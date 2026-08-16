'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { CLUSTER } = require('zigbee-clusters');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');

// Energy scaling divisors — ZCL raw attributes; Tuya-DP drivers use smartDivisor: true via SmartDivisorManager
const ZCL_ENERGY_DIVISORS = {
  meter_power: { divisor: 1000 },
  measure_power: { divisor: 10 },
  measure_current: { divisor: 1000 },
  measure_voltage: { divisor: 10 }
};

// Energy scaling divisors for the Tuya DP path (DP 17/18/19/101 raw values)
const TUYA_DP_ENERGY_DIVISORS = {
  meter_power: { divisor: 100 },
  measure_power: { divisor: 1 },
  measure_current: { divisor: 1000 },
  measure_voltage: { divisor: 10 }
};

/**
 * 
 *       DIN RAIL SWITCH - v5.6.0 + Bidirectional Buttons                       
 * 
 *   Smart circuit breaker / DIN rail switch with energy monitoring             
 *   v5.6.0: Added bidirectional physical/virtual button support                
 * 
 */
class DinRailSwitchDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

  get mainsPowered() { return true; }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('DIN Rail Switch P127 initializing...');
    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
    }

    // v5.6.0: Track state for physical button detection
    this._lastOnoffState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    // Register on/off capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF);
    }

    // Setup electrical measurement
    await this._setupElectricalMeasurement(zclNode);

    // Setup Tuya DP cluster for TS0601 devices
    await this._setupTuyaDP(zclNode);

    // v5.6.0: Initialize bidirectional button support
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();

    this.log('DIN Rail Switch P127 initialized (UnifiedSwitchBase)');
  }

  _markAppCommand() {
    this._appCommandPending = true;
    safeClearTimeout(this, this._appCommandTimeout);
    this._appCommandTimeout = safeSetTimeout(this, () => { if (this._destroyed) {return;} this._appCommandPending = false; }, 2000);
  }

  async _setupElectricalMeasurement(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) {return;}

    const emCluster = ep1.clusters?.electricalMeasurement || ep1.clusters?.[2820];
    if (emCluster) {
      this.log('[EM] Electrical Measurement cluster found');

      if (this.hasCapability('measure_power')) {
        emCluster.on('attr.activePower', (value) => {
          if (this._destroyed) {return;}
          const power = Number(value) / ZCL_ENERGY_DIVISORS.measure_power.divisor;
          this.safeSetCapabilityValue('measure_power', power).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        });
      }

      if (this.hasCapability('measure_voltage')) {
        emCluster.on('attr.rmsVoltage', (value) => {
          if (this._destroyed) {return;}
          const voltage = Number(value) / ZCL_ENERGY_DIVISORS.measure_voltage.divisor;
          this.safeSetCapabilityValue('measure_voltage', voltage).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        });
      }

      if (this.hasCapability('measure_current')) {
        emCluster.on('attr.rmsCurrent', (value) => {
          if (this._destroyed) {return;}
          const current = Number(value) / ZCL_ENERGY_DIVISORS.measure_current.divisor;
          this.safeSetCapabilityValue('measure_current', current).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        });
      }
    }

    const meteringCluster = ep1.clusters?.metering || ep1.clusters?.[1794];
    if (meteringCluster && this.hasCapability('meter_power')) {
      meteringCluster.on('attr.currentSummationDelivered', (value) => {
        if (this._destroyed) {return;}
        const energy = Number(value) / ZCL_ENERGY_DIVISORS.meter_power.divisor;
        this.safeSetCapabilityValue('meter_power', energy).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) {return;}

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) {return;}

    this.log('[TUYA] Tuya DP cluster found');

    tuyaCluster.on('response', (response) => {
      this._handleTuyaDP(response);
      });

    tuyaCluster.on('reporting', (report) => {
      this._handleTuyaDP(report);
      });
  }

  _handleTuyaDP(data) {
    if (!data || !data.dp ) {return;}
    const { dp, value } = data;

    this.log(`[DP${dp}] Value: ${value}`);

    switch (dp) {
    case 1: //On/Off state
    case 16:
      this.safeSetCapabilityValue('onoff', !!value).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      break;

    case 17: //Total current (A*1000)
    case 20:
      if (this.hasCapability('measure_current')) {
        this.safeSetCapabilityValue('measure_current', Number(value) / TUYA_DP_ENERGY_DIVISORS.measure_current.divisor).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      }
      break;

    case 18: // Power (W)
      if (this.hasCapability('measure_power')) {
        this.safeSetCapabilityValue('measure_power', value * TUYA_DP_ENERGY_DIVISORS.measure_power.divisor).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      }
      break;

    case 19: //Voltage (V*10)
      if (this.hasCapability('measure_voltage')) {
        this.safeSetCapabilityValue('measure_voltage', Number(value) / TUYA_DP_ENERGY_DIVISORS.measure_voltage.divisor).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      }
      break;

    case 101: //Energy (kWh*100)
      if (this.hasCapability('meter_power')) {
        this.safeSetCapabilityValue('meter_power', Number(value) / TUYA_DP_ENERGY_DIVISORS.meter_power.divisor).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      }
      break;
    }
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = DinRailSwitchDevice;


