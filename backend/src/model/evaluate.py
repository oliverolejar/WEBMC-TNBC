from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


def parse_session_id(session_id: str) -> tuple[str, int, int]:
    # Format from synthetic generator:
    # synth_{base_name}_v{variant}_w{week}
    # base_name may contain underscores, so parse from the right.
    if "_v" not in session_id or "_w" not in session_id:
        raise ValueError(f"Unrecognized synthetic session id format: {session_id}")

    prefix, week_part = session_id.rsplit("_w", 1)
    base_part, variant_part = prefix.rsplit("_v", 1)

    week = int(week_part)
    variant = int(variant_part)
    base_name = base_part.removeprefix("synth_")
    return base_name, variant, week


def summarize_progress(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (source_session, variant_id), group in df.groupby(["source_session", "variant_id"], sort=True):
        g = group.sort_values("week_index")
        x = g["week_index"].to_numpy(dtype=float)
        y = g["recovery_index"].to_numpy(dtype=float)
        s = g["anomaly_score"].to_numpy(dtype=float)

        if len(x) < 2:
            continue

        slope_idx = float(np.polyfit(x, y, 1)[0])
        slope_score = float(np.polyfit(x, s, 1)[0])
        delta_idx = float(y[-1] - y[0])
        delta_score = float(s[-1] - s[0])
        monotonic_frac = float(np.mean(np.diff(y) >= 0))

        rows.append(
            {
                "source_session": source_session,
                "variant_id": int(variant_id),
                "n_weeks": int(len(g)),
                "recovery_index_start": float(y[0]),
                "recovery_index_end": float(y[-1]),
                "recovery_index_delta": delta_idx,
                "recovery_index_slope": slope_idx,
                "anomaly_score_start": float(s[0]),
                "anomaly_score_end": float(s[-1]),
                "anomaly_score_delta": delta_score,
                "anomaly_score_slope": slope_score,
                "recovery_monotonic_fraction": monotonic_frac,
                "trend_pass": bool(slope_idx > 0 and delta_idx > 0),
            }
        )
    return pd.DataFrame(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate synthetic progression trends from inference output.")
    parser.add_argument(
        "--inference-csv",
        type=Path,
        default=Path("backend/src/model/artifacts/inference_results_synth.csv"),
        help="Inference results CSV containing session_id, anomaly_score, recovery_index.",
    )
    parser.add_argument(
        "--output-summary",
        type=Path,
        default=Path("backend/src/model/artifacts/evaluation_summary.csv"),
        help="Output CSV for per-variant trend summary.",
    )
    args = parser.parse_args()

    if not args.inference_csv.exists():
        print(f"[error] inference csv not found: {args.inference_csv}")
        return

    inf = pd.read_csv(args.inference_csv)
    required = {"session_id", "anomaly_score", "recovery_index"}
    missing = required - set(inf.columns)
    if missing:
        print(f"[error] missing required columns: {sorted(missing)}")
        return

    parsed = inf["session_id"].apply(parse_session_id)
    inf["source_session"] = parsed.apply(lambda t: t[0])
    inf["variant_id"] = parsed.apply(lambda t: t[1])
    inf["week_index"] = parsed.apply(lambda t: t[2])

    summary = summarize_progress(inf)
    if summary.empty:
        print("[error] no valid variant groups found for evaluation")
        return

    args.output_summary.parent.mkdir(parents=True, exist_ok=True)
    summary.to_csv(args.output_summary, index=False)

    total = len(summary)
    pass_count = int(summary["trend_pass"].sum())
    pass_rate = 100.0 * pass_count / max(total, 1)
    mean_delta = float(summary["recovery_index_delta"].mean())
    mean_mono = float(summary["recovery_monotonic_fraction"].mean())

    print(f"[ok] Wrote evaluation summary to {args.output_summary}")
    print(f"[eval] variants={total} trend_pass={pass_count} ({pass_rate:.1f}%)")
    print(f"[eval] mean_recovery_index_delta={mean_delta:.2f}")
    print(f"[eval] mean_monotonic_fraction={mean_mono:.3f}")


if __name__ == "__main__":
    main()

