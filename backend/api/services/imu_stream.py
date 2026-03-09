from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import time
from typing import Optional

ROLE_CENTRAL = "central"
ROLE_PERIPHERAL = "peripheral"
ROLES = (ROLE_CENTRAL, ROLE_PERIPHERAL)


def wrap180(angle_deg: float) -> float:
    angle = float(angle_deg)
    while angle > 180.0:
        angle -= 360.0
    while angle < -180.0:
        angle += 360.0
    return angle


def angle_diff_deg(a_deg: float, b_deg: float) -> float:
    return wrap180(float(a_deg) - float(b_deg))


@dataclass
class RawImuSample:
    role: str
    timestamp_utc: str
    host_timestamp_ms: int
    device_timestamp_ms: int
    seq: int
    roll_deg: float
    emg_quad_percent: float
    emg_ham_percent: float


@dataclass
class KneeSample:
    timestamp_utc: str
    central_roll_deg: float
    peripheral_roll_deg: float
    knee_angle_deg: float
    emg_quad_percent: float
    emg_ham_percent: float
    pair_dt_ms: int


class ImuStreamService:
    def __init__(self, pair_window_ms: int = 40, buffer_size: int = 300) -> None:
        self.pair_window_ms = int(pair_window_ms)
        self.buffer_size = int(buffer_size)

        self.latest_knee: Optional[KneeSample] = None
        self.latest_raw_by_role: dict[str, Optional[RawImuSample]] = {role: None for role in ROLES}
        self.pending_by_role: dict[str, deque[RawImuSample]] = {
            role: deque(maxlen=self.buffer_size) for role in ROLES
        }
        self.connected_by_role: dict[str, bool] = {role: False for role in ROLES}

        self.recording: bool = False
        self.session_rows: list[KneeSample] = []

        self.latest_raw_event_id: int = 0
        self.latest_raw_event: Optional[dict] = None

        self.roll_zero_by_role: dict[str, float] = {role: 0.0 for role in ROLES}
        self.calibration_active: bool = False
        self.calibration_timestamp_utc: Optional[str] = None

    @property
    def central_connected(self) -> bool:
        return self.connected_by_role[ROLE_CENTRAL]

    @property
    def peripheral_connected(self) -> bool:
        return self.connected_by_role[ROLE_PERIPHERAL]

    @property
    def device_connected(self) -> bool:
        return self.central_connected and self.peripheral_connected

    def _validate_role(self, role: str) -> None:
        if role not in ROLES:
            raise ValueError(f"invalid role '{role}'")

    def _calibrated_roll(self, role: str, raw_roll_deg: float) -> float:
        return wrap180(float(raw_roll_deg) - float(self.roll_zero_by_role[role]))

    def set_connected(self, role: str, connected: bool) -> None:
        self._validate_role(role)
        is_connected = bool(connected)
        self.connected_by_role[role] = is_connected

        if not is_connected:
            self.latest_knee = None
            self.latest_raw_by_role[role] = None
            self.pending_by_role[role].clear()

    def ingest_raw_sample(
        self,
        role: str,
        device_timestamp_ms: int,
        seq: int,
        roll_deg: float,
        emg_quad_percent: float = 0.0,
        emg_ham_percent: float = 0.0,
        host_timestamp_ms: Optional[int] = None,
    ) -> tuple[RawImuSample, Optional[KneeSample]]:
        self._validate_role(role)

        if host_timestamp_ms is None:
            host_timestamp_ms = time.monotonic_ns() // 1_000_000

        sample = RawImuSample(
            role=role,
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
            host_timestamp_ms=int(host_timestamp_ms),
            device_timestamp_ms=int(device_timestamp_ms),
            seq=int(seq),
            roll_deg=float(roll_deg),
            emg_quad_percent=max(0.0, min(100.0, float(emg_quad_percent))),
            emg_ham_percent=max(0.0, min(100.0, float(emg_ham_percent))),
        )

        self.latest_raw_by_role[role] = sample
        self.pending_by_role[role].append(sample)

        self.latest_raw_event_id += 1
        self.latest_raw_event = {
            "event_id": self.latest_raw_event_id,
            **asdict(sample),
            "calibrated_roll_deg": self._calibrated_roll(role, sample.roll_deg),
            "central_connected": self.central_connected,
            "peripheral_connected": self.peripheral_connected,
            "device_connected": self.device_connected,
            "recording": self.recording,
            "calibration_active": self.calibration_active,
        }

        knee_sample = self._try_pair(role)
        if knee_sample is not None:
            self.latest_knee = knee_sample
            if self.recording:
                self.session_rows.append(knee_sample)

        self._prune_pending(now_ms=sample.host_timestamp_ms)
        return sample, knee_sample

    def _try_pair(self, role: str) -> Optional[KneeSample]:
        if not self.device_connected:
            return None

        other_role = ROLE_PERIPHERAL if role == ROLE_CENTRAL else ROLE_CENTRAL
        source_queue = self.pending_by_role[role]
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

        if role == ROLE_CENTRAL:
            central_sample = source
            peripheral_sample = best_match
        else:
            central_sample = best_match
            peripheral_sample = source

        central_roll_cal = self._calibrated_roll(ROLE_CENTRAL, central_sample.roll_deg)
        peripheral_roll_cal = self._calibrated_roll(ROLE_PERIPHERAL, peripheral_sample.roll_deg)
        knee_angle = angle_diff_deg(central_roll_cal, peripheral_roll_cal)

        return KneeSample(
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
            central_roll_deg=central_roll_cal,
            peripheral_roll_deg=peripheral_roll_cal,
            knee_angle_deg=knee_angle,
            emg_quad_percent=central_sample.emg_quad_percent,
            emg_ham_percent=central_sample.emg_ham_percent,
            pair_dt_ms=int(best_dt_ms),
        )

    def _prune_pending(self, now_ms: int) -> None:
        cutoff_ms = int(now_ms) - (self.pair_window_ms * 5)
        for role in ROLES:
            queue = self.pending_by_role[role]
            while queue and queue[0].host_timestamp_ms < cutoff_ms:
                queue.popleft()

    def calibrate_current_pose(self) -> dict:
        if not self.device_connected:
            raise RuntimeError("Both devices must be connected before calibration.")

        central_sample = self.latest_raw_by_role[ROLE_CENTRAL]
        peripheral_sample = self.latest_raw_by_role[ROLE_PERIPHERAL]

        if central_sample is None or peripheral_sample is None:
            raise RuntimeError("No live IMU samples available yet for calibration.")

        self.roll_zero_by_role[ROLE_CENTRAL] = float(central_sample.roll_deg)
        self.roll_zero_by_role[ROLE_PERIPHERAL] = float(peripheral_sample.roll_deg)
        self.calibration_active = True
        self.calibration_timestamp_utc = datetime.now(timezone.utc).isoformat()
        self.latest_knee = None

        return {
            "message": "calibrated",
            "calibration_active": self.calibration_active,
            "calibration_timestamp_utc": self.calibration_timestamp_utc,
            "central_zero_roll_deg": self.roll_zero_by_role[ROLE_CENTRAL],
            "peripheral_zero_roll_deg": self.roll_zero_by_role[ROLE_PERIPHERAL],
        }

    def reset_calibration(self) -> dict:
        self.roll_zero_by_role = {role: 0.0 for role in ROLES}
        self.calibration_active = False
        self.calibration_timestamp_utc = None
        self.latest_knee = None

        return {
            "message": "calibration_reset",
            "calibration_active": self.calibration_active,
            "central_zero_roll_deg": self.roll_zero_by_role[ROLE_CENTRAL],
            "peripheral_zero_roll_deg": self.roll_zero_by_role[ROLE_PERIPHERAL],
        }

    def start_recording(self) -> None:
        self.session_rows = []
        self.recording = True

    def stop_recording(self) -> list[KneeSample]:
        self.recording = False
        return list(self.session_rows)

    def latest_dict(self) -> dict:
        central_sample = self.latest_raw_by_role[ROLE_CENTRAL]
        peripheral_sample = self.latest_raw_by_role[ROLE_PERIPHERAL]
        knee_available = self.latest_knee is not None and self.device_connected

        payload = {
            "timestamp": self.latest_knee.timestamp_utc if knee_available else None,
            "knee_angle_deg": self.latest_knee.knee_angle_deg if knee_available else None,
            "emg_quad_percent": self.latest_knee.emg_quad_percent if knee_available else (
                central_sample.emg_quad_percent if central_sample is not None else 0.0
            ),
            "emg_ham_percent": self.latest_knee.emg_ham_percent if knee_available else (
                central_sample.emg_ham_percent if central_sample is not None else 0.0
            ),
            "device_timestamp_ms": None,
            "device_connected": self.device_connected,
            "central_connected": self.central_connected,
            "peripheral_connected": self.peripheral_connected,
            "recording": self.recording,
            "knee_available": knee_available,
            "calibration_active": self.calibration_active,
            "calibration_timestamp_utc": self.calibration_timestamp_utc,
            "central_zero_roll_deg": self.roll_zero_by_role[ROLE_CENTRAL],
            "peripheral_zero_roll_deg": self.roll_zero_by_role[ROLE_PERIPHERAL],
        }

        if central_sample is not None:
            payload["device_timestamp_ms"] = central_sample.device_timestamp_ms
            payload["central_roll_raw_deg"] = central_sample.roll_deg
            payload["central_roll_calibrated_deg"] = self._calibrated_roll(
                ROLE_CENTRAL, central_sample.roll_deg
            )
            payload["central_emg_quad_percent"] = central_sample.emg_quad_percent
            payload["central_emg_ham_percent"] = central_sample.emg_ham_percent

        if peripheral_sample is not None:
            payload["peripheral_roll_raw_deg"] = peripheral_sample.roll_deg
            payload["peripheral_roll_calibrated_deg"] = self._calibrated_roll(
                ROLE_PERIPHERAL, peripheral_sample.roll_deg
            )

        if knee_available:
            payload["central_roll_deg"] = self.latest_knee.central_roll_deg
            payload["peripheral_roll_deg"] = self.latest_knee.peripheral_roll_deg
            payload["pair_dt_ms"] = self.latest_knee.pair_dt_ms

        return payload

    def latest_raw_event_dict(self) -> dict:
        if self.latest_raw_event is None:
            return {"event_id": 0}
        return dict(self.latest_raw_event)