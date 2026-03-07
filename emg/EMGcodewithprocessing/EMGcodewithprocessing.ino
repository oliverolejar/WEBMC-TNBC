/************************************************************
  EMG → Nano A0
  CSV output: raw_zeroed, rectified, activation

  Goal:
  - Make 832 act like raw zero
  - Remove resting envelope floor (~36) from activation
 ************************************************************/

const int EMG_PIN = A0;
const int ZERO_OFFSET = 832;

// Resting envelope floor observed at no activation
const int ENVELOPE_BASELINE = 36;

// Envelope smoothing
const float ENVELOPE_ALPHA = 0.10f;

float envelope = 0;

// Sampling & printing rates
const unsigned long SAMPLE_INTERVAL_MS = 5;
const unsigned long PRINT_INTERVAL_MS  = 250;

unsigned long lastSampleMs = 0;
unsigned long lastPrintMs  = 0;

int raw_zeroed = 0;
int rectified = 0;
int activation = 0;

void setup() {
  Serial.begin(115200);
  delay(300);
}

void loop() {
  unsigned long now = millis();

  // ---- Sample fast ----
  if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
    lastSampleMs = now;

    int raw = analogRead(EMG_PIN);

    raw_zeroed = raw - ZERO_OFFSET;
    rectified  = abs(raw_zeroed);
    envelope   = (1.0f - ENVELOPE_ALPHA) * envelope + ENVELOPE_ALPHA * rectified;

    activation = (int)envelope - ENVELOPE_BASELINE;
    if (activation < 0) activation = 0;
  }

  // ---- Print slower ----
  if (now - lastPrintMs >= PRINT_INTERVAL_MS) {
    lastPrintMs = now;

    //Serial.print(raw_zeroed);
    //Serial.print(",");
    //Serial.print(rectified);
    //Serial.print(",");
    Serial.println(activation);
  }
}