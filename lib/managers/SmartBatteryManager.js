'use strict';

const { safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * SmartBatteryManager v5.9.0
 * Intelligent battery detection and conflict resolution for all Tuya Zigbee devices.
 * 
 * Resolves the "battery alarm" and "battery measurement" conflict by:
 * 1. Automatically establishing bidirectional synchronization.
 * 2. Synthesizing a virtual percent (10% or 100%) if the device only reports an alarm.
 * 3. Automatically raising/lowering the alarm if the device only reports percentages.
 * 4. Preventing empty UI states or card glitches in Homey.
 */

const BATTERY_DPS = [4, 10, 14, 15, 21, 100, 101, 102, 104];

class SmartBatteryManager {
  constructor(device) {
    this.device = device;
    this._detected = false;
    this._lastValue = null;
    this._lastUpdateTime = 0;
  }

  async init() {
    await this._setupZCLListener();
    this.device.log('[BATTERY] SmartBatteryManager initialized with Conflict Resolution');
  }

  async _setupZCLListener() {
    try {
      const pc = this.device.zclNode?.endpoints?.[1]?.clusters?.powerConfiguration;
      if (!pc?.on) return;
      
      pc.on('attr.batteryPercentageRemaining', (v) => this.setBattery(safeParse(v, 2)));
      pc.on('attr.batteryVoltage', (v) => this.setBattery(this._voltageToPercent(v)));
      
      // Listen to battery low alarm attribute if reported directly in IAS Zone or Power cluster
      pc.on('attr.batteryAlarmState', (v) => this.setAlarmBattery(!!v));
    } catch (e) {}
  }

  async handleDP(dpId, value) {
    if (!BATTERY_DPS.includes(dpId)) return false;
    
    this.device.log(`[BATTERY] Received DP ${dpId} with raw value: ${value}`);

    // If the DP is a Boolean representing battery alarm instead of a percentage
    if (typeof value === 'boolean') {
      await this.setAlarmBattery(value);
      return true;
    }

    let percent = value;
    // Map voltage DPs
    if (dpId === 101 || dpId === 104) {
      percent = this._voltageToPercent(value);
    }
    
    await this.setBattery(percent);
    return true;
  }

  /**
   * Sets battery percentage and synchronizes low battery alarm.
   */
  async setBattery(percent) {
    if (percent === null || percent === undefined) return;
    percent = Math.max(0, Math.min(100, Math.round(percent)));
    
    // Auto-create capability if missing
    if (!this.device.hasCapability('measure_battery')) {
      await this.device.addCapability('measure_battery').catch(() => {});
      this.device.log('[BATTERY] Dynamically added missing measure_battery capability');
    }
    
    // Anti-flood throttle (5 mins bypassable on significant changes >= 2%)
    const now = Date.now();
    const elapsed = now - this._lastUpdateTime;
    const change = this._lastValue !== null ? Math.abs(percent - this._lastValue) : 100;
    
    if (this._lastValue === percent) return;
    if (elapsed < 300000 && change < 2) return;

    await this.device.setCapabilityValue('measure_battery', percent).catch(() => {});
    await this.device.setStoreValue('last_battery_percentage', percent).catch(() => {});
    
    this._lastValue = percent;
    this._lastUpdateTime = now;
    this.device.log(`[BATTERY] Set battery percentage: ${percent}%`);
    
    // Synchronize battery alarm (percent < 15% -> Alarm)
    await this.syncAlarmState(percent < 15);
  }

  /**
   * Sets battery alarm and synthesizes virtual percentage if needed.
   */
  async setAlarmBattery(alarmVal) {
    if (alarmVal === null || alarmVal === undefined) return;
    
    // Auto-create capability if missing
    if (!this.device.hasCapability('alarm_battery')) {
      await this.device.addCapability('alarm_battery').catch(() => {});
      this.device.log('[BATTERY] Dynamically added missing alarm_battery capability');
    }

    const prevAlarm = this.device.getCapabilityValue('alarm_battery');
    if (prevAlarm !== alarmVal) {
      await this.device.setCapabilityValue('alarm_battery', alarmVal).catch(() => {});
      this.device.log(`[BATTERY] Set battery low alarm: ${alarmVal}`);
    }

    // Bidirectional synthesis: if percentage is missing or conflicting, correct it!
    const currentPercent = this.device.getCapabilityValue('measure_battery');
    if (alarmVal) {
      if (currentPercent === null || currentPercent > 15) {
        // Synthesize low battery percentage
        await this.setBatteryDirect(10);
      }
    } else {
      if (currentPercent === null || currentPercent <= 15) {
        // Synthesize healthy battery percentage
        await this.setBatteryDirect(100);
      }
    }
  }

  /**
   * Helper to set battery directly without looping back to alarm setting.
   */
  async setBatteryDirect(percent) {
    if (!this.device.hasCapability('measure_battery')) {
      await this.device.addCapability('measure_battery').catch(() => {});
    }
    await this.device.setCapabilityValue('measure_battery', percent).catch(() => {});
    this._lastValue = percent;
    this._lastUpdateTime = Date.now();
    this.device.log(`[BATTERY] Synthesized virtual percentage: ${percent}%`);
  }

  /**
   * Syncs alarm state based on percent without recursive loops.
   */
  async syncAlarmState(alarmVal) {
    if (!this.device.hasCapability('alarm_battery')) {
      await this.device.addCapability('alarm_battery').catch(() => {});
    }
    const prevAlarm = this.device.getCapabilityValue('alarm_battery');
    if (prevAlarm !== alarmVal) {
      await this.device.setCapabilityValue('alarm_battery', alarmVal).catch(() => {});
      this.device.log(`[BATTERY] Coordinated battery alarm state: ${alarmVal}`);
    }
  }

  _voltageToPercent(mV) {
    if (mV === null || mV === undefined) return null;
    
    // Handle scale issues (e.g. voltage reported in tenths of volts or single volts)
    if (mV < 10) mV = mV * 1000; // 3V -> 3000mV
    else if (mV < 100) mV = mV * 100; // 30 tenths of V -> 3000mV
    
    const curve = this._selectCurve(mV);
    return this._interpolateCurve(mV, curve);
  }

  _selectCurve(mV) {
    const d = (this.device?.driver?.id || '').toLowerCase();
    if (d.includes('trv') || d.includes('thermostat') || d.includes('lock') || d.includes('siren')) {
      return CURVE_2xAA;
    }
    if (mV > 3500) return CURVE_LION;
    if (mV < 1800) return CURVE_1xAA;
    return CURVE_CR2032;
  }

  _interpolateCurve(mV, curve) {
    if (mV >= curve[0][0]) return 100;
    if (mV <= curve[curve.length - 1][0]) return 0;
    for (let i = 0; i < curve.length - 1; i++) {
      const [vH, pH] = curve[i];
      const [vL, pL] = curve[i + 1];
      if (mV >= vL && mV <= vH) {
        return Math.round(pL + ((mV - vL) / (vH - vL)) * (pH - pL));
      }
    }
    return 0;
  }
}

// Z2M '3V_2100' profile: CR2032/CR2450 Li-MnO2 coin cells
const CURVE_CR2032 = [
  [3000,100],[2950,95],[2900,90],[2850,85],[2800,80],
  [2750,70],[2700,60],[2650,50],[2600,40],[2550,30],
  [2500,20],[2400,10],[2300,5],[2100,0]
];

// 2xAA / 2xAAA alkaline (3V nominal, 1800-3300mV)
const CURVE_2xAA = [
  [3200,100],[3100,95],[3000,90],[2900,80],[2800,70],
  [2700,60],[2600,50],[2500,40],[2400,30],[2300,20],
  [2200,12],[2000,5],[1800,0]
];

// Single AA/AAA alkaline (1.5V nominal)
const CURVE_1xAA = [
  [1600,100],[1550,95],[1500,90],[1450,80],[1400,70],
  [1350,60],[1300,50],[1250,40],[1200,30],[1150,20],
  [1100,12],[1000,3],[900,0]
];

// Li-ion rechargeable (3.7V nominal)
const CURVE_LION = [
  [4200,100],[4100,95],[4000,88],[3900,78],[3800,65],
  [3700,50],[3600,35],[3500,22],[3400,12],[3300,5],[3000,0]
];

module.exports = SmartBatteryManager;
