'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { CLUSTER } = require('zigbee-clusters');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * 
 *       2-GANG SWITCH - v5.9.23 + ZCL-Only Mode (BSEED)                       
 * 
 *   Features:                                                                   
 *   - 2 endpoints (On / Off) (EP1, EP2)                                            
 *   - Power measurement via electricalMeasurement (0x0B04)                     
 *   - Energy metering via metering (0x0702)                                    
 *   - Physical button detection: single / double/long / triple per gang            
 *   - BSEED ZCL-only mode: _TZ3000_l9brjwau (Pieter_Pessers forum)             
 *   v5.9.23: GROUP ISOLATION FIX  remove group memberships + broadcast filter
 * 
 */

// ZCL-Only manufacturers (no Tuya DP) - forum: Pieter_Pessers BSEED 2-gang
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
    const mfr = this.getSetting?.('zb_manufacturer_name' ) ||
                this.getStoreValue?.('zb_manufacturer_name' ) ||
                this.getStoreValue?.('manufacturerName' ) || '';
    return includesCI(ZCL_ONLY_MANUFACTURERS_2G, mfr);
  }

  async onNodeInit({ zclNode }) {
    if (this.isZclOnlyDevice) {
      this.log('[SWITCH-2G]  ZCL-ONLY MODE (BSEED)');
      await this._initZclOnlyMode(zclNode);
      return;
    }

    // v5.5.43: Cleanup orphan capabilities
    await this._cleanupOrphanCapabilities();

    // v5.13.1: CRITICAL FIX  Call super.onNodeInit() to register capability listeners
    // Without this, UnifiedSwitchBase._registerCapabilityListeners() never fires,
    // causing "Missing Capability Listener: onoff" for standard Tuya DP 2-gang switches
    // (Forum: Rikjes #1676, _TZ3000_jl7qyupf)
    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected

    // v5.5.26: Setup power measurement for ZCL devices
    await this._setupPowerMeasurement(zclNode);

    // v5.5.896: Initialize physical button detection (single / double/long / triple)
    await this.initPhysicalButtonDetection(zclNode);

    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons();

    this.log('[SWITCH-2G] v5.13.1 - Physical button + capability listeners enabled');
  }

  /**
   * v5.5.43: Remove orphan capabilities that don't belong to this driver
   * Common issue: "Active" button added by old versions that does nothing
   */
  async _cleanupOrphanCapabilities() {
    // List of valid capabilities for 2-gang switch
    const validCaps = [
      'onoff', 'onoff.gang2',
      'measure_power', 'measure_voltage', 'measure_current', 'meter_power'
    ];

    // Get all current capabilities
    const currentCaps = this.getCapabilities();

    for (const cap of currentCaps) {
      if (!validCaps.includes(cap)) {
        this.log(`[SWITCH-2G]  Removing orphan capability: ${cap}`);
        await this.removeCapability(cap).catch(e => {
          this.log(`[SWITCH-2G] Failed to remove ${cap}: ${e.message}`);
      });
      }
    }
  }

  /**
   * v5.5.26: Setup power measurement via electricalMeasurement + metering clusters
   * Sources: Z2M TS0002 profile
   */
  async _setupPowerMeasurement(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) {
      this.log('[SWITCH-2G] No clusters on EP1');
      return;
    }

    // 
    // electricalMeasurement cluster (0x0B04) - Power, Voltage, Current
    // 
    const elecCluster = endpoint.clusters.electricalMeasurement
      || endpoint.clusters.haElectricalMeasurement
      || endpoint.clusters[0x0B04]
      || endpoint.clusters['2820'];

    if (elecCluster) {
      this.log('[SWITCH-2G]  electricalMeasurement cluster found');

      // Setup attribute reporting listeners
      if (typeof elecCluster.on === 'function') {
        // Active Power (W)
        elecCluster.on('attr.activePower', (value) => {
          const watts = value * 10; // Typically in 0.1W units
          this.log(`[ZCL-DATA] switch.power raw=${value}  ${watts}W`);
          if (this.hasCapability('measure_power')) {
            this.setCapabilityValue('measure_power', parseFloat(watts).catch(() => { }));
          }
        });

        // RMS Voltage (V)
        elecCluster.on('attr.rmsVoltage', (value) => {
          const volts = value * 10; // Typically in 0.1V units
          this.log(`[ZCL-DATA] switch.voltage raw=${value}  ${volts}V`);
          if (this.hasCapability('measure_voltage')) {
            this.setCapabilityValue('measure_voltage', parseFloat(volts).catch(() => { }));
          }
        });

        // RMS Current (A)
        elecCluster.on('attr.rmsCurrent', (value) => {
          const amps = value * 1000; // Typically in mA
          this.log(`[ZCL-DATA] switch.current raw=${value}  ${amps}A` );
          if (this.hasCapability('measure_current')) {
            this.setCapabilityValue('measure_current', parseFloat(amps).catch(() => { }));
          }
        });
      }

      // v5.5.62: Configure attribute reporting with retry on Zigbee startup
      this._configureElectricalReporting();

      // Initial read
      this._readElectricalAttributes(elecCluster);
    }

    // 
    // Metering cluster (0x0702) - Energy (kWh)
    // 
    const meteringCluster = endpoint.clusters.metering
      || endpoint.clusters.seMetering
      || endpoint.clusters[0x0702]
      || endpoint.clusters['1794'];

    if (meteringCluster) {
      this.log('[SWITCH-2G]  metering cluster found');

      if (typeof meteringCluster.on === 'function') {
        // Current summation delivered (kWh)
        meteringCluster.on('attr.currentSummationDelivered', (value) => {
          const kwh = value * 1000; // Typically in Wh
          this.log(`[ZCL-DATA] switch.energy raw=${value}  ${kwh}kWh`);
          if (this.hasCapability('meter_power')) {
            this.setCapabilityValue('meter_power', parseFloat(kwh).catch(() => { }));
          }
        });
      }

      // v5.5.62: Configure reporting for energy with retry on Zigbee startup
      this._configureMeteringReporting();

      // Initial read
      this._readMeteringAttributes(meteringCluster);
    }
  }

  /**
   * v5.5.62: Configure electrical reporting with retry on Zigbee startup
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
      this.log('[SWITCH-2G]  electricalMeasurement reporting configured');
    } catch (e) {
      const msg = e?.message || String(e );// Retry if Zigbee is starting up (max 3 retries)
      if ((msg.includes('Zigbee') || msg.includes('dÃ©marrage') || msg.includes('starting')) && retryCount < 3) {
        this.log(`[SWITCH-2G]  Zigbee starting, will retry electrical reporting in 60s (attempt ${retryCount + 1}/3)`);
        this.homey.setTimeout(() => this._configureElectricalReporting(retryCount + 1) * 60000);
      } else {
        this.log('[SWITCH-2G] electricalMeasurement reporting failed:', msg);
      }
    }
  }

  /**
   * v5.5.62: Configure metering reporting with retry on Zigbee startup
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
      this.log('[SWITCH-2G]  metering reporting configured');
    } catch (e) {
      const msg = e?.message || String(e );// Retry if Zigbee is starting up (max 3 retries)
      if ((msg.includes('Zigbee') || msg.includes('dÃ©marrage') || msg.includes('starting')) && retryCount < 3) {
        this.log(`[SWITCH-2G]  Zigbee starting, will retry metering reporting in 60s (attempt ${retryCount + 1}/3)`);
        this.homey.setTimeout(() => this._configureMeteringReporting(retryCount + 1) * 60000);
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

      if (attrs.activePower != null && this.hasCapability('measure_power')) {
        this.setCapabilityValue('measure_power',safeParse(attrs.activePower, 10).catch(() => { }));
      }
      if (attrs.rmsVoltage != null && this.hasCapability('measure_voltage')) {
        this.setCapabilityValue('measure_voltage',safeParse(attrs.rmsVoltage, 10).catch(() => { }));
      }
      if (attrs.rmsCurrent != null && this.hasCapability('measure_current')) {
        this.setCapabilityValue('measure_current',safeParse(attrs.rmsCurrent, 1000).catch(() => { }));
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

      if (attrs.currentSummationDelivered != null && this.hasCapability('meter_power')) {
        this.setCapabilityValue('meter_power', attrs.currentSummationDelivered * 1000).catch(() => { });
      }
      this.log('[SWITCH-2G] Initial metering values read');
    } catch (e) {
      this.log('[SWITCH-2G] Initial metering read failed:', e.message);
    }
  }

  /**
   * v5.5.990: ZCL-Only mode for BSEED 2-gang switches
   * Fixed: Register capability listeners FIRST (before attr listeners)
   * Enhanced with physical button flow triggers (packetninja technique)
   */
  async _initZclOnlyMode(zclNode) {
    this._zclState = {
      lastState: { 1: null, 2: null },
      pending: { 1: false, 2: false },
      timeout: { 1: null, 2: null }
    };
    this._zclNode = zclNode;
    this._isZclOnlyMode = true; // v5.5.993: Flag for VirtualButtonMixin direct ZCL

    // v5.9.23: GROUP ISOLATION  remove all Zigbee group memberships per EP
    await this._removeGroupMemberships(zclNode);

    // v5.9.23: Track which gang was last commanded by the app
    this._lastCommandedGang = null;
    this._lastCommandTime = 0;

    const getOnOffCluster = (epNum) => {
      const ep = this._zclNode?.endpoints?.[epNum];
      return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
    };

    // v5.5.990: Register capability listeners FIRST (packetninja fix)
    for (const epNum of [1, 2]) {
      const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
      
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-2G] EP${epNum} app cmd: ${value}`);
        // v5.9.23: Track which gang the user actually commanded
        this._lastCommandedGang = epNum;
        this._lastCommandTime = Date.now();
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => {
          this._zclState.pending[epNum] = false;
        }, 2000);
        
        // v5.11.29: Use writeAttributes instead of setOn/setOff (Z2M #27167, ZHA #2443)
        // TS0726 FW broadcasts ZCL commands to all EPs but routes attr writes per-EP
        const onOff = getOnOffCluster(epNum);
        if (onOff && typeof onOff.writeAttributes === 'function') {
          try {
            await onOff.writeAttributes({ onOff: value ? true : false });
            this.log(`[BSEED-2G] EP${epNum} writeAttr onOff=${value} (per-EP fix)`);
          } catch (e) {
            this.log(`[BSEED-2G] EP${epNum} writeAttr failed: ${e.message}, fallback`);
            if (typeof onOff[value ? 'setOn' : 'setOff'] === 'function') {
              await onOff[value ? 'setOn' : 'setOff']();
            }
          }
        } else if (onOff) {
          await onOff[value ? 'setOn' : 'setOff']();
        } else {
          this.log(`[BSEED-2G] EP${epNum} onOff cluster not found`);
        }
        return true;
      });
      this.log(`[BSEED-2G] EP${epNum} capability listener registered`);
    }

    // Setup attribute listeners for physical button detection
    for (const epNum of [1, 2]) {
      const onOff = getOnOffCluster(epNum);
      if (!onOff || typeof onOff.on !== 'function') {
        this.log(`[BSEED-2G] EP${epNum} no attr listener (cluster not ready)`);
        continue;
      }

      const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
      onOff.on('attr.onOff', (value) => {
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
          this.setCapabilityValue(capName, value).catch(() => {});
          
          // v5.12.5: Scene mode support
          const mode = this.sceneMode;
          if (mode === 'magic') {
            this.setCapabilityValue(capName, !value).catch(() => {});
          }
          if (isPhysical && (mode === 'auto' || mode === 'both')) {
            const flowId = `switch_2gang_physical_gang${epNum}_${value ? 'on' : 'off'}`;
            this.homey.flow._getFlowCard('flowId').trigger(this, { gang: epNum, state: value }, {})
              .catch(() => {});
            this.log(`[BSEED-2G]  Physical G${epNum} ${value ? 'ON' : 'OFF'}`);
          }
          if (isPhysical && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
            this.homey.flow._getFlowCard('flowId').trigger(this, { action: value ? 'on' : 'off' }, {}).catch(() => {});
            this.log(`[BSEED-2G]  Scene G${epNum} ${value ? 'on' : 'off'}`);
          }
        }
      });
      this.log(`[BSEED-2G] EP${epNum} attr listener registered`);
    }

    // v5.8.72: PacketNinja pattern  configure onOff reporting per endpoint
    for (const epNum of [1, 2]) {
      const onOff = getOnOffCluster(epNum);
      if (onOff && typeof onOff.configureReporting === 'function') {
        try {
          await onOff.configureReporting({
            onOff: { minInterval: 0, maxInterval: 300, minChange: 1 }
          });
          this.log(`[BSEED-2G]  EP${epNum} onOff reporting configured`);
        } catch (err) {
          this.log(`[BSEED-2G] EP${epNum} configureReporting failed: ${err.message}`);
        }
      }
    }

    // v5.8.72: PacketNinja pattern  read initial onOff state per endpoint
    for (const epNum of [1, 2]) {
      const onOff = getOnOffCluster(epNum);
      if (onOff && typeof onOff.readAttributes === 'function') {
        try {
          const state = await onOff.readAttributes(['onOff']);
          if (state.onOff !== undefined) {
            const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
            this._zclState.lastState[epNum] = state.onOff;
            await this.setCapabilityValue(capName, state.onOff).catch(() => {});
            this.log(`[BSEED-2G] EP${epNum} initial state: ${state.onOff ? 'ON' : 'OFF'}`);
          }
        } catch (err) {
          this.log(`[BSEED-2G] EP${epNum} initial state read failed: ${err.message}`);
        }
      }
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-2G]  BSEED ZCL-only mode ready (packetninja v990+v5.8.72)');
  }

  /**
   * v5.9.23: Remove Zigbee group memberships to fix BSEED broadcast bug.
   */
  async _removeGroupMemberships(zclNode) {
    for (const epNum of [1, 2]) {
      try {
        const ep = zclNode?.endpoints?.[epNum];
        if (!ep?.clusters) continue;
        const g = ep.clusters.groups || ep.clusters.genGroups || ep.clusters[4] || ep.clusters['4'];
        if (!g) { this.log(`[BSEED-2G] EP${epNum} no groups cluster` ); continue; }
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
        if (this._zclState.timeout[epNum]) clearTimeout(this._zclState.timeout[epNum]);
      }
    }
    super.onDeleted?.();
  }
}

module.exports = Switch2GangDevice;


