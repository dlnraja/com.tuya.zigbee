'use strict';

const Homey = require('homey');

class SmartRcboDriver extends Homey.Driver {
  async onInit() {
    this.log('Smart RCBO Driver initialized');
  }
}

module.exports = SmartRcboDriver;
