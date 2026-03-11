// ─────────────────────────────────────────────────────────────────────────────
// MustangMotion.ino  –  single-source sketch for new Central / Peripheral setup
//
// NEW SETUP:
//   upper = CENTRAL
//   lower = PERIPHERAL
//
// FLASH THIS SAME FILE TWICE:
//   Upper board  -> set SENSOR_ROLE_UPPER to 1
//   Lower board  -> set SENSOR_ROLE_UPPER to 0
//
// CENTRAL / UPPER packet format (20 bytes):
//   Python: struct.unpack("<IIfff", data)
//   Fields: deviceTimestampMs, seq, roll, quadEnvelope, hamEnvelope
//
// PERIPHERAL / LOWER packet format (12 bytes):
//   Python: struct.unpack("<IIf", data)
//   Fields: deviceTimestampMs, seq, roll
//
// Notes:
// - Upper/central includes EMG on A0 and A3
// - Lower/peripheral has no EMG fields
// - BLE names match your backend exactly
// ─────────────────────────────────────────────────────────────────────────────

// ── Compile-time role config ─────────────────────────────────────────────────
#define SENSOR_ROLE_UPPER  1   // 1 = upper/central, 0 = lower/peripheral
#define EMG_ENABLED              // only used on upper/central
// #define DEBUG_VERBOSE
// ─────────────────────────────────────────────────────────────────────────────

#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

// ── Role-dependent names ─────────────────────────────────────────────────────
#if SENSOR_ROLE_UPPER
  #define ROLE_NAME     "upper_central"
  #define ROLE_BLE_NAME "Nano 33 BLE (CentralIMU)"
#else
  #define ROLE_NAME     "lower_peripheral"
  #define ROLE_BLE_NAME "Nano 33 BLE (PeripheralIMU)"
#endif

// ── BLE UUIDs ────────────────────────────────────────────────────────────────
const char* rawServiceUuid        = "19b10010-e8f2-537e-4f6c-d104768a1214";
const char* rawCharacteristicUuid = "19b10011-e8f2-537e-4f6c-d104768a1214";

// ── Packet definitions ───────────────────────────────────────────────────────
struct __attribute__((packed)) CentralRawPacket {
  uint32_t deviceTimestampMs;
  uint32_t seq;
  float    roll;              // real central roll
  float    emgQuadPercent;    // carries QUAD ENVELOPE
  float    emgHamPercent;     // carries HAM ENVELOPE
};

struct __attribute__((packed)) PeripheralRawPacket {
  uint32_t deviceTimestampMs;
  uint32_t seq;
  float    roll;              // real peripheral roll
};

BLEService rawService(rawServiceUuid);

#if SENSOR_ROLE_UPPER
BLECharacteristic rawCharacteristic(
  rawCharacteristicUuid,
  BLERead | BLENotify,
  sizeof(CentralRawPacket)
);
#else
BLECharacteristic rawCharacteristic(
  rawCharacteristicUuid,
  BLERead | BLENotify,
  sizeof(PeripheralRawPacket)
);
#endif

// ── IMU / AHRS ───────────────────────────────────────────────────────────────
ReefwingAHRS ahrs;
SensorData data = {};

float gxOffset = 0.0f;
float gyOffset = 0.0f;
float gzOffset = 0.0f;

const int GYRO_CALIBRATION_SAMPLES = 600;
const float SMOOTH = 0.2f;
const unsigned long UPDATE_INTERVAL_MS = 10;   // ~100 Hz

uint32_t packetSeq = 0;
unsigned long lastUpdate = 0;
float rollF = 0.0f;

// ── RGB LED (active LOW on Nano 33 BLE) ─────────────────────────────────────
inline void ledOff() {
  digitalWrite(LEDR, HIGH);
  digitalWrite(LEDG, HIGH);
  digitalWrite(LEDB, HIGH);
}

inline void ledRole() {
#if SENSOR_ROLE_UPPER
  // upper/central = red
  digitalWrite(LEDR, LOW);
  digitalWrite(LEDG, HIGH);
  digitalWrite(LEDB, HIGH);
#else
  // lower/peripheral = green
  digitalWrite(LEDR, HIGH);
  digitalWrite(LEDG, LOW);
  digitalWrite(LEDB, HIGH);
#endif
}

// ── Helpers ──────────────────────────────────────────────────────────────────
float wrap180(float a) {
  while (a > 180.0f) a -= 360.0f;
  while (a < -180.0f) a += 360.0f;
  return a;
}

// ── EMG: UPPER / CENTRAL ONLY ────────────────────────────────────────────────
#if SENSOR_ROLE_UPPER && defined(EMG_ENABLED)
const int EMG1_PIN = A0;   // quad
const int EMG2_PIN = A3;   // ham
const int EMG1_ZERO_OFFSET = 832;
const int EMG2_ZERO_OFFSET = 832;
const int EMG1_ENVELOPE_BASELINE = 36;
const int EMG2_ENVELOPE_BASELINE = 36;
const float ENVELOPE_ALPHA = 0.10f;
const unsigned long EMG_SAMPLE_INTERVAL_MS = 5;

unsigned long lastEmgSampleMs = 0;

float emg1Envelope = 0.0f;
int emg1Activation = 0;

float emg2Envelope = 0.0f;
int emg2Activation = 0;

int emg1RawLatest = 0;
int emg2RawLatest = 0;

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

  // ---- EMG 2: Hamstring on A3 ----
  int raw2 = analogRead(EMG2_PIN);
  emg2RawLatest = raw2;

  int raw2Zeroed = raw2 - EMG2_ZERO_OFFSET;
  int rectified2 = abs(raw2Zeroed);

  emg2Envelope = (1.0f - ENVELOPE_ALPHA) * emg2Envelope + ENVELOPE_ALPHA * rectified2;
  emg2Activation = (int)emg2Envelope - EMG2_ENVELOPE_BASELINE;
  if (emg2Activation < 0) emg2Activation = 0;
}
#endif

// ── Gyro calibration ─────────────────────────────────────────────────────────
void calibrateGyro() {
  float gx = 0.0f;
  float gy = 0.0f;
  float gz = 0.0f;
  int collected = 0;
  const unsigned long gyroWaitTimeoutMs = 3000;

  gxOffset = 0.0f;
  gyOffset = 0.0f;
  gzOffset = 0.0f;

  Serial.print("[");
  Serial.print(ROLE_NAME);
  Serial.println("] Calibrating gyro... DO NOT MOVE");

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

  Serial.print("[");
  Serial.print(ROLE_NAME);
  Serial.print("] Gyro calibration complete. Samples = ");
  Serial.println(collected);
}

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 5000) {}

  pinMode(LEDR, OUTPUT);
  pinMode(LEDG, OUTPUT);
  pinMode(LEDB, OUTPUT);
  ledOff();

#if SENSOR_ROLE_UPPER && defined(EMG_ENABLED)
  pinMode(EMG1_PIN, INPUT);
  pinMode(EMG2_PIN, INPUT);
#endif

  Serial.print("[");
  Serial.print(ROLE_NAME);
  Serial.println("] Booting...");

  if (!BLE.begin()) {
    Serial.println("ERROR: BLE init failed");
    while (1) {}
  }

  BLE.setLocalName(ROLE_BLE_NAME);
  BLE.setAdvertisedService(rawService);
  rawService.addCharacteristic(rawCharacteristic);
  BLE.addService(rawService);

#if SENSOR_ROLE_UPPER
  CentralRawPacket initPacket = {0, 0, 0.0f, 0.0f, 0.0f};
  rawCharacteristic.writeValue((const uint8_t*)&initPacket, sizeof(CentralRawPacket));
#else
  PeripheralRawPacket initPacket = {0, 0, 0.0f};
  rawCharacteristic.writeValue((const uint8_t*)&initPacket, sizeof(PeripheralRawPacket));
#endif

  BLE.advertise();

  Serial.print("[");
  Serial.print(ROLE_NAME);
  Serial.print("] BLE advertising started as ");
  Serial.println(ROLE_BLE_NAME);

  if (!IMU.begin()) {
    Serial.println("ERROR: IMU init failed");
    while (1) {}
  }

  calibrateGyro();

  ahrs.begin();
  ahrs.setDOF(DOF::DOF_6);
  ahrs.setFusionAlgorithm(SensorFusion::MAHONY);
  ahrs.setKp(5.0f);
  ahrs.setKi(0.0f);
  ahrs.setDeclination(-8.51f);

  Serial.print("[");
  Serial.print(ROLE_NAME);
  Serial.println("] IMU ready");
}

// ── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  BLE.poll();

  unsigned long now = millis();

#if SENSOR_ROLE_UPPER && defined(EMG_ENABLED)
  updateEmgs(now);
#endif

  if (now - lastUpdate < UPDATE_INTERVAL_MS) {
    return;
  }
  lastUpdate = now;

  if (IMU.gyroscopeAvailable() && IMU.accelerationAvailable()) {
    IMU.readGyroscope(data.gx, data.gy, data.gz);
    IMU.readAcceleration(data.ax, data.ay, data.az);

    data.gx -= gxOffset;
    data.gy -= gyOffset;
    data.gz -= gzOffset;

    if (IMU.magneticFieldAvailable()) {
      IMU.readMagneticField(data.mx, data.my, data.mz);
    }

    ahrs.setData(data);
    ahrs.update();

    rollF = (1.0f - SMOOTH) * rollF + SMOOTH * ahrs.angles.roll;
    rollF = wrap180(rollF);

#if SENSOR_ROLE_UPPER
    CentralRawPacket packet;
    packet.deviceTimestampMs = now;
    packet.seq = packetSeq++;
    packet.roll = rollF;                  // upper = central roll
    packet.emgQuadPercent = emg1Envelope; // quad envelope
    packet.emgHamPercent = emg2Envelope;  // ham envelope

    rawCharacteristic.writeValue((const uint8_t*)&packet, sizeof(CentralRawPacket));

  #ifdef DEBUG_VERBOSE
    Serial.print(packet.deviceTimestampMs);
    Serial.print(",");
    Serial.print(packet.seq);
    Serial.print(",");
    Serial.print(packet.roll, 3);
    Serial.print(",");
    Serial.print(packet.emgQuadPercent, 3);
    Serial.print(",");
    Serial.println(packet.emgHamPercent, 3);
  #endif

#else
    PeripheralRawPacket packet;
    packet.deviceTimestampMs = now;
    packet.seq = packetSeq++;
    packet.roll = rollF;   // lower = peripheral roll

    rawCharacteristic.writeValue((const uint8_t*)&packet, sizeof(PeripheralRawPacket));

  #ifdef DEBUG_VERBOSE
    Serial.print(packet.deviceTimestampMs);
    Serial.print(",");
    Serial.print(packet.seq);
    Serial.print(",");
    Serial.println(packet.roll, 3);
  #endif

#endif
  }
}