'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaRGBControllerDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Register onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'genOnOff', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 30,
            minChange: 1,
          },
        },
      });
    }

    // Register dim capability
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 30,
            minChange: 5,
          },
        },
      });
    }

    // Register hue capability
    if (this.hasCapability('light_hue')) {
      this.registerCapability('light_hue', 'lightingColorCtrl', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 30,
            minChange: 5,
          },
        },
      });
    }

    // Register saturation capability
    if (this.hasCapability('light_saturation')) {
      this.registerCapability('light_saturation', 'lightingColorCtrl', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 30,
            minChange: 5,
          },
        },
      });
    }

    // Register color temperature capability
    if (this.hasCapability('light_temperature')) {
      this.registerCapability('light_temperature', 'lightingColorCtrl', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 30,
            minChange: 5,
          },
        },
      });
    }

    this.log('Tuya RGB LED Controller initialized');
  }

}

module.exports = TuyaRGBControllerDevice;
