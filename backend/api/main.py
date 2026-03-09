import asyncio
import csv
from datetime import datetime
from pathlib import Path
import struct

import uvicorn
from bleak import BleakClient, BleakScanner
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.api.services.imu_stream import ImuStreamService

app = FastAPI()
imu_service = ImuStreamService(pair_window_ms=40)

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

RAW_IMU_SERVICE_UUID = "19b10010-e8f2-537e-4f6c-d104768a1214"
RAW_IMU_CHAR_UUID = "19b10011-e8f2-537e-4f6c-d104768a1214"

CENTRAL_PACKET_FORMAT = "<IIfff"
CENTRAL_PACKET_SIZE = struct.calcsize(CENTRAL_PACKET_FORMAT)

PERIPHERAL_PACKET_FORMAT = "<IIf"
PERIPHERAL_PACKET_SIZE = struct.calcsize(PERIPHERAL_PACKET_FORMAT)

CENTRAL_ROLE = "central"
PERIPHERAL_ROLE = "peripheral"
ROLE_TO_DEVICE_NAME = {
    CENTRAL_ROLE: "Nano 33 BLE (CentralIMU)",
    PERIPHERAL_ROLE: "Nano 33 BLE (PeripheralIMU)",
}

ble_tasks: list[asyncio.Task] = []


def _parse_raw_packet(role: str, data: bytes):
    if role == CENTRAL_ROLE:
        if len(data) < CENTRAL_PACKET_SIZE:
            return None
        return struct.unpack(CENTRAL_PACKET_FORMAT, data[:CENTRAL_PACKET_SIZE])

    if len(data) < PERIPHERAL_PACKET_SIZE:
        return None
    unpacked = struct.unpack(PERIPHERAL_PACKET_FORMAT, data[:PERIPHERAL_PACKET_SIZE])
    return (*unpacked, 0.0, 0.0)


def _make_notification_handler(role: str):
    def notification_handler(_sender, data: bytes):
        parsed = _parse_raw_packet(role, data)
        if parsed is None:
            return

        device_timestamp_ms, seq, roll_deg, emg_quad_percent, emg_ham_percent = parsed
        imu_service.ingest_raw_sample(
            role=role,
            device_timestamp_ms=device_timestamp_ms,
            seq=seq,
            roll_deg=roll_deg,
            emg_quad_percent=emg_quad_percent,
            emg_ham_percent=emg_ham_percent,
        )

    return notification_handler


def _device_matcher(target_name: str):
    target_service_uuid = RAW_IMU_SERVICE_UUID.lower()

    def matcher(device, adv_data):
        local_name = (adv_data.local_name or device.name or "").strip()
        advertised_uuids = [uuid.lower() for uuid in (adv_data.service_uuids or [])]
        return local_name == target_name and target_service_uuid in advertised_uuids

    return matcher


async def ble_role_loop(role: str, target_name: str):
    handler = _make_notification_handler(role)
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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "device_connected": imu_service.device_connected,
        "central_connected": imu_service.central_connected,
        "peripheral_connected": imu_service.peripheral_connected,
        "recording": imu_service.recording,
        "calibration_active": imu_service.calibration_active,
    }


@app.get("/knee-angle/latest")
def knee_angle_latest():
    return imu_service.latest_dict()


@app.post("/calibration/zero")
def calibration_zero():
    try:
        return imu_service.calibrate_current_pose()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/calibration/reset")
def calibration_reset():
    return imu_service.reset_calibration()


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
        writer.writerow(
            [
                "timestamp_utc",
                "central_roll_deg",
                "peripheral_roll_deg",
                "knee_angle_deg",
                "emg_quad_percent",
                "emg_ham_percent",
                "pair_dt_ms",
            ]
        )
        for sample in rows:
            writer.writerow(
                [
                    sample.timestamp_utc,
                    sample.central_roll_deg,
                    sample.peripheral_roll_deg,
                    sample.knee_angle_deg,
                    sample.emg_quad_percent,
                    sample.emg_ham_percent,
                    sample.pair_dt_ms,
                ]
            )

    return {"saved_to": str(output_path), "rows": len(rows)}


@app.on_event("startup")
async def on_startup():
    global ble_tasks
    ble_tasks = [
        asyncio.create_task(ble_role_loop(CENTRAL_ROLE, ROLE_TO_DEVICE_NAME[CENTRAL_ROLE])),
        asyncio.create_task(ble_role_loop(PERIPHERAL_ROLE, ROLE_TO_DEVICE_NAME[PERIPHERAL_ROLE])),
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