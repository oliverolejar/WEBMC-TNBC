from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import time
from typing import Optional

ALL_ROLES = ("right_upper", "right_lower", "left_upper", "left_lower")

LEG_ROLES: dict[str, tuple[str, str]] = {
    "right": ("right_upper", "right_lower"),
    "left":  ("left_upper",  "left_lower"),
}


@dataclass
class RawImuSample:
    role: str
    timestamp_utc: str
    host_timestamp_ms: int
    device_timestamp_ms: int
    seq: int
    roll_deg: float
    emg_quad_pct: float   # 0.0 for lower roles
    emg_ham_pct: float    # 0.0 for lower roles


@dataclass
class KneeSample:
    timestamp_utc: str
    leg: str
    upper_roll_deg: float
    lower_roll_deg: float
    knee_angle_deg: float   # upper_roll_deg - lower_roll_deg
    emg_quad_pct: float     # from upper sample
    emg_ham_pct: float      # from upper sample
    pair_dt_ms: int


class ImuStreamService:
    def __init__(
        self,
        pair_window_ms: int = 40,
        buffer_size: int = 300,
        enabled_legs: Optional[list[str]] = None,
    ) -> None:
        self.pair_window_ms = int(pair_window_ms)
        self.buffer_size = int(buffer_size)
        self.enabled_legs: list[str] = list(enabled_legs or ["right"])

        self.latest_knee_by_leg: dict[str, Optional[KneeSample]] = {
            "right": None, "left": None
        }
        self.latest_raw_by_role: dict[str, Optional[RawImuSample]] = {
            r: None for r in ALL_ROLES
        }
        self.pending_by_role: dict[str, deque[RawImuSample]] = {
            r: deque(maxlen=self.buffer_size) for r in ALL_ROLES
        }
        self.connected_by_role: dict[str, bool] = {r: False for r in ALL_ROLES}
        self.roll_offset_by_role: dict[str, float] = {r: 0.0 for r in ALL_ROLES}

        self.recording: bool = False
        self.session_rows: list[KneeSample] = []

        self.latest_raw_event_id: int = 0
        self.latest_raw_event: Optional[dict] = None

    @property
    def device_connected(self) -> bool:
        """True when all roles belonging to enabled legs are connected."""
        return all(
            self.connected_by_role[role]
            for leg in self.enabled_legs
            for role in LEG_ROLES[leg]
        )

    def leg_available(self, leg: str) -> bool:
        """True when both roles for a leg are connected and a knee sample exists."""
        upper, lower = LEG_ROLES[leg]
        return (
            self.connected_by_role[upper]
            and self.connected_by_role[lower]
            and self.latest_knee_by_leg[leg] is not None
        )

    def set_connected(self, role: str, connected: bool) -> None:
        if role not in self.connected_by_role:
            raise ValueError(f"invalid role '{role}'")
        self.connected_by_role[role] = bool(connected)

        if not connected:
            self.pending_by_role[role].clear()
            self.latest_raw_by_role[role] = None
            self.roll_offset_by_role[role] = 0.0
            # Clear the knee sample for whichever leg owns this role
            for leg, (upper, lower) in LEG_ROLES.items():
                if role in (upper, lower):
                    self.latest_knee_by_leg[leg] = None
                    break

    def ingest_raw_sample(
        self,
        role: str,
        device_timestamp_ms: int,
        seq: int,
        roll_deg: float,
        emg_quad_pct: float,
        emg_ham_pct: float,
        host_timestamp_ms: Optional[int] = None,
    ) -> tuple[RawImuSample, Optional[KneeSample]]:
        if role not in self.connected_by_role:
            raise ValueError(f"invalid role '{role}'")

        if host_timestamp_ms is None:
            host_timestamp_ms = time.monotonic_ns() // 1_000_000

        sample = RawImuSample(
            role=role,
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
            host_timestamp_ms=int(host_timestamp_ms),
            device_timestamp_ms=int(device_timestamp_ms),
            seq=int(seq),
            roll_deg=float(roll_deg) - self.roll_offset_by_role[role],
            emg_quad_pct=float(emg_quad_pct),
            emg_ham_pct=float(emg_ham_pct),
        )

        self.latest_raw_by_role[role] = sample
        self.pending_by_role[role].append(sample)

        self.latest_raw_event_id += 1
        self.latest_raw_event = {
            "event_id": self.latest_raw_event_id,
            **asdict(sample),
            **{f"{r}_connected": self.connected_by_role[r] for r in ALL_ROLES},
            "device_connected": self.device_connected,
            "recording": self.recording,
        }

        # Try pairing for the leg that owns this role
        knee_sample = None
        for leg, (upper, lower) in LEG_ROLES.items():
            if role in (upper, lower):
                knee_sample = self._try_pair_leg(leg, role)
                if knee_sample is not None:
                    self.latest_knee_by_leg[leg] = knee_sample
                    if self.recording:
                        self.session_rows.append(knee_sample)
                break

        self._prune_pending(now_ms=sample.host_timestamp_ms)
        return sample, knee_sample

    def _try_pair_leg(self, leg: str, triggering_role: str) -> Optional[KneeSample]:
        upper_role, lower_role = LEG_ROLES[leg]

        if not (self.connected_by_role[upper_role] and self.connected_by_role[lower_role]):
            return None

        other_role = lower_role if triggering_role == upper_role else upper_role
        source_queue = self.pending_by_role[triggering_role]
        other_queue = self.pending_by_role[other_role]

        if not source_queue or not other_queue:
            return None

        source = source_queue[-1]

        best_match = None
        best_dt_ms = self.pair_window_ms + 1
        for candidate in other_queue:
            dt_ms = abs(source.host_timestamp_ms - candidate.host_timestamp_ms)
            if dt_ms < best_dt_ms:
                best_dt_ms = dt_ms
                best_match = candidate

        if best_match is None or best_dt_ms > self.pair_window_ms:
            return None

        source_queue.pop()
        other_queue.remove(best_match)

        if triggering_role == upper_role:
            upper_sample, lower_sample = source, best_match
        else:
            upper_sample, lower_sample = best_match, source

        return KneeSample(
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
            leg=leg,
            upper_roll_deg=upper_sample.roll_deg,
            lower_roll_deg=lower_sample.roll_deg,
            knee_angle_deg=upper_sample.roll_deg - lower_sample.roll_deg,
            emg_quad_pct=upper_sample.emg_quad_pct,
            emg_ham_pct=upper_sample.emg_ham_pct,
            pair_dt_ms=int(best_dt_ms),
        )

    def _prune_pending(self, now_ms: int) -> None:
        cutoff_ms = int(now_ms) - (self.pair_window_ms * 5)
        for role in ALL_ROLES:
            queue = self.pending_by_role[role]
            while queue and queue[0].host_timestamp_ms < cutoff_ms:
                queue.popleft()

    def tare_all(self) -> dict[str, float]:
        """Snapshot current roll for each connected role as the new zero reference."""
        applied: dict[str, float] = {}
        for role in ALL_ROLES:
            sample = self.latest_raw_by_role[role]
            if sample is not None:
                self.roll_offset_by_role[role] += sample.roll_deg
                applied[role] = self.roll_offset_by_role[role]
        return applied

    def start_recording(self) -> None:
        self.session_rows = []
        self.recording = True

    def stop_recording(self) -> list[KneeSample]:
        self.recording = False
        return list(self.session_rows)

    def latest_dict(self) -> dict:
        right_knee = self.latest_knee_by_leg["right"]
        left_knee  = self.latest_knee_by_leg["left"]
        right_avail = self.leg_available("right")
        left_avail  = self.leg_available("left")

        return {
            "right_knee_angle_deg":  right_knee.knee_angle_deg  if right_avail else None,
            "left_knee_angle_deg":   left_knee.knee_angle_deg   if left_avail  else None,
            "right_available":       right_avail,
            "left_available":        left_avail,
            "right_pair_dt_ms":      right_knee.pair_dt_ms      if right_avail else None,
            "left_pair_dt_ms":       left_knee.pair_dt_ms       if left_avail  else None,
            "right_emg_quad_pct":    right_knee.emg_quad_pct    if right_avail else None,
            "right_emg_ham_pct":     right_knee.emg_ham_pct     if right_avail else None,
            "left_emg_quad_pct":     left_knee.emg_quad_pct     if left_avail  else None,
            "left_emg_ham_pct":      left_knee.emg_ham_pct      if left_avail  else None,
            "right_upper_connected": self.connected_by_role["right_upper"],
            "right_lower_connected": self.connected_by_role["right_lower"],
            "left_upper_connected":  self.connected_by_role["left_upper"],
            "left_lower_connected":  self.connected_by_role["left_lower"],
            "device_connected":      self.device_connected,
            "recording":             self.recording,
            "enabled_legs":          self.enabled_legs,
        }

    def latest_raw_event_dict(self) -> dict:
        if self.latest_raw_event is None:
            return {"event_id": 0}
        return dict(self.latest_raw_event)
