'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaSmartLightDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // enable debugging
    this.enableDebug();

    // print the node's info to the console
    this.printNode();

    // Register onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'genOnOff');
    }

    // Register dim capability
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl');
    }

    // Register color temperature capability
    if (this.hasCapability('light_temperature')) {
      this.registerCapability('light_temperature', 'lightingColorCtrl', {
        get: 'colorTempMireds',
        getOpts: {
          getOnStart: true,
        },
        set: 'colorTempMireds',
        setParser: value => {
          const mireds = Math.round(1000000 / (value * 347 + 153));
          return mireds;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 1,
          },
        },
      });
    }

    // Register hue capability
    if (this.hasCapability('light_hue')) {
      this.registerCapability('light_hue', 'lightingColorCtrl', {
        get: 'currentHue',
        set: 'currentHue',
        setParser: value => Math.round(value * 254),
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 1,
          },
        },
      });
    }

    // Register saturation capability
    if (this.hasCapability('light_saturation')) {
      this.registerCapability('light_saturation', 'lightingColorCtrl', {
        get: 'currentSaturation',
        set: 'currentSaturation',
        setParser: value => Math.round(value * 254),
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 1,
          },
        },
      });
    }

    this.log('Tuya Smart Light initialized');
  }

}

module.exports = TuyaSmartLightDevice;
