#include <ArduinoBLE.h>
#include <Arduino_BMI270_BMM150.h>
#include <ReefwingAHRS.h>

const char* deviceServiceUuid               = "19b10000-e8f2-537e-4f6c-d104768a1214";
const char* deviceServiceCharacteristicUuid = "19b10001-e8f2-537e-4f6c-d104768a1214";

BLEService deviceService(deviceServiceUuid);

struct IMUPacket{
  uint32_t t;
  float yaw;
  float pitch;
  float roll;
};

BLECharacteristic deviceCharacteristic(
  deviceServiceCharacteristicUuid,
  BLERead | BLENotify, sizeof(IMUPacket)
);

ReefwingAHRS ahrs;
SensorData data = {};

void setup() {

  Serial.begin(115200);
  while (!Serial);

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

    if (!BLE.begin()) {
    Serial.println("- Starting Bluetooth® Low Energy module failed!");
    while (1);
  }

  BLE.setLocalName("Arduino Nano 33 BLE (Peripheral)");

  BLE.setAdvertisedService(deviceService);

  deviceService.addCharacteristic(deviceCharacteristic);

  BLE.addService(deviceService);

  IMUPacket initPacket = {0, 0.0f, 0.0f, 0.0f};
  deviceCharacteristic.writeValue(
    (const uint8_t*)&initPacket,
    sizeof(IMUPacket)
  );

  BLE.advertise();

  Serial.println("Nano 33 BLE (Peripheral Device) - Minimal");
  Serial.println("Advertising...");
  Serial.println(" ");

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
  ahrs.setBeta(0.01f);                              // changes sensitivity to movement

/*
  Needed if using 9 DOF 
  This sets angle between magnetic north and true north @ our location

  ahrs.setDeclination()
*/
}

void loop() {

  BLEDevice central = BLE.central();

  Serial.println("- Discovering central device...");
  delay(500);

  if (central) {
    Serial.println("* Connected to central device!");
    Serial.print("* Device MAC address: ");
    Serial.println(central.address());  
    Serial.println(" ");

    digitalWrite(LED_BUILTIN, HIGH);

    while (central.connected()) {
      BLE.poll();

      uint32_t t = millis();

      if ( IMU.gyroscopeAvailable() && IMU.accelerationAvailable() && IMU.magneticFieldAvailable() ){
        IMU.readGyroscope(data.gx, data.gy, data.gz);
        IMU.readAcceleration(data.ax, data.ay, data.az);
        IMU.readMagneticField(data.mx, data.my, data.mz);

        ahrs.setData(data);
        ahrs.update();

        IMUPacket packet;
        packet.t = t;
        packet.yaw = ahrs.angles.yaw;
        packet.pitch = ahrs.angles.pitch;
        packet.roll = ahrs.angles.roll;

        // send packet with time, yaw, pitch, and roll in byte form
        deviceCharacteristic.writeValue(
          (const uint8_t*)&packet,
          sizeof(IMUPacket)
        );

        // print to serial monitor for debugging
        Serial.print(packet.t);
        Serial.print(",");
        Serial.print(packet.yaw, 6);
        Serial.print(",");
        Serial.print(packet.pitch, 6);
        Serial.print(",");
        Serial.println(packet.roll, 6);
      }
    }

    Serial.println("* Disconnected from central device!");
    digitalWrite(LED_BUILTIN, LOW);
  }
}