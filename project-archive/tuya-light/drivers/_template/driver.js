'use strict';

const Homey = require('homey');

class TuyaDriverTemplate extends Homey.Driver {
  
  async onInit() {
    this.log('Driver initialized');
    this._registerFlowCards();
  }
  
  _registerFlowCards() {
    // Flow cards communes
  }
  
  async onPairListDevices() {
    // Logique de pairing standard
  }
}

module.exports = TuyaDriverTemplate;
