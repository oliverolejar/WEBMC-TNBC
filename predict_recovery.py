import pandas as pd
import joblib
import os
import sys

# Configuration
MODEL_FILE = "recovery_model.joblib"
# PLACEHOLDER: Replace this with your actual competition file path
INPUT_FILE = "new_patient_data.csv" 
OUTPUT_FILE = "recovery_predictions.csv"

def batch_predict_recovery(input_path):
    """
    Reads a CSV file of RAW patient metrics (Healthy vs Injured).
    Calculates LSI internally.
    Predicts recovery percentage.
    """
    if not os.path.exists(MODEL_FILE):
        print(f"[ERROR] Model file '{MODEL_FILE}' not found. Please run 'train_recovery_model.py' first.")
        return

    if not os.path.exists(input_path):
        print(f"[ERROR] Input file '{input_path}' not found.")
        print("Please create this file with columns: Week_Post_Op, Healthy_ROM, Injured_ROM, ...")
        return

    print(f"Loading model from {MODEL_FILE}...")
    model = joblib.load(MODEL_FILE)
    
    print(f"Reading data from {input_path}...")
    df = pd.read_csv(input_path)
    
    # Check for required columns (Raw Inputs)
    required_raw_cols = [
        'Week_Post_Op', 
        'Healthy_ROM', 'Injured_ROM',
        'Healthy_Quad', 'Injured_Quad',
        'Healthy_Ham', 'Injured_Ham'
    ]
    
    missing = [c for c in required_raw_cols if c not in df.columns]
    if missing:
        print(f"[ERROR] Missing columns in CSV: {missing}")
        return

    # --- AUTOMATIC CALCULATION OF LSI (Feature Engineering) ---
    print("Calculating Symmetry Indices (Injured / Healthy)...")
    
    # Avoid division by zero
    df['Healthy_ROM'] = df['Healthy_ROM'].replace(0, 1)
    df['Healthy_Quad'] = df['Healthy_Quad'].replace(0, 1)
    df['Healthy_Ham'] = df['Healthy_Ham'].replace(0, 1)

    df['LSI_ROM'] = df['Injured_ROM'] / df['Healthy_ROM']
    df['LSI_Quad'] = df['Injured_Quad'] / df['Healthy_Quad']
    df['LSI_Hamstring'] = df['Injured_Ham'] / df['Healthy_Ham']

    # Select Features for Model
    X = df[['Week_Post_Op', 'LSI_ROM', 'LSI_Quad', 'LSI_Hamstring']]
    
    # Predict
    predictions = model.predict(X)
    
    # Clip predictions to 0-100 range
    predictions = predictions.clip(0, 100)
    
    # Add predictions back to the dataframe
    df['Predicted_Recovery_Percent'] = predictions.round(1)
    
    # Add status label
    def get_status(p):
        if p >= 90: return "Full Recovery"
        if p >= 70: return "Good Progress"
        if p >= 40: return "Moderate Deficit"
        return "Significant Deficit"

    df['Recovery_Status'] = df['Predicted_Recovery_Percent'].apply(get_status)

    # Save output (Include both Raw inputs and Calculated Predictions)
    output_cols = ['Patient_ID', 'Week_Post_Op', 'Predicted_Recovery_Percent', 'Recovery_Status']
    # If Patient_ID exists, include it, otherwise just use logical columns
    final_cols = [c for c in output_cols if c in df.columns]
    
    df.to_csv(OUTPUT_FILE, index=False)
    
    print("\n--- CLINICAL PREDICTION REPORT ---")
    
    if len(df) == 1:
        # SINGLE PATIENT MODE (Cleaner Output)
        row = df.iloc[0]
        print(f"Patient ID: {row.get('Patient_ID', 'N/A')}")
        print(f"Time Post-Op: {row['Week_Post_Op']} Weeks")
        print("-" * 30)
        print(f"ROM Symmetry:      {row['LSI_ROM']*100:.1f}%  (Injured: {row['Injured_ROM']}° / Healthy: {row['Healthy_ROM']}°)")
        print(f"Quad Symmetry:     {row['LSI_Quad']*100:.1f}%")
        print(f"Hamstring Symmetry: {row['LSI_Hamstring']*100:.1f}%")
        print("-" * 30)
        print(f"RECOVERY SCORE:    {row['Predicted_Recovery_Percent']}%")
        print(f"STATUS:            {row['Recovery_Status']}")
        print("-" * 30)
    else:
        # BATCH MODE (Table Output)
        print(df[final_cols])

    print(f"\nSaved detailed results to: {OUTPUT_FILE}")

if __name__ == "__main__":
    
    # Allow command line argument for file path
    file_path = INPUT_FILE
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
    batch_predict_recovery(file_path)
