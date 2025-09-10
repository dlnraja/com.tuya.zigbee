#!/usr/bin/env node
'use strict';

const Homey = require('homey');

class Logger {
  constructor(driver) {
    this.driver = driver;
  }

  info(message) {
    Homey.app.log(`[INFO] ${message}`);
  }

  error(message) {
    Homey.app.error(`[ERROR] ${message}`);
  }

  debug(message) {
    if (process.env.DEBUG) {
      Homey.app.log(`[DEBUG] ${message}`);
    }
  }
}

module.exports = Logger;
