from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .config import COL_DEVICE_TS_MS, COL_KNEE_ANGLE, COL_TIMESTAMP, SESSIONS_DIR


@dataclass
class SynthProfile:
    variant_id: int
    start_scale: float
    end_scale: float
    angle_bias_deg: float
    noise_std_deg: float


def _load_base_session(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    required = [COL_KNEE_ANGLE]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"{csv_path.name}: missing '{col}'")
    if COL_DEVICE_TS_MS not in df.columns:
        # Fallback for legacy files: synthetic monotonic ms
        df[COL_DEVICE_TS_MS] = np.arange(len(df), dtype=np.int64) * 50
    if COL_TIMESTAMP not in df.columns:
        # Fallback for legacy files: synthetic wall-clock timestamps
        t0 = pd.Timestamp.utcnow()
        df[COL_TIMESTAMP] = (t0 + pd.to_timedelta(df[COL_DEVICE_TS_MS], unit="ms")).astype(str)
    return df


def _make_profile(rng: np.random.Generator, variant_id: int) -> SynthProfile:
    # Start with reduced ROM, recover towards healthy by end_scale.
    start_scale = float(rng.uniform(0.45, 0.8))
    end_scale = float(rng.uniform(0.85, 1.0))
    if end_scale < start_scale:
        start_scale, end_scale = end_scale, start_scale
    return SynthProfile(
        variant_id=variant_id,
        start_scale=start_scale,
        end_scale=end_scale,
        angle_bias_deg=float(rng.uniform(-8.0, 8.0)),
        noise_std_deg=float(rng.uniform(0.8, 3.0)),
    )


def _progress_fraction(week_idx: int, total_weeks: int) -> float:
    if total_weeks <= 1:
        return 1.0
    x = week_idx / (total_weeks - 1)
    return float(x ** 0.7)


def _synthesize_angles(
    healthy_angle: np.ndarray,
    profile: SynthProfile,
    week_idx: int,
    total_weeks: int,
    rng: np.random.Generator,
) -> np.ndarray:
    frac = _progress_fraction(week_idx, total_weeks)
    scale = profile.start_scale + (profile.end_scale - profile.start_scale) * frac
    center = float(np.mean(healthy_angle))
    reduced = center + scale * (healthy_angle - center)

    # Mild instability decreases over recovery.
    week_noise = profile.noise_std_deg * (1.15 - 0.5 * frac)
    jitter = rng.normal(loc=0.0, scale=week_noise, size=len(healthy_angle))
    return reduced + profile.angle_bias_deg + jitter


def generate_synthetic_sessions(
    healthy_dir: Path,
    output_dir: Path,
    variants_per_session: int,
    weeks: int,
    seed: int,
) -> Path:
    rng = np.random.default_rng(seed)
    output_dir.mkdir(parents=True, exist_ok=True)

    manifest_rows: list[dict] = []
    healthy_files = sorted(healthy_dir.glob("*.csv"))
    if not healthy_files:
        raise ValueError(f"No CSV files found in {healthy_dir}")

    for src_csv in healthy_files:
        base_df = _load_base_session(src_csv)
        base_name = src_csv.stem
        healthy_angle = pd.to_numeric(base_df[COL_KNEE_ANGLE], errors="coerce").ffill().bfill().to_numpy()
        base_device_ms = pd.to_numeric(base_df[COL_DEVICE_TS_MS], errors="coerce").ffill().bfill().to_numpy()

        # Normalize device clock to zero-start, preserve cadence.
        base_device_ms = base_device_ms - base_device_ms[0]
        t0 = pd.Timestamp.utcnow()

        for v in range(1, variants_per_session + 1):
            profile = _make_profile(rng, variant_id=v)
            for w in range(weeks):
                synth_angle = _synthesize_angles(healthy_angle, profile, w, weeks, rng)

                session_id = f"synth_{base_name}_v{v:02d}_w{w:02d}"
                session_df = pd.DataFrame(
                    {
                        COL_TIMESTAMP: (
                            t0 + pd.to_timedelta(w * 7, unit="D") + pd.to_timedelta(base_device_ms, unit="ms")
                        ).astype(str),
                        COL_DEVICE_TS_MS: base_device_ms.astype(np.int64),
                        COL_KNEE_ANGLE: synth_angle.astype(np.float32),
                    }
                )

                out_csv = output_dir / f"{session_id}.csv"
                session_df.to_csv(out_csv, index=False)

                manifest_rows.append(
                    {
                        "session_id": session_id,
                        "source_session": base_name,
                        "variant_id": profile.variant_id,
                        "week_index": w,
                        "start_scale": profile.start_scale,
                        "end_scale": profile.end_scale,
                        "angle_bias_deg": profile.angle_bias_deg,
                        "noise_std_deg": profile.noise_std_deg,
                    }
                )

    manifest_path = output_dir / "synthetic_manifest.csv"
    pd.DataFrame(manifest_rows).to_csv(manifest_path, index=False)
    return manifest_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic injured knee sessions from healthy session CSVs.")
    parser.add_argument(
        "--healthy-dir",
        type=Path,
        default=SESSIONS_DIR,
        help="Input directory with healthy session CSVs.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("data/synthetic_sessions"),
        help="Output directory for generated synthetic CSVs.",
    )
    parser.add_argument(
        "--variants-per-session",
        type=int,
        default=8,
        help="Number of synthetic patient variants per source session.",
    )
    parser.add_argument(
        "--weeks",
        type=int,
        default=12,
        help="Number of weekly progression sessions per synthetic variant.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility.",
    )
    args = parser.parse_args()

    manifest = generate_synthetic_sessions(
        healthy_dir=args.healthy_dir,
        output_dir=args.output_dir,
        variants_per_session=args.variants_per_session,
        weeks=args.weeks,
        seed=args.seed,
    )
    print(f"[ok] Synthetic sessions generated. Manifest: {manifest}")


if __name__ == "__main__":
    main()
