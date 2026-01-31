'use strict';

const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMART PLUG - v5.6.0 + Virtual/Physical Buttons (packetninja pattern)   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridPlugBase handles: onoff listener, Tuya DP, ZCL On/Off                ║
 * ║  This class ONLY: dpMappings + ZCL energy monitoring listeners              ║
 * ║  DPs: 1,7,9,17-21,101,102 | ZCL: 6,2820,1794,EF00                          ║
 * ║  v5.6.0: Added bidirectional physical/virtual button support                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmartPlugDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridPlugBase)) {

  get plugCapabilities() {
    return ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      7: { capability: null, internal: 'child_lock', writable: true },
      9: { capability: null, internal: 'countdown', writable: true },
      17: { capability: 'measure_current', divisor: 1000 },
      18: { capability: 'measure_power', divisor: 10 },
      19: { capability: 'measure_voltage', divisor: 10 },
      20: { capability: 'meter_power', divisor: 100 },
      21: { capability: null, internal: 'frequency', divisor: 100 },
      101: { capability: null, internal: 'power_factor', divisor: 10 },
      102: { capability: null, internal: 'max_power_alert', writable: true }
    };
  }

  // v5.5.422: Apply user-defined scale to power/energy readings
  _applyScale(value, capability) {
    const powerScale = parseFloat(this.getSetting('power_scale')) || 1;
    const energyScale = parseFloat(this.getSetting('energy_scale')) || 1;

    if (capability === 'measure_power') return value * powerScale;
    if (capability === 'meter_power') return value * energyScale;
    return value;
  }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    // v5.6.0: Track state for physical button detection (packetninja pattern)
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    // Parent handles onoff listener - DO NOT re-register
    await super.onNodeInit({ zclNode });
    this.log('[PLUG] v5.6.0 - DPs: 1,7,9,17-21,101,102 | ZCL: 6,2820,1794,EF00');

    // Setup ZCL energy monitoring (parent doesn't do this)
    await this._setupEnergyMonitoring(zclNode);

    // v5.6.0: Initialize bidirectional button support
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this._setupPhysicalButtonFlowDetection();

    this.log('[PLUG] ✅ Ready with bidirectional button support');
  }

  /**
   * v5.6.0: Setup physical button flow detection (packetninja pattern)
   */
  _setupPhysicalButtonFlowDetection() {
    const originalHandler = this._handleTuyaDatapoint?.bind(this);
    if (originalHandler) {
      this._handleTuyaDatapoint = (dp, data, reportingEvent = false) => {
        if (dp === 1) {
          const state = Boolean(data?.value ?? data);
          const isPhysical = reportingEvent && !this._appCommandPending;
          if (this._lastOnoffState !== state) {
            this._lastOnoffState = state;
            if (isPhysical) {
              const flowId = state ? 'plug_smart_physical_on' : 'plug_smart_physical_off';
              this.homey.flow.getDeviceTriggerCard(flowId)
                .trigger(this, {}, {}).catch(() => {});
            }
          }
        }
        return originalHandler(dp, data, reportingEvent);
      };
    }
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }

  async _setupEnergyMonitoring(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Electrical Measurement cluster (0x0B04) - v5.5.422: Apply user scale
    try {
      const elec = ep1.clusters?.haElectricalMeasurement;
      if (elec?.on) {
        elec.on('attr.activePower', (v) => {
          const scaled = this._applyScale(v / 10, 'measure_power');
          this.setCapabilityValue('measure_power', parseFloat(scaled)).catch(() => { });
        });
        elec.on('attr.rmsVoltage', (v) => this.setCapabilityValue('measure_voltage', parseFloat(v) / 10).catch(() => { }));
        elec.on('attr.rmsCurrent', (v) => this.setCapabilityValue('measure_current', parseFloat(v) / 1000).catch(() => { }));
        this.log('[PLUG] ✅ ZCL Electrical Measurement configured (with scale support)');
      }
    } catch (e) { /* ignore */ }

    // Metering cluster (0x0702) - v5.5.422: Apply user scale
    try {
      const meter = ep1.clusters?.seMetering;
      if (meter?.on) {
        meter.on('attr.currentSummationDelivered', (v) => {
          const scaled = this._applyScale(v / 1000, 'meter_power');
          this.setCapabilityValue('meter_power', parseFloat(scaled)).catch(() => { });
        });
        this.log('[PLUG] ✅ ZCL Metering configured (with scale support)');
      }
    } catch (e) { /* ignore */ }
  }
}

module.exports = SmartPlugDevice;
