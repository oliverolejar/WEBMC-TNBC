from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from .features import extract_features_from_folder


def main() -> None:
    parser = argparse.ArgumentParser(description="Train knee-only Isolation Forest (backend-only phase).")
    parser.add_argument(
        "--sessions-dir",
        type=Path,
        default=Path("data/sessions"),
        help="Session CSV folder.",
    )
    parser.add_argument(
        "--output-model",
        type=Path,
        default=Path("backend/src/model/artifacts/isolation_forest_knee.joblib"),
        help="Output model artifact path.",
    )
    args = parser.parse_args()

    df = extract_features_from_folder(args.sessions_dir)
    if df.empty:
        print("[error] No valid sessions found for training.")
        return

    # Use only core knee-angle distribution features.
    # Excluded reasons:
    #   EMG          – electrodes not always attached; 0-values are hard outliers
    #   Velocity     – synthetic per-sample noise inflates velocity vs real sessions
    #   Asymmetry    – always 0 for 2-Arduino sessions (phantom left = right),
    #                  but training data has non-zero asymmetry → hard outlier
    #   Left-knee    – phantom copies of right in 2-Arduino mode; adds no signal
    #   Timing/count – fixed from single base session; would penalise different lengths
    _CORE_KNEE_COLS = {
        "knee_mean_deg", "knee_std_deg", "knee_min_deg", "knee_max_deg",
        "knee_rom_deg", "knee_p05_deg", "knee_p95_deg",
    }
    feature_cols = [c for c in df.columns if c in _CORE_KNEE_COLS]
    X = df[feature_cols]

    model = IsolationForest(
        n_estimators=200,
        contamination="auto",
        random_state=42,
    )
    model.fit(X)

    # Save score scaling bounds to map decision scores -> Recovery Index (0-100)
    train_scores = model.decision_function(X)
    score_p05 = float(np.percentile(train_scores, 1))
    score_p95 = float(np.percentile(train_scores, 95))

    args.output_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "feature_cols": feature_cols,
            "score_p05": score_p05,
            "score_p95": score_p95,
        },
        args.output_model,
    )
    print(f"[ok] Trained on {len(df)} sessions and saved model to {args.output_model}")


if __name__ == "__main__":
    main()
