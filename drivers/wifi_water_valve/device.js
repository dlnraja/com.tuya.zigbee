'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiWaterValveDevice extends PhysicalButtonMixin(VirtualButtonMixin(TuyaLocalDevice)) {
  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: null },
      '3':  { capability: null },
      '5':  { capability: null },
      '6':  { capability: 'measure_battery' },
      '7':  { capability: null },
      '9':  { capability: null },
      '11': { capability: null },
      '12': { capability: null },
      '15': { capability: null },
      '17': { capability: null },
    };
  }

  async onInit() {
    await super.onInit();
    if (!this.hasCapability('measure_battery')) {
      try {
        await this.addCapability('measure_battery').catch(() => { });
      } catch (e) {
        // optional
      }
    }
    this.log('[WIFI-WATER-VALVE] Ready');
  }

  onDeleted() {
    this.log('Device deleted, cleaning up');
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = WiFiWaterValveDevice;
