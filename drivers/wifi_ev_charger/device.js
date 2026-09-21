'use strict';

/**
 * P2621 / P2641 / P2642 MASTER_ONLY — WiFi EV Charger (Tuya Local).
 * WHY: Dedicated driver for Tuya category qccdz (Vevor/Nine/Aimiler/… rebrands).
 * HOW: Core DPs + phase-JSON + charge-history (proven session kWh).
 * AGAINST: wifi_plug; JSON into packed parsers; inventing session from phase e/d.
 *
 * Credits: andiwirz/com.tuyalocal (MIT) + Homey Test store.
 * See docs/architecture/TUYALOCAL_COMPLEMENTARY_CREDITS.md
 */
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const {
  parseEvChargerPhaseJson,
  looksLikePhaseJson,
} = require('../../lib/tuya-local/EvChargerPhaseJson');
const {
  parseEvChargerChargeHistory,
  looksLikeChargeHistory,
  shouldApplyChargeHistory,
  mapEvChargerWorkState,
} = require('../../lib/tuya-local/EvChargerChargeHistory');

class WiFiEvChargerDevice extends TuyaLocalDevice {
  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      18: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1,
        reverseTransform: (v) => v === true,
      },
      1: { capability: 'meter_power', smartDivisor: true },
      5: { capability: 'measure_power', smartDivisor: true },
      9: { capability: 'measure_power', smartDivisor: true },
      24: { capability: 'measure_temperature', divisor: 1 },
      25: { capability: 'meter_power', smartDivisor: true },
      10: {
        capability: 'alarm_generic',
        transform: (v) => !!(v && Number(v) !== 0),
      },
      114: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1,
        reverseTransform: (v) => v === true,
      },
      27: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1 || v === 'online',
        reverseTransform: (v) => v === true,
      },
    };
  }

  async onInit() {
    this._lastChargeHistoryId = this.getStoreValue('lastHistoryId') || null;
    await super.onInit();
    for (const c of ['measure_current', 'measure_voltage', 'measure_temperature']) {
      if (!this.hasCapability(c)) {
        try { await this.addCapability(c); } catch (_e) { /* optional */ }
      }
    }
    this.log('[WIFI-EV-CHARGER] Ready (P2641 phase-JSON + P2642 charge-history)');
  }

  async _processDPUpdate(dps) {
    if (!dps || typeof dps !== 'object') return;
    const settings = (typeof this.getSettings === 'function' && this.getSettings()) || {};

    // P2642: charge history first (proven session kWh)
    const histDp = Number(settings.dp_charge_history) || 0;
    const histCandidates = [];
    if (histDp > 0 && dps[histDp] !== undefined) {
      histCandidates.push({ dp: histDp, value: dps[histDp] });
    }
    for (const [k, v] of Object.entries(dps)) {
      if (looksLikeChargeHistory(v)) histCandidates.push({ dp: Number(k), value: v });
    }
    for (const { dp, value } of histCandidates) {
      const rec = parseEvChargerChargeHistory(value, {
        energyDivisor: Number(settings.history_energy_divisor) || 10,
      });
      if (!rec) continue;
      await this._applyChargeHistory(rec);
      delete dps[dp];
      break;
    }

    const configured = Number(settings.dp_phase_json) || 0;
    const candidates = [];
    if (configured > 0 && dps[configured] !== undefined) {
      candidates.push({ dp: configured, value: dps[configured] });
    }
    if (dps[102] !== undefined && (configured === 0 || configured === 102)) {
      candidates.push({ dp: 102, value: dps[102] });
    }
    for (const { dp, value } of candidates) {
      if (!looksLikePhaseJson(value) && configured !== dp) continue;
      const block = parseEvChargerPhaseJson(value, {
        voltageDivisor: Number(settings.json_voltage_divisor) || 10,
        currentDivisor: Number(settings.json_current_divisor) || 10,
        powerFactor: Number(settings.json_power_factor) || 100,
        tempDivisor: Number(settings.json_temp_divisor) || 10,
        sessionField: settings.json_session_field || 'none',
        energyDivisor: Number(settings.json_energy_divisor) || 1000,
      });
      if (!block) {
        if (configured === dp) {
          this.log(`[WIFI-EV] DP${dp} phase-JSON parse failed — leaving alone`);
        }
        continue;
      }
      await this._applyPhaseJson(block);
      delete dps[dp];
      break;
    }

    for (const [k, v] of Object.entries(dps)) {
      const mapped = mapEvChargerWorkState(v);
      if (mapped && typeof v === 'string' && !String(v).includes('{')) {
        this.log(`[WIFI-EV] work_state ${v} → ${mapped} (DP${k})`);
      }
    }
  }

  async _applyChargeHistory(rec) {
    const first = this._lastChargeHistoryId == null;
    if (this.hasCapability('meter_power') && Number.isFinite(rec.kwh)) {
      await this.safeSetCapabilityValue('meter_power', Math.round(rec.kwh * 100) / 100);
    }
    if (!shouldApplyChargeHistory(rec, this._lastChargeHistoryId) && !first) return;
    const isNewSession = !first;
    this._lastChargeHistoryId = rec.id;
    try { await this.setStoreValue('lastHistoryId', rec.id); } catch (_e) { /* soft */ }
    const dur = rec.seconds == null
      ? ''
      : `, ${Math.floor(rec.seconds / 3600)}h ${Math.floor((rec.seconds % 3600) / 60)}m`;
    this.log(`[WIFI-EV] Charge history: ${Math.round(rec.kwh * 100) / 100} kWh${dur}${first ? ' (seed)' : ''}`);
    // P2647: tuyalocal "Charging session finished" — only on proven new history id
    if (isNewSession && Number.isFinite(rec.kwh) && rec.kwh > 0) {
      try {
        await this.triggerFlowCard('wifi_ev_charger_session_finished', {
          kwh: Math.round(rec.kwh * 100) / 100,
          seconds: Number.isFinite(rec.seconds) ? rec.seconds : 0,
          session_id: String(rec.id || ''),
        });
      } catch (_e) { /* soft */ }
    }
  }

  async _applyPhaseJson(block) {
    const L1 = block.phases.L1;
    if (L1) {
      if (this.hasCapability('measure_voltage') && Number.isFinite(L1.voltage)) {
        await this.safeSetCapabilityValue('measure_voltage', Math.round(L1.voltage * 10) / 10);
      }
      if (this.hasCapability('measure_current') && Number.isFinite(L1.current)) {
        await this.safeSetCapabilityValue('measure_current', Math.round(L1.current * 1000) / 1000);
      }
    }
    if (block.totalPowerW != null && this.hasCapability('measure_power')) {
      await this.safeSetCapabilityValue('measure_power', Math.round(block.totalPowerW));
    } else if (L1 && Number.isFinite(L1.power) && this.hasCapability('measure_power')) {
      await this.safeSetCapabilityValue('measure_power', Math.round(L1.power));
    }
    if (block.temperatureC != null && this.hasCapability('measure_temperature')) {
      await this.safeSetCapabilityValue(
        'measure_temperature',
        Math.round(block.temperatureC * 10) / 10,
      );
    }
    if (block.sessionKwh != null && this.hasCapability('meter_power')) {
      await this.safeSetCapabilityValue(
        'meter_power',
        Math.round(block.sessionKwh * 1000) / 1000,
      );
    }
  }

  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    await super.onDeleted();
  }
}

module.exports = WiFiEvChargerDevice;
