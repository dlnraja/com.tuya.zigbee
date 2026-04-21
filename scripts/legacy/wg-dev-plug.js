const fs=require('fs'),p=require('path'),B=p.resolve('drivers');
function w(f,c){fs.writeFileSync(p.join(B,f),c);console.log(f);}

w('wifi_plug/device.js',`'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WiFiPlugDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '9': { capability },
      '17': { capability: 'meter_power', divisor: 100 },
      '18': { capability: 'measure_current', divisor: 1000 },
      '19': { capability: 'measure_power', divisor: 10 },
      '20': { capability: 'measure_voltage', divisor: 10 },
    };
  }
  async onInit() {
    await super.onInit();
    for (const c of ['measure_current','measure_voltage']) {
      if (!this.hasCapability(c)) {
        try { await this.addCapability(c); } catch(e) {}
      }
    }
    this.log('[WIFI-PLUG] Ready');
  }
}
module.exports = WiFiPlugDevice;
`);
console.log('plug done');
