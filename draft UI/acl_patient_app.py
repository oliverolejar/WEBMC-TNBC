import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import time
from datetime import datetime
import os
import pickle

# ==================== PAGE CONFIG ====================
st.set_page_config(
    page_title="ACL Recovery",
    page_icon="🦵",
    layout="wide",
)

# ==================== UI THEME (APPLE-LIKE) ====================
def inject_apple_css():
    st.markdown(
        """
        <style>
        html, body, [class*="css"]  {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
                         "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .stApp { background: #f5f5f7; color: #1d1d1f; }
        .block-container { padding-top: 0.8rem; padding-bottom: 2.5rem; max-width: 1200px; }

        /* Hide Streamlit chrome */
        #MainMenu, header, footer { visibility: hidden; }
        section[data-testid="stSidebar"] { display: none; }

        /* Top "nav" feel: make tabs look like Apple's top bar links */
        div[data-testid="stTabs"] { margin-top: 0.2rem; }
        div[data-testid="stTabs"] > div[role="tablist"]{
            border-bottom: 1px solid rgba(0,0,0,0.08);
            padding-bottom: 6px;
            gap: 18px;
        }
        button[role="tab"]{
            border: none !important;
            background: transparent !important;
            color: rgba(29,29,31,0.88) !important;
            font-size: 14px !important;
            padding: 10px 2px !important;
            margin-right: 0px !important;
            border-radius: 0px !important;
        }
        button[role="tab"]:hover{ color: rgba(29,29,31,1.0) !important; }
        button[role="tab"][aria-selected="true"]{
            color: rgba(29,29,31,1.0) !important;
            box-shadow: none !important;
        }
        button[role="tab"][aria-selected="true"]::after{
            content: "";
            display: block;
            height: 2px;
            margin-top: 6px;
            background: rgba(29,29,31,1.0);
            border-radius: 2px;
        }

        /* Hero */
        .hero {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 18px;
            padding: 6px 2px 10px 2px;
        }
        .hero-kicker {
            font-size: 13px;
            font-weight: 600;
            color: rgba(29,29,31,0.70);
            letter-spacing: 0.2px;
        }
        .hero-title {
            font-size: 40px;
            line-height: 1.08;
            font-weight: 800;
            margin-top: 6px;
            letter-spacing: -0.02em;
        }
        .hero-sub {
            font-size: 14px;
            line-height: 1.45;
            color: rgba(29,29,31,0.70);
            max-width: 520px;
            text-align: right;
        }

        /* Cards + hover lift */
        .apple-card {
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(0,0,0,0.06);
            border-radius: 18px;
            padding: 18px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.06);
            transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }
        .apple-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 18px 42px rgba(0,0,0,0.10);
            border-color: rgba(0,0,0,0.10);
        }

        .apple-card-sm {
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(0,0,0,0.06);
            border-radius: 16px;
            padding: 14px;
            box-shadow: 0 8px 22px rgba(0,0,0,0.06);
            transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }
        .apple-card-sm:hover {
            transform: translateY(-4px);
            box-shadow: 0 14px 30px rgba(0,0,0,0.10);
            border-color: rgba(0,0,0,0.10);
        }

        /* Buttons */
        .stButton > button {
            border-radius: 14px !important;
            padding: 0.62rem 0.95rem !important;
            border: 1px solid rgba(0,0,0,0.10) !important;
            background: #ffffff !important;
            color: #1d1d1f !important;
            transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
            box-shadow: 0 6px 18px rgba(0,0,0,0.06);
        }
        .stButton > button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 28px rgba(0,0,0,0.10);
            background: #fafafa !important;
        }

        input, textarea { border-radius: 14px !important; }
        div[data-baseweb="select"] > div { border-radius: 14px !important; }

        div[data-testid="stPlotlyChart"] > div {
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.06);
            box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }
        </style>
        """,
        unsafe_allow_html=True
    )

def card_open(cls="apple-card"):
    st.markdown(f'<div class="{cls}">', unsafe_allow_html=True)

def card_close():
    st.markdown("</div>", unsafe_allow_html=True)

def hero_header():
    st.markdown(
        """
        <div class="hero">
            <div class="hero-left">
                <div class="hero-kicker">ACL Recovery</div>
                <div class="hero-title">My Recovery</div>
            </div>
            <div class="hero-right">
                <div class="hero-sub">
                    Track your knee range of motion (ROM) and muscle activation to see your progress over time.
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )

inject_apple_css()
hero_header()

# ==================== FILE PATHS ====================
DATA_FILE = "acl_recovery_data.csv"     # session summaries
MODEL_FILE = "acl_model.pkl"
SCALER_FILE = "scaler.pkl"

# ==================== SESSION STATE ====================
def init_session_state():
    defaults = {
        "calibrated": False,
        "rom_baseline": 0.0,
        "emg_baseline": 0.0,
        "monitoring": False,
        "rom_data": [],
        "emg_data": [],
        "timestamps": [],
        "current_patient_id": "",
        "age": 30,
        "days_post_surgery": 30,
        "prediction": None,
        "last_session_saved": False,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

init_session_state()

# ==================== SENSOR INTERFACE ====================
class SensorInterface:
    """
    Replace these methods with your real sensor code.
    - ROM can be computed from IMU (accel/gyro/mag + sensor fusion) upstream,
      or you can feed a precomputed knee angle here.
    - EMG should be processed into an envelope for "activation" (bandpass, rectify, smooth).
    """
    def connect_sensors(self) -> bool:
        return True  # simulated success

    def read_rom(self) -> float:
        return float(np.random.uniform(30, 120))  # degrees (simulated)

    def read_emg(self) -> float:
        return float(np.random.uniform(50, 800))  # microvolts (simulated)

    def disconnect(self):
        pass

sensors = SensorInterface()

# ==================== DATA HELPERS ====================
def load_sessions() -> pd.DataFrame:
    if os.path.exists(DATA_FILE):
        return pd.read_csv(DATA_FILE)
    return pd.DataFrame()

def save_session_row(row: dict) -> None:
    df = pd.DataFrame([row])
    if os.path.exists(DATA_FILE):
        df.to_csv(DATA_FILE, mode="a", header=False, index=False)
    else:
        df.to_csv(DATA_FILE, index=False)

def load_model():
    if os.path.exists(MODEL_FILE) and os.path.exists(SCALER_FILE):
        with open(MODEL_FILE, "rb") as f:
            model = pickle.load(f)
        with open(SCALER_FILE, "rb") as f:
            scaler = pickle.load(f)
        return model, scaler
    return None, None

def predict_recovery_weeks(age: int, days_post_surgery: int, rom_readings: list, emg_readings: list):
    model, scaler = load_model()
    if model is None or scaler is None:
        return None, "No trained model is available yet."
    if len(rom_readings) < 10 or len(emg_readings) < 10:
        return None, "Need a bit more data (keep recording for a few more seconds)."

    features = {
        "age": age,
        "days_post_surgery": days_post_surgery,
        "avg_rom": float(np.mean(rom_readings)),
        "std_rom": float(np.std(rom_readings)),
        "max_rom": float(np.max(rom_readings)),
        "min_rom": float(np.min(rom_readings)),
        "avg_emg": float(np.mean(emg_readings)),
        "std_emg": float(np.std(emg_readings)),
        "max_emg": float(np.max(emg_readings)),
        "min_emg": float(np.min(emg_readings)),
    }
    X = pd.DataFrame([features])
    Xs = scaler.transform(X)
    pred = float(model.predict(Xs)[0])
    return pred, None

# ==================== VISUALS ====================
def create_realtime_chart(rom_data, emg_data, timestamps):
    fig = make_subplots(
        rows=2, cols=1,
        subplot_titles=("Range of Motion (ROM)", "Quadriceps Activation (EMG)"),
        vertical_spacing=0.14
    )
    fig.add_trace(go.Scatter(x=timestamps, y=rom_data, mode="lines", name="ROM"), row=1, col=1)
    fig.add_trace(go.Scatter(x=timestamps, y=emg_data, mode="lines", name="EMG"), row=2, col=1)

    fig.update_xaxes(title_text="Time (s)", row=2, col=1)
    fig.update_yaxes(title_text="Degrees", row=1, col=1)
    fig.update_yaxes(title_text="μV (relative)", row=2, col=1)
    fig.update_layout(height=520, showlegend=False, hovermode="x unified")
    return fig

def create_progress_chart(df_patient):
    fig = make_subplots(
        rows=2, cols=1,
        subplot_titles=("ROM Progress (average per session)", "Quad Activation (average per session)"),
        vertical_spacing=0.14
    )
    dates = pd.to_datetime(df_patient["timestamp"])

    fig.add_trace(go.Scatter(x=dates, y=df_patient["avg_rom"], mode="lines+markers", name="ROM"), row=1, col=1)
    fig.add_trace(go.Scatter(x=dates, y=df_patient["avg_emg"], mode="lines+markers", name="EMG"), row=2, col=1)

    fig.update_xaxes(title_text="Date", row=2, col=1)
    fig.update_yaxes(title_text="Degrees", row=1, col=1)
    fig.update_yaxes(title_text="μV (relative)", row=2, col=1)
    fig.update_layout(height=520, showlegend=False)
    return fig

# ==================== PATIENT TOP NAV (TABS) ====================
tabs = st.tabs(["Home", "Calibration", "Live Session", "Progress", "Help"])

# ==================== HOME ====================
with tabs[0]:
    card_open("apple-card")
    st.subheader("Welcome")
    st.write(
        "This app helps you track your knee recovery using **range of motion (ROM)** and **muscle activation (EMG)**. "
        "You’ll do a quick calibration, record a short session, and then view progress over time."
    )
    st.caption("This is a prototype for educational purposes. It does not replace medical advice.")
    card_close()

    st.markdown("")

    card_open("apple-card")
    col1, col2, col3, col4 = st.columns(4)

    sessions = load_sessions()
    pid = st.session_state.current_patient_id.strip()

    with col1:
        st.metric("Sensors", "Ready" if st.session_state.calibrated else "Not connected")

    with col2:
        if pid and not sessions.empty and "patient_id" in sessions.columns:
            n = int((sessions["patient_id"] == pid).sum())
        else:
            n = 0
        st.metric("My sessions", n)

    with col3:
        if pid and not sessions.empty and "patient_id" in sessions.columns and n > 0:
            last = sessions[sessions["patient_id"] == pid].iloc[-1]
            st.metric("Last ROM avg", f"{float(last['avg_rom']):.1f}°")
        else:
            st.metric("Last ROM avg", "—")

    with col4:
        model, scaler = load_model()
        st.metric("Prediction", "Available" if model else "Not available")

    st.markdown("")
    st.info("Next step: go to **Calibration** to connect sensors and set your baseline.")
    card_close()

# ==================== CALIBRATION ====================
with tabs[1]:
    st.subheader("Calibration")

    card_open("apple-card")
    st.write(
        "Calibration helps the app understand your **baseline** readings. "
        "Do this while sitting comfortably."
    )
    st.markdown(
        "- **Step 1:** Connect sensors\n"
        "- **Step 2:** Relax your leg for baseline\n"
        "- **Step 3:** (Optional) Record a short calibration movement"
    )
    card_close()

    st.markdown("")

    colA, colB = st.columns([1, 1])
    with colA:
        card_open("apple-card-sm")
        if st.button("Connect sensors", use_container_width=True):
            with st.spinner("Connecting…"):
                ok = sensors.connect_sensors()
                st.session_state.calibrated = bool(ok)
                if ok:
                    st.success("Connected.")
                else:
                    st.error("Could not connect. Check cables / Bluetooth.")
        card_close()

    with colB:
        card_open("apple-card-sm")
        if st.button("Calibrate baseline (relax)", use_container_width=True, disabled=not st.session_state.calibrated):
            with st.spinner("Calibrating… stay still and relaxed"):
                time.sleep(1.2)
                rom_samples = [sensors.read_rom() for _ in range(12)]
                emg_samples = [sensors.read_emg() for _ in range(12)]
                st.session_state.rom_baseline = float(np.mean(rom_samples))
                st.session_state.emg_baseline = float(np.mean(emg_samples))
                st.success(f"Baseline set • ROM {st.session_state.rom_baseline:.1f}° • EMG {st.session_state.emg_baseline:.1f}")
        card_close()

    st.markdown("")

    card_open("apple-card")
    st.subheader("Your info")
    c1, c2, c3 = st.columns(3)
    with c1:
        st.session_state.current_patient_id = st.text_input("Your ID (or initials)", value=st.session_state.current_patient_id, placeholder="e.g., A1")
    with c2:
        st.session_state.age = st.number_input("Age", min_value=10, max_value=100, value=int(st.session_state.age))
    with c3:
        st.session_state.days_post_surgery = st.number_input("Days since surgery (or injury)", min_value=0, max_value=3650, value=int(st.session_state.days_post_surgery))

    st.caption("Your ID is only used to group your sessions on this device (prototype storage).")
    card_close()

# ==================== LIVE SESSION ====================
with tabs[2]:
    st.subheader("Live Session")

    card_open("apple-card")
    st.write(
        "Record a short session (example: **30 seconds**) while doing your rehab movement. "
        "You’ll see ROM and EMG update live."
    )
    st.caption("Tip: If your ‘movement’ is knee extensions, stay seated so walking/standing doesn’t confuse the recording.")
    card_close()

    st.markdown("")

    col1, col2, col3 = st.columns([1, 1, 1])
    with col1:
        duration = st.number_input("Session duration (seconds)", min_value=10, max_value=180, value=30)
    with col2:
        sample_hz = st.selectbox("Sampling rate", [5, 10, 20], index=1)
    with col3:
        show_prediction = st.checkbox("Show prediction (if available)", value=True)

    st.markdown("")

    colS, colT = st.columns([1, 1])
    with colS:
        if st.button("Start session", use_container_width=True, disabled=not st.session_state.calibrated):
            st.session_state.monitoring = True
            st.session_state.last_session_saved = False
            st.session_state.rom_data = []
            st.session_state.emg_data = []
            st.session_state.timestamps = []
    with colT:
        if st.button("Stop", use_container_width=True):
            st.session_state.monitoring = False

    if st.session_state.monitoring:
        chart_placeholder = st.empty()
        metrics_placeholder = st.empty()
        prediction_placeholder = st.empty()
        progress_bar = st.progress(0.0)

        start = time.time()
        dt = 1.0 / float(sample_hz)

        while st.session_state.monitoring:
            t = time.time() - start
            if t > float(duration):
                st.session_state.monitoring = False
                break

            rom = sensors.read_rom()
            emg = sensors.read_emg()

            st.session_state.rom_data.append(float(rom))
            st.session_state.emg_data.append(float(emg))
            st.session_state.timestamps.append(float(t))

            if len(st.session_state.timestamps) % max(1, int(sample_hz / 2)) == 0:
                fig = create_realtime_chart(st.session_state.rom_data, st.session_state.emg_data, st.session_state.timestamps)
                chart_placeholder.plotly_chart(fig, use_container_width=True)

                with metrics_placeholder.container():
                    a, b, c, d = st.columns(4)
                    with a:
                        st.metric("ROM now", f"{rom:.1f}°")
                    with b:
                        st.metric("EMG now", f"{emg:.1f}")
                    with c:
                        st.metric("ROM avg", f"{np.mean(st.session_state.rom_data):.1f}°")
                    with d:
                        st.metric("EMG avg", f"{np.mean(st.session_state.emg_data):.1f}")

                if show_prediction:
                    pred, err = predict_recovery_weeks(
                        int(st.session_state.age),
                        int(st.session_state.days_post_surgery),
                        st.session_state.rom_data,
                        st.session_state.emg_data,
                    )
                    with prediction_placeholder.container():
                        if pred is not None:
                            st.success(f"Estimated recovery time: **{pred:.1f} weeks**")
                        else:
                            st.info(err)

            progress_bar.progress(min(t / float(duration), 1.0))
            time.sleep(dt)

        progress_bar.progress(1.0)

    # Save session summary (only once after recording ends)
    if (not st.session_state.monitoring) and (len(st.session_state.rom_data) > 0) and (not st.session_state.last_session_saved):
        pid = st.session_state.current_patient_id.strip() or "UNKNOWN"
        row = {
            "patient_id": pid,
            "age": int(st.session_state.age),
            "days_post_surgery": int(st.session_state.days_post_surgery),
            "avg_rom": float(np.mean(st.session_state.rom_data)),
            "std_rom": float(np.std(st.session_state.rom_data)),
            "max_rom": float(np.max(st.session_state.rom_data)),
            "min_rom": float(np.min(st.session_state.rom_data)),
            "avg_emg": float(np.mean(st.session_state.emg_data)),
            "std_emg": float(np.std(st.session_state.emg_data)),
            "max_emg": float(np.max(st.session_state.emg_data)),
            "min_emg": float(np.min(st.session_state.emg_data)),
            "timestamp": datetime.now().isoformat(),
        }
        save_session_row(row)
        st.session_state.last_session_saved = True

        st.markdown("")
        card_open("apple-card")
        st.subheader("Session saved")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Avg ROM", f"{row['avg_rom']:.1f}°")
        c2.metric("Max ROM", f"{row['max_rom']:.1f}°")
        c3.metric("Avg EMG", f"{row['avg_emg']:.1f}")
        c4.metric("Duration", f"{len(st.session_state.timestamps)/max(1,float(sample_hz)):.0f}s")
        st.caption("You can view your trend in the Progress tab.")
        card_close()

# ==================== PROGRESS ====================
with tabs[3]:
    st.subheader("Progress")

    pid = st.session_state.current_patient_id.strip()
    sessions = load_sessions()

    if not pid:
        st.info("Add your ID in **Calibration** to view your saved sessions.")
    elif sessions.empty or "patient_id" not in sessions.columns:
        st.info("No saved sessions yet. Record a session in **Live Session**.")
    else:
        dfp = sessions[sessions["patient_id"] == pid].copy()
        if dfp.empty:
            st.info("No sessions found for your ID yet. Record a session in **Live Session**.")
        else:
            card_open("apple-card")
            col1, col2, col3 = st.columns(3)
            col1.metric("Sessions", len(dfp))
            col2.metric("ROM avg (latest)", f"{float(dfp.iloc[-1]['avg_rom']):.1f}°")
            col3.metric("EMG avg (latest)", f"{float(dfp.iloc[-1]['avg_emg']):.1f}")
            card_close()

            st.markdown("")
            fig = create_progress_chart(dfp)
            st.plotly_chart(fig, use_container_width=True)

            with st.expander("View session table"):
                st.dataframe(dfp.sort_values("timestamp", ascending=False), use_container_width=True)

# ==================== HELP ====================
with tabs[4]:
    st.subheader("Help")

    card_open("apple-card")
    st.write("**Common questions**")
    st.markdown(
        "- **What is ROM?** It’s how far your knee bends/straightens (measured in degrees).\n"
        "- **What is EMG?** It measures muscle activation (here, the quadriceps). It’s an indirect indicator of function.\n"
        "- **Why do calibration?** It sets a baseline so measurements are more consistent.\n"
        "- **Why might readings look odd?** Standing/walking can produce knee motion too—try recording while seated for knee extensions.\n"
    )
    st.write("**Privacy (prototype):** This app saves session summaries locally (CSV on the device running Streamlit).")
    card_close()

    st.markdown("")

    card_open("apple-card")
    st.write("**For developers (sensor hookup):** Replace `SensorInterface` methods with your IMU/EMG code.")
    st.caption("Your original project also includes a sensor integration guide if you need examples.")
    card_close()
