class MotionDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya Motion Driver initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: 'Tuya Motion Sensor',
        data: {
          id: this.homey.uuid.generate(),
        },
    ];
  }

module.exports = MotionDriver;
