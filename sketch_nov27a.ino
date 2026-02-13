#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

ReefwingAHRS ahrs;
SensorData data = {};

// --- simple low-pass filter ---
float alpha = 0.10f;                 // 0.05–0.20 (lower = smoother)
float yawF = 0, pitchF = 0, rollF = 0;

float lpf(float x, float &y) {
  y = y + alpha * (x - y);
  return y;
}

void setup() {

  Serial.begin(115200);
  while (!Serial);

  if ( ! IMU.begin() ){
    while (1);
  }

  ahrs.begin();

/*
  Needed if we are using magnetometer (6 DOF vs 9 DOF)
*/
  ahrs.setDOF(DOF::DOF_9);


/*
  Needed for better data accuracy
  Algorithm choice will depend on type of motion
*/
  ahrs.setFusionAlgorithm(SensorFusion::MADGWICK);


/*
  Needed if using 9 DOF 
  This sets angle between magnetic north and true north @ our location

  ahrs.setDeclination()
*/
}

void loop() {

  uint32_t t = millis();

  if ( IMU.gyroscopeAvailable() && IMU.accelerationAvailable() && IMU.magneticFieldAvailable() ){
    IMU.readGyroscope(data.gx, data.gy, data.gz);
    IMU.readAcceleration(data.ax, data.ay, data.az);
    IMU.readMagneticField(data.mx, data.my, data.mz);

    ahrs.setData(data);
    ahrs.update();

    float yaw   = lpf(ahrs.angles.yaw,   yawF);
    float pitch = lpf(ahrs.angles.pitch, pitchF);
    float roll  = lpf(ahrs.angles.roll,  rollF);

    Serial.print(t);
    Serial.print(",");
    Serial.print(yaw, 6);
    Serial.print(",");
    Serial.print(pitch, 6);
    Serial.print(",");
    Serial.println(roll, 6);
  }
}