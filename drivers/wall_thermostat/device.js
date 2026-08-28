'use strict';

const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('./helpers');
const { Cluster } = require('zigbee-clusters');
const { equalsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

Cluster.addCluster(TuyaOnOffCluster);
Cluster.addCluster(TuyaSpecificCluster);

/** BHT-002 / generic wall thermostat (floor/boiler) — DP2 = manual/program. */
const BHT_DATA_POINTS = {
  onOff: 1,
  mode: 2,
  targetTemperature: 16,
  currentTemperature: 24,
  childlock: 40,
};

/**
 * TYBAC-006 FCU (Z2M) — sacred couples only:
 *   _TZE204_mpbki2zm|TS0601, _TZE204_qujphad5|TS0601
 * DP2 = system_mode cool/heat/fan_only; DP28 = fan_mode; DP101 = manual/schedule.
 */
const FCU_DATA_POINTS = {
  onOff: 1,
  systemMode: 2,
  targetTemperature: 16,
  currentTemperature: 24,
  fanMode: 28,
  childlock: 40,
  manualMode: 101,
};

const FCU_MFRS = ['_TZE204_mpbki2zm', '_TZE204_qujphad5'];
const SYSTEM_MODE_RX = { 0: 'cool', 1: 'heat', 2: 'fan_only' };
const SYSTEM_MODE_TX = { cool: 0, heat: 1, fan_only: 2 };
const FAN_MODE_RX = { 0: 'low', 1: 'medium', 2: 'high', 3: 'auto' };
const FAN_MODE_TX = { low: 0, medium: 1, high: 2, auto: 3 };

/**
 * WallThermostatDevice — BHT-002 path + TYBAC-006 FCU couple branch (P2293 / issue #532).
 */
class WallThermostatDevice extends TuyaSpecificClusterDevice {
  get mainsPowered() { return true; }

  _isFcuCouple() {
    const mfr = this.getData?.()?.manufacturerName
      || this.zigbee?.manufacturerName
      || this.getStoreValue?.('manufacturerName')
      || '';
    const pid = this.getData?.()?.productId
      || this.zigbee?.productId
      || this.getStoreValue?.('productId')
      || '';
    const mfrOk = FCU_MFRS.some((m) => equalsCI(mfr, m));
    const pidOk = !pid || equalsCI(pid, 'TS0601');
    return mfrOk && pidOk;
  }

  async onNodeInit({ zclNode }) {
    this.printNode();
    this._fcu = this._isFcuCouple();
    this.log(this._fcu ? '🚀 Wall Thermostat FCU (TYBAC-006) path' : '🚀 Wall Thermostat BHT path');

    for (const cap of ['thermostat_programming', 'child_lock']) {
      if (!this.hasCapability(cap)) await this.addCapability(cap);
    }
    if (this._fcu) {
      for (const cap of ['thermostat_mode', 'fan_mode']) {
        if (!this.hasCapability(cap)) await this.addCapability(cap);
      }
    }

    this.registerCapabilityListener('onoff', async (onOff) => {
      await this.writeBool(BHT_DATA_POINTS.onOff, onOff);
      if (this._fcu && !onOff && this.hasCapability('thermostat_mode')) {
        await this.safeSetCapabilityValue('thermostat_mode', 'off');
      }
      this.log('Device on/off set', onOff);
    });

    this.registerCapabilityListener('thermostat_programming', async (mode) => {
      if (this._fcu) {
        // Z2M DP101: ON=manual, OFF=schedule → Homey "0"=Manual "1"=Programming
        const manualOn = String(mode) === '0';
        await this.writeBool(FCU_DATA_POINTS.manualMode, manualOn);
      } else {
        await this.writeEnum(BHT_DATA_POINTS.mode, mode);
      }
      this.log('Device programming mode set', mode);
    });

    if (this._fcu) {
      this.registerCapabilityListener('thermostat_mode', async (mode) => {
        if (mode === 'off') {
          await this.writeBool(FCU_DATA_POINTS.onOff, false);
          await this.safeSetCapabilityValue('onoff', false);
          return;
        }
        const enumVal = SYSTEM_MODE_TX[mode];
        if (enumVal === undefined) return;
        await this.writeBool(FCU_DATA_POINTS.onOff, true);
        await this.writeEnum(FCU_DATA_POINTS.systemMode, enumVal);
        await this.safeSetCapabilityValue('onoff', true);
        this.log('FCU system_mode TX', mode, enumVal);
      });

      this.registerCapabilityListener('fan_mode', async (mode) => {
        const enumVal = FAN_MODE_TX[mode];
        if (enumVal === undefined) return;
        await this.writeEnum(FCU_DATA_POINTS.fanMode, enumVal);
        this.log('FCU fan_mode TX', mode, enumVal);
      });
    }

    this.registerCapabilityListener('target_temperature', async (targetTemperature) => {
      const rawValue = Math.round(targetTemperature * 10);
      await this.writeData32(BHT_DATA_POINTS.targetTemperature, rawValue);
      this.log('Target temperature set', targetTemperature, '(raw:', rawValue, ')');
    });

    this.registerCapabilityListener('child_lock', async (childlock) => {
      await this.writeBool(BHT_DATA_POINTS.childlock, childlock);
      this.log('Childlock set', childlock);
    });

    zclNode.endpoints[1].clusters.tuya.on('reporting', (value) => this.processResponse(value));
    zclNode.endpoints[1].clusters.tuya.on('response', (value) => this.processResponse(value));
  }

  async processResponse(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);

    if (this._fcu) {
      await this._processFcuResponse(dp, parsedValue);
      return;
    }

    switch (dp) {
      case BHT_DATA_POINTS.onOff:
        try { await this.safeSetCapabilityValue('onoff', parsedValue); } catch (e) { this.log('Failed to set on/off', e); }
        break;
      case BHT_DATA_POINTS.mode:
        try {
          await this.safeSetCapabilityValue('thermostat_programming', parsedValue === 0 ? '0' : '1');
        } catch (e) { this.log('Failed to set mode', e); }
        break;
      case BHT_DATA_POINTS.currentTemperature:
        try { await this.safeSetCapabilityValue('measure_temperature', parsedValue / 10); } catch (e) { this.log('Failed to set current temperature', e); }
        break;
      case BHT_DATA_POINTS.targetTemperature:
        try { await this.safeSetCapabilityValue('target_temperature', parsedValue / 10); } catch (e) { this.log('Failed to set target temperature', e); }
        break;
      case BHT_DATA_POINTS.childlock:
        try { await this.safeSetCapabilityValue('child_lock', parsedValue); } catch (e) { this.log('Failed to set childlock', e); }
        break;
      default:
        this.log('processReporting', dp, parsedValue);
    }
  }

  async _processFcuResponse(dp, parsedValue) {
    try {
      switch (dp) {
        case FCU_DATA_POINTS.onOff: {
          await this.safeSetCapabilityValue('onoff', !!parsedValue);
          if (!parsedValue && this.hasCapability('thermostat_mode')) {
            await this.safeSetCapabilityValue('thermostat_mode', 'off');
          }
          break;
        }
        case FCU_DATA_POINTS.systemMode: {
          const mode = SYSTEM_MODE_RX[parsedValue];
          if (mode && this.hasCapability('thermostat_mode')) {
            await this.safeSetCapabilityValue('thermostat_mode', mode);
          }
          break;
        }
        case FCU_DATA_POINTS.fanMode: {
          const fan = FAN_MODE_RX[parsedValue];
          if (fan && this.hasCapability('fan_mode')) {
            await this.safeSetCapabilityValue('fan_mode', fan);
          }
          break;
        }
        case FCU_DATA_POINTS.manualMode: {
          // Z2M: ON=manual → Homey "0"; OFF=schedule → "1"
          await this.safeSetCapabilityValue('thermostat_programming', parsedValue ? '0' : '1');
          break;
        }
        case FCU_DATA_POINTS.currentTemperature:
          await this.safeSetCapabilityValue('measure_temperature', parsedValue / 10);
          break;
        case FCU_DATA_POINTS.targetTemperature:
          await this.safeSetCapabilityValue('target_temperature', parsedValue / 10);
          break;
        case FCU_DATA_POINTS.childlock:
          await this.safeSetCapabilityValue('child_lock', !!parsedValue);
          break;
        default:
          this.log('FCU processReporting', dp, parsedValue);
      }
    } catch (e) {
      this.log('FCU DP', dp, 'set failed', e);
    }
  }
}

module.exports = WallThermostatDevice;
