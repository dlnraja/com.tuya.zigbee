'use strict';

/**
 * Minimal 'homey' SDK stub for offline smoke tests (tools/ci/lib-smoke-test.js).
 * On the Homey box these classes are provided by the runtime sandbox; in plain
 * node, require('homey') resolves to the CLI package (no SDK classes), so any
 * `class X extends Homey.ZigBeeDevice` crashes. This stub provides the class
 * shell so libs can be *required* — it is NOT a runtime implementation.
 */

class HomeyEventEmitter {
  constructor() {this._events = {};}
  on(evt, fn) {(this._events[evt] = this._events[evt] || []).push(fn); return this;}
  once(evt, fn) {return this.on(evt, fn);}
  off() {return this;}
  emit(evt, ...args) {(this._events[evt] || []).forEach(fn => fn(...args)); return true;}
  removeAllListeners() {this._events = {}; return this;}
}

class Device extends HomeyEventEmitter {
  constructor() {
    super();
    this.homey = {};
  }
  log() {}
  error() {}
  getData() {return {};}
  getSettings() {return {};}
  getSetting() {return undefined;}
  getCapabilities() {return [];}
  hasCapability() {return false;}
  getCapabilityValue() {return null;}
  async setCapabilityValue() {}
  async addCapability() {}
  async removeCapability() {}
  registerCapabilityListener() {}
  registerMultipleCapabilityListener() {}
  getStoreValue() {return undefined;}
  async setStoreValue() {}
  async unsetStoreValue() {}
  getDriver() {return {};}
  getName() {return 'stub';}
  getClass() {return 'other';}
  getAvailable() {return true;}
  async setAvailable() {}
  async setUnavailable() {}
  async setWarning() {}
  async unsetWarning() {}
  getEnergy() {return {};}
  getEnergyObj() {return {};}
}

class Driver extends HomeyEventEmitter {
  onPair() {}
  onMapFlowCardAction() {}
}

class App extends HomeyEventEmitter {
  log() {}
  error() {}
}

class ZigBeeDevice extends Device {
  async onNodeInit() {}
  getNode() {return {};}
}

class ZigBeeDriver extends Driver {}
class ZigBeeLightDevice extends ZigBeeDevice {}
class ZigBeeXYDevice extends ZigBeeDevice {}

module.exports = {
  Device,
  Driver,
  App,
  ZigBeeDevice,
  ZigBeeDriver,
  ZigBeeLightDevice,
  ZigBeeXYDevice,
  Util: { __: (s) => s },
  env: {},
  version: 'stub',
};
