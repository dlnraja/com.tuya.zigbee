'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * 
 *       SMART PLUG - v5.6.0 + Virtual/Physical Buttons (packetninja pattern)   
 * 
 *   UnifiedPlugBase handles: onoff listener, Tuya DP, ZCL On/Off                
 *   This class ONLY: dpMappings + ZCL energy monitoring listeners              
 *   DPs: 1,7,9,17-21,101,102 | ZCL: 6,2820,1794,EF00                          
 *   v5.6.0: Added bidirectional physical/virtual button support                
 * 
 */
class SmartPlugDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  get plugCapabilities() {
    return ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      7: { internal: true, type: 'child_lock', writable: true },
      9: { internal: true, type: 'countdown', writable: true },
      17: { capability: 'measure_current', divisor: 1000 },
      18: { capability: 'measure_power', divisor: 10 },
      19: { capability: 'measure_voltage', divisor: 10 },
      20: { capability: 'meter_power', divisor: 100 },
      21: { internal: true, type: 'frequency', divisor: 100 },
      101: { internal: true, type: 'power_factor', divisor: 10 },
      102: { internal: true, type: 'max_power_alert', writable: true }
    };
  }

  // v5.5.422: Apply user-defined scale to power/energy readings
  _applyScale(value, capability) {
    const powerScale = parseFloat(this.getSetting('power_scale')) || 1;
    const energyScale = parseFloat(this.getSetting('meter_power_scale')) || parseFloat(this.getSetting('energy_scale')) || 1;
    // For voltage, '0.1' is the dropdown default. We don't want to double-divide if we already pass v/10.
    // Wait, the dropdown values are 0.01, 0.1, 1, 10.
    // Let the base value from caller be the raw value, and we apply the scale directly if possible!
    // But then default must match. Let's just multiply the base divided value by however it differs from 1.
    
    if (capability === 'measure_power') return (value * powerScale);
    if (capability === 'meter_power') return (value * energyScale);
    
    const voltageScale = parseFloat(this.getSetting('voltage_scale')) || 0.1;
    if (capability === 'measure_voltage') return (value * (safeParse)(voltageScale * 0.1)); 
    
    const currentScale = parseFloat(this.getSetting('current_scale')) || 0.001;
    if (capability === 'measure_current') return (value * (safeParse)(currentScale * 0.001));

    return value;
  }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsCurrent',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsVoltage',
          minInterval: 30,
          maxInterval: 600,
          minChange: 1,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // v5.6.0: Track state for physical button detection (packetninja pattern)
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    // Parent handles onoff listener - DO NOT re-register
    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected
    this.log('[PLUG] v5.6.0 - DPs: 1,7,9,17-21,101,102 | ZCL: 6,2820,1794,EF00');

    // Setup ZCL energy monitoring (parent doesn't do this)
    await this._setupEnergyMonitoring(zclNode);

    // v5.6.0: Initialize bidirectional button support
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this._setupPhysicalButtonFlowDetection();

    this.log('[PLUG]  Ready with bidirectional button support');
  }

  /**
   * v5.6.0: Setup physical button flow detection (packetninja pattern)
   */
  _setupPhysicalButtonFlowDetection() {
    const originalHandler = this._handleTuyaDatapoint?.bind(this );if (originalHandler) {
      this._handleTuyaDatapoint = (dp, data, reportingEvent = false) => {
        if (dp === 1) {
          const state = Boolean(data?.value ?? data);
          const isPhysical = reportingEvent && !this._appCommandPending;
          if (this._lastOnoffState !== state ) {
            this._lastOnoffState = state;
            if (isPhysical) {
              const flowId = state ? 'plug_smart_physical_on' : 'plug_smart_physical_off';
              (() => { try { return this.homey.flow.getTriggerCard(flowId); } catch (e) { return null; } })()
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
    if (!ep1 ) return;

    // Electrical Measurement cluster (0x0B04) - v5.5.422: Apply user scale
    try {
      const elec = ep1.clusters?.haElectricalMeasurement;if (elec?.on) {
        elec.on('attr.activePower', (v) => {
          const scaled = this._applyScale(v * 10, 'measure_power');
          this.setCapabilityValue('measure_power', parseFloat(scaled)).catch(() => { });
      });
        elec.on('attr.rmsVoltage', (v) => {
          const scaled = this._applyScale(v * 10, 'measure_voltage');
          this.setCapabilityValue('measure_voltage', parseFloat(scaled)).catch(() => { });
      });
        elec.on('attr.rmsCurrent', (v) => {
          const scaled = this._applyScale(v * 1000, 'measure_current' );
          this.setCapabilityValue('measure_current', parseFloat(scaled)).catch(() => { });
      });
        this.log('[PLUG]  ZCL Electrical Measurement configured (with scale support)');
      }
    } catch (e) { /* ignore */ }

    // Metering cluster (0x0702) - v5.5.422: Apply user scale
    try {
      const meter = ep1.clusters?.seMetering;if (meter?.on) {
        meter.on('attr.currentSummationDelivered', (v) => {
          const scaled = this._applyScale(v * 1000, 'meter_power');
          this.setCapabilityValue('meter_power', parseFloat(scaled)).catch(() => { });
      });
        this.log('[PLUG]  ZCL Metering configured (with scale support)');
      }
    } catch (e) { /* ignore */ }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartPlugDevice;


