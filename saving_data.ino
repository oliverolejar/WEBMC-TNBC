#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

ReefwingAHRS ahrs;
SensorData data = {};

float gxOffset = 0.0f;
float gyOffset = 0.0f;
float gzOffset = 0.0f;
 
void calibrateGyro() {
  const int N = 500;              // keep the board still while this runs
  float gx, gy, gz;
 
  for (int i = 0; i < N; i++) {
    while (!IMU.gyroscopeAvailable());
    printf("calibrating IMU DONT MOVE");
    IMU.readGyroscope(gx, gy, gz);
    gxOffset += gx;
    gyOffset += gy;
    gzOffset += gz;
    delay(5);
  }
 
  gxOffset /= N;
  gyOffset /= N;
  gzOffset /= N;
}
 
// --- Timing for a steady update rate ---
unsigned long lastUpdate = 0;
 
// Optional: smoothed output (EMA)
float yawF = 0.0f, pitchF = 0.0f, rollF = 0.0f;
const float smooth = 0.2f;        // smaller = smoother, larger = snappier
 

void setup() {

  Serial.begin(115200);
  while (!Serial);

  if ( ! IMU.begin() ){
    while (1);
  }


  calibrateGyro();

  
  ahrs.begin();

/*
  Needed if we are using magnetometer (6 DOF vs 9 DOF)
*/
  ahrs.setDOF(DOF::DOF_9);


/*
  Needed for better data accuracy
  Algorithm choice will depend on type of motion
*/
  ahrs.setFusionAlgorithm(SensorFusion::MAHONY);
  ahrs.setKp(5.0f);               // default is ~10, this is slightly gentler
  ahrs.setKi(0.0f);
/*
  Needed if using 9 DOF 
  This sets angle between magnetic north and true north @ our location

  ahrs.setDeclination()
  
*/
  ahrs.setDeclination(-8.51f);
}

void loop() {
 
  unsigned long now = millis();
 
  // Force a roughly constant update rate (~100 Hz)
  if (now - lastUpdate < 10) {
    return;
  }
  lastUpdate = now;
 
  if (IMU.gyroscopeAvailable() &&
      IMU.accelerationAvailable() &&
      IMU.magneticFieldAvailable()) {
 
    IMU.readGyroscope(data.gx, data.gy, data.gz);
    IMU.readAcceleration(data.ax, data.ay, data.az);
    IMU.readMagneticField(data.mx, data.my, data.mz);
 
    // Remove gyro bias
    data.gx -= gxOffset;
    data.gy -= gyOffset;
    data.gz -= gzOffset;
 
    // axisAlign = true by default, which is what you want for BMI270/BMM150
    ahrs.setData(data);
    ahrs.update();
 
    // Extra low-pass smoothing on the angles (kills twitchy noise)
    yawF   = (1.0f - smooth) * yawF   + smooth * ahrs.angles.yaw;
    pitchF = (1.0f - smooth) * pitchF + smooth * ahrs.angles.pitch;
    rollF  = (1.0f - smooth) * rollF  + smooth * ahrs.angles.roll;
 
    Serial.print(now);
    Serial.print(",");
    Serial.print(yawF,   3);
    Serial.print(",");
    Serial.print(pitchF, 3);
    Serial.print(",");
    Serial.println(rollF, 3);
  }
}
