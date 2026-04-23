'use strict';
const { safeDivide } = require('../utils/tuyaUtils.js');

class ZigbeeProtocolPatchManager {
  constructor(device) {
    this._device = device;
    this._throttle = new Map();
  }

  _getMfr() {
    try { return this._device.getSetting('zb_manufacturer_name') || ''; }
    catch (e) { return ''; }
  }
  _getModel() {
    try { return this._device.getSetting('zb_model_id') || ''; }
    catch (e) { return ''; }
  }
  _log(m) { try { this._device.log('[PATCH] ' + m); } catch (e) {} }

  async applyPatches() {
    const mfr = this._getMfr();
    const model = this._getModel();
    if (!mfr && !model) return;
    this._log(`${mfr}/${model}`);
    const m = mfr.trim();
    if (/^LUMI|^Aqara/i.test(m)) this._patchXiaomi();
    if (/^_TZ/i.test(m)) this._patchTuya(model);
    if (/^Danfoss|^D5X84YU/i.test(m)) this._patchDanfoss();
    if (/^Legrand|^Netatmo/i.test(m)) this._patchLegrand();
    if (/^Schneider|^Wiser|^SE$/i.test(m)) this._patchSchneider();
    if (/^SONOFF|^eWeLink/i.test(m)) this._patchSonoff();
    if (/^IKEA/i.test(m)) this._patchIkea();
    this._patchGeneric();
  }

  /**
   * Xiaomi/Aqara: sleepy devices silently drop off network.
   * They skip standard Zigbee rejoin. Fix: periodic keepalive read,
   * extended unavailable timeout, force poll control checkin.
   */
  _patchXiaomi() {
    this._log('Xiaomi: rejoin+keepalive');
    const d = this._device;
    try { d.setStoreValue('xiaomi_keepalive', true); } catch (e) {}
    // Extend unavailable timeout to 2h (Aqara can sleep 1-2h)
    d._xiaomiUnavailableMs = 7200000;
    // Start keepalive ping every 55 min
    if (!d._xiaomiKeepaliveTimer) {
      d._xiaomiKeepaliveTimer = d.homey.setInterval(() => {
        this._xiaomiPing();
      }, 3300000);
    }
  }

  _xiaomiPing() {
    try {
      const ep = this._device.zclNode && this._device.zclNode.endpoints[1];
      if (ep && ep.clusters && ep.clusters.basic) {
        ep.clusters.basic.readAttributes([0x0000]).catch(() => {});
      }
    } catch (e) {}
  }
  /**
   * Tuya TS0601: report flooding. Some devices (air quality, TRVs)
   * send 10+ DP reports per second, overwhelming the Zigbee mesh.
   * Fix: throttle incoming reports to max 1 per 800ms per DP.
   */
  _patchTuya(model) {
    this._log('Tuya: report throttle');
    const d = this._device;
    d._patchReportThrottle = model === 'TS0601' ? 800 : 200;
    // Wrap DP handler if not already wrapped
    if (!d._patchedDpThrottle && typeof d._handleDpReport === 'function') {
      const orig = d._handleDpReport.bind(d);
      d._handleDpReport = (dp, value, type) => {
        const key = `dp_${dp}`;
        const now = Date.now();
        const last = this._throttle.get(key) || 0;
        if (now - last < d._patchReportThrottle) return;
        this._throttle.set(key, now);
        return orig(dp, value, type);
      };
      d._patchedDpThrottle = true;
    }
  }
  /**
   * Danfoss TRV: becomes unresponsive when connected directly to coordinator.
   * Fix: flag for router-only binding + thermostat setpoint reporting config.
   */
  _patchDanfoss() {
    this._log('Danfoss: TRV router bind + thermostat fix');
    const d = this._device;
    try { d.setStoreValue('force_router_bind', true); } catch (e) {}
    // Configure thermostat reporting (min 60s, max 600s, delta 50 = 0.5Â°C)
    try {
      const ep = d.zclNode && d.zclNode.endpoints[1];
      if (ep && ep.clusters && ep.clusters.thermostat) {
        ep.clusters.thermostat.configureReporting({
          localTemperature: { minInterval: 60, maxInterval: 600, minChange: 50 }
        }).catch(() => {});
      }
    } catch (e) {}
  }
  /**
   * Legrand/Netatmo: uses manufacturer cluster 0xFC01 for device mode.
   * Bug: devices won't report state without proper cluster init.
   * Fix: flag FC01 + configure onOff reporting.
   */
  _patchLegrand() {
    this._log('Legrand: FC01 cluster + reporting');
    const d = this._device;
    try { d.setStoreValue('legrand_fc01', true); } catch (e) {}
    try {
      const ep = d.zclNode && d.zclNode.endpoints[1];
      if (ep && ep.clusters && ep.clusters.onOff) {
        ep.clusters.onOff.configureReporting({
          onOff: { minInterval: 1, maxInterval: 300, minChange: 0 }
        }).catch(() => {});
      }
    } catch (e) {}
  }
  _patchSchneider() {
    this._log('Schneider: metering fix');
    try { this._device.setStoreValue('schneider_metering_fix', true); } catch (e) {}
  }
  _patchSonoff() {
    this._log('Sonoff: reporting');
    this._hardenReporting();
  }
  _patchIkea() {
    this._log('IKEA: router compat');
    try { this._device.setStoreValue('ikea_router', true); } catch (e) {}
  }
  _patchGeneric() { this._hardenReporting(); }

  _hardenReporting() {
    try {
      const ep = this._device.zclNode && this._device.zclNode.endpoints[1];
      if (!ep || !ep.clusters) return;
      const c = ep.clusters;
      if (c.onOff) c.onOff.configureReporting({
        onOff: { minInterval: 1, maxInterval: 300, minChange: 0 }
      }).catch(() => {});
    } catch (e) {}
  }

  destroy() {
    const d = this._device;
    if (d._xiaomiKeepaliveTimer) {
      d.homey.clearInterval(d._xiaomiKeepaliveTimer);
      d._xiaomiKeepaliveTimer = null;
    }
  }
}
module.exports = ZigbeeProtocolPatchManager;
