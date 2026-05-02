'use strict';
const { safeParse, safeMultiply } = require('../../lib/utils/tuyaUtils.js');

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { CLUSTER } = require('zigbee-clusters');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const ZCL_ONLY_MANUFACTURERS_2G = [
  '_TZ3000_l9brjwau', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
  '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt'
];

class Switch2GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {
  get gangCount() { return 2; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  get isZclOnlyDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name') || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_2G, mfr);
  }

  async onNodeInit({ zclNode }) {
    if (this.isZclOnlyDevice) {
      await this._initZclOnlyMode(zclNode);
      return;
    }

    await super.onNodeInit({ zclNode });
    await this._setupPowerMeasurement(zclNode);
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
  }

  async _setupPowerMeasurement(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return;

    const elecCluster = endpoint.clusters.electricalMeasurement || endpoint.clusters.haElectricalMeasurement || endpoint.clusters[0x0B04];
    if (elecCluster && typeof elecCluster.on === 'function') {
      elecCluster.on('attr.activePower', (value) => {
        const watts = safeMultiply(value, 10);
        if (this.hasCapability('measure_power')) this.setCapabilityValue('measure_power', parseFloat(watts)).catch(() => { });
      });
      elecCluster.on('attr.rmsVoltage', (value) => {
        const volts = safeMultiply(value, 10);
        if (this.hasCapability('measure_voltage')) this.setCapabilityValue('measure_voltage', parseFloat(volts)).catch(() => { });
      });
      elecCluster.on('attr.rmsCurrent', (value) => {
        const amps = value * 1000;
        if (this.hasCapability('measure_current')) this.setCapabilityValue('measure_current', parseFloat(amps)).catch(() => { });
      });
      this._readElectricalAttributes(elecCluster);
    }

    const meteringCluster = endpoint.clusters.metering || endpoint.clusters.seMetering || endpoint.clusters[0x0702];
    if (meteringCluster && typeof meteringCluster.on === 'function') {
      meteringCluster.on('attr.currentSummationDelivered', (value) => {
        const kwh = value * 1000;
        if (this.hasCapability('meter_power')) this.setCapabilityValue('meter_power', parseFloat(kwh)).catch(() => { });
      });
      this._readMeteringAttributes(meteringCluster);
    }
  }

  async _readElectricalAttributes(cluster) {
    try {
      const attrs = await cluster.readAttributes(['activePower', 'rmsVoltage', 'rmsCurrent']).catch(() => ({}));
      if (attrs.activePower != null && this.hasCapability('measure_power')) {
        this.setCapabilityValue('measure_power', safeParse(attrs.activePower, 10)).catch(() => { });
      }
      if (attrs.rmsVoltage != null && this.hasCapability('measure_voltage')) {
        this.setCapabilityValue('measure_voltage', safeParse(attrs.rmsVoltage, 10)).catch(() => { });
      }
      if (attrs.rmsCurrent != null && this.hasCapability('measure_current')) {
        this.setCapabilityValue('measure_current', safeParse(attrs.rmsCurrent, 1000)).catch(() => { });
      }
    } catch (e) {
      this.log('[SWITCH-2G] Initial electrical read failed:', e.message);
    }
  }

  async _readMeteringAttributes(cluster) {
    try {
      const attrs = await cluster.readAttributes(['currentSummationDelivered']).catch(() => ({}));
      if (attrs.currentSummationDelivered != null && this.hasCapability('meter_power')) {
        this.setCapabilityValue('meter_power', attrs.currentSummationDelivered * 1000).catch(() => { });
      }
    } catch (e) {
      this.log('[SWITCH-2G] Initial metering read failed:', e.message);
    }
  }

  async _initZclOnlyMode(zclNode) {
    this._zclState = { lastState: { 1: null, 2: null }, pending: { 1: false, 2: false }, timeout: { 1: null, 2: null } };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true;

    for (const epNum of [1, 2]) {
      const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
      this.registerCapabilityListener(capName, async (value) => {
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => { this._zclState.pending[epNum] = false; }, 2000);
        
        const ep = this._zclNode?.endpoints?.[epNum];
        const onOff = ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
        if (onOff) {
          try {
            await onOff.writeAttributes({ onOff: !!value });
          } catch (e) {
            if (typeof onOff[value ? 'setOn' : 'setOff'] === 'function') await onOff[value ? 'setOn' : 'setOff']();
          }
        }
        return true;
      });
    }

    for (const epNum of [1, 2]) {
      const ep = this._zclNode?.endpoints?.[epNum];
      const onOff = ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
      if (onOff && typeof onOff.on === 'function') {
        const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
        onOff.on('attr.onOff', (value) => {
          if (!this._zclState.pending[epNum] && this._zclState.lastState[epNum] !== value) {
            this._zclState.lastState[epNum] = value;
            this.setCapabilityValue(capName, !!value).catch(() => {});
          }
        });
      }
    }
  }

  onDeleted() {
    if (this._zclState?.timeout) {
      for (const epNum of [1, 2]) {
        if (this._zclState.timeout[epNum]) clearTimeout(this._zclState.timeout[epNum]);
      }
    }
    super.onDeleted?.();
  }
}

module.exports = Switch2GangDevice;
