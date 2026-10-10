'use strict';

/**
 * P2705 — glue between TuyaLocalDevice and lib/energy/WifiDp17Energy (see there for WHY).
 * Persists state in store `dp17_energy`; override setting `dp17_energy_mode` (auto|incremental|cumulative).
 */
const { feed, emptyState, MODES } = require('../energy/WifiDp17Energy');
const { smartParse } = require('../managers/SmartDivisorManager');

const STORE_KEY = 'dp17_energy';

async function handleDp17(device, dps) {
  if (!device || !dps || dps['17'] === undefined || device._destroyed) return;
  if (!device.hasCapability?.('meter_power')) return;
  const settingRaw = device.getSetting?.('dp17_energy_mode');
  const override = MODES.includes(settingRaw) ? settingRaw : 'auto';

  let state = device._dp17State || device.getStoreValue?.(STORE_KEY) || null;
  if (!state || state.override !== override) {
    if (state) device.log?.(`[DP17] Energy mode setting changed to ${override} — restarting from current meter`);
    state = { ...emptyState(), override };
  }
  device._dp17State = state;

  const raw = dps['17'];
  let legacyKwh = null;
  try {
    legacyKwh = smartParse(raw, 17, {
      manufacturerName: device.getSetting?.('zb_manufacturer_name') || '',
      capability: 'meter_power',
      deviceId: device.getData?.()?.id || '',
      protocol: 'wifi',
    });
  } catch (_e) { legacyKwh = null; }

  const power = device.hasCapability?.('measure_power') ? device.getCapabilityValue?.('measure_power') : null;
  const res = feed(state, {
    raw,
    t: Date.now(),
    powerW: power,
    currentMeter: device.getCapabilityValue?.('meter_power'),
    legacyKwh,
    override,
  });
  if (res.decidedNow) {
    device.log?.(`[DP17] Energy DP17 detected as ${res.mode} (${override === 'auto' ? 'auto-detected' : 'setting'}); meter continues from ${state.baseline ?? state.lastEmitted} kWh`);
  }
  if (res.kwh != null && Number.isFinite(res.kwh)) {
    const v = Math.round(res.kwh * 1000) / 1000;
    if (typeof device._setLocalCapabilityValue === 'function') await device._setLocalCapabilityValue('meter_power', v);
    else await device.setCapabilityValue?.('meter_power', v);
  }
  try { await device.setStoreValue?.(STORE_KEY, state); } catch (_e) { /* non-fatal */ }
}

module.exports = { handleDp17, STORE_KEY };
