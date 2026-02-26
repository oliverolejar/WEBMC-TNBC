/************************************************************
  EMG → Nano A0
  Sends CSV to Processing: raw, rectified, envelope

  Improvements for stability:
  1) Average multiple ADC samples (reduces jitter)
  2) Deadband near rest (keeps bar low when relaxed)
  3) Stronger envelope smoothing (blue bar smoother)
 ************************************************************/

const int EMG_PIN = A0;

// How many ADC samples to average each loop (more = smoother, but slower)
// 8 is a good sweet spot
const int AVG_SAMPLES = 8;

// Envelope smoothing for BLUE bar
// Smaller = smoother (less fluctuation), but slower response
const float ENVELOPE_ALPHA = 0.03f;

// Baseline drift correction (slowly follows resting level)
const float BASELINE_ALPHA = 0.002f;

// Ignore tiny noise close to baseline (helps bar stay at rest)
const int DEADBAND = 8;   // try 5–20 depending on noise

int baseline = 0;
float envelope = 0;

/************************************************************
  Calibrate baseline (keep muscle relaxed!)
 ************************************************************/
void calibrateBaseline() {
  const int N = 600;  // ~2 seconds
  long sum = 0;

  for (int i = 0; i < N; i++) {
    sum += analogRead(EMG_PIN);
    delay(3);
  }

  baseline = (int)(sum / N);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  // IMPORTANT: keep muscle relaxed during this
  calibrateBaseline();
}

void loop() {
  // 1) Read raw EMG with averaging to reduce jitter
  long sum = 0;
  for (int i = 0; i < AVG_SAMPLES; i++) {
    sum += analogRead(EMG_PIN);
  }
  int raw = (int)(sum / AVG_SAMPLES);

  // 2) Slowly update baseline to handle drift
  baseline = (int)((1.0f - BASELINE_ALPHA) * baseline + BASELINE_ALPHA * raw);

  // 3) Rectify (magnitude of activity)
  int rectified = abs(raw - baseline);

  // 4) Deadband: ignore tiny noise at rest
  if (rectified < DEADBAND) rectified = 0;

  // 5) Envelope follower (smooth activation = BLUE bar)
  envelope = (1.0f - ENVELOPE_ALPHA) * envelope + ENVELOPE_ALPHA * rectified;

  // 6) Send to Processing (3 bars)
  Serial.print(raw);
  Serial.print(",");
  Serial.print(rectified);
  Serial.print(",");
  Serial.println((int)envelope);

  delay(5);
}
