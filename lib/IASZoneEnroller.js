'use strict';

/**
 * IASZoneEnroller - Stub for backward compatibility
 * Real implementation is in lib/managers/IASZoneManager.js
 */

const IASZoneManager = require('./managers/IASZoneManager');

class IASZoneEnroller {
  constructor(device) {
    this.device = device;
    this.manager = new IASZoneManager(device);
  }

  async enroll() {
    try {
      return await this.manager.enrollIASZone();
    } catch (err) {
      this.device?.log?.('[IASZoneEnroller] Enroll error:', err.message);
      return false;
    }
  }

  async configure() {
    try {
      return await this.manager.configureReporting();
    } catch (err) {
      this.device?.log?.('[IASZoneEnroller] Configure error:', err.message);
      return false;
    }
  }
}

module.exports = IASZoneEnroller;
