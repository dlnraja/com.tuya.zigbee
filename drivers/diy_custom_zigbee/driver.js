'use strict';

const { Driver } = require('homey');

class DiyCustomZigbeeDriver extends Driver {

  async onInit() {
    this.log('DIY Custom Zigbee Driver initialized');
    this.log('Supports: PTVO, ESP32-H2/C6, CC2530/CC2652, DIYRuZ, Tasmota Z2T');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = DiyCustomZigbeeDriver;
