class AqaraMotionDevice extends BaseZigbeeDevice.Device {
  async onInit() {
    this.log('Aqara Motion Sensor initialized');
    this.registerCapabilityListener('alarm_motion', this.onCapabilityAlarmMotion.bind(this));
  }

  async onCapabilityAlarmMotion(value, opts) {
    this.log('Motion detection updated:', value);
  }

module.exports = AqaraMotionDevice;
