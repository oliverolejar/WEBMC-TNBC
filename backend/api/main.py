import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.api.services.imu_stream import ImuStreamService
from datetime import datetime
from pathlib import Path
import csv
import asyncio
import struct
from bleak import BleakClient, BleakScanner

app = FastAPI()
imu_service = ImuStreamService()

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
    allow_headers=["*"]
)

KNEE_ANGLE_SERVICE_UUID = "19b10002-e8f2-537e-4f6c-d104768a1214"
KNEE_ANGLE_CHAR_UUID = "19b10003-e8f2-537e-4f6c-d104768a1214"

@app.get("/health")
def health():
    return {
        "status": "ok",
        "device_connected": imu_service.device_connected,
        "recording": imu_service.recording,
    }

@app.get("/knee-angle/latest")
def knee_angle_latest():
    return imu_service.latest_dict()

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
        writer.writerow(["timestamp", "knee_angle_deg"])
        for sample in rows:
            writer.writerow([sample.timestamp, sample.knee_angle_deg])

    return {"saved_to": str(output_path), "rows": len(rows)}

def notification_handler(sender, data):
    knee_angle = struct.unpack("<f", data)[0]
    imu_service.ingest_sample(knee_angle)

async def ble_loop():
    while True:
        try:
            def match_uuid(device, adv_data):
                return KNEE_ANGLE_SERVICE_UUID.lower() in adv_data.service_uuids

            device = await BleakScanner.find_device_by_filter(match_uuid, timeout=10.0)

            if device is None:
                imu_service.set_connected(False)
                await asyncio.sleep(2)
                continue

            async with BleakClient(device) as client:
                imu_service.set_connected(True)
                await client.start_notify(KNEE_ANGLE_CHAR_UUID, notification_handler)

                while client.is_connected:
                    await asyncio.sleep(1)

        except Exception as e:
            print(f"BLE loop error: {e}")
        finally:
            imu_service.set_connected(False)
            await asyncio.sleep(2)

@app.on_event("startup")
async def on_startup():
    global ble_task
    ble_task = asyncio.create_task(ble_loop())


@app.on_event("shutdown")
async def on_shutdown():
    global ble_task
    if ble_task:
        ble_task.cancel()
        try:
            await ble_task
        except asyncio.CancelledError:
            pass

@app.websocket("/ws/knee-angle")
async def knee_angle_ws(websocket: WebSocket):
    await websocket.accept()
    last_timestamp = None

    try:
        while True:
            payload = imu_service.latest_dict()

            # only send when a new sample arrives
            if payload["timestamp"] and payload["timestamp"] != last_timestamp:
                await websocket.send_json(payload)
                last_timestamp = payload["timestamp"]

            await asyncio.sleep(0.05)  # ~20 Hz check loop

    except WebSocketDisconnect:
        pass
