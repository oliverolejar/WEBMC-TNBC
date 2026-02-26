from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from .config import (
    COL_DEVICE_TS_MS,
    COL_KNEE_ANGLE,
    COL_TIMESTAMP,
    EPSILON,
    SESSIONS_DIR,
)


def load_session_csv(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    if COL_KNEE_ANGLE not in df.columns:
        raise ValueError(f"{csv_path.name}: missing required column '{COL_KNEE_ANGLE}'")
    return df


def _time_seconds(df: pd.DataFrame) -> pd.Series:
    # Prefer Arduino timestamp for sensor-side timing.
    if COL_DEVICE_TS_MS in df.columns and df[COL_DEVICE_TS_MS].notna().any():
        t = pd.to_numeric(df[COL_DEVICE_TS_MS], errors="coerce") / 1000.0
        if t.notna().sum() >= 2:
            return t

    # Fallback for older CSV format.
    if COL_TIMESTAMP in df.columns and df[COL_TIMESTAMP].notna().any():
        wall = pd.to_datetime(df[COL_TIMESTAMP], errors="coerce", utc=True)
        if wall.notna().sum() >= 2:
            first = wall.dropna().iloc[0]
            return (wall - first).dt.total_seconds()

    # Last resort: synthetic index-based timeline.
    return pd.Series(np.arange(len(df), dtype=float), index=df.index)


def extract_session_features(df: pd.DataFrame, session_id: str) -> dict:
    angle = pd.to_numeric(df[COL_KNEE_ANGLE], errors="coerce").dropna()
    if len(angle) < 2:
        raise ValueError(f"{session_id}: not enough knee-angle samples")

    t = _time_seconds(df).loc[angle.index].astype(float)
    valid = t.notna()
    t = t.loc[valid]
    angle = angle.loc[valid]
    if len(angle) < 2:
        raise ValueError(f"{session_id}: not enough valid time-aligned samples")

    dt = t.diff().dropna()
    dt = dt[dt > EPSILON]

    duration_s = float(t.iloc[-1] - t.iloc[0])
    sample_count = int(len(angle))
    sample_rate_hz = float(sample_count / max(duration_s, EPSILON))
    rom_deg = float(angle.max() - angle.min())

    vel = angle.diff() / t.diff().replace(0, np.nan)
    vel = vel.replace([np.inf, -np.inf], np.nan).dropna()

    return {
        "session_id": session_id,
        "sample_count": sample_count,
        "duration_s": duration_s,
        "sample_rate_hz": sample_rate_hz,
        "knee_mean_deg": float(angle.mean()),
        "knee_std_deg": float(angle.std(ddof=0)),
        "knee_min_deg": float(angle.min()),
        "knee_max_deg": float(angle.max()),
        "knee_rom_deg": rom_deg,
        "knee_p05_deg": float(angle.quantile(0.05)),
        "knee_p95_deg": float(angle.quantile(0.95)),
        "dt_mean_s": float(dt.mean()) if not dt.empty else 0.0,
        "dt_std_s": float(dt.std(ddof=0)) if len(dt) > 1 else 0.0,
        "vel_mean_deg_s": float(vel.mean()) if not vel.empty else 0.0,
        "vel_std_deg_s": float(vel.std(ddof=0)) if len(vel) > 1 else 0.0,
        "vel_abs_mean_deg_s": float(vel.abs().mean()) if not vel.empty else 0.0,
        "vel_abs_max_deg_s": float(vel.abs().max()) if not vel.empty else 0.0,
    }


def extract_features_from_csv(csv_path: Path) -> dict:
    df = load_session_csv(csv_path)
    return extract_session_features(df, session_id=csv_path.stem)


def extract_features_from_folder(sessions_dir: Path) -> pd.DataFrame:
    rows = []
    for csv_path in sorted(sessions_dir.glob("*.csv")):
        # Ignore metadata tables that are not sample streams.
        if "manifest" in csv_path.stem.lower():
            continue
        try:
            rows.append(extract_features_from_csv(csv_path))
        except Exception as exc:
            print(f"[skip] {csv_path.name}: {exc}")
    return pd.DataFrame(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract session-level knee features.")
    parser.add_argument(
        "--sessions-dir",
        type=Path,
        default=SESSIONS_DIR,
        help="Directory containing session CSV files.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("backend/src/model/artifacts/session_features.csv"),
        help="Output CSV for extracted features.",
    )
    args = parser.parse_args()

    features_df = extract_features_from_folder(args.sessions_dir)
    if features_df.empty:
        print("[error] No valid session feature rows extracted.")
        return

    args.output.parent.mkdir(parents=True, exist_ok=True)
    features_df.to_csv(args.output, index=False)
    print(f"[ok] Wrote {len(features_df)} session feature rows to {args.output}")


if __name__ == "__main__":
    main()
