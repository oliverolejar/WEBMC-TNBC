#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

const char* rawServiceUuid = "19b10010-e8f2-537e-4f6c-d104768a1214";
const char* rawCharacteristicUuid = "19b10011-e8f2-537e-4f6c-d104768a1214";

struct CentralRawPacket {
  uint32_t deviceTimestampMs;
  uint32_t seq;
  float roll;              // REAL central roll again
  float emgQuadPercent;    // carries QUAD ENVELOPE
  float emgHamPercent;     // carries HAMSTRING ENVELOPE
};

BLEService rawService(rawServiceUuid);
BLECharacteristic rawCharacteristic(
  rawCharacteristicUuid,
  BLERead | BLENotify,
  sizeof(CentralRawPacket)
);

ReefwingAHRS ahrs;
SensorData data = {};

float gxOffset = 0.0f;
float gyOffset = 0.0f;
float gzOffset = 0.0f;

const int GYRO_CALIBRATION_SAMPLES = 600;
const float smooth = 0.2f;
const unsigned long UPDATE_INTERVAL_MS = 10;   // ~100 Hz

uint32_t packetSeq = 0;
unsigned long lastUpdate = 0;

float rollF = 0.0f;

// ===================== EMG 1 (Quad) =====================
const int EMG1_PIN = A0;
const int EMG1_ZERO_OFFSET = 832;
const int EMG1_ENVELOPE_BASELINE = 36;

// ===================== EMG 2 (Hamstring) =====================
const int EMG2_PIN = A3;
const int EMG2_ZERO_OFFSET = 832;
const int EMG2_ENVELOPE_BASELINE = 36;

// Shared EMG settings
const float ENVELOPE_ALPHA = 0.10f;
const unsigned long EMG_SAMPLE_INTERVAL_MS = 5;
const int EMG_PERCENT_FULL_SCALE = 600;

unsigned long lastEmgSampleMs = 0;

float emg1Envelope = 0.0f;
int emg1Activation = 0;
float emg1Percent = 0.0f;

float emg2Envelope = 0.0f;
int emg2Activation = 0;
float emg2Percent = 0.0f;

int emg1RawLatest = 0;
int emg2RawLatest = 0;

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

  Serial.println("Calibrating gyro... DO NOT MOVE (central)");

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

float activationToPercent(int activation) {
  if (activation < 0) activation = 0;
  if (activation > EMG_PERCENT_FULL_SCALE) activation = EMG_PERCENT_FULL_SCALE;
  return (activation / (float)EMG_PERCENT_FULL_SCALE) * 100.0f;
}

void updateEmgs(unsigned long now) {
  if (now - lastEmgSampleMs < EMG_SAMPLE_INTERVAL_MS) {
    return;
  }
  lastEmgSampleMs = now;

  // ---- EMG 1: Quad on A0 ----
  int raw1 = analogRead(EMG1_PIN);
  emg1RawLatest = raw1;

  int raw1Zeroed = raw1 - EMG1_ZERO_OFFSET;
  int rectified1 = abs(raw1Zeroed);

  emg1Envelope = (1.0f - ENVELOPE_ALPHA) * emg1Envelope + ENVELOPE_ALPHA * rectified1;
  emg1Activation = (int)emg1Envelope - EMG1_ENVELOPE_BASELINE;
  if (emg1Activation < 0) emg1Activation = 0;
  emg1Percent = activationToPercent(emg1Activation);

  // ---- EMG 2: Hamstring on A3 ----
  int raw2 = analogRead(EMG2_PIN);
  emg2RawLatest = raw2;

  int raw2Zeroed = raw2 - EMG2_ZERO_OFFSET;
  int rectified2 = abs(raw2Zeroed);

  emg2Envelope = (1.0f - ENVELOPE_ALPHA) * emg2Envelope + ENVELOPE_ALPHA * rectified2;
  emg2Activation = (int)emg2Envelope - EMG2_ENVELOPE_BASELINE;
  if (emg2Activation < 0) emg2Activation = 0;
  emg2Percent = activationToPercent(emg2Activation);
}

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 5000) {}
  Serial.println("Central setup started.");

  pinMode(EMG1_PIN, INPUT);
  pinMode(EMG2_PIN, INPUT);

  if (!BLE.begin()) {
    Serial.println("Failed to start BLE module.");
    while (1) {}
  }

  BLE.setLocalName("Nano 33 BLE (CentralIMU)");
  BLE.setAdvertisedService(rawService);
  rawService.addCharacteristic(rawCharacteristic);
  BLE.addService(rawService);

  CentralRawPacket initPacket = {0, 0, 0.0f, 0.0f, 0.0f};
  rawCharacteristic.writeValue((const uint8_t*)&initPacket, sizeof(CentralRawPacket));
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

  Serial.println("Central IMU + EMG ready and advertising packets.");
}

void loop() {
  BLE.poll();

  unsigned long now = millis();
  updateEmgs(now);

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
    rollF = wrap180(rollF);

    CentralRawPacket packet;
    packet.deviceTimestampMs = now;
    packet.seq = packetSeq++;

    // FINAL PAYLOAD:
    packet.roll = rollF;                  // real central roll again
    packet.emgQuadPercent = emg1Envelope; // quad envelope
    packet.emgHamPercent = emg2Envelope;  // ham envelope

    rawCharacteristic.writeValue((const uint8_t*)&packet, sizeof(CentralRawPacket));

    // Serial output:
    // timestamp, seq, roll, quadEnvelope, hamEnvelope
    Serial.print(packet.deviceTimestampMs);
    Serial.print(",");
    Serial.print(packet.seq);
    Serial.print(",");
    Serial.print(packet.roll, 3);
    Serial.print(",");
    Serial.print(packet.emgQuadPercent, 3);
    Serial.print(",");
    Serial.println(packet.emgHamPercent, 3);
  }
}