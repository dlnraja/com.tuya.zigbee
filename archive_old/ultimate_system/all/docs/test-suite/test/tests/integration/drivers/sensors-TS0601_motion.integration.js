const { expect } = require('chai');
const sinon = require('sinon');
const { ZCLNode, ZCL, ZCLStatus } = require('zigbee-clusters');
const { Device } = require('homey');
const Driver = require('../../../drivers/sensors-TS0601_motion/device');

// Mock Homey environment
const mockHomey = {
  __: (key) => key,
  homey: {
    __: (key) => key,
    __n: (key) => key,
  },
  log: {
    info: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
  },
};

describe('TS0601 Motion Sensor - Integration', function() {
  this.timeout(10000); // Increase timeout for integration tests
  
  let device;
  let zclNode;
  
  before(async () => {
    // Create a real ZCL Node for testing
    zclNode = new ZCLNode({
      manufacturerID: 0x1002, // Tuya manufacturer ID
      networkAddress: 0x1234,
    });
    
    // Add IAS Zone cluster to the node
    await zclNode.addEndpoint(1, {
      inputClusters: [
        ZCL.ClusterId.genBasic,
        ZCL.ClusterId.genPowerCfg,
        ZCL.ClusterId.genIdentify,
        ZCL.ClusterId.genOnOff,
        ZCL.ClusterId.ssIasZone,
        ZCL.ClusterId.msTemperatureMeasurement,
      ],
    });
  });
  
  beforeEach(async () => {
    // Create a new device instance for each test
    device = new Device({
      id: 'test-device-int',
      name: 'Test Motion Sensor (Integration)',
      settings: {
        motion_reset: 60,
        temperature_offset: 0,
      },
      store: {},
      storeSettings: {},
      getStoreValue: sinon.stub(),
      setStoreValue: sinon.stub(),
      unsetStoreValue: sinon.stub(),
      getSettings: () => ({
        motion_reset: 60,
        temperature_offset: 0,
      }),
      hasCapability: (capability) => [
        'alarm_motion',
        'measure_temperature',
        'measure_battery',
        'alarm_battery',
      ].includes(capability),
      getCapabilityValue: sinon.stub().returns(false),
      setCapabilityValue: sinon.stub().resolves(),
      registerCapabilityListener: sinon.stub().resolves(),
      registerSetting: sinon.stub(),
      getClusterEndpoint: (cluster) => 1,
      zclNode,
    });
    
    // Initialize the device
    await device.onNodeInit({ zclNode, node: {} });
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  it('should handle motion detection correctly', async () => {
    // Get the IAS Zone cluster
    const iasZoneCluster = zclNode.getClusterServer(ZCL.ClusterId.ssIasZone, 1);
    
    // Simulate motion detected
    await iasZoneCluster.handleZoneStatusChangeNotification({
      zoneStatus: 1, // Motion detected
      extendedStatus: 0,
      zoneId: 1,
      delay: 0,
    });
    
    // Verify motion is detected
    expect(device.setCapabilityValue.calledWith('alarm_motion', true)).to.be.true;
    
    // Simulate motion cleared
    await iasZoneCluster.handleZoneStatusChangeNotification({
      zoneStatus: 0, // Motion cleared
      extendedStatus: 0,
      zoneId: 1,
      delay: 0,
    });
    
    // Verify motion is cleared
    expect(device.setCapabilityValue.calledWith('alarm_motion', false)).to.be.true;
  });
  
  it('should read temperature correctly', async () => {
    // Get the Temperature Measurement cluster
    const tempCluster = zclNode.getClusterServer(ZCL.ClusterId.msTemperatureMeasurement, 1);
    
    // Update the temperature attribute
    await tempCluster.attributes.measuredValue.update(2500); // 25.00°C
    
    // Trigger a read
    await device.readTemperature();
    
    // Verify temperature is read correctly
    expect(device.setCapabilityValue.calledWith('measure_temperature', 25.0)).to.be.true;
    
    // Test with offset
    device.getSettings = () => ({
      temperature_offset: 1.5,
      motion_reset: 60,
    });
    
    await device.readTemperature();
    
    // Verify offset is applied
    expect(device.setCapabilityValue.calledWith('measure_temperature', 26.5)).to.be.true;
  });
  
  it('should handle battery level changes', async () => {
    // Get the Power Configuration cluster
    const powerCluster = zclNode.getClusterServer(ZCL.ClusterId.genPowerCfg, 1);
    
    // Update the battery level attribute
    await powerCluster.attributes.batteryPercentageRemaining.update(200); // 100%
    
    // Trigger a read
    await device.readBattery();
    
    // Verify battery level is read correctly
    expect(device.setCapabilityValue.calledWith('measure_battery', 100)).to.be.true;
    
    // Test low battery
    await powerCluster.attributes.batteryPercentageRemaining.update(30); // 15%
    await device.readBattery();
    
    // Verify battery alarm is triggered
    expect(device.setCapabilityValue.calledWith('alarm_battery', true)).to.be.true;
  });
  
  it('should handle settings changes', async () => {
    // Change motion reset time
    await device.onMotionResetSettingChanged(30);
    
    // Verify the change is reflected in the next motion detection
    const iasZoneCluster = zclNode.getClusterServer(ZCL.ClusterId.ssIasZone, 1);
    
    // Simulate motion detected
    await iasZoneCluster.handleZoneStatusChangeNotification({
      zoneStatus: 1,
      extendedStatus: 0,
      zoneId: 1,
      delay: 0,
    });
    
    // Fast-forward time to verify the new reset time is used
    const clock = sinon.useFakeTimers();
    await clock.tick(31000);
    
    // Verify motion is cleared after the new reset time
    expect(device.setCapabilityValue.calledWith('alarm_motion', false)).to.be.true;
    
    clock.restore();
  });
  
  it('should clean up resources on deletion', async () => {
    // Set up a spy on clearTimeout and clearInterval
    const clearTimeoutSpy = sinon.spy(global, 'clearTimeout');
    const clearIntervalSpy = sinon.spy(global, 'clearInterval');
    
    // Trigger some timeouts and intervals
    const iasZoneCluster = zclNode.getClusterServer(ZCL.ClusterId.ssIasZone, 1);
    await iasZoneCluster.handleZoneStatusChangeNotification({
      zoneStatus: 1,
      extendedStatus: 0,
      zoneId: 1,
      delay: 0,
    });
    
    // Call onDeleted
    await device.onDeleted();
    
    // Verify cleanup
    expect(clearTimeoutSpy.called).to.be.true;
    expect(clearIntervalSpy.called).to.be.true;
    
    // Clean up spies
    clearTimeoutSpy.restore();
    clearIntervalSpy.restore();
  });
});
