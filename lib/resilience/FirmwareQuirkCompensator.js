'use strict';

/**
 * FirmwareQuirkCompensator (P2392) — fleet-wide Homey/Tuya firmware gap compensations.
 *
 * WHY: Tuya firmware + Homey compose hybrids invent UI ghosts (low battery on mains,
 * DIY tuya_dp_* caps on every device via UniversalBridge, curtain phantoms on radar).
 * Compensate without waiting for interview / forum reply. Never invent sacred couples.
 */

const DIY_CAPS = ['tuya_dp_raw', 'tuya_dp_value', 'tuya_dp_string', 'tuya_dp_bitmap', 'tuya_cluster_event'];

function isDiyUniversalDriver(device) {
  const id = String(device?.driver?.id || '').toLowerCase();
  return /universal|generic_diy|device_generic|fallback|catch.?all/.test(id);
}

function isMainsPowered(device) {
  try {
    if (device && 'mainsPowered' in device) {
      const v = device.mainsPowered;
      if (typeof v === 'boolean') return v;
    }
  } catch { /* soft */ }
  return false;
}

async function stripCaps(device, caps, tag) {
  const removed = [];
  for (const cap of caps) {
    try {
      if (typeof device.hasCapability === 'function' && device.hasCapability(cap)) {
        await device.removeCapability(cap).catch(() => {});
        removed.push(cap);
      }
    } catch { /* soft */ }
  }
  if (removed.length) {
    try { device.log?.(`[P2392] ${tag} stripped: ${removed.join(',')}`); } catch { /* ignore */ }
  }
  return removed;
}

async function healFirmwareQuirks(device) {
  const notes = [];

  if (!isDiyUniversalDriver(device)) {
    const gone = await stripCaps(device, DIY_CAPS, 'diy-caps');
    if (gone.length) notes.push('strip-diy-caps');
  }

  if (isMainsPowered(device)) {
    const gone = await stripCaps(device, ['measure_battery', 'alarm_battery'], 'mains-battery');
    if (gone.length) notes.push('strip-mains-battery');
    try {
      if (typeof device.setEnergy === 'function') {
        await device.setEnergy({ batteries: null, mains: true }).catch(() => {});
        notes.push('clear-energy-batteries');
      }
    } catch { /* soft */ }
    try {
      await device.setStoreValue?.('powerSource', 'mains').catch(() => {});
      await device.setStoreValue?.('battery', false).catch(() => {});
    } catch { /* soft */ }
  }

  try {
    if (!isDiyUniversalDriver(device)) {
      device._forbiddenCapabilities = Array.from(new Set([
        ...(device._forbiddenCapabilities || []),
        ...DIY_CAPS,
      ]));
      notes.push('forbid-diy-caps');
    }
    if (isMainsPowered(device)) {
      device._forbiddenCapabilities = Array.from(new Set([
        ...(device._forbiddenCapabilities || []),
        'measure_battery',
        'alarm_battery',
      ]));
      notes.push('forbid-mains-battery');
    }
  } catch { /* soft */ }

  return notes;
}

/**
 * Arm compensations once; schedule delayed re-heals without nesting forever.
 */
function applyFirmwareQuirkCompensations(device) {
  if (!device || device._p2392FirmwareCompArmed) {
    return { ok: true, skipped: true, notes: [] };
  }
  device._p2392FirmwareCompArmed = true;
  const notes = ['armed'];

  Promise.resolve(healFirmwareQuirks(device))
    .then((n) => {
      try { device.log?.(`[P2392] firmware heal: ${(n || []).join(',') || 'none'}`); } catch { /* ignore */ }
    })
    .catch(() => {});

  if (!device._p2392RehealScheduled) {
    device._p2392RehealScheduled = true;
    try {
      const { safeSetTimeout } = require('../utils/safe-timers');
      for (const ms of [20_000, 90_000, 240_000]) {
        safeSetTimeout(device, () => {
          healFirmwareQuirks(device).catch(() => {});
        }, ms);
      }
      notes.push('reheal-scheduled');
    } catch {
      try {
        device.homey?.setTimeout?.(() => {
          healFirmwareQuirks(device).catch(() => {});
        }, 60_000);
        notes.push('reheal-fallback');
      } catch { /* soft */ }
    }
  }

  try {
    device.log?.(`[P2392] firmware quirk compensations: ${notes.join(',')}`);
  } catch { /* ignore */ }

  return { ok: true, notes };
}

module.exports = {
  applyFirmwareQuirkCompensations,
  healFirmwareQuirks,
  isDiyUniversalDriver,
  isMainsPowered,
  DIY_CAPS,
};
