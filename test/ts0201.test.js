const { expect } = require('chai');
const Homey = require('homey');
const { ZCLNode, CLUSTER } = require('zigbee-clusters');

// Mock the Homey environment
const { mock } = require('homey-mock');

// Import the device class
const TS0201Device = require('../drivers/sensors/ts0201/device');

describe('TS0201 Temperature & Humidity Sensor', () => {
  let device;
  let mockNode;
  let mockHomey;

  before(() => {
    // Set up the Homey mock environment
    mockHomey = mock(Homey);
    
    // Create a mock ZCL node
    mockNode = new ZCLNode({
      manufacturerName: '_TZ3000_qaayslip',
      modelId: 'TS0201'
    });
    
    // Initialize the device
    device = new TS0201Device({
      homey: mockHomey,
      data: { id: 'test-device' },
      settings: {}
    });
    
    // Mock the ZCL node
    device.zclNode = mockNode;
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await device.onNodeInit({ zclNode: mockNode });
      expect(device).to.be.an.instanceOf(TS0201Device);
    });
  });

  describe('Temperature Measurement', () => {
    it('should handle temperature reports', async () => {
      const testTemp = 2450; // 24.5°C
      
      // Simulate a temperature report
      await mockNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT]._handleReport({
        attributes: {
          measuredValue: testTemp
        },
        meta: {}
      });
      
      // Check if the capability was updated
      const currentTemp = device.getCapabilityValue('measure_temperature');
      expect(currentTemp).to.equal(24.5);
    });
  });

  describe('Humidity Measurement', () => {
    it('should handle humidity reports', async () => {
      const testHumidity = 6500; // 65.0%
      
      // Simulate a humidity report
      await mockNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT]._handleReport({
        attributes: {
          measuredValue: testHumidity
        },
        meta: {}
      });
      
      // Check if the capability was updated
      const currentHumidity = device.getCapabilityValue('measure_humidity');
      expect(currentHumidity).to.equal(65.0);
    });
  });

  describe('Battery Measurement', () => {
    it('should handle battery reports', async () => {
      const testBattery = 160; // 80% (160/2)
      
      // Simulate a battery report
      await mockNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION]._handleReport({
        attributes: {
          batteryPercentageRemaining: testBattery
        },
        meta: {}
      });
      
      // Check if the capability was updated
      const currentBattery = device.getCapabilityValue('measure_battery');
      expect(currentBattery).to.equal(80);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing cluster gracefully', async () => {
      // Remove the temperature cluster for this test
      const tempCluster = mockNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT];
      delete mockNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT];
      
      try {
        await device.readTemperature();
        // If we get here, the error was not thrown as expected
        expect.fail('Should have thrown an error for missing cluster');
      } catch (error) {
        expect(error.message).to.include('not found');
      }
      
      // Restore the cluster
      mockNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT] = tempCluster;
    });
  });

  after(() => {
    // Clean up
    mockHomey.clearMocks();
  });
});
