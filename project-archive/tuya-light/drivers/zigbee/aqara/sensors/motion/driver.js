class AqaraMotionDriver extends Homey.Driver {
  async onInit() {
    this.log('Aqara Motion Driver initialized');
  }

  async onPairListDevices() {
    return [
      {
        name: 'Aqara Motion Sensor',
        data: {
          id: this.homey.uuid.generate(),
        },
      },
    ];
  }
}

module.exports = AqaraMotionDriver;
