/**
 * SmartBatteryManager v5.7.48
 * Intelligent battery detection for all Tuya Zigbee devices
 */
'use strict';

const BATTERY_DPS = [4, 10, 14, 15, 100, 101, 102, 104];

class SmartBatteryManager {
  constructor(device) {
    this.device = device;
    this._detected = false;
    this._lastValue = null;
  }

  async init() {
    await this._setupZCLListener();
    this.device.log('[BATTERY] 🔋 SmartBatteryManager ready');
  }

  async _setupZCLListener() {
    try {
      const pc = this.device.zclNode?.endpoints?.[1]?.clusters?.powerConfiguration;
      if (!pc?.on) return;
      
      pc.on('attr.batteryPercentageRemaining', (v) => this.setBattery(v / 2));
      pc.on('attr.batteryVoltage', (v) => this.setBattery(this._voltageToPercent(v * 100)));
    } catch (e) {}
  }

  async handleDP(dpId, value) {
    if (!BATTERY_DPS.includes(dpId)) return false;
    
    let percent = value;
    if (dpId === 101 || dpId === 104) {
      percent = this._voltageToPercent(value);
    }
    
    await this.setBattery(percent);
    return true;
  }

  async setBattery(percent) {
    if (percent === null || percent === undefined) return;
    percent = Math.max(0, Math.min(100, Math.round(percent)));
    
    if (!this.device.hasCapability('measure_battery')) {
      await this.device.addCapability('measure_battery').catch(() => {});
      this.device.log('[BATTERY] ✅ Added measure_battery capability');
    }
    
    if (this._lastValue !== percent) {
      await this.device.setCapabilityValue('measure_battery', percent).catch(() => {});
      this._lastValue = percent;
      this.device.log(`[BATTERY] 🔋 ${percent}%`);
    }
    
    // Low battery alarm
    if (this.device.hasCapability('alarm_battery')) {
      await this.device.setCapabilityValue('alarm_battery', percent < 15).catch(() => {});
    }
  }

  _voltageToPercent(mV) {
    // CR2032/CR2450: 2000-3000mV
    if (mV >= 2000 && mV <= 3300) {
      return Math.round(((mV - 2000) / 1000) * 100);
    }
    // AA/AAA: 900-1500mV per cell
    if (mV >= 1800 && mV <= 3300) {
      return Math.round(((mV - 1800) / 1200) * 100);
    }
    return Math.min(100, Math.round(mV / 30));
  }
}

module.exports = SmartBatteryManager;
