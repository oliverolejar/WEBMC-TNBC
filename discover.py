
import asyncio
from bleak import BleakScanner

async def main():
    print("Scanning for BLE devices for 5 seconds...")
    devices = await BleakScanner.discover()
    if not devices:
        print("No BLE devices found.")
    else:
        print("Found devices:")
        for device in devices:
            print(f"  - {device.name} ({device.address})")

if __name__ == "__main__":
    asyncio.run(main())
