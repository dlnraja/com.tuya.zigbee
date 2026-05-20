'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * Liquid Level Sensor - TLC2206-ZB / ME201WZ Zigbee
 *
 * Ultrasonic liquid level sensor for tanks and containers.
 * Z2M-verified DP mapping (zigbee2mqtt.io/devices/TLC2206.html):
 *
 * READ DPs:
 * - DP 1:  liquid_state (enum: 0=normal, 1=low, 2=high)
 * - DP 2:  liquid_depth (value: cm, raw integer)
 * - DP 22: liquid_level_percent (value: 0-100%)
 *
 * WRITE DPs (settings):
 * - DP 7:  max_set (value: max alarm %, 0-100)
 * - DP 8:  min_set (value: min alarm %, 0-100)
 * - DP 19: installation_height (value: sensor to tank bottom, mm, 10-4000)
 * - DP 21: liquid_depth_max (value: sensor to full line, mm, 10-4000)
 *
 * Sources: Z2M #21015, #22543, zigpy/zha-device-handlers#3397
 * Fingerprints: _TZE200_lvkk0hdg (EPTTECH), _TZE200_81isopgh, _TZE200_htnnfasr, etc.
 *
 * v5.9.12: Complete rewrite to match Z2M TLC2206 verified DP mapping
 */

const LIQUID_STATE = { 0: 'normal', 1: 'low', 2: 'high' };

class WaterTankMonitorDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    this.log('[LIQUID] Initializing liquid level sensor...');
    this._lastState = null;
    this._lastDepth = null;
    this._lastPercent = null;

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
    this.log('[LIQUID] Liquid level sensor initialized');
  }

  /**
   * Handle Tuya datapoints  Z2M TLC2206 verified mapping
   */
  async _handleDP(dp, value) {
    this.log(`[LIQUID] DP${dp}: ${value}`);

    try {
      switch (dp) {
      case 1: // liquid_state (enum: 0=normal, 1=low, 2=high)
        await this._handleLiquidState(value);
        break;

      case 2: // liquid_depth (cm)
        await this._handleLiquidDepth(value);
        break;

      case 7: // max_set readback
        this.log(`[LIQUID] Max alarm readback: ${value}%`);
        break;

      case 8: // min_set readback
        this.log(`[LIQUID] Min alarm readback: ${value}%`);
        break;

      case 19: // installation_height readback (mm)
        this.log(`[LIQUID] Installation height readback: ${value}mm`);
        break;

      case 21: // liquid_depth_max readback (mm)
        this.log(`[LIQUID] Depth max readback: ${value}mm`);
        break;

      case 22: // liquid_level_percent (0-100)
        await this._handleLiquidPercent(value);
        break;

      default:
        this.log(`[LIQUID] Unknown DP${dp} = ${value}`);
        await super._handleDP(dp, value);
        break;
      }
    } catch (err) {
      this.error(`[LIQUID] Error handling DP${dp}:`, err.message);
    }
  }

  async _handleLiquidState(value) {
    const parsed = typeof value === 'number' ? value : parseInt(value) || 0;
    const stateName = LIQUID_STATE[parsed] || 'normal';
    this._lastState = stateName;
    this.log(`[LIQUID] State: ${stateName} (raw=${parsed})`);

    const isLow = parsed === 1;
    const isHigh = parsed === 2;

    if (this.hasCapability('alarm_water_low')) {
      await this.setCapabilityValue('alarm_water_low', isLow).catch(() => {});
    }
    if (this.hasCapability('alarm_water_high')) {
      await this.setCapabilityValue('alarm_water_high', isHigh).catch(() => {});
    }
    if (this.hasCapability('alarm_water')) {
      await this.setCapabilityValue('alarm_water', isLow || isHigh).catch(() => {});
    }

    // Trigger flows
    if (isLow) {
      this.driver.lowLevelTrigger?.trigger(this, { state: 'low' }, {}).catch(() => {});
    }
    if (isHigh) {
      this.driver.highLevelTrigger?.trigger(this, { state: 'high' }, {}).catch(() => {});
    }
    this.driver.stateChangedTrigger?.trigger(this, { state: stateName }, {}).catch(() => {});
  }

  async _handleLiquidDepth(value) {
    const parsed = typeof value === 'number' ? value : parseInt(value) || 0;
    const depthCm = parsed;
    this._lastDepth = depthCm;
    this.log(`[LIQUID] Depth: ${depthCm} cm`);

    if (this.hasCapability('measure_water_level')) {
      await this.setCapabilityValue('measure_water_level', depthCm).catch(() => {});
    }

    this.driver.levelChangedTrigger?.trigger(this, {
      depth: depthCm,
      percentage: this._lastPercent || 0
    }, {}).catch(() => {});
  }

  async _handleLiquidPercent(value) {
    const parsed = typeof value === 'number' ? value : parseInt(value) || 0;
    const percent = Math.max(0, Math.min(100, parsed));
    this._lastPercent = percent;
    this.log(`[LIQUID] Fill: ${percent}%`);

    if (this.hasCapability('measure_water_percentage')) {
      await this.setCapabilityValue('measure_water_percentage', percent).catch(() => {});
    }
  }

  /**
   * Send writable DP settings to device
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[LIQUID] Settings changed:', changedKeys);

    for (const key of changedKeys) {
      try {
        const val = newSettings[key];
        switch (key) {
        case 'installation_height': // DP19
          if (this.tuyaEF00Manager) await this.tuyaEF00Manager.sendDP(19, val, 'value');
          this.log(`[LIQUID] Sent DP19 installation_height = ${val}mm`);
          break;
        case 'liquid_depth_max': // DP21
          if (this.tuyaEF00Manager) await this.tuyaEF00Manager.sendDP(21, val, 'value');
          this.log(`[LIQUID] Sent DP21 liquid_depth_max = ${val}mm`);
          break;
        case 'max_set': // DP7
          if (this.tuyaEF00Manager) await this.tuyaEF00Manager.sendDP(7, val, 'value');
          this.log(`[LIQUID] Sent DP7 max_set = ${val}%`);
          break;
        case 'min_set': // DP8
          if (this.tuyaEF00Manager) await this.tuyaEF00Manager.sendDP(8, val, 'value');
          this.log(`[LIQUID] Sent DP8 min_set = ${val}%`);
          break;
        }
      } catch (err) {
        this.error(`[LIQUID] Failed to send setting ${key}:`, err.message);
      }
    }
  }

  onDeleted() {
    this.log('[LIQUID] Liquid level sensor deleted');
  }
}

module.exports = WaterTankMonitorDevice;
