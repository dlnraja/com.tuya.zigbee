const { expect } = require('chai');
const sinon = require('sinon');
const { CLUSTER } = require('zigbee-clusters');

// Mock the required modules
const { ZigbeeDevice } = require('homey-zigbeedriver');
const BaseZigbeeDevice = require('../../drivers/templates/BaseZigbeeDevice');

describe('BaseZigbeeDevice', () => {
  let device;
  let nodeStub;
  let zclNodeStub;
  let endpointStub;
  let clusterStub;
  
  beforeEach(() => {
    // Create stubs for the device and its dependencies
    nodeStub = {
      ieeeAddr: '00:11:22:33:44:55:66:77',
      getEndpoint: sinon.stub()
    };
    
    clusterStub = {
      readAttribute: sinon.stub(),
      writeAttribute: sinon.stub(),
      configureReporting: sinon.stub()
    };
    
    endpointStub = {
      clusters: {
        basic: clusterStub
      },
      bind: sinon.stub().resolves()
    };
    
    zclNodeStub = {
      endpoints: {
        1: endpointStub
      }
    };
    
    // Create a test device instance
    device = new BaseZigbeeDevice({
      zclNode: zclNodeStub,
      node: nodeStub,
      homey: {
        __: (key) => key // i18n mock
      },
      store: {
        get: () => ({
          modelId: 'TS0121',
          manufacturerName: 'TuYa',
        }),
        set: () => {},
        save: () => {}
      },
      registerCapability: sinon.spy(),
      registerCapabilityListener: sinon.spy(),
      setCapabilityValue: sinon.spy(),
      getCapabilityValue: sinon.stub().returns(false),
      getSettings: () => ({}),
      setSettings: () => {},
      log: console.log,
      error: console.error,
      debug: console.debug,
      getStoreValue: (key) => {
        const store = {
          modelId: 'TS0121',
          manufacturerName: 'TuYa',
        };
        return store[key];
      },
      setStoreValue: () => {},
      hasCapability: () => true,
      getDriver: () => ({
        homey: {
          __: (key) => key
        }
      })
    });
    
    // Stub the configureReporting method
    device.configureReporting = sinon.stub().resolves(true);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('onNodeInit', () => {
    it('should initialize the device with default settings', async () => {
      await device.onNodeInit();
      
      // Verify that capabilities were registered
      expect(device.registerCapability.called).to.be.true;
      
      // Verify that the device was configured
      expect(device.configureReporting.called).to.be.true;
      
      // Verify that event listeners were set up
      expect(device.registerCapabilityListener.calledWith('alarm_battery')).to.be.true;
    });
  });
  
  describe('configureDevice', () => {
    it('should configure basic cluster reporting', async () => {
      await device.configureDevice();
      
      // Verify that configureReporting was called with the correct parameters
      expect(device.configureReporting.calledOnce).to.be.true;
      const args = device.configureReporting.getCall(0).args[0];
      
      expect(args.endpoint).to.equal(1);
      expect(args.cluster).to.equal(CLUSTER.BASIC);
      expect(args.attributes).to.be.an('array').with.length.greaterThan(0);
      
      // Verify that all required attributes are included
      const attributeIds = args.attributes.map(attr => attr.attribute);
      expect(attributeIds).to.include('zclVersion');
      expect(attributeIds).to.include('appVersion');
      expect(attributeIds).to.include('manufacturerName');
      expect(attributeIds).to.include('modelId');
    });
  });
  
  describe('registerCapability', () => {
    it('should register a capability with default handlers', () => {
      const capability = 'onoff';
      const cluster = 'genOnOff';
      const attribute = 'onOff';
      
      device.registerCapability(capability, cluster, { attribute });
      
      // Verify that the capability was registered
      expect(device.registerCapability.calledOnce).to.be.true;
      
      const [cap, handlers] = device.registerCapability.getCall(0).args;
      expect(cap).to.equal(capability);
      expect(handlers).to.have.property('get');
      expect(handlers).to.have.property('set');
      expect(handlers).to.have.property('report');
      expect(handlers.reportOpts).to.have.property('configureAttributeReporting');
    });
  });
  
  describe('onSettings', () => {
    it('should handle settings changes', async () => {
      const settings = { pollInterval: 300 };
      const changedKeys = ['pollInterval'];
      
      // Stub the applySetting method
      device.applySetting = sinon.stub().resolves();
      
      await device.onSettings(settings, changedKeys);
      
      // Verify that applySetting was called with the correct parameters
      expect(device.applySetting.calledOnce).to.be.true;
      expect(device.applySetting.getCall(0).args).to.deep.equal([
        'pollInterval',
        300
      ]);
    });
  });
  
  describe('_defaultCapabilityGetter', () => {
    it('should get a capability value from the device', async () => {
      const capability = 'onoff';
      const cluster = 'genOnOff';
      const attribute = 'onOff';
      const value = true;
      
      // Stub the cluster's readAttribute method
      endpointStub.clusters[cluster] = {
        readAttribute: sinon.stub().resolves(value)
      };
      
      const getter = device._defaultCapabilityGetter(cluster, attribute);
      const result = await getter();
      
      // Verify that the value was read from the device
      expect(result).to.equal(value);
      expect(endpointStub.clusters[cluster].readAttribute.calledOnce).to.be.true;
      expect(endpointStub.clusters[cluster].readAttribute.getCall(0).args[0]).to.equal(attribute);
    });
  });
  
  describe('_defaultCapabilitySetter', () => {
    it('should set a capability value on the device', async () => {
      const capability = 'onoff';
      const cluster = 'genOnOff';
      const attribute = 'onOff';
      const value = true;
      
      // Stub the cluster's writeAttribute method
      endpointStub.clusters[cluster] = {
        writeAttribute: sinon.stub().resolves()
      };
      
      const setter = device._defaultCapabilitySetter(cluster, attribute);
      await setter(value);
      
      // Verify that the value was written to the device
      expect(endpointStub.clusters[cluster].writeAttribute.calledOnce).to.be.true;
      expect(endpointStub.clusters[cluster].writeAttribute.getCall(0).args).to.deep.equal([
        attribute,
        value
      ]);
    });
  });
  
  describe('_defaultCapabilityReporter', () => {
    it('should handle attribute reports', async () => {
      const capability = 'onoff';
      const cluster = 'genOnOff';
      const attribute = 'onOff';
      const value = true;
      
      // Create a reporter
      const reporter = device._defaultCapabilityReporter(capability, cluster, attribute);
      
      // Call the reporter with a value
      const result = await reporter({ value });
      
      // Verify that the capability value was updated
      expect(result).to.equal(value);
      expect(device.setCapabilityValue.calledOnce).to.be.true;
      expect(device.setCapabilityValue.getCall(0).args).to.deep.equal([
        capability,
        value
      ]);
    });
  });
});
