'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WiFiSwitch4GangDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2': { capability: 'onoff.gang2', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '3': { capability: 'onoff.gang3', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '4': { capability: 'onoff.gang4', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
    };
  }
}
module.exports = WiFiSwitch4GangDevice;
