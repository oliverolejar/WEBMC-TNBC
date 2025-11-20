#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

const char* deviceServiceUuid               = "19b10000-e8f2-537e-4f6c-d104768a1214";
const char* deviceServiceCharacteristicUuid = "19b10001-e8f2-537e-4f6c-d104768a1214";

struct IMUPacket {
  uint32_t t;
  float yaw;
  float pitch;
  float roll;
};

ReefwingAHRS ahrs;
SensorData data = {};

void setup() {
  Serial.begin(115200);
  while (!Serial);

  if (!BLE.begin()) {
    Serial.println("* Starting Bluetooth® Low Energy module failed!");
    while (1);
  }

  BLE.setLocalName("Nano 33 BLE (Central)");

  Serial.println("Arduino Nano 33 BLE (Central Device)");
  Serial.println("Ready to scan for peripherals...");
  Serial.println();

  if ( ! IMU.begin() ){
    while (1);
  }

  ahrs.begin();

/*
  Needed if we are using magnetometer (6 DOF vs 9 DOF)
*/
  ahrs.setDOF(DOF::DOF_9);


/*
  Needed for better data accuracy
  Algorithm choice will depend on type of motion
*/
  ahrs.setFusionAlgorithm(SensorFusion::MADGWICK);
  ahrs.setBeta(0.01f);                              // changes sensitivity to movement

/*
  Needed if using 9 DOF 
  This sets angle between magnetic north and true north @ our location

  ahrs.setDeclination()
*/
}

void loop() {
  connectToPeripheral();
}

void connectToPeripheral() {
  BLEDevice peripheral;

  Serial.println("- Discovering peripheral device...");

  do {
    BLE.scanForUuid(deviceServiceUuid);

    peripheral = BLE.available();

  } while (!peripheral);  

  Serial.println("* Peripheral device found!");
  Serial.print("* Device MAC address: ");
  Serial.println(peripheral.address());
  Serial.print("* Device name: ");
  Serial.println(peripheral.localName());
  Serial.print("* Advertised service UUID: ");
  Serial.println(peripheral.advertisedServiceUuid());
  Serial.println();

  BLE.stopScan();

  controlPeripheral(peripheral);
}

void controlPeripheral(BLEDevice peripheral) {
  Serial.println("- Connecting to peripheral device...");

  if (peripheral.connect()) {
    Serial.println("* Connected to peripheral device!");
    Serial.println();
  } else {
    Serial.println("* Connection to peripheral device failed!");
    Serial.println();
    return;
  }

  Serial.println("- Discovering peripheral device attributes...");
  if (peripheral.discoverAttributes()) {
    Serial.println("* Peripheral device attributes discovered!");
    Serial.println();
  } else {
    Serial.println("* Peripheral device attributes discovery failed!");
    Serial.println();
    peripheral.disconnect();
    return;
  }

  BLECharacteristic imuCharacteristic =
    peripheral.characteristic(deviceServiceCharacteristicUuid);

  if (!imuCharacteristic) {
    Serial.println("* Peripheral does not have expected IMU characteristic!");
    peripheral.disconnect();
    return;
  } else if (!imuCharacteristic.canRead() && !imuCharacteristic.canSubscribe()) {
    Serial.println("* IMU characteristic is not readable or subscribable!");
    peripheral.disconnect();
    return;
  }

  Serial.println("* IMU characteristic found!");
  Serial.println();

    if (imuCharacteristic.canSubscribe()) {
    imuCharacteristic.subscribe();
    Serial.println("* Subscribed to IMU characteristic notifications.");
    Serial.println();
  }
  
  // Put these at the TOP of controlPeripheral, before the while-loop:
  float lastYawA = 0.0f;
  float lastPitchA = 0.0f;
  float lastRollA = 0.0f;

  while (peripheral.connected()) {
    BLE.poll();

    // ---- A: local IMU on central ----
    uint32_t t = millis();

    if (IMU.gyroscopeAvailable() && IMU.accelerationAvailable() && IMU.magneticFieldAvailable()) {
      IMU.readGyroscope(data.gx, data.gy, data.gz);
      IMU.readAcceleration(data.ax, data.ay, data.az);
      IMU.readMagneticField(data.mx, data.my, data.mz);

      ahrs.setData(data);
      ahrs.update();

      float yawA   = ahrs.angles.yaw;
      float pitchA = ahrs.angles.pitch;
      float rollA  = ahrs.angles.roll;

      // store latest A values for later subtraction
      lastYawA   = yawA;
      lastPitchA = pitchA;
      lastRollA  = rollA;

      // print A IMU
      Serial.print("A,");
      Serial.print(t);
      Serial.print(",");
      Serial.print(yawA, 6);
      Serial.print(",");
      Serial.print(pitchA, 6);
      Serial.print(",");
      Serial.println(rollA, 6);
    }

    // ---- B: IMUPacket from peripheral over BLE ----
    if (imuCharacteristic.valueUpdated()) {          // new data from B?
      IMUPacket packetB;
      int bytesRead = imuCharacteristic.readValue(
        (uint8_t*)&packetB,
        sizeof(IMUPacket)
      );

      if (bytesRead == sizeof(IMUPacket)) {
        // print B IMU
        Serial.print("B,");
        Serial.print(packetB.t);
        Serial.print(",");
        Serial.print(packetB.yaw, 6);
        Serial.print(",");
        Serial.print(packetB.pitch, 6);
        Serial.print(",");
        Serial.println(packetB.roll, 6);

        // ---- Knee ROM: A - B on pitch ----
        float kneeAngle = lastPitchA - packetB.pitch;   // central (thigh) - peripheral (shank), for example

        Serial.print("KNEE,");
        Serial.println(kneeAngle, 6);
      }
    }
  }

  Serial.println("- Peripheral device disconnected!");
  Serial.println();
}