'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDoorbellDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '101': { capability: 'alarm_generic', transform: (v) => !!v },
      '103': { capability: null }, // motion detection sensitivity
      '104': { capability: 'alarm_motion', transform: (v) => !!v },
      '105': { capability: null }, // basic nightvision (auto/on/off)
      '106': { capability: null }, // SD card status
      '108': { capability: null }, // basic flip (image rotation)
      '109': { capability: null }, // record mode (1=event, 2=always)
      '110': { capability: null }, // record switch
      '115': { capability: null }, // motion switch
      '134': { capability: null }, // motion sensitivity
      '136': { capability: null }, // decibel switch
      '139': { capability: null }, // PIR switch
      '150': { capability: null }, // SD card format
      '154': { capability: null }, // motion area switch
      '155': { capability: null }, // motion area string
      '185': { capability: null }, // chime ring (Tuya doorbell)
    };
  }

  _fireFlowTriggers(changes) {
    if (changes['alarm_generic']) {
      const flowId = 'wifi_doorbell_ring';
      try { this.homey.flow.getTriggerCard().trigger(this {}, {}).catch(() => {}); }
      catch (e) { /* no flow card */ }
    }
    if (changes['alarm_motion']) {
      const flowId = 'wifi_doorbell_motion';
      try { this.homey.flow.getTriggerCard().trigger(this {}, {}).catch(() => {}); }
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
    this.log('[WIFI-DOORBELL] Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiDoorbellDevice;

