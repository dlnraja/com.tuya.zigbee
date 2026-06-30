'use strict';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const INTERVAL_MS = 15 * 60 * 1000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeTimestamp(value) {
  if (!value) return 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'number') {
    return value < 10000000000 ? value * 1000 : value;
  }
  return 0;
}

class DeviceTelemetryEstimator {
  constructor(device, options = {}) {
    this.device = device;
    this.options = options;
    this.interval = null;
    this._applyingEstimate = false;
    this._refreshing = false;
  }

  static attach(device, options = {}) {
    if (!device) return null;
    if (device.__deviceTelemetryEstimator) {
      return device.__deviceTelemetryEstimator;
    }

    const estimator = new DeviceTelemetryEstimator(device, options);
    device.__deviceTelemetryEstimator = estimator;
    estimator.init().catch(err => estimator._log(`[TELEMETRY] Init failed: ${err.message}`));
    return estimator;
  }

  static async record(device, capability, value, meta = {}) {
    const estimator = DeviceTelemetryEstimator.attach(device);
    if (!estimator) return false;
    return estimator.recordCapability(capability, value, meta);
  }

  async init() {
    await this.refresh('init');
    const homey = this.device.homey;
    const setIntervalFn = homey?.setInterval?.bind(homey) || setInterval;
    this.interval = setIntervalFn(async () => {
      if (this._isDestroyed()) return;
      await this.refresh('periodic');
    }, INTERVAL_MS);
    this.interval?.unref?.();
  }

  destroy() {
    if (!this.interval) return;
    const homey = this.device.homey;
    const clearIntervalFn = homey?.clearInterval?.bind(homey) || clearInterval;
    clearIntervalFn(this.interval);
    this.interval = null;
  }

  async recordCapability(capability, value, meta = {}) {
    if (!capability || this._isDestroyed()) return false;

    const source = this._applyingEstimate ? 'estimated' : (meta.source || 'direct');
    const now = Date.now();
    await this._setStore(`telemetry_${capability}_source`, source);
    await this._setStore(`telemetry_${capability}_updated_at`, now);

    if (capability === 'measure_battery') {
      await this._recordBattery(value, source, now);
    } else if (capability === 'onoff') {
      await this._recordUsage(value, now);
      await this.refresh('onoff');
    } else if (['measure_power', 'measure_current', 'measure_voltage', 'meter_power'].includes(capability)) {
      if (!this._applyingEstimate && isFiniteNumber(value)) {
        await this._setStore(`telemetry_last_${capability}`, value);
        await this._setStore(`telemetry_last_${capability}_at`, now);
      }
    }

    return true;
  }

  async refresh(reason = 'manual') {
    if (this._refreshing || this._isDestroyed()) return false;
    this._refreshing = true;
    try {
      const usage = await this._updateUsageFromCurrentState();
      await this._ensureBattery(reason);
      await this._ensureEnergy(reason, usage);
      await this._setStore('telemetry_last_refresh_at', Date.now());
      await this._setStore('telemetry_last_refresh_reason', reason);
      return true;
    } catch (err) {
      this._log(`[TELEMETRY] Refresh failed: ${err.message}`);
      return false;
    } finally {
      this._refreshing = false;
    }
  }

  async _recordBattery(value, source, now) {
    if (!this._isValidBattery(value)) {
      await this._setStore('telemetry_battery_last_invalid', value);
      await this._setStore('telemetry_battery_last_invalid_at', now);
      return;
    }

    if (source !== 'estimated') {
      const percent = Math.round(clamp(value, 0, 100));
      await this._setStore('telemetry_last_battery_percent', percent);
      await this._setStore('telemetry_last_battery_at', now);
      await this._setStore('last_battery_percentage', percent);
      await this._setStore('telemetry_battery_estimated', false);
      await this._setBatteryStatus(`direct:${percent}%`);
    }
  }

  async _ensureBattery(reason) {
    if (!this._hasCapability('measure_battery')) return;

    const current = this._getCapability('measure_battery');
    const currentSource = this._getStore('telemetry_measure_battery_source', null);
    if (this._isValidBattery(current) && currentSource !== 'estimated') {
      await this._recordBattery(current, 'direct', Date.now());
      await this._updateBatteryHealthCaps(current, false);
      return;
    }

    const estimate = this._estimateBattery();
    if (!estimate) return;

    await this._setStore('telemetry_battery_estimated', true);
    await this._setStore('telemetry_battery_estimate_reason', estimate.reason);
    await this._setStore('telemetry_estimated_battery_percent', estimate.percent);
    await this._setStore('telemetry_estimated_battery_at', Date.now());

    await this._setCapabilityEstimated('measure_battery', estimate.percent, reason);
    await this._setCapabilityEstimated('alarm_battery', estimate.percent <= 20, reason);
    await this._updateBatteryHealthCaps(estimate.percent, true);
  }

  _estimateBattery() {
    const now = Date.now();
    const candidates = [
      ['telemetry_last_battery_percent', 'telemetry_last_battery_at'],
      ['last_battery_percentage', 'last_battery_time'],
      ['last_battery_percentage', 'last_battery_update'],
      ['previous_battery_level', null],
    ];

    for (const [valueKey, timeKey] of candidates) {
      const raw = this._getStore(valueKey, null);
      if (raw === null || raw === undefined || raw === '') continue;
      const percent = Number(raw);
      if (!this._isValidBattery(percent)) continue;

      const lastAt = normalizeTimestamp(timeKey ? this._getStore(timeKey, 0) : 0);
      const elapsedDays = lastAt ? Math.max(0, (now - lastAt) / DAY_MS) : 0;
      const drain = this._dailyBatteryDrainPercent();
      const cyclePenalty = Math.min(5, this._getUsageCycleCount() * 0.005);
      return {
        percent: Math.round(clamp(percent - (elapsedDays * drain) - cyclePenalty, 1, 100)),
        reason: lastAt ? `last-real:${valueKey}:${Math.round(elapsedDays * 10) / 10}d` : `stored:${valueKey}`,
      };
    }

    const alarmBattery = this._getCapability('alarm_battery');
    if (alarmBattery === true) {
      return { percent: 15, reason: 'alarm_battery:true' };
    }

    const batteryState = String(this._getStore('battery_state', '') || this._getSetting('battery_state') || '').toLowerCase();
    if (batteryState.includes('low')) return { percent: 15, reason: 'battery_state:low' };
    if (batteryState.includes('medium')) return { percent: 55, reason: 'battery_state:medium' };
    if (batteryState.includes('high') || batteryState.includes('full')) return { percent: 90, reason: 'battery_state:high' };

    return { percent: this._defaultBatteryPercent(), reason: 'profile-default:no-direct-report' };
  }

  async _updateBatteryHealthCaps(percent, estimated) {
    if (!this._isValidBattery(percent)) return;
    if (this._hasCapability('measure_battery_health')) {
      await this._setCapabilityEstimated('measure_battery_health', Math.round(clamp(percent, 0, 100)), estimated ? 'battery-estimate' : 'battery-direct');
    }
    if (this._hasCapability('measure_battery_cycles')) {
      await this._setCapabilityEstimated('measure_battery_cycles', this._getUsageCycleCount(), 'usage-cycles');
    }
    await this._setBatteryStatus(`${estimated ? 'estimated' : 'direct'}:${Math.round(percent)}%`);
  }

  async _setBatteryStatus(status) {
    await this._setStore('telemetry_battery_status', status);
    if (this._hasCapability('text_battery_status')) {
      await this._setCapabilityEstimated('text_battery_status', status, 'battery-status');
    }
  }

  async _ensureEnergy(reason, usage = null) {
    const energyCaps = ['measure_power', 'measure_current', 'measure_voltage', 'meter_power'];
    if (!energyCaps.some(cap => this._hasCapability(cap))) return;
    if (this._isBatteryOnlyDevice()) return;

    const now = Date.now();
    usage = usage || await this._updateUsageFromCurrentState(now);
    const power = this._estimatePower();
    const voltage = this._estimateVoltage();
    const current = voltage > 0 ? round(power / voltage, 3) : 0;
    const energy = this._estimateEnergy(power, usage.elapsedMs, now);

    await this._setStore('telemetry_estimated_power_w', power);
    await this._setStore('telemetry_estimated_voltage_v', voltage);
    await this._setStore('telemetry_estimated_current_a', current);
    await this._setStore('telemetry_estimated_meter_power_kwh', energy);
    await this._setStore('estimated_energy', energy);

    if (this._shouldFill('measure_power')) {
      await this._setCapabilityEstimated('measure_power', power, reason);
    }
    if (this._shouldFill('measure_voltage')) {
      await this._setCapabilityEstimated('measure_voltage', voltage, reason);
    }
    if (this._shouldFill('measure_current')) {
      await this._setCapabilityEstimated('measure_current', current, reason);
    }
    if (this._shouldFill('meter_power')) {
      await this._setCapabilityEstimated('meter_power', energy, reason);
    }
  }

  _estimatePower() {
    const onoff = this._getCapability('onoff');
    const isOn = onoff === true;
    const nominal = this._numberSetting(['nominal_power', 'power_estimate_w', 'estimated_power_w'], this._defaultPowerWatts());
    const standby = this._numberSetting(['standby_power', 'standby_power_w'], this._defaultStandbyWatts());
    const directPower = this._getCapability('measure_power');

    if (this._isRealNumber(directPower) && this._getStore('telemetry_measure_power_source', null) !== 'estimated') {
      return round(Math.max(0, directPower), 2);
    }
    return round(Math.max(0, isOn ? nominal : standby), 2);
  }

  _estimateVoltage() {
    const directVoltage = this._getCapability('measure_voltage');
    if (this._isRealNumber(directVoltage) && this._getStore('telemetry_measure_voltage_source', null) !== 'estimated') {
      return round(directVoltage, 1);
    }
    return this._numberSetting(['nominal_voltage', 'voltage_estimate_v'], 230);
  }

  _estimateEnergy(power, elapsedMs, now) {
    const directEnergy = this._getCapability('meter_power');
    const source = this._getStore('telemetry_meter_power_source', null);
    let base = Number(this._getStore('telemetry_estimated_meter_power_kwh', NaN));

    if (this._isRealNumber(directEnergy) && source !== 'estimated') {
      base = directEnergy;
    }
    if (!isFiniteNumber(base)) {
      base = Number(this._getStore('estimated_energy', 0)) || 0;
    }

    const delta = power * Math.max(0, elapsedMs || 0) / HOUR_MS / 1000;
    return round(Math.max(0, base + delta), 4);
  }

  async _updateUsageFromCurrentState(now = Date.now()) {
    const current = this._getCapability('onoff');
    if (typeof current !== 'boolean') {
      return { elapsedMs: 0, state: null };
    }
    return this._recordUsage(current, now);
  }

  async _recordUsage(current, now) {
    if (typeof current !== 'boolean') {
      return { elapsedMs: 0, state: null };
    }

    const lastState = this._getStore('telemetry_usage_last_state', null);
    const lastAt = Number(this._getStore('telemetry_usage_last_at', 0)) || now;
    const elapsedMs = Math.max(0, now - lastAt);

    if (typeof lastState === 'boolean') {
      const bucket = lastState ? 'telemetry_usage_on_ms' : 'telemetry_usage_off_ms';
      await this._setStore(bucket, (Number(this._getStore(bucket, 0)) || 0) + elapsedMs);
      if (lastState !== current) {
        await this._setStore('telemetry_usage_transition_count', this._getUsageTransitionCount() + 1);
        if (current === true) {
          await this._setStore('telemetry_usage_cycle_count', this._getUsageCycleCount() + 1);
        }
      }
    }

    await this._setStore('telemetry_usage_last_state', current);
    await this._setStore('telemetry_usage_last_at', now);
    await this._setStore('telemetry_usage_last_elapsed_ms', elapsedMs);
    return { elapsedMs, state: current };
  }

  _shouldFill(capability) {
    if (!this._hasCapability(capability)) return false;
    const value = this._getCapability(capability);
    if (!this._isRealNumber(value)) return true;
    return this._getStore(`telemetry_${capability}_source`, null) === 'estimated';
  }

  async _setCapabilityEstimated(capability, value, reason) {
    if (!this._hasCapability(capability)) return false;
    const current = this._getCapability(capability);
    if (current === value) return true;

    this._applyingEstimate = true;
    try {
      await this._setStore(`telemetry_${capability}_source`, 'estimated');
      await this._setStore(`telemetry_${capability}_reason`, reason);

      if (typeof this.device.safeSetCapabilityValue === 'function') {
        return await this.device.safeSetCapabilityValue(capability, value, { skipThrottle: true, forceDedupe: false });
      }
      if (typeof this.device.setCapabilityValue === 'function') {
        await this.device.setCapabilityValue(capability, value);
        return true;
      }
    } catch (err) {
      this._log(`[TELEMETRY] Could not set ${capability}: ${err.message}`);
    } finally {
      this._applyingEstimate = false;
    }
    return false;
  }

  _dailyBatteryDrainPercent() {
    const id = this._driverId();
    const cls = this._deviceClass();
    const text = `${id} ${cls} ${this._name()}`.toLowerCase();

    if (/remote|button|switch|fingerbot/.test(text)) return 0.03;
    if (/contact|door|window/.test(text)) return 0.08;
    if (/motion|presence|pir/.test(text)) return 0.12;
    if (/thermostat|radiator|trv|climate/.test(text)) return 0.18;
    if (/soil|water|leak|temp|humid|sensor/.test(text)) return 0.1;
    if (/lock|siren/.test(text)) return 0.22;
    return 0.08;
  }

  _defaultBatteryPercent() {
    const id = this._driverId();
    const name = this._name();
    if (/button|remote|contact|motion|sensor|soil|temp|humid|lock|thermostat|radiator/i.test(`${id} ${name}`)) {
      return 50;
    }
    return 75;
  }

  _defaultPowerWatts() {
    const cls = this._deviceClass();
    const id = this._driverId();
    const text = `${id} ${cls} ${this._name()}`.toLowerCase();
    if (cls === 'light' || /light|dimmer/.test(text)) return 9;
    if (/heater|radiator|thermostat/.test(text)) return 1200;
    if (/fan/.test(text)) return 45;
    if (/plug|socket|outlet|switch/.test(text)) return 5;
    if (/usb/.test(text)) return 10;
    return 1;
  }

  _defaultStandbyWatts() {
    const text = `${this._driverId()} ${this._deviceClass()} ${this._name()}`.toLowerCase();
    if (/plug|socket|outlet|switch|usb|heater/.test(text)) return 0.5;
    return 0;
  }

  _isBatteryOnlyDevice() {
    const powerType = String(this._getStore('power_type', '') || this._getSetting('power_type') || '').toUpperCase();
    if (powerType === 'AC' || powerType === 'MAINS') return false;
    if (powerType === 'BATTERY') return true;
    return this._hasCapability('measure_battery')
      && !this._hasCapability('measure_power')
      && !this._hasCapability('meter_power')
      && !this._hasCapability('measure_current');
  }

  _numberSetting(keys, fallback) {
    for (const key of keys) {
      const value = Number(this._getSetting(key));
      if (isFiniteNumber(value) && value >= 0) return value;
    }
    return fallback;
  }

  _isValidBattery(value) {
    return isFiniteNumber(value) && value >= 0 && value <= 100;
  }

  _isRealNumber(value) {
    return isFiniteNumber(value) && value >= 0;
  }

  _getUsageCycleCount() {
    return Number(this._getStore('telemetry_usage_cycle_count', 0)) || 0;
  }

  _getUsageTransitionCount() {
    return Number(this._getStore('telemetry_usage_transition_count', 0)) || 0;
  }

  _hasCapability(capability) {
    try {
      return !!this.device.hasCapability?.(capability);
    } catch (e) {
      return false;
    }
  }

  _getCapability(capability) {
    try {
      return this.device.getCapabilityValue?.(capability);
    } catch (e) {
      return null;
    }
  }

  _getStore(key, fallback = null) {
    try {
      const value = this.device.getStoreValue?.(key);
      return value === undefined ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  async _setStore(key, value) {
    try {
      if (typeof this.device.setStoreValue === 'function') {
        await this.device.setStoreValue(key, value);
      }
    } catch (e) {
      // Store writes are best-effort; capability values remain authoritative.
    }
  }

  _getSetting(key) {
    try {
      return this.device.getSetting?.(key);
    } catch (e) {
      return undefined;
    }
  }

  _driverId() {
    try {
      return this.device.driver?.id || this.device.getDriverId?.() || '';
    } catch (e) {
      return '';
    }
  }

  _deviceClass() {
    try {
      return this.device.getClass?.() || this.device.getDeviceClass?.() || 'other';
    } catch (e) {
      return 'other';
    }
  }

  _name() {
    try {
      return this.device.getName?.() || '';
    } catch (e) {
      return '';
    }
  }

  _isDestroyed() {
    return !!(this.device._destroyed || this.device._deleted || this.device.destroyed);
  }

  _log(message) {
    try {
      this.device.log?.(message);
    } catch (e) {
      // Ignore logging failures during teardown.
    }
  }
}

module.exports = DeviceTelemetryEstimator;
