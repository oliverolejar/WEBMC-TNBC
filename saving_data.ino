#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

ReefwingAHRS ahrs;
SensorData data = {};

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

    Serial.print(t);
    Serial.print(",");
    Serial.print(ahrs.angles.yaw, 6);
    Serial.print(",");
    Serial.print(ahrs.angles.pitch, 6);
    Serial.print(",");
    Serial.println(ahrs.angles.roll, 6);
  }
}