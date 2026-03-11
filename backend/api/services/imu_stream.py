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


class ImuStreamService:
    def __init__(self, pair_window_ms: int = 40):
        self.pair_window_ms = pair_window_ms

        self.central_connected = False
        self.peripheral_connected = False
        self.device_connected = False

        self.recording = False
        self.calibration_active = False

        self.central_zero_deg = 0.0
        self.peripheral_zero_deg = 0.0

        self.latest_central: Optional[RawSample] = None
        self.latest_peripheral: Optional[RawSample] = None

        self.latest_payload = {
            "timestamp_utc": None,
            "device_connected": False,
            "central_connected": False,
            "peripheral_connected": False,
            "calibration_active": False,
            "central_roll_deg": 0.0,
            "peripheral_roll_deg": 0.0,
            "knee_angle_deg": 0.0,
            "emg_quad_envelope": 0.0,
            "emg_ham_envelope": 0.0,
            "pair_dt_ms": None,
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
        if role == "central":
            self.central_connected = connected
        elif role == "peripheral":
            self.peripheral_connected = connected

        self.device_connected = self.central_connected and self.peripheral_connected
        self.latest_payload["device_connected"] = self.device_connected
        self.latest_payload["central_connected"] = self.central_connected
        self.latest_payload["peripheral_connected"] = self.peripheral_connected
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

        if role == "central":
            self.latest_central = sample
        else:
            self.latest_peripheral = sample

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
        central = self.latest_central
        peripheral = self.latest_peripheral

        if central is None:
            self.latest_payload["device_connected"] = self.device_connected
            self.latest_payload["central_connected"] = self.central_connected
            self.latest_payload["peripheral_connected"] = self.peripheral_connected
            self.latest_payload["calibration_active"] = self.calibration_active
            return

        central_roll = central.roll_deg
        peripheral_roll = peripheral.roll_deg if peripheral is not None else 0.0

        central_rel = wrap180(central_roll - self.central_zero_deg)
        peripheral_rel = wrap180(peripheral_roll - self.peripheral_zero_deg)

        # Knee angle from relative roll difference between central and peripheral
        knee_angle = abs(wrap180(central_rel - peripheral_rel))

        pair_dt_ms = None
        if central is not None and peripheral is not None:
            pair_dt_ms = abs(central.device_timestamp_ms - peripheral.device_timestamp_ms)

        self.latest_payload = {
            "timestamp_utc": central.timestamp_utc,
            "device_connected": self.device_connected,
            "central_connected": self.central_connected,
            "peripheral_connected": self.peripheral_connected,
            "calibration_active": self.calibration_active,
            "central_roll_deg": central_roll,
            "peripheral_roll_deg": peripheral_roll,
            "knee_angle_deg": knee_angle,
            "emg_quad_envelope": central.emg_quad_envelope,
            "emg_ham_envelope": central.emg_ham_envelope,
            "pair_dt_ms": pair_dt_ms,
        }

        if (
            self.recording
            and central is not None
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
            )
            self._session_rows.append(row)
            self._recent_pairs.append(row)

    def latest_dict(self):
        payload = dict(self.latest_payload)
        payload["device_connected"] = self.device_connected
        payload["central_connected"] = self.central_connected
        payload["peripheral_connected"] = self.peripheral_connected
        payload["calibration_active"] = self.calibration_active
        return payload

    def latest_raw_event_dict(self):
        return dict(self._latest_raw_event)

    def calibrate_current_pose(self):
        if self.latest_central is None or self.latest_peripheral is None:
            raise RuntimeError("Both central and peripheral IMUs must be connected before calibration.")

        self.central_zero_deg = self.latest_central.roll_deg
        self.peripheral_zero_deg = self.latest_peripheral.roll_deg
        self.calibration_active = True
        self._update_latest_payload()

        return {
            "message": "calibration_successful",
            "central_zero_deg": self.central_zero_deg,
            "peripheral_zero_deg": self.peripheral_zero_deg,
            "calibration_active": True,
        }

    def reset_calibration(self):
        self.central_zero_deg = 0.0
        self.peripheral_zero_deg = 0.0
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