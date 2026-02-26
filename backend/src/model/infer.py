from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .features import extract_features_from_folder


def score_to_recovery_index(scores: np.ndarray, score_p05: float, score_p95: float) -> np.ndarray:
    denom = max(score_p95 - score_p05, 1e-9)
    scaled = (scores - score_p05) / denom
    scaled = np.clip(scaled, 0.0, 1.0)
    return scaled * 100.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Run inference and map anomaly score to Recovery Index.")
    parser.add_argument(
        "--sessions-dir",
        type=Path,
        default=Path("data/sessions"),
        help="Session CSV folder.",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=Path("backend/src/model/artifacts/isolation_forest_knee.joblib"),
        help="Path to trained model artifact.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("backend/src/model/artifacts/inference_results.csv"),
        help="Output CSV path for inference results.",
    )
    args = parser.parse_args()

    if not args.model.exists():
        print(f"[error] Model not found: {args.model}")
        return

    payload = joblib.load(args.model)
    model = payload["model"]
    feature_cols = payload["feature_cols"]
    score_p05 = float(payload.get("score_p05", -0.1))
    score_p95 = float(payload.get("score_p95", 0.1))

    df = extract_features_from_folder(args.sessions_dir)
    if df.empty:
        print("[error] No valid sessions found for inference.")
        return

    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        print(f"[error] Missing feature columns for inference: {missing}")
        return

    X = df[feature_cols]
    scores = model.decision_function(X)
    pred = model.predict(X)  # 1 inlier, -1 outlier
    recovery_index = score_to_recovery_index(scores, score_p05, score_p95)

    out = df[["session_id"]].copy()
    out["anomaly_score"] = scores
    out["isolation_pred"] = pred
    out["recovery_index"] = np.round(recovery_index, 2)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(args.output, index=False)
    print(f"[ok] Wrote {len(out)} inference rows to {args.output}")


if __name__ == "__main__":
    main()

