// ─────────────────────────────────────────────────────────────────────────────
//  MustangMotion.ino  –  single-source IMU node for all four sensor positions
//
//  Flash workflow: set ROLE_ID and ROLE_NAME below, then compile + upload.
//  Repeat for each board (up to 4; 2 if only one leg is used).
//
//  Role map + LED colour (RGB, active LOW):
//    1 = right_upper  →  Red
//    2 = right_lower  →  Green
//    3 = left_upper   →  Blue
//    4 = left_lower   →  Yellow (R+G)
//
//  Packet (21 bytes, little-endian):
//    Python: struct.unpack("<BIIfff", data)
//    Fields: roleId, deviceTimestampMs, seq, roll, emgQuadPercent, emgHamPercent
//    EMG fields are 0.0 for lower roles (2, 4).
// ─────────────────────────────────────────────────────────────────────────────

// ── Compile-time role config ─────────────────────────────────────────────────
#define ROLE_ID    2
#define ROLE_NAME  "right_lower"

// #define EMG_ENABLED   // comment out if EMG sensors not attached

// Uncomment for per-packet serial logs (off by default to reduce serial noise)
// #define DEBUG_VERBOSE
// ─────────────────────────────────────────────────────────────────────────────

#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

#define ROLE_BLE_NAME "Nano33BLE-" ROLE_NAME

// ── RGB LED (active LOW on Nano 33 BLE) ──────────────────────────────────────
// Colour per role: right_upper=Red, right_lower=Green, left_upper=Blue, left_lower=Yellow
inline void ledOff() {
  digitalWrite(LEDR, HIGH);
  digitalWrite(LEDG, HIGH);
  digitalWrite(LEDB, HIGH);
}

inline void ledRole() {
#if   ROLE_ID == 1   // right_upper → Red
  digitalWrite(LEDR, LOW);  digitalWrite(LEDG, HIGH); digitalWrite(LEDB, HIGH);
#elif ROLE_ID == 2   // right_lower → Green
  digitalWrite(LEDR, HIGH); digitalWrite(LEDG, LOW);  digitalWrite(LEDB, HIGH);
#elif ROLE_ID == 3   // left_upper  → Blue
  digitalWrite(LEDR, HIGH); digitalWrite(LEDG, HIGH); digitalWrite(LEDB, LOW);
#elif ROLE_ID == 4   // left_lower  → Yellow (R+G)
  digitalWrite(LEDR, LOW);  digitalWrite(LEDG, LOW);  digitalWrite(LEDB, HIGH);
#endif
}
// ─────────────────────────────────────────────────────────────────────────────

const char* rawServiceUuid        = "19b10010-e8f2-537e-4f6c-d104768a1214";
const char* rawCharacteristicUuid = "19b10011-e8f2-537e-4f6c-d104768a1214";

// Packed so the compiler adds no padding between fields.
// Python side: struct.unpack("<BIIfff", data)  →  21 bytes exact.
// Fields: roleId, deviceTimestampMs, seq, roll, emgQuadPercent, emgHamPercent
struct __attribute__((packed)) RawPacket {
  uint8_t  roleId;
  uint32_t deviceTimestampMs;
  uint32_t seq;
  float    roll;            // smoothed + wrap180'd
  float    emgQuadPercent;  // 0.0 for lower roles
  float    emgHamPercent;   // 0.0 for lower roles
};

BLEService        rawService(rawServiceUuid);
BLECharacteristic rawCharacteristic(
  rawCharacteristicUuid,
  BLERead | BLENotify,
  sizeof(RawPacket)
);

ReefwingAHRS ahrs;
SensorData   data     = {};
float        gxOffset = 0.0f;
float        gyOffset = 0.0f;
float        gzOffset = 0.0f;

const int   GYRO_CALIBRATION_SAMPLES = 500;
const float SMOOTH                   = 0.2f;

float    rollF         = 0.0f;
uint32_t packetSeq     = 0;
uint32_t txCountSec    = 0;
uint32_t lastSummaryMs = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────
float wrap180(float a) {
  while (a >  180.0f) a -= 360.0f;
  while (a < -180.0f) a += 360.0f;
  return a;
}

// ── EMG (upper roles only: right_upper=1, left_upper=3) ──────────────────────
#if (ROLE_ID == 1 || ROLE_ID == 3) && defined(EMG_ENABLED)
const int          EMG_QUAD_PIN          = A0;
const int          EMG_HAM_PIN           = A3;
const int          EMG_ZERO_OFFSET       = 832;
const int          EMG_ENVELOPE_BASELINE = 36;
const float        EMG_ALPHA             = 0.10f;
const int          EMG_FULL_SCALE        = 600;
const unsigned long EMG_INTERVAL_MS      = 5;   // 200 Hz

float         emgQuadEnv = 0.0f, emgHamEnv = 0.0f;
float         emgQuadPct = 0.0f, emgHamPct = 0.0f;
unsigned long lastEmgMs  = 0;

void updateEmg(unsigned long now) {
  if (now - lastEmgMs < EMG_INTERVAL_MS) return;
  lastEmgMs = now;

  int r1 = abs(analogRead(EMG_QUAD_PIN) - EMG_ZERO_OFFSET);
  emgQuadEnv = (1.0f - EMG_ALPHA) * emgQuadEnv + EMG_ALPHA * r1;
  int a1 = (int)emgQuadEnv - EMG_ENVELOPE_BASELINE;
  if (a1 < 0) a1 = 0;
  emgQuadPct = constrain(a1 / (float)EMG_FULL_SCALE * 100.0f, 0.0f, 100.0f);

  int r2 = abs(analogRead(EMG_HAM_PIN) - EMG_ZERO_OFFSET);
  emgHamEnv  = (1.0f - EMG_ALPHA) * emgHamEnv  + EMG_ALPHA * r2;
  int a2 = (int)emgHamEnv - EMG_ENVELOPE_BASELINE;
  if (a2 < 0) a2 = 0;
  emgHamPct  = constrain(a2 / (float)EMG_FULL_SCALE * 100.0f, 0.0f, 100.0f);
}
#endif

// ── Gyro calibration ─────────────────────────────────────────────────────────
void calibrateGyro() {
  float gx = 0.0f, gy = 0.0f, gz = 0.0f;
  int   collected = 0;
  gxOffset = gyOffset = gzOffset = 0.0f;

  Serial.print("["); Serial.print(ROLE_NAME);
  Serial.println("] Calibrating gyro – keep still...");

  for (int i = 0; i < GYRO_CALIBRATION_SAMPLES; i++) {
    unsigned long start = millis();
    while (!IMU.gyroscopeAvailable()) {
      if (millis() - start > 3000) break;
      delay(1);
    }
    if (!IMU.gyroscopeAvailable()) continue;

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

  Serial.print("["); Serial.print(ROLE_NAME);
  Serial.print("] Gyro calibration done – samples=");
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

#if (ROLE_ID == 1 || ROLE_ID == 3) && defined(EMG_ENABLED)
  pinMode(EMG_QUAD_PIN, INPUT);
  pinMode(EMG_HAM_PIN,  INPUT);
#endif

  Serial.print("["); Serial.print(ROLE_NAME);
  Serial.print("] Boot – role_id="); Serial.println(ROLE_ID);

  if (!BLE.begin()) {
    Serial.println("ERROR: BLE init failed");
    while (1) {}
  }

  BLE.setLocalName(ROLE_BLE_NAME);
  BLE.setAdvertisedService(rawService);
  rawService.addCharacteristic(rawCharacteristic);
  BLE.addService(rawService);

  RawPacket initPacket = {ROLE_ID, 0, 0, 0.0f, 0.0f, 0.0f};
  rawCharacteristic.writeValue((const uint8_t*)&initPacket, sizeof(RawPacket));
  BLE.advertise();

  Serial.print("["); Serial.print(ROLE_NAME);
  Serial.println("] BLE advertising started");

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

  Serial.print("["); Serial.print(ROLE_NAME);
  Serial.println("] IMU ready");
}

// ── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  BLEDevice pc = BLE.central();

  if (pc) {
    Serial.print("["); Serial.print(ROLE_NAME);
    Serial.print("] Connected – "); Serial.println(pc.address());
    ledRole();

    txCountSec    = 0;
    lastSummaryMs = millis();

    while (pc.connected()) {
      BLE.poll();

      unsigned long now = millis();

#if (ROLE_ID == 1 || ROLE_ID == 3) && defined(EMG_ENABLED)
      updateEmg(now);
#endif

      if (IMU.gyroscopeAvailable() && IMU.accelerationAvailable()) {
        IMU.readGyroscope(data.gx, data.gy, data.gz);
        data.gx -= gxOffset;
        data.gy -= gyOffset;
        data.gz -= gzOffset;
        IMU.readAcceleration(data.ax, data.ay, data.az);

        ahrs.setData(data);
        ahrs.update();

        rollF = (1.0f - SMOOTH) * rollF + SMOOTH * ahrs.angles.roll;

        RawPacket packet;
        packet.roleId            = ROLE_ID;
        packet.deviceTimestampMs = now;
        packet.seq               = packetSeq++;
        packet.roll              = wrap180(rollF);

#if (ROLE_ID == 1 || ROLE_ID == 3) && defined(EMG_ENABLED)
        packet.emgQuadPercent = emgQuadPct;
        packet.emgHamPercent  = emgHamPct;
#else
        packet.emgQuadPercent = 0.0f;
        packet.emgHamPercent  = 0.0f;
#endif

        rawCharacteristic.writeValue((const uint8_t*)&packet, sizeof(RawPacket));
        txCountSec++;

#ifdef DEBUG_VERBOSE
        Serial.print(packet.deviceTimestampMs); Serial.print(",");
        Serial.print(packet.seq);               Serial.print(",");
        Serial.print(packet.roll, 3);           Serial.print(",");
        Serial.print(packet.emgQuadPercent, 1); Serial.print(",");
        Serial.println(packet.emgHamPercent, 1);
#endif
      }

      // 1-second summary log
      if (now - lastSummaryMs >= 1000) {
        float rate = txCountSec / ((now - lastSummaryMs) / 1000.0f);
        Serial.print("["); Serial.print(ROLE_NAME);
        Serial.print("] connected=1 seq=");  Serial.print(packetSeq);
        Serial.print(" tx_last_sec=");        Serial.print(txCountSec);
        Serial.print(" rate=");               Serial.print(rate, 1);
        Serial.println("Hz");
        txCountSec    = 0;
        lastSummaryMs = now;
      }

      delay(40); // ~25 Hz BLE send rate
    }

    Serial.print("["); Serial.print(ROLE_NAME);
    Serial.println("] Disconnected");
    ledOff();
  }
}
