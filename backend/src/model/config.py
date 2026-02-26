from pathlib import Path

# Base directories
PROJECT_ROOT = Path(__file__).resolve().parents[3]
SESSIONS_DIR = PROJECT_ROOT / "data" / "sessions"
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"

# Core column names
COL_TIMESTAMP = "timestamp"
COL_DEVICE_TS_MS = "device_timestamp_ms"
COL_KNEE_ANGLE = "knee_angle_deg"

# Feature extraction settings
EPSILON = 1e-9

