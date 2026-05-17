'use strict';

const Homey = require('homey');

class WeatherStationOutdoorDriver extends Homey.Driver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('Weather Station Outdoor driver v7.4.11 initialized');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = WeatherStationOutdoorDriver;
