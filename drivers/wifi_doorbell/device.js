'use strict';
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDoorbellDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '101': { capability: 'alarm_generic', transform: (v) => !!v },
      '103': { capability: 'unknown' }, // motion detection sensitivity
      '104': { capability: 'alarm_motion', transform: (v) => !!v },
      '105': { capability: 'unknown' }, // basic nightvision (auto/on/off)
      '106': { capability: 'unknown' }, // SD card status
      '108': { capability: 'unknown' }, // basic flip (image rotation)
      '109': { capability: 'unknown' }, // record mode (1=event, 2=always)
      '110': { capability: 'unknown' }, // record switch
      '115': { capability: 'unknown' }, // motion switch
      '134': { capability: 'unknown' }, // motion sensitivity
      '136': { capability: 'unknown' }, // decibel switch
      '139': { capability: 'unknown' }, // PIR switch
      '150': { capability: 'unknown' }, // SD card format
      '154': { capability: 'unknown' }, // motion area switch
      '155': { capability: 'unknown' }, // motion area string
      '185': { capability: 'unknown' }, // chime ring (Tuya doorbell)
    };
  }

  _fireFlowTriggers(changes) {
    if (changes['alarm_generic']) {
      const flowId = 'wifi_doorbell_ring';
      try {
      this._getFlowCard(flowId)?.trigger(this, {}, {}).catch(this.error || console.error) }
      catch (e) { /* no flow card */ }
    }
    if (changes['alarm_motion']) {
      const flowId = 'wifi_doorbell_motion';
      try {
      this._getFlowCard(flowId)?.trigger(this, {}, {}).catch(this.error || console.error) }
      catch (e) { /* no flow card */ }
    }
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['alarm_generic', 'alarm_motion']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-DOORBELL] Ready' );
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiDoorbellDevice;


