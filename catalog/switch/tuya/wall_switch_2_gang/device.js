#!/usr/bin/env node
'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Configuration des capacités
    const capabilities = ["onoff"];
    for (const capability of capabilities) {
      await this.registerCapability(capability, 'genOnOff');
    }
  }
}

module.exports = TuyaDevice;