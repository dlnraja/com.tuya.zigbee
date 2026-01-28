'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { CLUSTER } = require('zigbee-clusters');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      2-GANG SWITCH - v5.5.919 + ZCL-Only Mode (BSEED)                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                   ║
 * ║  - 2 endpoints On/Off (EP1, EP2)                                            ║
 * ║  - Power measurement via electricalMeasurement (0x0B04)                     ║
 * ║  - Energy metering via metering (0x0702)                                    ║
 * ║  - Physical button detection: single/double/long/triple per gang            ║
 * ║  - BSEED ZCL-only mode: _TZ3000_l9brjwau (Pieter_Pessers forum)             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ZCL-Only manufacturers (no Tuya DP) - forum: Pieter_Pessers BSEED 2-gang
const ZCL_ONLY_MANUFACTURERS_2G = [
  '_TZ3000_l9brjwau', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
  '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt'
];

class Switch2GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {
  get gangCount() { return 2; }

  get isZclOnlyDevice() {
    const mfr = this.getSetting?.('zb_manufacturer_name') ||
                this.getStoreValue?.('zb_manufacturer_name') ||
                this.getStoreValue?.('manufacturerName') || '';
    return ZCL_ONLY_MANUFACTURERS_2G.some(b => mfr.toLowerCase().includes(b.toLowerCase()));
  }

  async onNodeInit({ zclNode }) {
    if (this.isZclOnlyDevice) {
      this.log('[SWITCH-2G] 🔵 ZCL-ONLY MODE (BSEED)');
      await this._initZclOnlyMode(zclNode);
      return;
    }
    await super.onNodeInit({ zclNode });

    // v5.5.43: Cleanup orphan capabilities
    await this._cleanupOrphanCapabilities();

    // v5.5.26: Setup power measurement for ZCL devices
    await this._setupPowerMeasurement(zclNode);

    // v5.5.896: Initialize physical button detection (single/double/long/triple)
    await this.initPhysicalButtonDetection(zclNode);

    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons();

    this.log('[SWITCH-2G] v5.5.896 - Physical button detection enabled');
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
        this.log(`[SWITCH-2G] ⚠️ Removing orphan capability: ${cap}`);
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

    // ═══════════════════════════════════════════════════════════════════
    // electricalMeasurement cluster (0x0B04) - Power, Voltage, Current
    // ═══════════════════════════════════════════════════════════════════
    const elecCluster = endpoint.clusters.electricalMeasurement
      || endpoint.clusters.haElectricalMeasurement
      || endpoint.clusters[0x0B04]
      || endpoint.clusters['2820'];

    if (elecCluster) {
      this.log('[SWITCH-2G] ✅ electricalMeasurement cluster found');

      // Setup attribute reporting listeners
      if (typeof elecCluster.on === 'function') {
        // Active Power (W)
        elecCluster.on('attr.activePower', (value) => {
          const watts = value / 10; // Typically in 0.1W units
          this.log(`[ZCL-DATA] switch.power raw=${value} → ${watts}W`);
          if (this.hasCapability('measure_power')) {
            this.setCapabilityValue('measure_power', parseFloat(watts)).catch(() => { });
          }
        });

        // RMS Voltage (V)
        elecCluster.on('attr.rmsVoltage', (value) => {
          const volts = value / 10; // Typically in 0.1V units
          this.log(`[ZCL-DATA] switch.voltage raw=${value} → ${volts}V`);
          if (this.hasCapability('measure_voltage')) {
            this.setCapabilityValue('measure_voltage', parseFloat(volts)).catch(() => { });
          }
        });

        // RMS Current (A)
        elecCluster.on('attr.rmsCurrent', (value) => {
          const amps = value / 1000; // Typically in mA
          this.log(`[ZCL-DATA] switch.current raw=${value} → ${amps}A`);
          if (this.hasCapability('measure_current')) {
            this.setCapabilityValue('measure_current', parseFloat(amps)).catch(() => { });
          }
        });
      }

      // v5.5.62: Configure attribute reporting with retry on Zigbee startup
      this._configureElectricalReporting();

      // Initial read
      this._readElectricalAttributes(elecCluster);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Metering cluster (0x0702) - Energy (kWh)
    // ═══════════════════════════════════════════════════════════════════
    const meteringCluster = endpoint.clusters.metering
      || endpoint.clusters.seMetering
      || endpoint.clusters[0x0702]
      || endpoint.clusters['1794'];

    if (meteringCluster) {
      this.log('[SWITCH-2G] ✅ metering cluster found');

      if (typeof meteringCluster.on === 'function') {
        // Current summation delivered (kWh)
        meteringCluster.on('attr.currentSummationDelivered', (value) => {
          const kwh = value / 1000; // Typically in Wh
          this.log(`[ZCL-DATA] switch.energy raw=${value} → ${kwh}kWh`);
          if (this.hasCapability('meter_power')) {
            this.setCapabilityValue('meter_power', parseFloat(kwh)).catch(() => { });
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
      this.log('[SWITCH-2G] ✅ electricalMeasurement reporting configured');
    } catch (e) {
      const msg = e?.message || String(e);
      // Retry if Zigbee is starting up (max 3 retries)
      if ((msg.includes('Zigbee') || msg.includes('démarrage') || msg.includes('starting')) && retryCount < 3) {
        this.log(`[SWITCH-2G] ⏰ Zigbee starting, will retry electrical reporting in 60s (attempt ${retryCount + 1}/3)`);
        this.homey.setTimeout(() => this._configureElectricalReporting(retryCount + 1), 60000);
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
      this.log('[SWITCH-2G] ✅ metering reporting configured');
    } catch (e) {
      const msg = e?.message || String(e);
      // Retry if Zigbee is starting up (max 3 retries)
      if ((msg.includes('Zigbee') || msg.includes('démarrage') || msg.includes('starting')) && retryCount < 3) {
        this.log(`[SWITCH-2G] ⏰ Zigbee starting, will retry metering reporting in 60s (attempt ${retryCount + 1}/3)`);
        this.homey.setTimeout(() => this._configureMeteringReporting(retryCount + 1), 60000);
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
        this.setCapabilityValue('measure_power', parseFloat(attrs.activePower) / 10).catch(() => { });
      }
      if (attrs.rmsVoltage != null && this.hasCapability('measure_voltage')) {
        this.setCapabilityValue('measure_voltage', parseFloat(attrs.rmsVoltage) / 10).catch(() => { });
      }
      if (attrs.rmsCurrent != null && this.hasCapability('measure_current')) {
        this.setCapabilityValue('measure_current', parseFloat(attrs.rmsCurrent) / 1000).catch(() => { });
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
        this.setCapabilityValue('meter_power', attrs.currentSummationDelivered / 1000).catch(() => { });
      }
      this.log('[SWITCH-2G] Initial metering values read');
    } catch (e) {
      this.log('[SWITCH-2G] Initial metering read failed:', e.message);
    }
  }

  /**
   * v5.5.921: ZCL-Only mode for BSEED 2-gang switches
   * Enhanced with physical button flow triggers (packetninja technique)
   * Forum: Pieter_Pessers - _TZ3000_l9brjwau TS0003
   */
  async _initZclOnlyMode(zclNode) {
    // State tracking per endpoint
    this._zclState = {
      lastState: { 1: null, 2: null },
      pending: { 1: false, 2: false },
      timeout: { 1: null, 2: null }
    };

    // Setup both endpoints with physical button detection
    for (const epNum of [1, 2]) {
      const ep = zclNode?.endpoints?.[epNum];
      const onOff = ep?.clusters?.onOff;
      if (!onOff) continue;

      const capName = epNum === 1 ? 'onoff' : 'onoff.gang2';
      
      // Listen for attribute reports (physical button presses)
      if (typeof onOff.on === 'function') {
        onOff.on('attr.onOff', (value) => {
          const isPhysical = !this._zclState.pending[epNum];
          this.log(`[BSEED-2G] EP${epNum} attr: ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);
          
          if (this._zclState.lastState[epNum] !== value) {
            this._zclState.lastState[epNum] = value;
            this.setCapabilityValue(capName, value).catch(() => {});
            
            // Trigger flow cards for PHYSICAL button presses only
            if (isPhysical) {
              const flowId = `switch_2gang_gang${epNum}_physical_${value ? 'on' : 'off'}`;
              this.homey.flow.getDeviceTriggerCard(flowId)
                .trigger(this, { gang: epNum, state: value }, {})
                .catch(() => {});
              this.log(`[BSEED-2G] 🔘 Physical button G${epNum} ${value ? 'ON' : 'OFF'}`);
            }
          }
        });
      }

      // Register capability listener for app commands
      this.registerCapabilityListener(capName, async (value) => {
        this.log(`[BSEED-2G] EP${epNum} app cmd: ${value}`);
        this._zclState.pending[epNum] = true;
        clearTimeout(this._zclState.timeout[epNum]);
        this._zclState.timeout[epNum] = setTimeout(() => {
          this._zclState.pending[epNum] = false;
        }, 2000);
        await onOff[value ? 'setOn' : 'setOff']();
        return true;
      });

      this.log(`[BSEED-2G] EP${epNum} ZCL onOff + physical detection registered`);
    }

    await this.initVirtualButtons?.();
    this.log('[SWITCH-2G] ✅ BSEED ZCL-only mode ready (packetninja technique)');
  }

  onDeleted() {
    if (this._zclState?.timeout) clearTimeout(this._zclState.timeout);
    super.onDeleted?.();
  }
}

module.exports = Switch2GangDevice;
