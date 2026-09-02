'use strict';

/**
 * ButtonCaptureCascade (P2223 / P2228 / P2395)
 *
 * Complements PhysicalButtonMixin with declarative L1–L8 capture levels.
 * Additive only — does not remove existing listeners or drivers' own E000 setup.
 *
 * WHY(P2395): preferredLevels now *gate* L5/L7/bind-retry (not log-only).
 * L1–L4/L6/L8 still live in PhysicalButtonMixin (always registered when phys init runs).
 *
 * APP runtime SSOT: lib/resilience/data/button-capture-cascade.json
 * CI catalog copy: config/resilience/button-capture-cascade.json (not in Homey package)
 */

const fs = require('fs');
const path = require('path');

const CASCADE_RUNTIME = path.join(__dirname, '..', 'resilience', 'data', 'button-capture-cascade.json');
// CI catalog copy (not shipped in Homey app — see .homeyignore)
const CASCADE_CI = path.join(__dirname, '..', '..', 'config', 'resilience', 'button-capture-cascade.json');

function loadCascade() {
  for (const p of [CASCADE_RUNTIME, CASCADE_CI]) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p));
    } catch { /* next */ }
  }
  return {
    levels: [],
    productPreferredLevels: {
      TS0041: [1, 2, 5, 3, 4],
      TS0044: [1, 2, 5, 3, 4],
      TS004F: [1, 2, 6, 3, 4, 5],
      TS0601: [7, 1, 2],
    },
  };
}

function productIdOf(device) {
  return String(
    device?.getSetting?.('zb_model_id')
    || device?.getStoreValue?.('zb_model_id')
    || device?.getData?.()?.productId
    || device?.getData?.()?.modelId
    || ''
  ).toUpperCase();
}

function manufacturerOf(device) {
  return String(
    device?.getSetting?.('zb_manufacturer_name')
    || device?.getStoreValue?.('manufacturerName')
    || device?.getData?.()?.manufacturerName
    || device?._cachedManufacturerName
    || ''
  ).toLowerCase();
}

/**
 * WHY(P2316): Sacred-couple overrides beat bare productId — SH-SC07 / Moes / Nobø
 * need L1+L2(+L5) ahead of standard OnOff L4 (Z2M tuya_on_off_action / first-press).
 */
function preferredLevels(device, cascade) {
  const pid = productIdOf(device);
  const mfr = manufacturerOf(device);
  const byMfr = cascade.manufacturerPreferredLevels || {};
  for (const [key, levels] of Object.entries(byMfr)) {
    if (key && mfr.includes(String(key).toLowerCase())) return levels;
  }
  const map = cascade.productPreferredLevels || {};
  if (map[pid]) return map[pid];
  if (/TS004F/.test(pid)) return map.TS004F || [1, 2, 6, 3, 4];
  if (/TS004/.test(pid)) return map.TS0044 || [1, 2, 5, 3, 4];
  if (/TS0601/.test(pid)) return map.TS0601 || [7, 1, 2];
  return [1, 2, 3, 4, 5, 6, 8];
}

function wantsLevel(preferred, level) {
  return Array.isArray(preferred) && preferred.map(Number).includes(Number(level));
}

/**
 * Ensure per-EP TuyaE000 BoundCluster when interview/profile suggests 0xE000.
 * Skips if driver already registered bindings (scene_switch_4 etc.).
 */
async function ensureE000BoundLayers(device, zclNode) {
  if (!device || !zclNode || device._e000BoundCascadeDone) return { ok: true, skipped: true };
  device._e000BoundCascadeDone = true;

  const profile = typeof device.getDeviceProfile === 'function' ? device.getDeviceProfile() : null;
  const wantsE000 = !!(profile?.usesE000 || profile?.customClusters?.includes?.(0xE000));
  const gangCount = device.gangCount || device.buttonCount || 1;
  let sawE000 = wantsE000;

  for (let gang = 1; gang <= gangCount; gang++) {
    const ep = zclNode.endpoints?.[gang];
    if (!ep) continue;
    if (ep.clusters?.['57344'] || ep.clusters?.[0xE000] || ep.clusters?.tuya || ep.bindings?.tuyaE000) {
      sawE000 = true;
    }
  }
  if (!sawE000 && !/TS004/.test(productIdOf(device))) {
    return { ok: true, skipped: true, reason: 'no-e000-signal' };
  }

  let TuyaE000BoundCluster;
  try {
    TuyaE000BoundCluster = require('../clusters/TuyaE000BoundCluster');
  } catch (e) {
    return { ok: false, error: e.message };
  }

  let wired = 0;
  for (let gang = 1; gang <= gangCount; gang++) {
    const endpoint = zclNode.endpoints?.[gang];
    if (!endpoint) continue;
    if (!endpoint.bindings) endpoint.bindings = {};
    // Keep driver-owned binding if already set
    if (endpoint.bindings.tuyaE000 || endpoint.bindings[57344]) continue;

    const bc = new TuyaE000BoundCluster({
      device,
      onButtonPress: (press) => {
        const btn = press?.button || gang;
        const type = press?.pressType || press?.type || 'single';
        if (typeof device._triggerPhysicalFlow === 'function') {
          device._triggerPhysicalFlow(btn, type);
        }
      },
    });
    endpoint.bindings.tuyaE000 = bc;
    wired += 1;
    try {
      device.log?.(`[CASCADE-L5] EP${gang} TuyaE000BoundCluster ready`);
    } catch { /* ignore */ }
  }
  return { ok: true, wired };
}

/**
 * Soft bind retry when OnOff bind failed at init (Homey gap: silent bind loss).
 */
function scheduleSilentBindRetry(device, zclNode) {
  if (!device || !zclNode || device._cascadeBindRetryScheduled) return;
  // WHY (P2235): sleepy remotes go offline when we hammer OnOff.bind() 8s after init
  // (same failure mode as IAS enroll storm). BoundCluster + raw 0xFD catcher already listen.
  const { isSleepyRemoteDevice } = require('../utils/scene-remote-classify');
  const isSleepyRemote = isSleepyRemoteDevice(device);
  if (isSleepyRemote) {
    try { device.log?.('[CASCADE] skip silent OnOff re-bind (sleepy remote)'); } catch { /* ignore */ }
    return;
  }
  device._cascadeBindRetryScheduled = true;
  const delay = 8000;
  const run = async () => {
    if (device._destroyed) return;
    const gangCount = device.gangCount || device.buttonCount || 1;
    for (let gang = 1; gang <= gangCount; gang++) {
      const ep = zclNode.endpoints?.[gang];
      const onOff = ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
      if (onOff && typeof onOff.bind === 'function') {
        try {
          await onOff.bind();
          device.log?.(`[CASCADE] silent OnOff re-bind EP${gang} ok`);
        } catch (e) {
          device.log?.(`[CASCADE] silent OnOff re-bind EP${gang}: ${e.message}`);
        }
      }
    }
  };
  try {
    const { safeSetTimeout } = require('../utils/safe-timers');
    safeSetTimeout(device, run, delay);
  } catch {
    try { device.homey?.setTimeout?.(run, delay); } catch { /* ignore */ }
  }
}

/**
 * Apply preferred-level gates onto the device (inventory + skip flags).
 * L7 skip: pure ZCL remotes (TS004x) must not treat residual EF00 as physical gangs.
 */
function applyPreferredLevelGates(device, preferred) {
  const levels = (preferred || []).map(Number);
  device._buttonCaptureLevelsApplied = levels;
  // WHY(P2395): HomeyGap inventory + PhysicalButtonMixin L7 gate
  device._skipCascadeL7Ef00 = !wantsLevel(levels, 7);
  device._cascadeWantsL5E000 = wantsLevel(levels, 5);
  device._cascadeWantsL6Level = wantsLevel(levels, 6);
  device._buttonCaptureCascadeDone = true;
  device._p2223CascadeDone = true;
}

/**
 * Entry: enrich capture after PhysicalButtonMixin core init.
 */
async function enrichCaptureCascade(device, zclNode) {
  const cascade = loadCascade();
  const preferred = preferredLevels(device, cascade);
  applyPreferredLevelGates(device, preferred);
  try {
    device.log?.(`[CASCADE] preferred levels for ${productIdOf(device) || '?'}: [${preferred.join(',')}] applied`);
  } catch { /* ignore */ }

  let e000 = { ok: true, skipped: true, reason: 'l5-not-preferred' };
  if (device._cascadeWantsL5E000) {
    e000 = await ensureE000BoundLayers(device, zclNode);
  } else {
    try { device.log?.('[CASCADE] skip L5 E000 (not in preferredLevels)'); } catch { /* ignore */ }
  }

  // Bind retry only when OnOff L1/L4 preferred (wall actuators / remotes with 0xFD)
  if (wantsLevel(preferred, 1) || wantsLevel(preferred, 4)) {
    scheduleSilentBindRetry(device, zclNode);
  }

  device._buttonCaptureCascade = {
    at: Date.now(),
    preferred,
    e000,
    levels: (cascade.levels || []).map((l) => l.id),
    skipL7: !!device._skipCascadeL7Ef00,
  };
  return device._buttonCaptureCascade;
}

module.exports = {
  loadCascade,
  preferredLevels,
  wantsLevel,
  applyPreferredLevelGates,
  ensureE000BoundLayers,
  scheduleSilentBindRetry,
  enrichCaptureCascade,
};
