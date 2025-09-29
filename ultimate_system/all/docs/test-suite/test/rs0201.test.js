const { expect } = require('chai');
const Homey = require('homey-mock');
const { CLUSTER } = require('zigbee-clusters');

const RS0201Driver = require('../drivers/sensors/rs0201/device');

describe('RS0201 Motion Sensor', () => {
  let homey;
  let driver;
  
  beforeEach(() => {
    homey = new Homey();
    driver = new RS0201Driver({ homey });
  });
  
  it('should detect motion', async () => {
    // Simulate motion detection
    await driver.zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
      .emit('attr.occupancy', { value: 1 });
    
    expect(driver.getCapabilityValue('alarm_motion')).to.be.true;
  });
  
  it('should clear motion after timeout', async () => {
    // First detect motion
    await driver.zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
      .emit('attr.occupancy', { value: 1 });
    
    // Then clear motion
    await driver.zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
      .emit('attr.occupancy', { value: 0 });
    
    expect(driver.getCapabilityValue('alarm_motion')).to.be.false;
  });
  
  it('should report battery level', async () => {
    // Simulate battery report
    await driver.zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .emit('attr.batteryPercentageRemaining', { value: 160 });
    
    expect(driver.getCapabilityValue('measure_battery')).to.equal(80);
  });
  
  it('should apply battery fix when enabled', async () => {
    // Enable battery fix in settings
    driver.setSettings({ apply_battery_fix: true });
    
    // Simulate battery report
    await driver.zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .emit('attr.batteryPercentageRemaining', { value: 200 });
    
    expect(driver.getCapabilityValue('measure_battery')).to.equal(100);
  });
});
