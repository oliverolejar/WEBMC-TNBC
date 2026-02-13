import pandas as pd
import numpy as np

# Configuration
NUM_PATIENTS = 200
WEEKS = 25  # 0 to 24 weeks

OUTPUT_FILE = "synthetic_biofeedback_data.csv"

def generate_recovery_curve(patient_id):
    """
    Generates 25 weeks of data for a single patient.
    """
    speed_factor = np.random.uniform(0.8, 1.2)
    final_outcome = np.random.choice([1, 0.8], p=[0.85, 0.15]) # Most recover to 100%, some stall at 80%

    weeks = np.arange(WEEKS)
    data = []

    # HEALTHY BASELINES
    # User specified: Seated Leg Extension -> 180 degrees is full extension (Healthy)
    healthy_rom = np.random.normal(180, 2) # Low variance, it's a mechanical limit
    healthy_quad = np.random.normal(1.0, 0.1)
    healthy_ham = np.random.normal(0.6, 0.05)

    for week in weeks:
        # --- 1. Range of Motion (ROM) Curve ---
        t_rom = min(week / (12 * speed_factor), 1.0)
        current_rom_sym = 0.50 + (final_outcome - 0.50) * (t_rom ** 0.5) 
        
        # --- 2. EMG Strength Curve ---
        t_emg = min(week / (24 * speed_factor), 1.0)
        current_emg_sym = 0.30 + (final_outcome - 0.30) * t_emg

        # --- 3. Add Noise ---
        noise = np.random.uniform(0.97, 1.03) # Less noise for cleaner regression training
        
        injured_rom = healthy_rom * current_rom_sym * noise
        injured_quad = healthy_quad * current_emg_sym * noise
        injured_ham = healthy_ham * current_emg_sym * noise 

        # --- 4. CALCULATE RECOVERY PERCENTAGE (TARGET) ---
        # Weighted Average: ROM (50%), Quad (30%), Hamstring (20%)
        # This is the "Ground Truth" the doctor would assess.
        
        actual_rom_sym = injured_rom / healthy_rom
        actual_quad_sym = injured_quad / healthy_quad
        actual_ham_sym = injured_ham / healthy_ham
        
        # Clip symmetries at 1.0 (100%) so "super-human" recovery doesn't skew score > 100
        score = (0.5 * min(actual_rom_sym, 1.0)) + \
                (0.3 * min(actual_quad_sym, 1.0)) + \
                (0.2 * min(actual_ham_sym, 1.0))
        
        recovery_percentage = score * 100
        
        data.append({
            'Patient_ID': patient_id,
            'Week_Post_Op': week,
            'Healthy_Knee_ROM': round(healthy_rom, 2),
            'Injured_Knee_ROM': round(injured_rom, 2),
            'Healthy_Quad_EMG_Peak': round(healthy_quad, 2),
            'Injured_Quad_EMG_Peak': round(injured_quad, 2),
            'Healthy_Hamstr_EMG_Peak': round(healthy_ham, 2),
            'Injured_Hamstr_EMG_Peak': round(injured_ham, 2),
            'Recovery_Percentage': round(recovery_percentage, 1) # <--- NEW TARGET
        })

    return data

def generate_dataset():
    all_data = []
    print(f"Generating {WEEKS} weeks of data for {NUM_PATIENTS} patients...")
    
    for p_id in range(1, NUM_PATIENTS + 1):
        patient_history = generate_recovery_curve(p_id)
        all_data.extend(patient_history)

    df = pd.DataFrame(all_data)
    df.to_csv(OUTPUT_FILE, index=False)
    
    print(f"Successfully saved {len(df)} rows to {OUTPUT_FILE}")
    print("Sample Data:")
    print(df[['Week_Post_Op', 'Recovery_Percentage']].head())

if __name__ == "__main__":
    generate_dataset()
