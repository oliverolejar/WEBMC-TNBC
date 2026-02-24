/************************************************************
  EMG Bar Graph (Processing)
  Displays 3 stacked bars:
   1) Raw (red)
   2) Rectified (green)
   3) Envelope / Activation (blue)  <-- like the video
 ************************************************************/

import processing.serial.*;

Serial port;

// values coming from Arduino
float rawV = 0;
float rectV = 0;
float envV = 0;

// scaling (tune if bars are too tall / too short)
float RAW_MAX  = 1023;  // if you see raw around 0–4095, change to 4095
float RECT_MAX = 300;
float ENV_MAX  = 300;

void setup() {
  size(520, 520);
  smooth();

  // Print all serial ports in the Processing console
  println(Serial.list());

  // Pick the correct port index (change [0] if needed)
  port = new Serial(this, "COM7", 115200);

  port.bufferUntil('\n');
}

void draw() {
  background(255);

  // Title
  fill(0);
  textSize(20);
  text("EMG Bar Graph", 170, 35);

  // Draw the 3 bar panels
  drawPanel(60,  90,  "1) Raw",                 rawV,  RAW_MAX,  color(220, 60, 60));
  drawPanel(210, 90,  "2) Rectified",           rectV, RECT_MAX, color(60, 200, 60));
  drawPanel(360, 90,  "3) Envelope (Activation)",envV, ENV_MAX,  color(60, 120, 255));

  // Numeric readout
  fill(0);
  textSize(14);
  text("raw=" + int(rawV) + "   rect=" + int(rectV) + "   env=" + int(envV), 110, 480);
}

void drawPanel(int x, int y, String label, float value, float maxValue, int barColor) {
  int panelW = 120;
  int panelH = 350;

  // Panel background
  stroke(200);
  fill(245);
  rect(x, y, panelW, panelH);

  // Bar height mapping
  float h = map(constrain(value, 0, maxValue), 0, maxValue, 0, panelH - 30);

  // Draw bar
  noStroke();
  fill(barColor);
  rect(x + 35, y + panelH - 15 - h, 50, h);

  // Label + value
  fill(0);
  textSize(13);
  text(label, x + 8, y - 10);
  text(int(value), x + 45, y + panelH + 20);
}

void serialEvent(Serial p) {
  String line = p.readStringUntil('\n');
  if (line == null) return;

  line = trim(line);
  String[] parts = split(line, ',');

  if (parts.length < 3) return;

  try {
    rawV  = float(parts[0]);
    rectV = float(parts[1]);
    envV  = float(parts[2]);
  } catch(Exception e) {
    // ignore bad lines
  }
}
