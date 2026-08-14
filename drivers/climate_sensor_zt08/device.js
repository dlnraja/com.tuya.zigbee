'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const GlobalTimeSyncEngine = require('../../lib/tuya/GlobalTimeSyncEngine');
const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
const { ClimateInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

/**
 * P133 / GH #513 — Dedicated thin driver for ZT08 LCD climate
 * (_TZE284_hodyryli + TS0601). Interview clusters: 0,4,5,61184,60672.
 * Kept separate from bloated climate_sensor so Homey can match the sacred couple.
 */
class ClimateSensorZt08Device extends UnifiedSensorBase {
  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
      2: { capability: 'measure_humidity', smartDivisor: true, useInference: true },
      3: {
        capability: 'measure_battery',
        transform: (v) => UnifiedBatteryHandler.calculateFromTuyaDP(v, 'enum3'),
      },
      38: { capability: 'measure_temperature.probe', smartDivisor: true, dynamicAdd: true },
    };
  }

  async onNodeInit({ zclNode }) {
    this._climateInference = new ClimateInference(this, {
      maxTempJump: 5,
      maxHumidityJump: 15,
      minTemp: -40,
      maxTemp: 100,
    });
    this._batteryInference = new BatteryInference(this);

    await super.onNodeInit({ zclNode });

    try {
      this._timeSyncEngine = new GlobalTimeSyncEngine(this);
      this._timeSyncEngine.setupListener(zclNode);
      this._initialTimeSyncTimer = this.homey.setTimeout(async () => {
        if (this._destroyed) { return; }
        await this._timeSyncEngine.syncTime(zclNode).catch(() => {});
      }, 5000);
      this._timeSyncEngine.schedulePeriodicSync(zclNode, 4 * 60 * 60 * 1000);
    } catch (e) {
      this.log('[ZT08] Time sync engine failed:', e.message);
    }

    this.log('[ZT08] Ready (P133 dedicated #513 driver)');
  }

  onTuyaDP(dpId, value) {
    this.log(`[ZT08] DP${dpId} = ${value}`);
    const mapping = this.dpMappings[dpId];
    if (!mapping) {
      return super.onTuyaDP(dpId, value);
    }

    if (mapping.dynamicAdd && mapping.capability && !this.hasCapability(mapping.capability)) {
      this.addCapability(mapping.capability)
        .then(() => this.log(`[ZT08] DYNAMIC ADD: ${mapping.capability}`))
        .catch((e) => this.log(`[ZT08] Could not add ${mapping.capability}: ${e.message}`));
    }

    let val;
    if (typeof mapping.transform === 'function') {
      val = mapping.transform(value);
    } else if (mapping.smartDivisor === true) {
      const { smartParse } = require('../../lib/managers/SmartDivisorManager');
      val = smartParse(value, dpId, {
        manufacturerName: this.getSetting('zb_manufacturer_name') || '_TZE284_hodyryli',
        capability: mapping.capability,
        deviceId: this.getData()?.id || '',
      });
    } else {
      val = value / (mapping.divisor || 1);
    }

    if (mapping.capability === 'measure_temperature' || mapping.capability === 'measure_temperature.probe') {
      val = this._climateInference?.validateTemperature(val) ?? val;
    } else if (mapping.capability === 'measure_humidity') {
      val = this._climateInference?.validateHumidity(val) ?? val;
    } else if (mapping.capability === 'measure_battery') {
      val = this._batteryInference?.validateBattery(val) ?? val;
    }

    if (val !== null && val !== undefined) {
      return this.safeSetCapabilityValue(mapping.capability, val).catch(() => {});
    }
  }
}

module.exports = ClimateSensorZt08Device;
