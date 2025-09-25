#!/usr/bin/env node
'use strict';

// Configure environment for testing
process.env.NODE_ENV = 'test';

// Set up chai
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const sinon = require('sinon');
const { expect } = chai;

// Configure chai plugins
chai.use(chaiAsPromised);
chai.use(sinonChai);

// Global test utilities
global.expect = expect;
global.sinon = sinon;

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
    warn: sinon.stub(),
    debug: sinon.stub(),
    verbose: sinon.stub(),
    silly: sinon.stub(),
  },
  settings: {
    get: sinon.stub(),
    set: sinon.stub(),
    unset: sinon.stub(),
  },
  cloud: {
    getLocalAddress: sinon.stub().resolves('http://localhost:3000'),
  },
};

// Mock Homey API
class HomeyAPI {
  static create(version = 'latest') {
    return Promise.resolve({
      devices: {
        on: sinon.stub(),
        getDevice: sinon.stub(),
        getDevices: sinon.stub().resolves([]),
      },
      zones: {
        on: sinon.stub(),
        getZones: sinon.stub().resolves([]),
      },
      i18n: {
        __: (key) => key,
      },
      version,
    });
  }
}

// Mock Homey.App
class HomeyApp {
  constructor() {
    this.homey = mockHomey;
    this.log = mockHomey.log;
    this.error = mockHomey.log.error;
    this.debug = mockHomey.log.debug;
  }
}

// Mock Homey.Device
class HomeyDevice {
  constructor(deviceData = {}) {
    this.id = deviceData.id || 'test-device';
    this.name = deviceData.name || 'Test Device';
    this.data = deviceData.data || {};
    this.store = deviceData.store || {};
    this.settings = deviceData.settings || {};
    this.capabilities = deviceData.capabilities || [];
    this.capabilityObj = deviceData.capabilityObj || {};
    
    // Mock methods
    this.getStoreValue = sinon.stub();
    this.setStoreValue = sinon.stub().resolves();
    this.unsetStoreValue = sinon.stub().resolves();
    this.getSettings = sinon.stub().resolves(this.settings);
    this.setSettings = sinon.stub().resolves();
    this.getSetting = sinon.stub().callsFake(key => this.settings[key]);
    this.setSetting = sinon.stub().callsFake((key, value) => {
      this.settings[key] = value;
      return Promise.resolve();
    });
    this.hasCapability = sinon.stub().callsFake(capability => 
      this.capabilities.includes(capability)
    );
    this.addCapability = sinon.stub().resolves();
    this.removeCapability = sinon.stub().resolves();
    this.getCapabilityValue = sinon.stub().callsFake(capability => 
      this.capabilityObj[capability]
    );
    this.setCapabilityValue = sinon.stub().callsFake((capability, value) => {
      this.capabilityObj[capability] = value;
      return Promise.resolve();
    });
    this.registerCapabilityListener = sinon.stub().resolves();
    this.registerMultipleCapabilityListener = sinon.stub().resolves();
    this.registerSetting = sinon.stub();
    this.registerReportListener = sinon.stub().resolves();
    this.registerAttrReportListener = sinon.stub().resolves();
    this.unregisterReportListener = sinon.stub().resolves();
    this.setUnavailable = sinon.stub().resolves();
    this.setAvailable = sinon.stub().resolves();
    this.setWarning = sinon.stub().resolves();
    this.unsetWarning = sinon.stub().resolves();
    this.destroy = sinon.stub().resolves();
  }
}

// Mock Homey.FlowCardAction
class FlowCardAction {
  constructor() {
    this.register = sinon.stub().resolves();
    this.registerRunListener = sinon.stub();
    this.trigger = sinon.stub().resolves();
  }
}

// Mock Homey.FlowCardCondition
class FlowCardCondition {
  constructor() {
    this.register = sinon.stub().resolves();
    this.registerRunListener = sinon.stub();
  }
}

// Mock Homey.FlowCardTrigger
class FlowCardTrigger {
  constructor() {
    this.register = sinon.stub().resolves();
    this.registerRunListener = sinon.stub();
    this.trigger = sinon.stub().resolves();
  }
}

// Mock Homey.SimpleClass
class SimpleClass {
  constructor() {
    this.log = mockHomey.log;
  }
}

// Export mocks
module.exports = {
  mockHomey,
  HomeyAPI,
  HomeyApp,
  HomeyDevice,
  FlowCardAction,
  FlowCardCondition,
  FlowCardTrigger,
  SimpleClass,
  // Re-export test utilities
  expect,
  sinon,
};

// Set up global mocks
global.Homey = mockHomey;
global.HomeyAPI = HomeyAPI;
