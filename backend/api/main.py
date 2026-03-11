import asyncio
import csv
from datetime import datetime
from pathlib import Path
import struct

import uvicorn
from bleak import BleakClient, BleakScanner
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.api.services.imu_stream import ImuStreamService

app = FastAPI()

# ── Leg config ────────────────────────────────────────────────────────────────
# Change to ["right", "left"] to enable both legs.
# With ["right"], left sensors are ignored and no errors are raised for them.
ENABLED_LEGS = ["right"]

imu_service = ImuStreamService(pair_window_ms=40, enabled_legs=ENABLED_LEGS)

origins = [
    "http://localhost:8000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── BLE / packet config ───────────────────────────────────────────────────────
RAW_IMU_SERVICE_UUID = "19b10010-e8f2-537e-4f6c-d104768a1214"
RAW_IMU_CHAR_UUID    = "19b10011-e8f2-537e-4f6c-d104768a1214"

# Payload: role_id(B) device_ts(I) seq(I) roll(f) emgQuad(f) emgHam(f)  →  21 bytes
RAW_PACKET_FORMAT = "<BIIfff"
RAW_PACKET_SIZE   = struct.calcsize(RAW_PACKET_FORMAT)

# Role registry: key → ble_name, expected role_id, leg, segment
ROLE_CONFIG: dict[str, dict] = {
    "right_upper": {"ble_name": "Nano33BLE-right_upper", "role_id": 1, "leg": "right", "segment": "upper"},
    "right_lower": {"ble_name": "Nano33BLE-right_lower", "role_id": 2, "leg": "right", "segment": "lower"},
    "left_upper":  {"ble_name": "Nano33BLE-left_upper",  "role_id": 3, "leg": "left",  "segment": "upper"},
    "left_lower":  {"ble_name": "Nano33BLE-left_lower",  "role_id": 4, "leg": "left",  "segment": "lower"},
}

ble_tasks: list[asyncio.Task] = []


# ── Helpers ───────────────────────────────────────────────────────────────────
def _make_notification_handler(role: str, expected_role_id: int):
    def notification_handler(_sender, data: bytes):
        if len(data) < RAW_PACKET_SIZE:
            print(f"[BLE] {role}: short packet ({len(data)} B), dropped")
            return

        role_id, device_ts, seq, roll, emg_quad, emg_ham = struct.unpack(
            RAW_PACKET_FORMAT, data[:RAW_PACKET_SIZE]
        )

        if role_id != expected_role_id:
            print(
                f"[ANTI-MIX] {role}: got role_id={role_id}, "
                f"expected {expected_role_id} — dropped"
            )
            return

        imu_service.ingest_raw_sample(
            role=role,
            device_timestamp_ms=device_ts,
            seq=seq,
            roll_deg=roll,
            emg_quad_pct=emg_quad,
            emg_ham_pct=emg_ham,
        )

    return notification_handler


def _device_matcher(target_name: str):
    target_service_uuid = RAW_IMU_SERVICE_UUID.lower()

    def matcher(device, adv_data):
        local_name = (adv_data.local_name or device.name or "").strip()
        advertised_uuids = [uuid.lower() for uuid in (adv_data.service_uuids or [])]
        return local_name == target_name and target_service_uuid in advertised_uuids

    return matcher


async def ble_role_loop(role: str, target_name: str, expected_role_id: int):
    handler = _make_notification_handler(role, expected_role_id)
    matcher = _device_matcher(target_name)

    while True:
        try:
            device = await BleakScanner.find_device_by_filter(matcher, timeout=10.0)
            if device is None:
                imu_service.set_connected(role, False)
                await asyncio.sleep(2)
                continue

            async with BleakClient(device) as client:
                imu_service.set_connected(role, True)
                await client.start_notify(RAW_IMU_CHAR_UUID, handler)

                while client.is_connected:
                    await asyncio.sleep(1)

        except Exception as exc:
            print(f"BLE loop error ({role}): {exc}")
        finally:
            imu_service.set_connected(role, False)
            await asyncio.sleep(2)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "device_connected": imu_service.device_connected,
        "enabled_legs": imu_service.enabled_legs,
        "right_available": imu_service.leg_available("right"),
        "left_available":  imu_service.leg_available("left"),
        "right_upper_connected": imu_service.connected_by_role["right_upper"],
        "right_lower_connected": imu_service.connected_by_role["right_lower"],
        "left_upper_connected":  imu_service.connected_by_role["left_upper"],
        "left_lower_connected":  imu_service.connected_by_role["left_lower"],
        "recording": imu_service.recording,
    }


@app.get("/knee-angle/latest")
def knee_angle_latest():
    return imu_service.latest_dict()


@app.get("/emg/latest")
def emg_latest():
    d = imu_service.latest_dict()
    return {
        "right_emg_quad_pct": d.get("right_emg_quad_pct"),
        "right_emg_ham_pct":  d.get("right_emg_ham_pct"),
        "left_emg_quad_pct":  d.get("left_emg_quad_pct"),
        "left_emg_ham_pct":   d.get("left_emg_ham_pct"),
    }


@app.post("/session/start")
def start_session():
    imu_service.start_recording()
    return {"message": "recording_started"}


@app.post("/session/stop")
def stop_session():
    rows = imu_service.stop_recording()

    output_dir = Path("data/sessions")
    output_dir.mkdir(parents=True, exist_ok=True)

    filename = f"session_{datetime.now().strftime('%Y-%m-%d_%H%M%S')}.csv"
    output_path = output_dir / filename

    with output_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp_utc",
            "leg",
            "upper_roll_deg",
            "lower_roll_deg",
            "knee_angle_deg",
            "emg_quad_pct",
            "emg_ham_pct",
            "pair_dt_ms",
        ])
        for sample in rows:
            writer.writerow([
                sample.timestamp_utc,
                sample.leg,
                sample.upper_roll_deg,
                sample.lower_roll_deg,
                sample.knee_angle_deg,
                sample.emg_quad_pct,
                sample.emg_ham_pct,
                sample.pair_dt_ms,
            ])

    return {"saved_to": str(output_path), "rows": len(rows)}


@app.post("/calibration/start")
def calibrate_all():
    return {"tared_roles": imu_service.tare_all()}


@app.on_event("startup")
async def on_startup():
    global ble_tasks
    # Only start tasks for roles belonging to enabled legs
    ble_tasks = [
        asyncio.create_task(
            ble_role_loop(role, cfg["ble_name"], cfg["role_id"])
        )
        for role, cfg in ROLE_CONFIG.items()
        if cfg["leg"] in ENABLED_LEGS
    ]


@app.on_event("shutdown")
async def on_shutdown():
    global ble_tasks
    for task in ble_tasks:
        task.cancel()
    for task in ble_tasks:
        try:
            await task
        except asyncio.CancelledError:
            pass


@app.websocket("/ws/knee-angle")
async def knee_angle_ws(websocket: WebSocket):
    await websocket.accept()
    last_payload = None

    try:
        while True:
            payload = imu_service.latest_dict()
            if payload != last_payload:
                await websocket.send_json(payload)
                last_payload = payload

            await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        pass


@app.websocket("/ws/imu-raw")
async def imu_raw_ws(websocket: WebSocket):
    await websocket.accept()
    last_event_id = 0

    try:
        while True:
            event = imu_service.latest_raw_event_dict()
            event_id = int(event.get("event_id", 0))
            if event_id > 0 and event_id != last_event_id:
                await websocket.send_json(event)
                last_event_id = event_id

            await asyncio.sleep(0.02)

    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=8000, reload=False)
