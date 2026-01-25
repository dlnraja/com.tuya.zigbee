'use strict';

const Homey = require('homey');

class SwitchDimmer1GangDriver extends Homey.Driver {

  async onInit() {
    this.log('Switch Touch Dimmer (1 Gang) Driver has been initialized');
    
    // v5.5.776: Flow cards are auto-registered by homeycompose from driver.flow.compose.json
    // Manual registration removed to prevent "Invalid Flow Card ID" errors
    // when driver.flow.compose.json is not properly compiled into app.json
  }

  async onPairListDevices() {
    return [];
  }

}

module.exports = SwitchDimmer1GangDriver;
