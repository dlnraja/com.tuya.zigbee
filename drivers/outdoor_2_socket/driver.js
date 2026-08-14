'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

const RootDevice = require('./device.js');
const SecondSocketDevice = require('./device.secondSocket.js');

class outdoor2socket_driver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerOnoffFlowCards(this, 'outdoor_2_socket');
  }

  onMapDeviceClass(device) {
    if (device.getData().subDeviceId === 'secondSocket') {
      return SecondSocketDevice;
    }
    return RootDevice;
  }
}

module.exports = outdoor2socket_driver;
