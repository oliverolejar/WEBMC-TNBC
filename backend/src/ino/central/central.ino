#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

// Service/characteristic to receive data from peripheral IMU
const char* remoteDeviceServiceUuid               = "19b10000-e8f2-537e-4f6c-d104768a1214";
const char* remoteDeviceServiceCharacteristicUuid = "19b10001-e8f2-537e-4f6c-d104768a1214";

// Service/characteristic to send data to PC
const char* pcServiceUuid               = "19b10002-e8f2-537e-4f6c-d104768a1214";
const char* pcKneeAngleCharacteristicUuid = "19b10003-e8f2-537e-4f6c-d104768a1214";

struct IMUPacket {
  uint32_t t;
  float yaw;
  float pitch;
  float roll;
};

struct KneePacket {
  uint32_t t;
  float kneeAngle;
};

ReefwingAHRS ahrs;
SensorData data = {};
float gxOffset = 0.0f;
float gyOffset = 0.0f;
float gzOffset = 0.0f;
const int GYRO_CALIBRATION_SAMPLES = 500;
const float KNEE_EMA_ALPHA = 0.2f;

// PC Service
BLEService pcService(pcServiceUuid);
BLECharacteristic kneeAngleCharacteristic(
  pcKneeAngleCharacteristicUuid,
  BLERead | BLENotify,
  sizeof(KneePacket)
);

void calibrateGyro() {
  float gx = 0.0f;
  float gy = 0.0f;
  float gz = 0.0f;
  int collected = 0;
  const unsigned long gyroWaitTimeoutMs = 3000;
  gxOffset = 0.0f;
  gyOffset = 0.0f;
  gzOffset = 0.0f;

  Serial.println("Calibrating gyro: keep central still...");
  for (int i = 0; i < GYRO_CALIBRATION_SAMPLES; i++) {
    unsigned long start = millis();
    while (!IMU.gyroscopeAvailable()) {
      if (millis() - start > gyroWaitTimeoutMs) {
        break;
      }
      delay(1);
    }
    if (!IMU.gyroscopeAvailable()) {
      continue;
    }
    IMU.readGyroscope(gx, gy, gz);
    gxOffset += gx;
    gyOffset += gy;
    gzOffset += gz;
    collected++;
    delay(5);
  }

  if (collected > 0) {
    gxOffset /= collected;
    gyOffset /= collected;
    gzOffset /= collected;
  }

  Serial.print("Gyro calibration samples: ");
  Serial.println(collected);
  Serial.println("Gyro calibration complete.");
}

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 5000) {}
  Serial.println("Setup started...");
  Serial.println("BOOT: central setup entered");

  if (!BLE.begin()) {
    Serial.println("* Starting Bluetooth® Low Energy module failed!");
    while (1);
  }
  Serial.println("BLE module started.");

  // Set name for central's peripheral role (for PC to connect)
  BLE.setLocalName("Nano 33 BLE (KneeAngle)");
  
  // Add service and characteristic for PC
  BLE.setAdvertisedService(pcService);
  pcService.addCharacteristic(kneeAngleCharacteristic);
  BLE.addService(pcService);
  KneePacket initPacket = {0, 0.0f};
  kneeAngleCharacteristic.writeValue((const uint8_t*)&initPacket, sizeof(KneePacket)); // initial value
  
  BLE.advertise();

  Serial.println("Arduino Nano 33 BLE (Central Device)");
  Serial.println("Advertising to PC and ready to scan for peripherals...");
  Serial.println();

  Serial.println("IMU starting...");
  if ( ! IMU.begin() ){
    Serial.println("IMU failed to start!");
    while (1);
  }
  Serial.println("IMU started successfully.");
  calibrateGyro();

  ahrs.begin();
  ahrs.setDOF(DOF::DOF_6);
  ahrs.setFusionAlgorithm(SensorFusion::MADGWICK);
  ahrs.setBeta(0.01f);
  
  Serial.println("Setup complete.");
}

void loop() {
  connectToPeripheral(); // Re-enabled for central->peripheral connection testing

  // Test code: send local pitch angle to PC
  BLE.poll(); // Poll for BLE events

  if (IMU.gyroscopeAvailable() && IMU.accelerationAvailable() /* && IMU.magneticFieldAvailable() */ ) {
    IMU.readGyroscope(data.gx, data.gy, data.gz);
    data.gx -= gxOffset;
    data.gy -= gyOffset;
    data.gz -= gzOffset;
    IMU.readAcceleration(data.ax, data.ay, data.az);
    // IMU.readMagneticField(data.mx, data.my, data.mz);

    ahrs.setData(data);
    ahrs.update();
    
    float pitch = ahrs.angles.pitch;
    KneePacket packet = {millis(), pitch};
    kneeAngleCharacteristic.writeValue((const uint8_t*)&packet, sizeof(KneePacket));

    // Optional: print to serial for debugging
    Serial.print("Sent Pitch: ");
    Serial.println(pitch, 6);
  }

  delay(100); // Send data roughly 10 times per second
}

void connectToPeripheral() {
  BLEDevice peripheral;

  Serial.println("- Discovering peripheral device...");
  do {
    BLE.scanForUuid(remoteDeviceServiceUuid);
    peripheral = BLE.available();
  } while (!peripheral);

  BLE.stopScan();

  Serial.println("* Peripheral device found!");
  Serial.print("* Device MAC address: ");
  Serial.println(peripheral.address());

  controlPeripheral(peripheral);
}

void controlPeripheral(BLEDevice peripheral) {
  Serial.println("- Connecting to peripheral device...");

  if (peripheral.connect()) {
    Serial.println("* Connected to peripheral device!");
    Serial.println();
  } else {
    Serial.println("* Connection to peripheral device failed!");
    return;
  }

  if (!peripheral.discoverAttributes()) {
    Serial.println("* Peripheral device attributes discovery failed!");
    peripheral.disconnect();
    return;
  }

  BLECharacteristic imuCharacteristic =
    peripheral.characteristic(remoteDeviceServiceCharacteristicUuid);

  if (!imuCharacteristic) {
    Serial.println("* Peripheral does not have expected IMU characteristic!");
    peripheral.disconnect();
    return;
  }

  if (imuCharacteristic.canSubscribe()) {
    bool subscribed = imuCharacteristic.subscribe();
    if (subscribed) {
      Serial.println("* Subscribed to IMU characteristic notifications.");
    } else {
      Serial.println("* Failed to subscribe to IMU characteristic notifications.");
    }
  } else {
    Serial.println("* IMU characteristic does not support notifications.");
  }
  
  float lastPitchA = 0.0f;
  float lastKneeAngle = 0.0f;
  bool hasFilteredKnee = false;
  float filteredKneeAngle = 0.0f;
  unsigned long packetsReceived = 0;
  unsigned long lastPacketMs = 0;
  unsigned long lastDebugMs = 0;

  while (peripheral.connected()) {
    // Poll for BLE events from both peripheral and central (PC) connections
    BLE.poll();

    // ---- A: local IMU on central ----
    if (IMU.gyroscopeAvailable() && IMU.accelerationAvailable() /* && IMU.magneticFieldAvailable() */ ) {
      IMU.readGyroscope(data.gx, data.gy, data.gz);
      data.gx -= gxOffset;
      data.gy -= gyOffset;
      data.gz -= gzOffset;
      IMU.readAcceleration(data.ax, data.ay, data.az);
      // IMU.readMagneticField(data.mx, data.my, data.mz);

      ahrs.setData(data);
      ahrs.update();
      
      lastPitchA = ahrs.angles.pitch; // store latest pitch
    }

    // ---- B: IMUPacket from peripheral over BLE ----
    if (imuCharacteristic.valueUpdated()) {
      IMUPacket packetB;
      int bytesRead = imuCharacteristic.readValue((uint8_t*)&packetB, sizeof(IMUPacket));

      if (bytesRead == sizeof(IMUPacket)) {
        
        // ---- Knee ROM: A - B on pitch ----
        float kneeAngle = lastPitchA - packetB.pitch;
        if (!hasFilteredKnee) {
          filteredKneeAngle = kneeAngle;
          hasFilteredKnee = true;
        } else {
          filteredKneeAngle =
            (1.0f - KNEE_EMA_ALPHA) * filteredKneeAngle + KNEE_EMA_ALPHA * kneeAngle;
        }
        lastKneeAngle = filteredKneeAngle;
        packetsReceived++;
        lastPacketMs = millis();

        // Send timestamp + knee angle to the connected PC
        KneePacket packetOut = {millis(), filteredKneeAngle};
        kneeAngleCharacteristic.writeValue((const uint8_t*)&packetOut, sizeof(KneePacket));

        // Optional: print to serial for debugging
        Serial.print("Knee Angle: ");
        Serial.println(filteredKneeAngle, 6);
      }
    }

    unsigned long now = millis();
    if (now - lastDebugMs >= 1000) {
      Serial.print("debug packets=");
      Serial.print(packetsReceived);
      Serial.print(" last_packet_ms_ago=");
      if (lastPacketMs == 0) {
        Serial.print(-1);
      } else {
        Serial.print(now - lastPacketMs);
      }
      Serial.print(" last_knee=");
      Serial.println(lastKneeAngle, 6);
      lastDebugMs = now;
    }
  }

  Serial.println("- Peripheral device disconnected!");
}
