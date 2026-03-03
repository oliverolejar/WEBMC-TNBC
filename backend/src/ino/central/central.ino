#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

const char* rawServiceUuid = "19b10010-e8f2-537e-4f6c-d104768a1214";
const char* rawCharacteristicUuid = "19b10011-e8f2-537e-4f6c-d104768a1214";

struct RawImuPacket {
  uint32_t deviceTimestampMs;
  uint32_t seq;
  float yaw;
  float pitch;
  float roll;
};

BLEService rawService(rawServiceUuid);
BLECharacteristic rawCharacteristic(
  rawCharacteristicUuid,
  BLERead | BLENotify,
  sizeof(RawImuPacket)
);

ReefwingAHRS ahrs;
SensorData data = {};
float gxOffset = 0.0f;
float gyOffset = 0.0f;
float gzOffset = 0.0f;
const int GYRO_CALIBRATION_SAMPLES = 500;
uint32_t packetSeq = 0;

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
  Serial.println("Central setup started.");

  if (!BLE.begin()) {
    Serial.println("Failed to start BLE module.");
    while (1) {}
  }

  BLE.setLocalName("Nano 33 BLE (CentralIMU)");
  BLE.setAdvertisedService(rawService);
  rawService.addCharacteristic(rawCharacteristic);
  BLE.addService(rawService);

  RawImuPacket initPacket = {0, 0, 0.0f, 0.0f, 0.0f};
  rawCharacteristic.writeValue((const uint8_t*)&initPacket, sizeof(RawImuPacket));
  BLE.advertise();

  if (!IMU.begin()) {
    Serial.println("IMU failed to start.");
    while (1) {}
  }

  calibrateGyro();

  ahrs.begin();
  ahrs.setDOF(DOF::DOF_6);
  ahrs.setFusionAlgorithm(SensorFusion::MADGWICK);
  ahrs.setBeta(0.01f);

  Serial.println("Central IMU ready and advertising raw packets.");
}

void loop() {
  BLEDevice pc = BLE.central();

  if (pc) {
    Serial.println("PC connected to central.");

    while (pc.connected()) {
      BLE.poll();

      if (IMU.gyroscopeAvailable() && IMU.accelerationAvailable()) {
        IMU.readGyroscope(data.gx, data.gy, data.gz);
        data.gx -= gxOffset;
        data.gy -= gyOffset;
        data.gz -= gzOffset;

        IMU.readAcceleration(data.ax, data.ay, data.az);

        ahrs.setData(data);
        ahrs.update();

        RawImuPacket packet;
        packet.deviceTimestampMs = millis();
        packet.seq = packetSeq++;
        packet.yaw = ahrs.angles.yaw;
        packet.pitch = ahrs.angles.pitch;
        packet.roll = ahrs.angles.roll;

        rawCharacteristic.writeValue((const uint8_t*)&packet, sizeof(RawImuPacket));

        Serial.print(packet.deviceTimestampMs);
        Serial.print(",");
        Serial.print(packet.seq);
        Serial.print(",");
        Serial.print(packet.yaw, 6);
        Serial.print(",");
        Serial.print(packet.pitch, 6);
        Serial.print(",");
        Serial.println(packet.roll, 6);
      }

      delay(40);
    }

    Serial.println("PC disconnected from central.");
  }
}
