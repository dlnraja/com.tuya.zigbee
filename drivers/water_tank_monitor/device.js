'use strict';
const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');

/**
 * Liquid Level Sensor - TLC2206-ZB / ME201WZ Zigbee
 * Ultrasonic liquid level sensor for tanks and containers.
 */
const LIQUID_STATE = { 0: 'normal', 1: 'low', 2: 'high' };

class WaterTankMonitorDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.log('[LIQUID] Initializing liquid level sensor...');
      this._lastState = null;
      this._lastDepth = null;
      this._lastPercent = null;
      await super.onNodeInit({ zclNode });
      this.log('[LIQUID] Liquid level sensor initialized');
    }, 'onNodeInit');
  }

  /**
   * Handle Tuya datapoints — Z2M TLC2206 verified mapping
   */
  async _handleDP(dp, value) {
    if (this._destroyed) return;
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
      this.error('[LIQUID] _handleDP error:', err.message);
    }
  }

  async _handleLiquidState(value) {
    if (this._destroyed) return;
    const parsed = typeof value === 'number' ? value : parseInt(value) || 0;
    const stateName = LIQUID_STATE[parsed] || 'normal';
    this._lastState = stateName;
    this.log(`[LIQUID] State: ${stateName} (raw=${parsed})`);

    const isLow = parsed === 1;
    const isHigh = parsed === 2;

    if (this.hasCapability('alarm_water_low')) {
      await this.safeSetCapabilityValue('alarm_water_low', isLow).catch(() => { });
    }
    if (this.hasCapability('alarm_water_high')) {
      await this.safeSetCapabilityValue('alarm_water_high', isHigh).catch(() => { });
    }
    if (this.hasCapability('alarm_water')) {
      await this.safeSetCapabilityValue('alarm_water', isLow || isHigh).catch(() => { });
    }

    // Trigger flows
    if (isLow && this.driver.lowLevelTrigger) {
      this.driver.lowLevelTrigger.trigger(this, { state: 'low' }).catch(() => {});
    }
    if (isHigh && this.driver.highLevelTrigger) {
      this.driver.highLevelTrigger.trigger(this, { state: 'high' }).catch(() => {});
    }
    if (this.driver.stateChangedTrigger) {
      this.driver.stateChangedTrigger.trigger(this, { state: stateName }).catch(() => {});
    }
  }

  async _handleLiquidDepth(value) {
    if (this._destroyed) return;
    const parsed = typeof value === 'number' ? value : parseInt(value) || 0;
    const depthCm = parsed;
    this._lastDepth = depthCm;
    this.log(`[LIQUID] Depth: ${depthCm} cm`);

    if (this.hasCapability('measure_water_level')) {
      await this.safeSetCapabilityValue('measure_water_level', depthCm).catch(() => { });
    }

    if (this.driver.levelChangedTrigger) {
      this.driver.levelChangedTrigger.trigger(this, {
        depth: depthCm,
        percentage: this._lastPercent || 0
      }).catch(() => { });
    }
  }

  async _handleLiquidPercent(value) {
    if (this._destroyed) return;
    const parsed = typeof value === 'number' ? value : parseInt(value) || 0;
    const percent = Math.max(0, Math.min(100, parsed));
    this._lastPercent = percent;
    this.log(`[LIQUID] Fill: ${percent}%`);

    if (this.hasCapability('measure_water_percentage')) {
      await this.safeSetCapabilityValue('measure_water_percentage', percent).catch(() => { });
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[LIQUID] Settings changed:', changedKeys);

    for (const key of changedKeys) {
      try {
        const val = newSettings[key];
        switch (key) {
          case 'installation_height': // DP19
            if (this.tuyaEF00Manager) {await this.tuyaEF00Manager.sendDP(19, val, 'value');}
            this.log(`[LIQUID] Sent DP19 installation_height = ${val}mm`);
            break;
          case 'liquid_depth_max': // DP21
            if (this.tuyaEF00Manager) {await this.tuyaEF00Manager.sendDP(21, val, 'value');}
            this.log(`[LIQUID] Sent DP21 liquid_depth_max = ${val}mm`);
            break;
          case 'max_set': // DP7
            if (this.tuyaEF00Manager) {await this.tuyaEF00Manager.sendDP(7, val, 'value');}
            this.log(`[LIQUID] Sent DP7 max_set = ${val}%`);
            break;
          case 'min_set': // DP8
            if (this.tuyaEF00Manager) {await this.tuyaEF00Manager.sendDP(8, val, 'value');}
            this.log(`[LIQUID] Sent DP8 min_set = ${val}%`);
            break;
        }
      } catch (err) {
        this.error(`[LIQUID] Error updating setting ${key}:`, err.message);
      }
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('[LIQUID] Liquid level sensor deleted');
  }
}

module.exports = WaterTankMonitorDevice;
