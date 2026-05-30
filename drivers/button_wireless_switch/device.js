'use strict';
const { safeParse, safeMultiply } = require('../../lib/utils/tuyaUtils.js');

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin.js');
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
    this._zclState = { 
      lastState: { 1: null, 2: null }, 
      pending: { 1: false, 2: false }, 
      timeout: { 1: null, 2: null },
      lastReport: { 1: 0, 2: 0 }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true;

    // Remove group memberships for isolation
    await this._removeGroupMemberships(zclNode);

    this._lastCommandedGang = null;
    this._lastCommandTime = 0;

    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
    };

    for (const epNum of [1, 2]) {
      const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-2G] EP${epNum} app cmd: ${value}`);
        this._lastCommandedGang = epNum;
        this._lastCommandTime = Date.now();
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => { this._zclState.pending[epNum] = false; }, 2000);
        
        const onOff = getOnOffCluster(epNum);
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
      const onOff = getOnOffCluster(epNum);
      if (onOff && typeof onOff.on === 'function') {
        const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
        onOff.on('attr.onOff', async (value) => {
          const now = Date.now();
          if (now - (this._zclState.lastReport[epNum] || 0) < 1000) return;
          this._zclState.lastReport[epNum] = now;

          const isPhysical = !this._zclState.pending[epNum];
          const isBroadcast = !isPhysical && this._lastCommandedGang
            && epNum !== this._lastCommandedGang
            && (now - this._lastCommandTime) < 2000;
          if (isBroadcast) {
            this.log(`[BSEED-2G] EP${epNum} attr: ${value} FILTERED (broadcast from G${this._lastCommandedGang})`);
            return;
          }
          this.log(`[BSEED-2G] EP${epNum} attr: ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

          if (this._zclState.lastState[epNum] !== value) {
            this._zclState.lastState[epNum] = value;
            this.setCapabilityValue(capName, !!value).catch(() => {});

            const mode = this.sceneMode;
            if (mode === 'magic') {
              this.setCapabilityValue(capName, !value).catch(() => {});
            }
            if (isPhysical && (mode === 'auto' || mode === 'both')) {
              const flowId = `button_wireless_switch_switch_2gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
              try {
                const card = this.homey.flow.getDeviceTriggerCard(flowId);
                if (card) {
                  await card.trigger(this, { gang: epNum, state: value }, {}).catch(() => {});
                  this.log(`[BSEED-2G] ✅ Physical G${epNum} ${value ? 'ON' : 'OFF'}`);
                }
              } catch (e) { }
            }
            if (isPhysical && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
              const sceneId = `button_wireless_switch_switch_2gang_gang${epNum}_scene`;
              try {
                const card = this.homey.flow.getDeviceTriggerCard(sceneId);
                if (card) {
                  await card.trigger(this, { action: value ? 'on' : 'off' }, {}).catch(() => {});
                  this.log(`[BSEED-2G] ✅ Scene G${epNum} ${value ? 'on' : 'off'}`);
                }
              } catch (e) { }
            }
          }
        });
      }
    }
  }

  async _removeGroupMemberships(zclNode) {
    for (const epNum of [1, 2]) {
      try {
        const ep = zclNode?.endpoints?.[epNum];
        const g = ep?.clusters?.groups || ep?.clusters?.genGroups;
        if (typeof g?.removeAll === 'function') {
          await g.removeAll().catch(() => {});
          this.log(`[BSEED-2G] EP${epNum} Group memberships removed`);
        }
      } catch (err) { }
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
