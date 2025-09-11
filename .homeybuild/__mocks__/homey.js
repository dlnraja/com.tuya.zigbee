
const { EventEmitter } = require('events');

class HomeyApp extends EventEmitter {
  constructor() {
    super();
    this.manifest = null;
    this.ready = false;
    this.log = console.log.bind(console);
    this.error = console.error.bind(console);
  }

  async onInit() {
    this.ready = true;
    this.emit('ready');
    return Promise.resolve();
  }

  async onUninit() {
    this.ready = false;
    return Promise.resolve();
  }

  getManifest() {
    return this.manifest || {};
  }
}

class HomeyDevice extends EventEmitter {
  constructor() {
    super();
    this.capabilities = new Map();
    this.settings = new Map();
    this.available = true;
    this.log = console.log.bind(console);
    this.error = console.error.bind(console);
  }

  async onInit() {
    return Promise.resolve();
  }

  async onAdded() {
    return Promise.resolve();
  }

  async onDeleted() {
    return Promise.resolve();
  }

  async addCapability(capabilityId) {
    this.capabilities.set(capabilityId, null);
    return Promise.resolve();
  }

  async removeCapability(capabilityId) {
    this.capabilities.delete(capabilityId);
    return Promise.resolve();
  }

  hasCapability(capabilityId) {
    return this.capabilities.has(capabilityId);
  }

  async getCapabilityValue(capabilityId) {
    return this.capabilities.get(capabilityId) || null;
  }

  async setCapabilityValue(capabilityId, value) {
    this.capabilities.set(capabilityId, value);
    this.emit('capability_changed', capabilityId, value);
    return Promise.resolve();
  }

  async registerCapabilityListener(capabilityId, listener) {
    this.on(`capability_${capabilityId}`, listener);
    return Promise.resolve();
  }

  getSetting(key) {
    return this.settings.get(key);
  }

  async setSetting(key, value) {
    this.settings.set(key, value);
    return Promise.resolve();
  }

  setAvailable() {
    this.available = true;
    return Promise.resolve();
  }

  setUnavailable(message) {
    this.available = false;
    return Promise.resolve();
  }

  getData() {
    return { id: 'mock-device' };
  }
}

class HomeyDriver extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
    this.log = console.log.bind(console);
    this.error = console.error.bind(console);
  }

  async onInit() {
    return Promise.resolve();
  }

  async onPair(session) {
    return Promise.resolve();
  }

  getDevices() {
    return Array.from(this.devices.values());
  }

  getDevice(data) {
    return this.devices.get(data.id) || null;
  }
}

module.exports = {
  App: HomeyApp,
  Device: HomeyDevice,
  Driver: HomeyDriver
};
