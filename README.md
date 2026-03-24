# MustangMotion

A wearable knee rehabilitation monitoring system for physiotherapists. MustangMotion tracks real-time knee angle and muscle activation (EMG) for both legs simultaneously, records sessions, and uses an unsupervised machine learning model to generate a Recovery Index — giving clinicians objective data to inform return-to-sport decisions.

---

## Demo

**Two Leg Dashboard Demo**

https://github.com/user-attachments/assets/73faa3f3-bd73-49c5-8bf9-3dbe64d406b0

**Single Leg Dashboard Demo**

https://github.com/user-attachments/assets/3da98cd1-636f-4654-8a9b-f96878a38f40

**GUI Up Close**

<video src="demo/GUI_TNBC.mp4" controls width="720"></video>

---

## System Architecture

```
Arduino Nanos (×4)
  └── BLE (Bleak)
        └── FastAPI Backend (Python)
              └── WebSocket
                    └── React Frontend (TypeScript)
```

Each leg uses two Arduino Nano 33 BLE boards:
- **Central** (femur/thigh) — IMU + 2× EMG (quadriceps and hamstring)
- **Peripheral** (tibia/lower leg) — IMU only

Knee angle is computed from the difference in roll between the two IMUs on the same leg. Both legs are streamed, displayed, and recorded simultaneously.

---

## Hardware Requirements

- 4× Arduino Nano 33 BLE
- EMG sensor modules (×2 per patient, connected to pins A0 and A3 on each Central)
- Custom PCBs and 3D printed TPU/PLA-CF cuff assembly

---

## Arduino Setup

### Required Libraries

Install the following libraries via the Arduino IDE Library Manager (`Sketch → Include Library → Manage Libraries`):

| Library | Purpose |
|---|---|
| `ArduinoBLE` | Bluetooth Low Energy communication |
| `Arduino_BMI270_BMM150` | IMU sensor driver |
| `ReefwingAHRS` | IMU sensor fusion (Mahony algorithm) |

### Flashing the Boards

There are two sketches — one for each role. Both are located in `backend/src/ino/`.

**Before flashing each board**, open the sketch and set the `LEG_SIDE` define at the top to match the leg it will be worn on:

```cpp
// Set to "R" for right leg, "L" for left leg before flashing
#define LEG_SIDE "R"
```

| Sketch | Board placement | File |
|---|---|---|
| `central.ino` | Femur (thigh) | `backend/src/ino/central/central.ino` |
| `peripheral.ino` | Tibia (lower leg) | `backend/src/ino/peripheral/peripheral.ino` |

Flash all four boards (2 central, 2 peripheral) with the correct `LEG_SIDE` before running the system. The backend discovers boards by their BLE advertised names, which are set automatically based on `LEG_SIDE` and the sketch role.

---

## Software Setup

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Clone the repository

```bash
git clone <repo-url>
cd WEBMC-TNBC
```

### 2. Backend

Create and activate a virtual environment, then install dependencies:

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

```bash
pip install -r requirements.txt
```

### 3. Frontend

```bash
cd frontend
npm install
```

---

## Running the System

Open two terminals from the project root.

**Terminal 1 — Backend**

```bash
python -m uvicorn backend.api.main:app --reload
```

The API will be available at `http://localhost:8000`.

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

> Make sure all four Arduino boards are powered on and advertising over BLE before starting the backend. The backend scans for and connects to them automatically on startup.

---

## Using the Dashboard

1. Navigate to `http://localhost:5173`
2. Select a patient from the **Select Patient** screen
3. The **Patient Dashboard** shows live knee angle and EMG for both legs side by side
4. Click **Calibrate** to zero the knee angle reference (stand with legs straight)
5. Click **Start Recording** to begin a session
6. Click **Stop Recording** to end the session — the data is saved and the ML model runs automatically, adding a new Recovery Index data point
7. Switch to **Recovery Outlook** to view the trend over time

---

## ML Pipeline

The machine learning pipeline lives in `backend/src/model/`. It can be run independently of the live system.

### Training

```bash
python -m backend.src.model.train
```

Trains an `IsolationForest` on synthetic recovery sessions and saves the model artifact to `backend/src/model/artifacts/isolation_forest_knee.joblib`.

### Inference

```bash
python -m backend.src.model.infer
```

Runs the model on all sessions in `data/sessions/` and outputs a Recovery Index (0–100%) per session.

### Generating Synthetic Data

```bash
python -m backend.src.model.synthetic
```

Generates synthetic injured/recovery sessions from healthy baseline CSVs for model training and evaluation.

---

## File Structure

```
WEBMC-TNBC/
├── README.md                        # This file
├── requirements.txt                 # Python dependencies
│
├── frontend/                        # React + TypeScript web app
│   ├── src/
│   │   ├── App.tsx                  # Routing (Home → SelectPatient → PatientDashboard)
│   │   ├── main.tsx                 # Entry point
│   │   ├── screens/
│   │   │   ├── Home.tsx             # Landing page
│   │   │   ├── SelectPatient.tsx    # Patient selection
│   │   │   └── PatientDashboard.tsx # Main clinician dashboard
│   │   └── components/
│   │       ├── KneeAngleViz.tsx     # Animated real-time knee angle diagram
│   │       ├── EMGChart.tsx         # Live EMG envelope time series chart
│   │       └── RecoveryOutlookChart.tsx  # Recovery Index trend over time
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── api/
│   │   ├── main.py                  # FastAPI app — BLE connections, WebSocket endpoints, REST API
│   │   └── services/
│   │       └── imu_stream.py        # IMU/EMG pairing service, recording buffer, calibration
│   └── src/
│       ├── ino/
│       │   ├── central/
│       │   │   └── central.ino      # Arduino sketch — femur board (IMU + EMG)
│       │   ├── peripheral/
│       │   │   └── peripheral.ino   # Arduino sketch — tibia board (IMU only)
│       └── model/
│           ├── config.py            # Shared paths and constants
│           ├── features.py          # Feature extraction from session CSVs (~35 features)
│           ├── train.py             # IsolationForest training script
│           ├── infer.py             # Inference — maps session to Recovery Index
│           ├── evaluate.py          # Evaluates model on synthetic recovery trajectories
│           ├── synthetic.py         # Synthetic session generator for training data
│           └── artifacts/
│               └── isolation_forest_knee.joblib  # Trained model artifact
│
└── data/
    ├── sessions/                    # Real recorded sessions (CSV), one file per session
    └── synthetic_sessions/          # Synthetically generated sessions for model training
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Device connection and calibration status |
| `GET` | `/knee-angle/latest` | Latest knee angle reading |
| `POST` | `/calibration/zero` | Zero the current pose as reference |
| `POST` | `/calibration/reset` | Clear calibration offsets |
| `POST` | `/session/start` | Begin recording a session |
| `POST` | `/session/stop` | Stop recording, save CSV, run inference |
| `GET` | `/recovery/history` | All Recovery Index scores over time |
| `WS` | `/ws/knee-angle` | Real-time knee angle stream |
| `WS` | `/ws/imu-raw` | Raw IMU event stream |
