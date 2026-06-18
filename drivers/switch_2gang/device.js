'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const { smartParse } = require('../../lib/managers/SmartDivisorManager');

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { CLUSTER } = require('zigbee-clusters');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * 
 *       2-GANG SWITCH - v8.1.0 + ZCL-Only Mode (BSEED)
 * 
 *   Features:
 *   - 2 endpoints (On / Off) (EP1, EP2)
 *   - Power measurement via electricalMeasurement (0x0B04)
 *   - Energy metering via metering (0x0702)
 *   - Physical button detection: single / double/long / triple per gang
 *   - BSEED ZCL-only mode: _TZ3000_l9brjwau (Pieter_Pessers forum)
 *   v5.9.23: GROUP ISOLATION FIX — remove group memberships + broadcast filter
 *   v8.1.0: Fixed setTimeout syntax bugs in reporting retry logic
 * 
 */

// ZCL-Only manufacturers (no Tuya DP) - forum: Pieter_Pessers BSEED 2-gang
const ZCL_ONLY_MANUFACTURERS_2G = [
  '_TZ3000_l9brjwau', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
  '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt',
  '_TZ3000_cauq1okq'
];

class Switch2GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {
  get gangCount() { return 2; }

  /**
   * v9.7.4: _setGangOnOff for flow card compatibility in ZCL-only mode.
   * When isZclOnlyDevice is true, super.onNodeInit() is bypassed, so
   * capability listeners from UnifiedSwitchBase may not be registered.
   * The flow card switch_multi_gang_turn_on/off calls _setGangOnOff() directly.
   */
  async _setGangOnOff(gang, value) {
    if (this.isZclOnlyDevice) {
      const getOnOffCluster = (epNum) => {
        const ep = this._zclNode?.endpoints?.[epNum] || this.zclNode?.endpoints?.[epNum];
        return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
      };
      const onOff = getOnOffCluster(gang);
      if (onOff && typeof onOff.writeAttributes === 'function') {
        await onOff.writeAttributes({ onOff: value ? true : false });
      } else if (onOff) {
        await onOff[value ? 'setOn' : 'setOff']();
      }
      return true;
    }
    return super._setGangOnOff(gang, value);
  }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  get isZclOnlyDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name') ||
                this.getStoreValue?.('zb_manufacturer_name') ||
                this.getStoreValue?.('manufacturerName') || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_2G, mfr);
  }

  async onNodeInit({ zclNode }) {
    if (this.isZclOnlyDevice) {
      this.log('[SWITCH-2G] ⚡ ZCL-ONLY MODE (BSEED)');
      this.zclNode = zclNode;
      await this._initZclOnlyMode(zclNode);
      return;
    }

    // v5.5.43: Cleanup orphan capabilities
    await this._cleanupOrphanCapabilities();

    // v5.13.1: CRITICAL FIX — Call super.onNodeInit() to register capability listeners
    await super.onNodeInit({ zclNode });

    // v5.5.26: Setup power measurement for ZCL devices
    await this._setupPowerMeasurement(zclNode);

    // v5.5.896: Initialize physical button detection (single / double/long / triple)
    await this.initPhysicalButtonDetection(zclNode);

    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons();

    this.log('[SWITCH-2G] v8.1.0 - Physical button + capability listeners enabled');
  }

  /**
   * v5.5.43: Remove orphan capabilities that don't belong to this driver
   */
  async _cleanupOrphanCapabilities() {
    const validCaps = [
      'onoff', 'onoff.gang2',
      'measure_power', 'measure_voltage', 'measure_current', 'meter_power'
    ];

    const currentCaps = this.getCapabilities();

    for (const cap of currentCaps) {
      if (!validCaps.includes(cap)) {
        this.log(`[SWITCH-2G] 🗑️ Removing orphan capability: ${cap}`);
        await this.removeCapability(cap).catch(e => {
          this.log(`[SWITCH-2G] Failed to remove ${cap}: ${e.message}`);
        });
      }
    }
  }

  /**
   * v5.5.26: Setup power measurement via electricalMeasurement + metering clusters
   */
  async _setupPowerMeasurement(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) {
      this.log('[SWITCH-2G] No clusters on EP1');
      return;
    }

    // electricalMeasurement cluster (0x0B04) - Power, Voltage, Current
    const elecCluster = endpoint.clusters.electricalMeasurement
      || endpoint.clusters.haElectricalMeasurement
      || endpoint.clusters[0x0B04]
      || endpoint.clusters['2820'];

    if (elecCluster) {
      this.log('[SWITCH-2G] ✅ electricalMeasurement cluster found');

      if (typeof elecCluster.on === 'function') {
        elecCluster.on('attr.activePower', (value) => {
          const watts = smartParse(value, null, { capability: 'measure_power' });
          this.log(`[ZCL-DATA] switch.power raw=${value} → ${watts}W`);
          if (this.hasCapability('measure_power')) {
            this.safeSetCapabilityValue('measure_power', parseFloat(watts)).catch(() => {});
          }
        });

        elecCluster.on('attr.rmsVoltage', (value) => {
          const volts = smartParse(value, null, { capability: 'measure_voltage' });
          this.log(`[ZCL-DATA] switch.voltage raw=${value} → ${volts}V`);
          if (this.hasCapability('measure_voltage')) {
            this.safeSetCapabilityValue('measure_voltage', parseFloat(volts)).catch(() => {});
          }
        });

        elecCluster.on('attr.rmsCurrent', (value) => {
          const amps = smartParse(value, null, { capability: 'measure_current' }) || 0;
          this.log(`[ZCL-DATA] switch.current raw=${value} → ${amps}A`);
          if (this.hasCapability('measure_current')) {
            this.safeSetCapabilityValue('measure_current', parseFloat(amps)).catch(() => {});
          }
        });
      }

      this._configureElectricalReporting();
      this._readElectricalAttributes(elecCluster);
    }

    // Metering cluster (0x0702) - Energy (kWh)
    const meteringCluster = endpoint.clusters.metering
      || endpoint.clusters.seMetering
      || endpoint.clusters[0x0702]
      || endpoint.clusters['1794'];

    if (meteringCluster) {
      this.log('[SWITCH-2G] ✅ metering cluster found');

      if (typeof meteringCluster.on === 'function') {
        meteringCluster.on('attr.current summation delivered', (value) => {
          const kwh = smartParse(value, null, { capability: 'meter_power' }) || 0;
          this.log(`[ZCL-DATA] switch.energy raw=${value} → ${kwh}kWh`);
          if (this.hasCapability('meter_power')) {
            this.safeSetCapabilityValue('meter_power', parseFloat(kwh)).catch(() => {});
          }
        });
      }

      this._configureMeteringReporting();
      this._readMeteringAttributes(meteringCluster);
    }
  }

  /**
   * v8.1.0: Configure electrical reporting with retry on Zigbee startup
   * FIXED: setTimeout syntax — delay was being multiplied into the callback return value
   */
  async _configureElectricalReporting(retryCount = 0) {
    try {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 1
        },
        {
          endpointId: 1,
          cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
          attributeName: 'rmsVoltage',
          minInterval: 60,
          maxInterval: 600,
          minChange: 10
        },
        {
          endpointId: 1,
          cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
          attributeName: 'rmsCurrent',
          minInterval: 10,
          maxInterval: 300,
          minChange: 10
        }
      ]);
      this.log('[SWITCH-2G] ✅ electricalMeasurement reporting configured');
    } catch (e) {
      const msg = e?.message || String(e);
      if ((msg.includes('Zigbee') || msg.includes('démarrage') || msg.includes('starting')) && retryCount < 3) {
        this.log(`[SWITCH-2G] ⏳ Zigbee starting, will retry electrical reporting in 60s (attempt ${retryCount + 1}/3)`);
        this.homey.setTimeout(() => { if (this._destroyed) return; this._configureElectricalReporting(retryCount + 1); }, 60000);
      } else {
        this.log('[SWITCH-2G] electricalMeasurement reporting failed:', msg);
      }
    }
  }

  /**
   * v8.1.0: Configure metering reporting with retry on Zigbee startup
   * FIXED: setTimeout syntax — delay was being multiplied into the callback return value
   */
  async _configureMeteringReporting(retryCount = 0) {
    try {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.METERING,
          attributeName: 'currentSummationDelivered',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 1
        }
      ]);
      this.log('[SWITCH-2G] ✅ metering reporting configured');
    } catch (e) {
      const msg = e?.message || String(e);
      if ((msg.includes('Zigbee') || msg.includes('démarrage') || msg.includes('starting')) && retryCount < 3) {
        this.log(`[SWITCH-2G] ⏳ Zigbee starting, will retry metering reporting in 60s (attempt ${retryCount + 1}/3)`);
        this.homey.setTimeout(() => { if (this._destroyed) return; this._configureMeteringReporting(retryCount + 1); }, 60000);
      } else {
        this.log('[SWITCH-2G] metering reporting failed:', msg);
      }
    }
  }

  /**
   * v5.5.26: Read initial electrical measurement values
   */
  async _readElectricalAttributes(cluster) {
    try {
      const attrs = await cluster.readAttributes([
        'activePower', 'rmsVoltage', 'rmsCurrent'
      ]).catch(() => ({}));

      if (this._destroyed) return;
      if (attrs.activePower != null && this.hasCapability('measure_power')) {
        this.safeSetCapabilityValue('measure_power', safeParse(attrs.activePower, 10)).catch(() => {});
      }
      if (attrs.rmsVoltage != null && this.hasCapability('measure_voltage')) {
        this.safeSetCapabilityValue('measure_voltage', safeParse(attrs.rmsVoltage, 10)).catch(() => {});
      }
      if (attrs.rmsCurrent != null && this.hasCapability('measure_current')) {
        this.safeSetCapabilityValue('measure_current', safeParse(attrs.rmsCurrent, 1000)).catch(() => {});
      }
      this.log('[SWITCH-2G] Initial electrical values read');
    } catch (e) {
      this.log('[SWITCH-2G] Initial electrical read failed:', e.message);
    }
  }

  /**
   * v5.5.26: Read initial metering values
   */
  async _readMeteringAttributes(cluster) {
    try {
      const attrs = await cluster.readAttributes([
        'currentSummationDelivered'
      ]).catch(() => ({}));

      if (this._destroyed) return;
      if (attrs.currentSummationDelivered != null && this.hasCapability('meter_power')) {
        this.safeSetCapabilityValue('meter_power', attrs.currentSummationDelivered / 1000).catch(() => {});
      }
      this.log('[SWITCH-2G] Initial metering values read');
    } catch (e) {
      this.log('[SWITCH-2G] Initial metering read failed:', e.message);
    }
  }

  /**
   * v5.5.990: ZCL-Only mode for BSEED 2-gang switches
   * Enhanced with physical button flow triggers (packetninja technique)
   */
  async _initZclOnlyMode(zclNode) {
    await this._migrateCapabilities().catch(e => this.log(`[BSEED-2G] ⚠️ Migrate: ${e.message}`));

    this._registerCapabilityListeners();

    this._zclState = {
      lastState: { 1: null, 2: null },
      pending: { 1: false, 2: false },
      timeout: { 1: null, 2: null }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true;

    // v5.9.23: GROUP ISOLATION — remove all Zigbee group memberships per EP
    await this._removeGroupMemberships(zclNode);

    this._lastCommandedGang = null;
    this._lastCommandTime = 0;

    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6] || null;
    };

    // Setup attribute listeners for physical button detection
    for (const epNum of [1, 2]) {
      const onOff = getOnOffCluster(epNum);
      if (!onOff || typeof onOff.on !== 'function') {
        this.log(`[BSEED-2G] EP${epNum} no attr listener (cluster not ready)`);
        continue;
      }

      const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
      onOff.on('attr.onOff', async (value) => {
        const now = Date.now();
        const isPhysical = !this._zclState.pending[epNum];

        // v5.9.23: Filter broadcast reports for non-commanded gangs
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
          this.safeSetCapabilityValue(capName, value).catch(() => {});
          
          // v5.12.5: Scene mode support
          // v9.7.4: FIXED - "magic" mode previously set capability without sending to hardware (fake capability).
          // Now sends the inverted command to hardware AND updates Homey.
          const mode = this.sceneMode;
          if (mode === 'magic') {
            const invertedValue = !value;
            this.safeSetCapabilityValue(capName, invertedValue).catch(() => {});
            const invertedCluster = getOnOffCluster(epNum);
            if (invertedCluster) {
              if (typeof invertedCluster.writeAttributes === 'function') {
                await invertedCluster.writeAttributes({ onOff: invertedValue }).catch(() => {});
              } else {
                await invertedCluster[invertedValue ? 'setOn' : 'setOff']().catch(() => {});
              }
            }
          }
          if (isPhysical && (mode === 'auto' || mode === 'both')) {
            const flowId = `switch_2gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
            try {
              const card = this.homey.flow.getDeviceTriggerCard(flowId);
              if (card) {
                await card.trigger(this, { gang: epNum, state: value }, {}).catch(() => {});
                this.log(`[BSEED-2G] ✅ Physical G${epNum} ${value ? 'ON' : 'OFF'}`);
              }
            } catch (e) { }
          }
          if (isPhysical && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
            const sceneId = `switch_2gang_gang${epNum}_scene`;
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
      this.log(`[BSEED-2G] EP${epNum} attr listener registered`);
    }

    // v5.8.72: PacketNinja pattern — configure onOff reporting per endpoint
    for (const epNum of [1, 2]) {
      const onOff = getOnOffCluster(epNum);
      if (onOff && typeof onOff.configureReporting === 'function') {
        try {
          await onOff.configureReporting({
            onOff: { minInterval: 0, maxInterval: 300, minChange: 1 }
          });
          this.log(`[BSEED-2G] ✅ EP${epNum} onOff reporting configured`);
        } catch (err) {
          this.log(`[BSEED-2G] EP${epNum} configureReporting failed: ${err.message}`);
        }
      }
    }

    // v5.8.72: PacketNinja pattern — read initial onOff state per endpoint
    for (const epNum of [1, 2]) {
      const onOff = getOnOffCluster(epNum);
      if (onOff && typeof onOff.readAttributes === 'function') {
        try {
          const state = await onOff.readAttributes(['onOff']);
          if (state.onOff !== undefined) {
            const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
            this._zclState.lastState[epNum] = state.onOff;
            await this.safeSetCapabilityValue(capName, state.onOff).catch(() => {});
            this.log(`[BSEED-2G] EP${epNum} initial state: ${state.onOff ? 'ON' : 'OFF'}`);
          }
        } catch (err) {
          this.log(`[BSEED-2G] EP${epNum} initial state read failed: ${err.message}`);
        }
      }
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-2G] ✅ BSEED ZCL-only mode ready (packetninja v990+v8.1.0)');
  }

  /**
   * v5.9.23: Remove Zigbee group memberships to fix BSEED broadcast bug.
   */
  async _removeGroupMemberships(zclNode) {
    for (const epNum of [1, 2]) {
      try {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep?.clusters) {continue;}
        const g = ep.clusters.groups || ep.clusters.genGroups || ep.clusters[4] || ep.clusters['4'];
        if (!g) { this.log(`[BSEED-2G] EP${epNum} no groups cluster`); continue; }
        const fn = g.removeAll || g.removeAllGroups;
        if (typeof fn === 'function') {
          await fn.call(g).catch(e => this.log(`[BSEED-2G] EP${epNum} removeAll warn: ${e.message}`));
          this.log(`[BSEED-2G] EP${epNum} group memberships removed`);
        } else {
          this.log(`[BSEED-2G] EP${epNum} no removeAll on groups`);
        }
      } catch (err) { this.log(`[BSEED-2G] EP${epNum} group err: ${err.message}`); }
    }
  }

  onDeleted() {
    if (this._zclState?.timeout) {
      for (const epNum of [1, 2]) {
        if (this._zclState.timeout[epNum]) {clearTimeout(this._zclState.timeout[epNum]);}
      }
    }
    super.onDeleted?.();
  }
}

module.exports = Switch2GangDevice;
