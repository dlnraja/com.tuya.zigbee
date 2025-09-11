class MotionDevice extends BaseZigbeeDevice.Device {
  async onInit() {
    this.log('Tuya Motion Sensor initialized');
    this.registerCapabilityListener('alarm_motion', this.onCapabilityAlarmMotion.bind(this));
  }

  async onCapabilityAlarmMotion(value, opts) {
    this.log('Motion detection:', value);
  }
}

module.exports = MotionDevice;
