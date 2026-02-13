import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import GroupShuffleSplit
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

# --- CONFIGURATION ---
DATASET_PATH = "synthetic_biofeedback_data.csv"
TARGET_COL = "Recovery_Percentage" # Continuous 0-100
MODEL_FILE = "recovery_model.joblib"
# ---------------------

def load_and_preprocess_data(filepath):
    """
    Loads data and calculates Limb Symmetry Indices (LSI).
    """
    if not os.path.exists(filepath):
        print(f"\n[ERROR] File '{filepath}' not found.")
        print(f"Please run 'python generate_synthetic_data.py' first.")
        return None

    print(f"Loading data from {filepath}...")
    df = pd.read_csv(filepath)

    # --- FEATURE ENGINEERING ---
    if 'Injured_Knee_ROM' in df.columns:
        df['LSI_ROM'] = df['Injured_Knee_ROM'] / df['Healthy_Knee_ROM']
    
    if 'Injured_Quad_EMG_Peak' in df.columns:
        df['LSI_Quad'] = df['Injured_Quad_EMG_Peak'] / df['Healthy_Quad_EMG_Peak']

    if 'Injured_Hamstr_EMG_Peak' in df.columns:
        df['LSI_Hamstring'] = df['Injured_Hamstr_EMG_Peak'] / df['Healthy_Hamstr_EMG_Peak']

    if 'Week_Post_Op' not in df.columns:
        df['Week_Post_Op'] = 0

    df = df.replace([np.inf, -np.inf], np.nan).dropna()
    return df

def train_model(df):
    """
    Trains a Random Forest REGRESSOR.
    """
    feature_cols = [col for col in df.columns if col.startswith('LSI') or col == 'Week_Post_Op']
    
    X = df[feature_cols]
    y = df[TARGET_COL]
    groups = df['Patient_ID']

    print(f"\nTraining on features: {feature_cols}")
    print(f"Total Rows: {len(df)}")

    # --- SPLIT BY PATIENT ---
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups))

    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

    print(f"Training Set: {len(X_train)} rows")
    print(f"Testing Set:  {len(X_test)} rows")

    # Train REGRESSOR
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("\n--- MODEL PERFORMANCE ---")
    print(f"R² Score: {r2:.4f} (1.0 is perfect)")

    # --- SHOW SAMPLE PREDICTIONS (Visual Proof of Learning) ---
    print("\n--- SAMPLE PREDICTIONS (Actual vs Predicted) ---")
    results = pd.DataFrame({'Actual': y_test, 'Predicted': y_pred})
    print(results.head(5).to_string(index=False))

    # Feature Importance
    importances = model.feature_importances_
    print("\n--- FEATURE IMPORTANCE ---")
    for feature, importance in zip(feature_cols, importances):
        print(f"{feature}: {importance:.5f}")

    # Save Model
    joblib.dump(model, MODEL_FILE)
    print(f"\n[SUCCESS] Model saved to '{MODEL_FILE}'")
    
    return model, feature_cols

if __name__ == "__main__":
    print("--- RECOVERY PERCENTAGE MODEL (REGRESSION) ---")
    
    data = load_and_preprocess_data(DATASET_PATH)

    if data is not None:
        train_model(data)
