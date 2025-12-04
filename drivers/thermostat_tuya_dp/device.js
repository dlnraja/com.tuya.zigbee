'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * Tuya TS0601 Thermostat / TRV Driver
 *
 * Supports multiple TRV variants with different DP mappings:
 * - Standard TRV: DP 2,3,4,5,7,13,101,104
 * - Avatto TRV06: DP 2,3,4,5,7,28-34,35,36,39,47
 * - Moes BRT-100: DP 2,3,16,24,27,40,45,101,104
 *
 * Based on Zigbee2MQTT tuya.ts and Jeedom configurations
 */
class ThermostatTS0601Device extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    this.log('[TRV] Thermostat TS0601 initializing...');

    // Detect manufacturer for DP mapping variant
    const manufacturerName = this.getSetting('zb_manufacturer_name') ||
      this.getStoreValue('manufacturerName') || '';
    this._dpVariant = this._detectDPVariant(manufacturerName);
    this.log(`[TRV] Detected variant: ${this._dpVariant}`);

    // Setup Tuya DP listener
    await this._setupTuyaDPThermostat();

    // Register capability listeners
    this._registerCapabilityListeners();

    this.log('[TRV] Thermostat initialized');
  }

  /**
   * Detect DP mapping variant based on manufacturer
   */
  _detectDPVariant(manufacturer) {
    // Avatto variants
    if (manufacturer.includes('_TZE200_b6wax7g0') ||
      manufacturer.includes('_TZE204_rtrmfadk') ||
      manufacturer.includes('_TZE204_qyr2m29i')) {
      return 'avatto';
    }
    // Moes BRT-100 variants
    if (manufacturer.includes('_TZE200_b6wax7g0') ||
      manufacturer.includes('_TZE200_chyvmhay')) {
      return 'moes';
    }
    // Saswell variants
    if (manufacturer.includes('_TZE200_6rdj8dzm')) {
      return 'saswell';
    }
    return 'standard';
  }

  /**
   * Setup Tuya DP listener for thermostats/TRVs
   */
  async _setupTuyaDPThermostat() {
    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    const tuyaCluster = endpoint.clusters?.tuya ||
      endpoint.clusters?.manuSpecificTuya ||
      endpoint.clusters?.[61184];

    if (!tuyaCluster) {
      this.log('[TRV] No Tuya cluster found');
      return;
    }

    // Listen via TuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleThermostatDP(dpId, value);
      });
      this.log('[TRV] Using TuyaEF00Manager');
      return;
    }

    // Direct cluster listener
    if (typeof tuyaCluster.on === 'function') {
      tuyaCluster.on('dataReport', (data) => {
        if (data?.dp !== undefined) {
          this._handleThermostatDP(data.dp, data.value);
        }
      });
    }

    tuyaCluster.onDataReport = (data) => {
      if (data?.dp !== undefined) {
        this._handleThermostatDP(data.dp, data.value);
      }
    };

    this.log('[TRV] Tuya DP listener configured');
  }

  /**
   * Handle incoming Tuya DP for thermostats
   *
   * DP Mapping (Zigbee2MQTT):
   * Standard:
   *   DP 2: system_mode (auto=0, heat=1, off=2)
   *   DP 3: running_state (heat=0, idle=1)
   *   DP 4: current_heating_setpoint (divideBy10)
   *   DP 5: local_temperature (divideBy10)
   *   DP 7: child_lock (lock=1, unlock=0)
   *   DP 13: battery (0-100)
   *   DP 101: window_detection (on/off)
   *   DP 104: valve_position (0-100)
   *
   * Avatto:
   *   DP 28-34: schedule (Mon-Sun)
   *   DP 35: error/battery_low
   *   DP 36: frost_protection
   *   DP 39: scale_protection
   *   DP 47: local_temperature_calibration
   */
  _handleThermostatDP(dpId, value) {
    this.log(`[TRV] DP${dpId} = ${value}`);

    switch (dpId) {
      // System mode
      case 2:
        const modes = { 0: 'auto', 1: 'heat', 2: 'off' };
        const mode = modes[value] || 'auto';
        this.log(`[TRV] Mode: ${mode}`);
        if (this.hasCapability('thermostat_mode')) {
          this.setCapabilityValue('thermostat_mode', mode).catch(this.error);
        }
        break;

      // Running state
      case 3:
        const running = value === 0; // heat=0, idle=1
        this.log(`[TRV] Running: ${running ? 'heating' : 'idle'}`);
        break;

      // Target temperature (setpoint)
      case 4:
      case 24: // Alternative DP for some models
        const targetTemp = value / 10;
        this.log(`[TRV] Target: ${targetTemp}°C`);
        if (this.hasCapability('target_temperature')) {
          this.setCapabilityValue('target_temperature', targetTemp).catch(this.error);
        }
        break;

      // Current temperature
      case 5:
      case 16: // Alternative DP for some models
        const currentTemp = value / 10;
        this.log(`[TRV] Current: ${currentTemp}°C`);
        if (this.hasCapability('measure_temperature')) {
          this.setCapabilityValue('measure_temperature', currentTemp).catch(this.error);
        }
        break;

      // Child lock
      case 7:
        const locked = Boolean(value);
        this.log(`[TRV] Child lock: ${locked}`);
        break;

      // Battery percentage
      case 13:
      case 35: // Avatto: error/battery_low combo
        if (dpId === 35 && value > 1) {
          // Error code, not battery
          this.log(`[TRV] Error: ${value}`);
        } else {
          const battery = dpId === 35 ? (value === 1 ? 10 : 100) : value;
          this.log(`[TRV] Battery: ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        }
        break;

      // Valve position
      case 104:
        const valve = Math.max(0, Math.min(100, value));
        this.log(`[TRV] Valve: ${valve}%`);
        if (this.hasCapability('valve_position')) {
          this.setCapabilityValue('valve_position', valve).catch(this.error);
        }
        break;

      // Window detection
      case 101:
        const windowOpen = Boolean(value);
        this.log(`[TRV] Window: ${windowOpen ? 'open' : 'closed'}`);
        if (this.hasCapability('alarm_contact')) {
          this.setCapabilityValue('alarm_contact', windowOpen).catch(this.error);
        }
        break;

      // Frost protection
      case 36:
        this.log(`[TRV] Frost protection: ${value ? 'ON' : 'OFF'}`);
        break;

      // Scale protection
      case 39:
        this.log(`[TRV] Scale protection: ${value ? 'ON' : 'OFF'}`);
        break;

      // Temperature calibration
      case 47:
        const calibration = value / 10;
        this.log(`[TRV] Calibration: ${calibration}°C`);
        break;

      // Schedule (Mon-Sun = DP 28-34)
      case 28: case 29: case 30: case 31: case 32: case 33: case 34:
        const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dpId - 28];
        this.log(`[TRV] Schedule ${day}: ${JSON.stringify(value)}`);
        break;

      default:
        this.log(`[TRV] Unknown DP${dpId} = ${value}`);
    }
  }

  /**
   * Register capability listeners for control
   */
  _registerCapabilityListeners() {
    // Target temperature
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        const dp = this._dpVariant === 'moes' ? 24 : 4;
        const temp = Math.round(value * 10);
        this.log(`[TRV] Setting target: ${value}°C`);
        await this._sendTuyaDP(dp, 'value', temp);
      });
    }

    // Thermostat mode
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (value) => {
        const modes = { 'auto': 0, 'heat': 1, 'off': 2 };
        const mode = modes[value] ?? 0;
        this.log(`[TRV] Setting mode: ${value}`);
        await this._sendTuyaDP(2, 'enum', mode);
      });
    }
  }

  /**
   * Send Tuya DP command
   */
  async _sendTuyaDP(dp, dataType, value) {
    try {
      if (this.tuyaEF00Manager) {
        await this.tuyaEF00Manager.setData(dp, value);
        return;
      }

      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya ||
        endpoint?.clusters?.manuSpecificTuya ||
        endpoint?.clusters?.[61184];

      if (!tuyaCluster) return;

      const seq = Date.now() % 65535;
      let dataBuffer;

      if (dataType === 'enum') {
        dataBuffer = Buffer.from([dp, 4, 0, 1, value]);
      } else if (dataType === 'value') {
        dataBuffer = Buffer.alloc(8);
        dataBuffer.writeUInt8(dp, 0);
        dataBuffer.writeUInt8(2, 1);
        dataBuffer.writeUInt16BE(4, 2);
        dataBuffer.writeUInt32BE(value, 4);
      } else {
        dataBuffer = Buffer.from([dp, 1, 0, 1, value ? 1 : 0]);
      }

      await tuyaCluster.dataRequest({ seq, dpValues: dataBuffer });
      this.log(`[TRV] Sent DP${dp} = ${value}`);
    } catch (err) {
      this.error('[TRV] Send DP error:', err.message);
    }
  }
}

module.exports = ThermostatTS0601Device;
