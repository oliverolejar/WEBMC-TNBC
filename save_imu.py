import asyncio
from bleak import BleakClient
import pandas as pd
import struct
from datetime import datetime

# UUIDs from the Arduino sketch
KNEE_ANGLE_SERVICE_UUID = "19b10002-e8f2-537e-4f6c-d104768a1214"
KNEE_ANGLE_CHAR_UUID = "19b10003-e8f2-537e-4f6c-d104768a1214"

# DataFrame to store data
df = pd.DataFrame(columns=["Timestamp", "Knee Angle (degrees)"])

def notification_handler(sender, data):
    """Handles incoming data from the BLE characteristic."""
    global df
    # The data is a float (4 bytes)
    knee_angle = struct.unpack('<f', data)[0]
    timestamp = datetime.now()
    
    new_row = pd.DataFrame({"Timestamp": [timestamp], "Knee Angle (degrees)": [knee_angle]})
    df = pd.concat([df, new_row], ignore_index=True)
    
    print(f"[{timestamp}] Knee Angle: {knee_angle:.2f} degrees")

async def main():
    """Main function to connect and receive data."""
    print("Scanning for device...")
    
    client = BleakClient(KNEE_ANGLE_SERVICE_UUID)

    try:
        await client.connect()
        print(f"Connected to {client.address}")

        print("Starting notifications...")
        await client.start_notify(KNEE_ANGLE_CHAR_UUID, notification_handler)
        
        print("Receiving data... Press Ctrl+C to stop and save.")
        while True:
            await asyncio.sleep(1)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if client.is_connected:
            await client.disconnect()
        print("Disconnected.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(main())
    except KeyboardInterrupt:
        print("\nStopping and saving data to out.csv...")
        df.to_csv('out.csv', index=False)
        print("Data saved.")
