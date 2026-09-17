'use strict';

/**
 * HomeyCapabilityUx (P2500 / P2553)
 *
 * WHY: Athom + Device Capabilities (T43287) — sensor readables must stay getable
 * so Homey shows tiles + Insights History. button.N getable:false remains OK (P2492).
 * Contre quoi: Peter Smartbutton battery hidden by getable:false (P2499).
 *
 * P2553: fleet History enable — force getable:true + preventInsights:false on
 * measure_/meter_/alarm_* except intelligent silence allowlist (duplicate motion,
 * mmWave distance flood).
 */

const SENSOR_PREFIXES = ['measure_', 'meter_', 'alarm_'];

/** Caps that flood Homey History if Insights stay on (mmWave / zone spam). */
const HISTORY_SILENCE_EXACT = new Set([
  // filled dynamically for distance.*
]);

const HISTORY_SILENCE_PREFIX = [
  'measure_luminance.distance',
  'measure_motion.classification',
];

/**
 * WHY(P2551/P2553): when alarm_human exists, silence alarm_motion Insights
 * so History is not dual English+locale spam (VicHY #2240).
 */
function shouldSilenceInsights(cap, deviceCaps) {
  const id = String(cap || '');
  if (HISTORY_SILENCE_EXACT.has(id)) return true;
  if (HISTORY_SILENCE_PREFIX.some((p) => id === p || id.startsWith(`${p}.`) || id.startsWith(p))) {
    return true;
  }
  const caps = Array.isArray(deviceCaps) ? deviceCaps : [];
  if (id === 'alarm_motion' && caps.includes('alarm_human')) return true;
  if (/^alarm_motion\.zone\d+$/.test(id) && caps.includes('alarm_human')) return true;
  return false;
}

function isSensorReadableCap(cap) {
  const id = String(cap || '');
  return SENSOR_PREFIXES.some((p) => id.startsWith(p));
}

function mustNeverGetableFalse(cap) {
  return isSensorReadableCap(cap);
}

function isButtonMaintenanceCap(cap) {
  return /^button(\.|$)/.test(String(cap || ''));
}

/**
 * Soft-heal: sensor measure_/meter_/alarm_* → getable true + Insights on
 * (unless silence allowlist). Idempotent via `_homeyCapabilityUxHealed`.
 */
async function healSensorCapabilityGetable(device) {
  if (!device || device._homeyCapabilityUxHealed) {
    return { skipped: true, healed: [], silenced: [] };
  }
  device._homeyCapabilityUxHealed = true;
  const healed = [];
  const silenced = [];

  if (typeof device.setCapabilityOptions !== 'function'
    || typeof device.getCapabilities !== 'function') {
    return { healed, silenced, noApi: true };
  }

  const caps = device.getCapabilities() || [];
  for (const cap of caps) {
    if (!mustNeverGetableFalse(cap)) continue;
    try {
      const cur = (typeof device.getCapabilityOptions === 'function'
        && device.getCapabilityOptions(cap)) || {};
      const silence = shouldSilenceInsights(cap, caps);

      if (silence) {
        // WHY(P2551/P2553): still getable (UI tile) but no Insights flood/dup
        if (cur.preventInsights !== true || cur.getable === false) {
          await device.setCapabilityOptions(cap, {
            ...cur,
            getable: true,
            preventInsights: true,
          });
          silenced.push(cap);
        }
        continue;
      }

      // WHY(P2553 / Peter #2239 + fleet): force History ON even when getable
      // already true — older tips left preventInsights stuck / unset.
      // WHY(P2522): getable already true but Insights still blocked
      const needsGetable = cur.getable === false || cur.getable !== true;
      const needsInsights = cur.preventInsights === true || cur.preventInsights == null;
      if (needsGetable || needsInsights) {
        await device.setCapabilityOptions(cap, {
          ...cur,
          getable: true,
          preventInsights: false,
        });
        healed.push(cap);
      }
    } catch (_e) { /* soft — Athom may reject option merges */ }
  }

  if ((healed.length || silenced.length) && typeof device.log === 'function') {
    if (healed.length) {
      device.log(`[P2500/P2553] History ON → ${healed.slice(0, 12).join(',')}${healed.length > 12 ? '…' : ''}`);
    }
    if (silenced.length) {
      device.log(`[P2553] History silence (flood/dup) → ${silenced.join(',')}`);
    }
  }
  return { healed, silenced };
}

/**
 * Compose helper — complementary options for one cap (no wipe).
 */
function complementaryHistoryOptions(cap, existingOpts, driverCaps) {
  const cur = existingOpts && typeof existingOpts === 'object' ? { ...existingOpts } : {};
  if (shouldSilenceInsights(cap, driverCaps)) {
    return {
      ...cur,
      getable: cur.getable === false ? true : (cur.getable !== undefined ? cur.getable : true),
      preventInsights: true,
    };
  }
  if (!isSensorReadableCap(cap)) return cur;
  return {
    ...cur,
    getable: true,
    preventInsights: false,
  };
}

module.exports = {
  SENSOR_PREFIXES,
  HISTORY_SILENCE_PREFIX,
  isSensorReadableCap,
  mustNeverGetableFalse,
  isButtonMaintenanceCap,
  shouldSilenceInsights,
  complementaryHistoryOptions,
  healSensorCapabilityGetable,
};
