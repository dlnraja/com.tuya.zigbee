'use strict';

const EventEmitter = require('events');

class HomeyMock extends EventEmitter {
  constructor() {
    super();
    this.app = {
      homey: this,
    };
    this.log = jest.fn();
    this.error = jest.fn();
    this.warn = jest.fn();
    this.debug = jest.fn();
    this.settings = new Map();
  }

  __(key) {
    return key; // Return the key as the translation
  }

  setSettings(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      this.settings.set(key, value);
    });
    return Promise.resolve();
  }

  getSettings() {
    const settings = {};
    this.settings.forEach((value, key) => {
      settings[key] = value;
    });
    return Promise.resolve(settings);
  }

  getSetting(key) {
    return Promise.resolve(this.settings.get(key));
  }

  setSetting(key, value) {
    this.settings.set(key, value);
    return Promise.resolve();
  }

  getI18n() {
    return {
      __: (key) => key, // Simple translation mock
    };
  }
}

const homey = new HomeyMock();

// Mock the Homey global
if (!global.Homey) {
  global.Homey = homey;
}

module.exports = homey;
