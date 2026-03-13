from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, asdict
from typing import Optional


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(value, hi))


def wrap180(angle: float) -> float:
    while angle > 180.0:
        angle -= 360.0
    while angle < -180.0:
        angle += 360.0
    return angle


@dataclass
class RawSample:
    role: str
    timestamp_utc: float
    device_timestamp_ms: int
    seq: int
    roll_deg: float
    emg_quad_envelope: float = 0.0
    emg_ham_envelope: float = 0.0


@dataclass
class PairedSample:
    timestamp_utc: float
    central_roll_deg: float
    peripheral_roll_deg: float
    knee_angle_deg: float
    emg_quad_envelope: float
    emg_ham_envelope: float
    pair_dt_ms: float
    left_knee_angle_deg: float = 0.0
    left_emg_quad_envelope: float = 0.0
    left_emg_ham_envelope: float = 0.0


class ImuStreamService:
    def __init__(self, pair_window_ms: int = 40):
        self.pair_window_ms = pair_window_ms

        # Right leg connection state
        self.central_right_connected = False
        self.peripheral_right_connected = False
        # Left leg connection state
        self.central_left_connected = False
        self.peripheral_left_connected = False

        # device_connected = right pair fully connected (same as before)
        self.device_connected = False
        self.left_connected = False

        self.recording = False
        self.calibration_active = False

        # Right leg calibration offsets
        self.central_right_zero_deg = 0.0
        self.peripheral_right_zero_deg = 0.0
        # Left leg calibration offsets
        self.central_left_zero_deg = 0.0
        self.peripheral_left_zero_deg = 0.0

        # Latest samples per role
        self.latest_central_right: Optional[RawSample] = None
        self.latest_peripheral_right: Optional[RawSample] = None
        self.latest_central_left: Optional[RawSample] = None
        self.latest_peripheral_left: Optional[RawSample] = None

        self.latest_payload = {
            "timestamp_utc": None,
            "device_connected": False,
            "central_connected": False,
            "peripheral_connected": False,
            "left_connected": False,
            "calibration_active": False,
            "central_roll_deg": 0.0,
            "peripheral_roll_deg": 0.0,
            "knee_angle_deg": 0.0,
            "emg_quad_envelope": 0.0,
            "emg_ham_envelope": 0.0,
            "pair_dt_ms": None,
            "left_knee_angle_deg": 0.0,
            "left_emg_quad_envelope": 0.0,
            "left_emg_ham_envelope": 0.0,
        }

        self._latest_raw_event = {
            "event_id": 0,
            "role": None,
            "device_timestamp_ms": None,
            "seq": None,
            "roll_deg": 0.0,
            "emg_quad_envelope": 0.0,
            "emg_ham_envelope": 0.0,
            "timestamp_utc": None,
        }

        self._session_rows: list[PairedSample] = []
        self._recent_pairs = deque(maxlen=400)

    def set_connected(self, role: str, connected: bool):
        if role == "central_right":
            self.central_right_connected = connected
        elif role == "peripheral_right":
            self.peripheral_right_connected = connected
        elif role == "central_left":
            self.central_left_connected = connected
        elif role == "peripheral_left":
            self.peripheral_left_connected = connected

        self.device_connected = self.central_right_connected and self.peripheral_right_connected
        self.left_connected = self.central_left_connected and self.peripheral_left_connected

        self.latest_payload["device_connected"] = self.device_connected
        self.latest_payload["central_connected"] = self.central_right_connected
        self.latest_payload["peripheral_connected"] = self.peripheral_right_connected
        self.latest_payload["left_connected"] = self.left_connected
        self.latest_payload["calibration_active"] = self.calibration_active

    def ingest_raw_sample(
        self,
        role: str,
        device_timestamp_ms: int,
        seq: int,
        roll_deg: float,
        emg_quad_envelope: float = 0.0,
        emg_ham_envelope: float = 0.0,
    ):
        now = time.time()

        sample = RawSample(
            role=role,
            timestamp_utc=now,
            device_timestamp_ms=device_timestamp_ms,
            seq=seq,
            roll_deg=roll_deg,
            emg_quad_envelope=emg_quad_envelope,
            emg_ham_envelope=emg_ham_envelope,
        )

        if role == "central_right":
            self.latest_central_right = sample
        elif role == "peripheral_right":
            self.latest_peripheral_right = sample
        elif role == "central_left":
            self.latest_central_left = sample
        elif role == "peripheral_left":
            self.latest_peripheral_left = sample

        self._latest_raw_event = {
            "event_id": self._latest_raw_event["event_id"] + 1,
            "role": role,
            "device_timestamp_ms": device_timestamp_ms,
            "seq": seq,
            "roll_deg": roll_deg,
            "emg_quad_envelope": emg_quad_envelope,
            "emg_ham_envelope": emg_ham_envelope,
            "timestamp_utc": now,
        }

        self._update_latest_payload()

    def _update_latest_payload(self):
        central = self.latest_central_right
        peripheral = self.latest_peripheral_right

        if central is None:
            self.latest_payload["device_connected"] = self.device_connected
            self.latest_payload["central_connected"] = self.central_right_connected
            self.latest_payload["peripheral_connected"] = self.peripheral_right_connected
            self.latest_payload["left_connected"] = self.left_connected
            self.latest_payload["calibration_active"] = self.calibration_active
            return

        # --- Right leg ---
        central_roll = central.roll_deg
        peripheral_roll = peripheral.roll_deg if peripheral is not None else 0.0

        central_rel = wrap180(central_roll - self.central_right_zero_deg)
        peripheral_rel = wrap180(peripheral_roll - self.peripheral_right_zero_deg)
        knee_angle = abs(wrap180(central_rel - peripheral_rel))

        pair_dt_ms = None
        if peripheral is not None:
            pair_dt_ms = abs(central.device_timestamp_ms - peripheral.device_timestamp_ms)

        # --- Left leg (optional) ---
        left_knee_angle = 0.0
        left_emg_quad = 0.0
        left_emg_ham = 0.0

        if self.latest_central_left is not None:
            lc = self.latest_central_left
            lp = self.latest_peripheral_left
            lc_roll = lc.roll_deg
            lp_roll = lp.roll_deg if lp is not None else 0.0
            lc_rel = wrap180(lc_roll - self.central_left_zero_deg)
            lp_rel = wrap180(lp_roll - self.peripheral_left_zero_deg)
            left_knee_angle = abs(wrap180(lc_rel - lp_rel))
            left_emg_quad = lc.emg_quad_envelope
            left_emg_ham = lc.emg_ham_envelope

        self.latest_payload = {
            "timestamp_utc": central.timestamp_utc,
            "device_connected": self.device_connected,
            "central_connected": self.central_right_connected,
            "peripheral_connected": self.peripheral_right_connected,
            "left_connected": self.left_connected,
            "calibration_active": self.calibration_active,
            "central_roll_deg": central_roll,
            "peripheral_roll_deg": peripheral_roll,
            "knee_angle_deg": knee_angle,
            "emg_quad_envelope": central.emg_quad_envelope,
            "emg_ham_envelope": central.emg_ham_envelope,
            "pair_dt_ms": pair_dt_ms,
            "left_knee_angle_deg": left_knee_angle,
            "left_emg_quad_envelope": left_emg_quad,
            "left_emg_ham_envelope": left_emg_ham,
        }

        if (
            self.recording
            and peripheral is not None
            and pair_dt_ms is not None
            and pair_dt_ms <= self.pair_window_ms
        ):
            row = PairedSample(
                timestamp_utc=central.timestamp_utc,
                central_roll_deg=central_roll,
                peripheral_roll_deg=peripheral_roll,
                knee_angle_deg=knee_angle,
                emg_quad_envelope=central.emg_quad_envelope,
                emg_ham_envelope=central.emg_ham_envelope,
                pair_dt_ms=pair_dt_ms,
                left_knee_angle_deg=left_knee_angle,
                left_emg_quad_envelope=left_emg_quad,
                left_emg_ham_envelope=left_emg_ham,
            )
            self._session_rows.append(row)
            self._recent_pairs.append(row)

    def latest_dict(self):
        payload = dict(self.latest_payload)
        payload["device_connected"] = self.device_connected
        payload["central_connected"] = self.central_right_connected
        payload["peripheral_connected"] = self.peripheral_right_connected
        payload["left_connected"] = self.left_connected
        payload["calibration_active"] = self.calibration_active
        return payload

    def latest_raw_event_dict(self):
        return dict(self._latest_raw_event)

    def calibrate_current_pose(self):
        if self.latest_central_right is None or self.latest_peripheral_right is None:
            raise RuntimeError("Both central and peripheral IMUs must be connected before calibration.")

        self.central_right_zero_deg = self.latest_central_right.roll_deg
        self.peripheral_right_zero_deg = self.latest_peripheral_right.roll_deg

        # Calibrate left leg if connected
        if self.latest_central_left is not None and self.latest_peripheral_left is not None:
            self.central_left_zero_deg = self.latest_central_left.roll_deg
            self.peripheral_left_zero_deg = self.latest_peripheral_left.roll_deg

        self.calibration_active = True
        self._update_latest_payload()

        return {
            "message": "calibration_successful",
            "central_zero_deg": self.central_right_zero_deg,
            "peripheral_zero_deg": self.peripheral_right_zero_deg,
            "calibration_active": True,
        }

    def reset_calibration(self):
        self.central_right_zero_deg = 0.0
        self.peripheral_right_zero_deg = 0.0
        self.central_left_zero_deg = 0.0
        self.peripheral_left_zero_deg = 0.0
        self.calibration_active = False
        self._update_latest_payload()

        return {
            "message": "calibration_reset",
            "calibration_active": False,
        }

    def start_recording(self):
        self.recording = True
        self._session_rows = []

    def stop_recording(self):
        self.recording = False
        return list(self._session_rows)
