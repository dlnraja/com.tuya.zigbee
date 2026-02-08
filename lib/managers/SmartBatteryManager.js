/**
 * SmartBatteryManager v5.8.67
 * Intelligent battery detection for all Tuya Zigbee devices
 */
'use strict';

const BATTERY_DPS = [4, 10, 14, 15, 21, 100, 101, 102, 104];

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
    // v5.8.67: Non-linear discharge curves (Z2M-compatible)
    const curve = this._selectCurve(mV);
    return this._interpolateCurve(mV, curve);
  }

  _selectCurve(mV) {
    const d = (this.device?.driver?.id || '').toLowerCase();
    // 2xAA/2xAAA devices (TRVs, locks, thermostats): alkaline 2-cell
    if (d.includes('trv') || d.includes('thermostat') || d.includes('lock') || d.includes('siren')) {
      return CURVE_2xAA;
    }
    // Li-ion (3.7V nominal): rechargeable devices
    if (mV > 3500) return CURVE_LION;
    // Single AA/AAA (1.5V nominal)
    if (mV < 1800) return CURVE_1xAA;
    // CR2032/CR2450 lithium coin (3V nominal) - most common
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
// Flat ~2.9V for 80% of life, then steep drop
const CURVE_CR2032 = [
  [3000,100],[2950,95],[2900,90],[2850,85],[2800,80],
  [2750,70],[2700,60],[2650,50],[2600,40],[2550,30],
  [2500,20],[2400,10],[2300,5],[2100,0]
];

// 2xAA / 2xAAA alkaline (3V nominal, 1800-3300mV)
// Z2M '3V_1500_2800' adapted for 2-cell
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
