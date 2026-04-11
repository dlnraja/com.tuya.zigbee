'use strict';

const StorageAdapter = require('homey-api/lib/AthomCloudAPI/StorageAdapter');
const Settings = require('../services/Settings');

module.exports = class extends StorageAdapter {

  async get() {
    const value = await Settings.get('homeyApi');
    return value ?? {};
  }

  async set(value) {
    return Settings.set('homeyApi', value);
  }

};
