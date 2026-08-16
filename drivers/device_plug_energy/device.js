'use strict';

const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const EnergyJumpGuard = require('../../lib/tuya/EnergyJumpGuard');
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
      7: { capability: 'child_lock', transform: (v) => v === true || v === 1 },
      9: { capability: 'countdown_remaining' },
      17: { capability: 'measure_current', smartDivisor: true },
      18: { capability: 'measure_power', smartDivisor: true },
      19: { capability: 'measure_voltage', smartDivisor: true },
      20: { capability: 'meter_power', smartDivisor: true },
      21: { internal: true, type: 'frequency', divisor: 100 },
      101: { internal: true, type: 'power_factor', divisor: 10 },
      102: { internal: true, type: 'max_power_alert', writable: true }
    };
  }

  get gangCount() { return 1; }

  // v5.6.1: Defensive guard against wrong-family energy divisors (forum ×660 bug)
  async safeSetCapabilityValue(capability, value) {
    if (capability === 'meter_power') {
      value = EnergyJumpGuard.check(this, value);
    }
    return super.safeSetCapabilityValue(capability, value);
  }

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
    this.log('[PLUG] v5.6.0 - DPs: 1,7,9,17-21,101,102 | ZCL: 6,2820,1794,EF00');

    // v5.6.2: ZCL energy listeners removed — UnifiedPlugBase._setupZCLMode
    // already handles seMetering (÷100) and haElectricalMeasurement with the
    // correct zclEnergyDivisors. The duplicate block here multiplied energy
    // by ×1000 (forum #2092/#2093: ~660 kWh shown for ~1 kWh) and zeroed
    // power/voltage on every ZCL report.

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
    const originalHandler = this._handleDP?.bind(this );if (originalHandler) {
      this._handleDP = (dp, data, reportingEvent = false) => {
        if (dp === 1) {
          const state = Boolean(data?.value ?? data);
          const isPhysical = reportingEvent && !this._appCommandPending;
          if (this._lastOnoffState !== state ) {
            this._lastOnoffState = state;
            if (isPhysical) {
              const flowId = state ? 'plug_smart_physical_on' : 'plug_smart_physical_off';
              (() => { try { return this.homey.flow.getDeviceTriggerCard(flowId); } catch (e) { return null; } })()
            }
          }
        }
        return originalHandler(dp, data, reportingEvent);
      };
    }
  }

  _markAppCommand() {
    this._appCommandPending = true;
    safeClearTimeout(this, this._appCommandTimeout);
    this._appCommandTimeout = safeSetTimeout(this, () => { if (this._destroyed) {return;} this._appCommandPending = false; }, 2000);
  }

  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartPlugDevice;


