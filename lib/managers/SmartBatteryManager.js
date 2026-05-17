'use strict';

const { safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * SmartBatteryManager v5.12.0 (Enriched Hardened Edition)
 * Intelligent battery detection, conflict resolution, and historical logic restoration.
 * 
 * v5.12.0: ENRICHMENT UPDATES:
 * 1. Restored IAS Zone low-battery monitoring (from UnifiedBatteryHandler).
 * 2. Restored Runtime Adaptive Capabilities (removes conflicting measure/alarm caps).
 * 3. Restored Kinetic Device Detection (skips battery logic for self-powered switches).
 * 4. Restored Anti-False-100% Logic (restores last known value from store on restart).
 * 5. Improved Bidirectional Synthesis between alarm_battery and measure_battery.
 */

const BATTERY_DPS = [4, 10, 14, 15, 21, 100, 101, 102, 104, 105];

class SmartBatteryManager {
  constructor(device) {
    this.device = device;
    this._detected = false;
    this._lastValue = null;
    this._lastUpdateTime = 0;
  }

  async init() {
    const zclNode = this.device.zclNode;
    
    // 1. Detect device type (Mains/Kinetic/Battery)
    const isMains = this.device.mainsPowered === true;
    const isKinetic = this._isKineticDevice();
    const hasZclBattery = this._hasZclBatteryCluster(zclNode);
    const hasIasZone = this._hasIasZoneCluster(zclNode);

    this.device.log(`[BATTERY] Initializing: ZCL=${hasZclBattery}, IAS=${hasIasZone}, Mains=${isMains}, Kinetic=${isKinetic}`);

    // 2. Adapt capabilities at runtime (SDK v3 compatibility)
    await this._adaptCapabilities(hasZclBattery, hasIasZone, isMains, isKinetic);

    // 3. Setup Listeners
    if (!isMains && !isKinetic) {
      await this._setupZCLListener();
      await this._setupIASListener(zclNode);
      this._restoreFromStore();
    }

    this.device.log('[BATTERY] SmartBatteryManager v5.12.0 initialized');
  }

  /**
   * Adaptive capability management
   * SDK v3 Rule: NEVER have both measure_battery + alarm_battery
   */
  async _adaptCapabilities(hasZcl, hasIas, isMains, isKinetic) {
    try {
      const hasMeasure = this.device.hasCapability('measure_battery');
      const hasAlarm = this.device.hasCapability('alarm_battery');

      if (isMains || isKinetic) {
        if (hasMeasure) await this.device.removeCapability('measure_battery').catch(() => {});
        if (hasAlarm) await this.device.removeCapability('alarm_battery').catch(() => {});
        return;
      }

      // If we have ZCL % support, prioritize measure_battery
      if (hasZcl) {
        if (!hasMeasure) await this.device.addCapability('measure_battery').catch(() => {});
        if (hasAlarm) await this.device.removeCapability('alarm_battery').catch(() => {});
      } 
      // If we ONLY have IAS Zone, use alarm_battery
      else if (hasIas && !hasMeasure) {
        if (!hasAlarm) await this.device.addCapability('alarm_battery').catch(() => {});
      }
    } catch (err) {
      this.device.log('[BATTERY] Capability adaptation error:', err.message);
    }
  }

  _isKineticDevice() {
    try {
      const modelId = this.device.getSettings?.().zb_model_id || '';
      // TS0041-TS0046 are often kinetic scene switches
      return /^TS004[1-6]$/.test(modelId) && !this.device.getEnergy?.()?.batteries?.length;
    } catch (e) { return false; }
  }

  _hasZclBatteryCluster(zclNode) {
    const pc = zclNode?.endpoints?.[1]?.clusters?.powerConfiguration;
    return !!pc?.on;
  }

  _hasIasZoneCluster(zclNode) {
    const ias = zclNode?.endpoints?.[1]?.clusters?.iasZone || zclNode?.endpoints?.[1]?.clusters?.ssIasZone;
    return !!ias;
  }

  async _setupZCLListener() {
    try {
      const pc = this.device.zclNode?.endpoints?.[1]?.clusters?.powerConfiguration;
      if (!pc?.on) return;
      
      pc.on('attr.batteryPercentageRemaining', (v) => this.setBattery(safeParse(v, 2)));
      pc.on('attr.batteryVoltage', (v) => this.setBattery(this._voltageToPercent(v)));
      
      // Some devices report alarm state in Power cluster
      pc.on('attr.batteryAlarmState', (v) => this.setAlarmBattery(!!v));
    } catch (e) {}
  }

  async _setupIASListener(zclNode) {
    try {
      const ias = zclNode?.endpoints?.[1]?.clusters?.iasZone || zclNode?.endpoints?.[1]?.clusters?.ssIasZone;
      if (!ias) return;

      // Bit 3 of ZoneStatus is battery-low
      const parseLowBat = (status) => (status & 0x08) !== 0;

      ias.on('attr.zoneStatus', (v) => this.setAlarmBattery(parseLowBat(v)));
      
      // Also catch frame notifications (more reliable for some Tuya sensors)
      if (ias.onZoneStatusChangeNotification) {
        const original = ias.onZoneStatusChangeNotification;
        ias.onZoneStatusChangeNotification = (payload) => {
          if (original) original(payload);
          this.setAlarmBattery(parseLowBat(payload?.zoneStatus || 0));
        };
      }
    } catch (e) {}
  }

  _restoreFromStore() {
    const stored = this.device.getStoreValue('last_battery_percentage');
    if (stored !== null && typeof stored === 'number') {
      this.device.log(`[BATTERY] Restored last known value: ${stored}%`);
      this._lastValue = stored;
      // We don't setCapabilityValue here to avoid flow triggers on app restart,
      // but we keep it in memory for delta checks.
    }
  }

  async handleDP(dpId, value) {
    if (!BATTERY_DPS.includes(dpId)) return false;
    
    this.device.log(`[BATTERY] Received DP ${dpId} with raw value: ${value}`);

    if (typeof value === 'boolean') {
      await this.setAlarmBattery(value);
      return true;
    }

    let percent = value;
    if (dpId === 101 || dpId === 104 || dpId === 105) {
      percent = this._voltageToPercent(value);
    }
    
    await this.setBattery(percent);
    return true;
  }

  async setBattery(percent) {
    if (percent === null || percent === undefined) return;
    percent = Math.max(0, Math.min(100, Math.round(percent)));
    
    if (!this.device.hasCapability('measure_battery') && !this.device.hasCapability('alarm_battery')) {
      await this.device.addCapability('measure_battery').catch(() => {});
    }
    
    const now = Date.now();
    const elapsed = now - this._lastUpdateTime;
    const change = this._lastValue !== null ? Math.abs(percent - this._lastValue) : 100;
    
    if (this._lastValue === percent) return;
    if (elapsed < 300000 && change < 2) return;

    if (this.device.hasCapability('measure_battery')) {
      await this.device.setCapabilityValue('measure_battery', percent).catch(() => {});
    }
    await this.device.setStoreValue('last_battery_percentage', percent).catch(() => {});
    
    this._lastValue = percent;
    this._lastUpdateTime = now;
    this.device.log(`[BATTERY] Set battery: ${percent}%`);
    
    await this.syncAlarmState(percent < 15);
  }

  async setAlarmBattery(alarmVal) {
    if (alarmVal === null || alarmVal === undefined) return;
    
    if (!this.device.hasCapability('alarm_battery') && !this.device.hasCapability('measure_battery')) {
      await this.device.addCapability('alarm_battery').catch(() => {});
    }

    if (this.device.hasCapability('alarm_battery')) {
      const prevAlarm = this.device.getCapabilityValue('alarm_battery');
      if (prevAlarm !== alarmVal) {
        await this.device.setCapabilityValue('alarm_battery', alarmVal).catch(() => {});
        this.device.log(`[BATTERY] Set low alarm: ${alarmVal}`);
      }
    }

    // Bidirectional synthesis
    const currentPercent = this.device.getCapabilityValue('measure_battery');
    if (alarmVal && (currentPercent === null || currentPercent > 15)) {
      await this.setBatteryDirect(10);
    } else if (!alarmVal && (currentPercent === null || currentPercent <= 15)) {
      await this.setBatteryDirect(100);
    }
  }

  async setBatteryDirect(percent) {
    if (this.device.hasCapability('measure_battery')) {
      await this.device.setCapabilityValue('measure_battery', percent).catch(() => {});
      this._lastValue = percent;
      this._lastUpdateTime = Date.now();
      this.device.log(`[BATTERY] Synthesized virtual percentage: ${percent}%`);
    }
  }

  async syncAlarmState(alarmVal) {
    if (this.device.hasCapability('alarm_battery')) {
      const prevAlarm = this.device.getCapabilityValue('alarm_battery');
      if (prevAlarm !== alarmVal) {
        await this.device.setCapabilityValue('alarm_battery', alarmVal).catch(() => {});
        this.device.log(`[BATTERY] Coordinated alarm state: ${alarmVal}`);
      }
    }
  }

  _voltageToPercent(mV) {
    if (mV === null || mV === undefined) return null;
    if (mV < 10) mV = mV * 1000;
    else if (mV < 100) mV = mV * 100;
    const curve = this._selectCurve(mV);
    return this._interpolateCurve(mV, curve);
  }

  _selectCurve(mV) {
    const d = (this.device?.driver?.id || '').toLowerCase();
    if (d.includes('trv') || d.includes('thermostat') || d.includes('lock') || d.includes('siren') || d.includes('radiator')) {
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

const CURVE_CR2032 = [[3000,100],[2950,95],[2900,90],[2850,85],[2800,80],[2750,70],[2700,60],[2650,50],[2600,40],[2550,30],[2500,20],[2400,10],[2300,5],[2100,0]];
const CURVE_2xAA = [[3200,100],[3100,95],[3000,90],[2900,80],[2800,70],[2700,60],[2600,50],[2500,40],[2400,30],[2300,20],[2200,12],[2000,5],[1800,0]];
const CURVE_1xAA = [[1600,100],[1550,95],[1500,90],[1450,80],[1400,70],[1350,60],[1300,50],[1250,40],[1200,30],[1150,20],[1100,12],[1000,3],[900,0]];
const CURVE_LION = [[4200,100],[4100,95],[4000,88],[3900,78],[3800,65],[3700,50],[3600,35],[3500,22],[3400,12],[3300,5],[3000,0]];

module.exports = SmartBatteryManager;
