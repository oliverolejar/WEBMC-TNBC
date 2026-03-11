import asyncio
import struct
import threading
import time
from collections import deque

from bleak import BleakClient, BleakScanner

RAW_SERVICE_UUID = "19b10010-e8f2-537e-4f6c-d104768a1214"
RAW_CHARACTERISTIC_UUID = "19b10011-e8f2-537e-4f6c-d104768a1214"

PACKET_FORMAT = "<IIfff"
PACKET_SIZE = struct.calcsize(PACKET_FORMAT)

_latest_lock = threading.Lock()
_history_lock = threading.Lock()

_stop_event = threading.Event()
_ble_thread = None
_history_start_time = None

_latest_data = {
    "device_timestamp_ms": None,
    "seq": None,
    "knee_angle_deg": 0.0,
    "quad_envelope": 0.0,
    "ham_envelope": 0.0,
    "device_connected": False,
    "last_packet_time": None,
}

_history = {
    "time_s": deque(maxlen=600),
    "knee_angle_deg": deque(maxlen=600),
    "quad_envelope": deque(maxlen=600),
    "ham_envelope": deque(maxlen=600),
}


def clamp(value, lo, hi):
    return max(lo, min(value, hi))


def map_to_percent(value, min_value, max_value):
    if max_value <= min_value:
        return 0.0
    pct = ((value - min_value) / (max_value - min_value)) * 100.0
    return clamp(pct, 0.0, 100.0)


def get_latest_data():
    with _latest_lock:
        return dict(_latest_data)


def get_history():
    with _history_lock:
        return {
            "time_s": list(_history["time_s"]),
            "knee_angle_deg": list(_history["knee_angle_deg"]),
            "quad_envelope": list(_history["quad_envelope"]),
            "ham_envelope": list(_history["ham_envelope"]),
        }


def _handle_notification(_, data: bytearray):
    global _history_start_time

    if len(data) < PACKET_SIZE:
        return

    device_timestamp_ms, seq, roll, quad_env, ham_env = struct.unpack(
        PACKET_FORMAT, data[:PACKET_SIZE]
    )

    now = time.time()

    with _latest_lock:
        _latest_data["device_timestamp_ms"] = device_timestamp_ms
        _latest_data["seq"] = seq
        _latest_data["knee_angle_deg"] = roll
        _latest_data["quad_envelope"] = quad_env
        _latest_data["ham_envelope"] = ham_env
        _latest_data["device_connected"] = True
        _latest_data["last_packet_time"] = now

    with _history_lock:
        if _history_start_time is None:
            _history_start_time = now

        t_rel = now - _history_start_time
        _history["time_s"].append(t_rel)
        _history["knee_angle_deg"].append(roll)
        _history["quad_envelope"].append(quad_env)
        _history["ham_envelope"].append(ham_env)


async def _find_device():
    devices = await BleakScanner.discover(timeout=5.0)

    for d in devices:
        name = d.name or ""
        if "CentralIMU" in name or "Nano 33 BLE" in name:
            return d

    for d in devices:
        uuids = d.metadata.get("uuids", []) if d.metadata else []
        uuids_lower = [u.lower() for u in uuids]
        if RAW_SERVICE_UUID.lower() in uuids_lower:
            return d

    return None


async def _ble_main():
    while not _stop_event.is_set():
        try:
            device = await _find_device()
            if device is None:
                with _latest_lock:
                    _latest_data["device_connected"] = False
                await asyncio.sleep(2.0)
                continue

            async with BleakClient(device.address) as client:
                with _latest_lock:
                    _latest_data["device_connected"] = True

                await client.start_notify(RAW_CHARACTERISTIC_UUID, _handle_notification)

                while client.is_connected and not _stop_event.is_set():
                    await asyncio.sleep(0.2)

                try:
                    await client.stop_notify(RAW_CHARACTERISTIC_UUID)
                except Exception:
                    pass

        except Exception as e:
            print(f"[imu_stream.py] BLE error: {e}")

        with _latest_lock:
            _latest_data["device_connected"] = False

        await asyncio.sleep(2.0)


def _thread_target():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_ble_main())
    finally:
        pending = asyncio.all_tasks(loop=loop)
        for task in pending:
            task.cancel()
        try:
            loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        except Exception:
            pass
        loop.close()


def start_ble():
    global _ble_thread
    if _ble_thread is not None and _ble_thread.is_alive():
        return

    _stop_event.clear()
    _ble_thread = threading.Thread(target=_thread_target, daemon=True)
    _ble_thread.start()


def stop_ble():
    _stop_event.set()