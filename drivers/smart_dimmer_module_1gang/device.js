'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmartDimmerModule1GangDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    // Register onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'genOnOff', {
        set: 'setOn',
        setParser: this._onOffSetParser.bind(this),
        get: 'onOff',
        report: 'onOff',
        reportParser: this._onOffReportParser.bind(this)
      });
    }

    // Register dim capability
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl', {
        set: 'moveToLevelWithOnOff',
        setParser: this._dimSetParser.bind(this),
        get: 'currentLevel',
        report: 'currentLevel',
        reportParser: this._dimReportParser.bind(this)
      });
    }

    // Register power measurement
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 'genAnalogInput');
    }

    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', 'genAnalogInput');
    }

    await super.onNodeInit({ zclNode });
  }

  _onOffSetParser(value) {
    return {
      value: value ? 1 : 0
    };
  }

  _onOffReportParser(value) {
    return value === 1;
  }

  _dimSetParser(value) {
    return {
      level: Math.round(value * 254),
      transtime: 1
    };
  }

  _dimReportParser(value) {
    return value / 254;
  }

}

module.exports = SmartDimmerModule1GangDevice;
