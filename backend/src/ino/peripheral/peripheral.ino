#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

// Set to "R" for right leg, "L" for left leg before flashing
#define LEG_SIDE "R"

const char* rawServiceUuid = "19b10010-e8f2-537e-4f6c-d104768a1214";
const char* rawCharacteristicUuid = "19b10011-e8f2-537e-4f6c-d104768a1214";

struct PeripheralRawPacket {
  uint32_t deviceTimestampMs;
  uint32_t seq;
  float roll;
};

BLEService rawService(rawServiceUuid);
BLECharacteristic rawCharacteristic(
  rawCharacteristicUuid,
  BLERead | BLENotify,
  sizeof(PeripheralRawPacket)
);

ReefwingAHRS ahrs;
SensorData data = {};

float gxOffset = 0.0f;
float gyOffset = 0.0f;
float gzOffset = 0.0f;

const int GYRO_CALIBRATION_SAMPLES = 500;
const float smooth = 0.2f;
const unsigned long UPDATE_INTERVAL_MS = 10;   // ~100 Hz

uint32_t packetSeq = 0;
unsigned long lastUpdate = 0;

float rollF = 0.0f;

float wrap180(float a) {
  while (a > 180.0f) a -= 360.0f;
  while (a < -180.0f) a += 360.0f;
  return a;
}

void calibrateGyro() {
  float gx = 0.0f;
  float gy = 0.0f;
  float gz = 0.0f;
  int collected = 0;
  const unsigned long gyroWaitTimeoutMs = 3000;

  gxOffset = 0.0f;
  gyOffset = 0.0f;
  gzOffset = 0.0f;

  Serial.println("Calibrating gyro... DO NOT MOVE (peripheral)");

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

  pinMode(LEDR,OUTPUT);
  pinMode(LEDG,OUTPUT);
  pinMode(LEDB,OUTPUT);

  if (!BLE.begin()) {
    Serial.println("Failed to start BLE module.");
    while (1) {}
  }

  BLE.setLocalName("Nano 33 BLE (PeripheralIMU_" LEG_SIDE ")");
  BLE.setAdvertisedService(rawService);
  rawService.addCharacteristic(rawCharacteristic);
  BLE.addService(rawService);

  PeripheralRawPacket initPacket = {0, 0, 0.0f};
  rawCharacteristic.writeValue((const uint8_t*)&initPacket, sizeof(PeripheralRawPacket));
  BLE.advertise();

  if (!IMU.begin()) {
    Serial.println("IMU failed to start.");
    while (1) {}
  }

  calibrateGyro();

  ahrs.begin();
  ahrs.setDOF(DOF::DOF_6);
  ahrs.setFusionAlgorithm(SensorFusion::MAHONY);
  ahrs.setKp(5.0f);
  ahrs.setKi(0.0f);
  ahrs.setDeclination(-8.51f);

  Serial.println("Peripheral IMU ready and advertising packets.");
}

void loop() {
  BLE.poll();

  digitalWrite(LEDR,HIGH);
  digitalWrite(LEDG,LOW);
  digitalWrite(LEDB,HIGH);

  unsigned long now = millis();
  if (now - lastUpdate < UPDATE_INTERVAL_MS) {
    return;
  }
  lastUpdate = now;

  if (IMU.gyroscopeAvailable() && IMU.accelerationAvailable()) {
    IMU.readGyroscope(data.gx, data.gy, data.gz);
    IMU.readAcceleration(data.ax, data.ay, data.az);

    if (IMU.magneticFieldAvailable()) {
      IMU.readMagneticField(data.mx, data.my, data.mz);
    }

    data.gx -= gxOffset;
    data.gy -= gyOffset;
    data.gz -= gzOffset;

    ahrs.setData(data);
    ahrs.update();

    rollF = (1.0f - smooth) * rollF + smooth * ahrs.angles.roll;

    PeripheralRawPacket packet;
    packet.deviceTimestampMs = now;
    packet.seq = packetSeq++;
    packet.roll = wrap180(rollF);

    rawCharacteristic.writeValue((const uint8_t*)&packet, sizeof(PeripheralRawPacket));

    Serial.print(packet.deviceTimestampMs);
    Serial.print(",");
    Serial.print(packet.seq);
    Serial.print(",");
    Serial.println(packet.roll, 3);
  }
}