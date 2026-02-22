from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

@dataclass
class KneeSample:
    timestamp: str
    knee_angle_deg: float

class ImuStreamService:
    def __init__(self) -> None:
        self.latest_sample: Optional[KneeSample] = None
        self.device_connected: bool = False
        self.recording: bool = False
        self.session_rows: list[KneeSample] = []

    def set_connected(self, connected):
        self.device_connected = connected

    def ingest_sample(self, knee_angle_deg):
        ts = datetime.now(timezone.utc).isoformat()
        sample = KneeSample(timestamp=ts, knee_angle_deg=knee_angle_deg)

        self.latest_sample = sample

        if self.recording:
            self.session_rows.append(sample)

        return sample

    def start_recording(self):
        self.session_rows = []
        self.recording = True

    def stop_recording(self):
        self.recording = False
        return self.session_rows

    def latest_dict(self):
        return {
            "timestamp": self.latest_sample.timestamp if self.latest_sample else None,
            "knee_angle_deg": self.latest_sample.knee_angle_deg if self.latest_sample else None,
            "device_connected": self.device_connected,
            "recording": self.recording,
        }
