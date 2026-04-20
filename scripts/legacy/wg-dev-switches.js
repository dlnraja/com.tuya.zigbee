const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(f,c){fs.writeFileSync(p.join(B,f),c);console.log(f);}

w('wifi_switch/device.js',`'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WiFiSwitchDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
    };
  }
}
module.exports = WiFiSwitchDevice;
`);

w('wifi_switch_2gang/device.js',`'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WiFiSwitch2GangDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2': { capability: 'onoff.gang2', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
    };
  }
}
module.exports = WiFiSwitch2GangDevice;
`);

w('wifi_switch_3gang/device.js',`'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WiFiSwitch3GangDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2': { capability: 'onoff.gang2', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '3': { capability: 'onoff.gang3', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
    };
  }
}
module.exports = WiFiSwitch3GangDevice;
`);

w('wifi_switch_4gang/device.js',`'use strict';
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
`);
console.log('switches done');
