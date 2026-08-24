'use strict';

/**
 * ButtonCaptureCascade (P2223 / P2228)
 *
 * Complements PhysicalButtonMixin with declarative L1–L8 capture levels.
 * Additive only — does not remove existing listeners or drivers' own E000 setup.
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

function preferredLevels(device, cascade) {
  const pid = productIdOf(device);
  const map = cascade.productPreferredLevels || {};
  if (map[pid]) return map[pid];
  if (/TS004F/.test(pid)) return map.TS004F || [1, 2, 6, 3, 4];
  if (/TS004/.test(pid)) return map.TS0044 || [1, 2, 5, 3, 4];
  if (/TS0601/.test(pid)) return map.TS0601 || [7, 1, 2];
  return [1, 2, 3, 4, 5, 6, 8];
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
  const driverId = String(device.driver?.id || device.driver?.manifest?.id || '');
  const isActuator = /button_wireless_(plug|switch|usb|valve|fingerbot)|remote_button_wireless_(usb|plug)/.test(driverId);
  const isSleepyRemote = !isActuator && (
    /button_wireless|scene_switch|smart_remote|remote_button|handheld_remote|smart_knob|button_emergency_sos/.test(driverId)
    || device.driver?.manifest?.class === 'button'
    || device._forcedDeviceType === 'BUTTON'
  );
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
 * Entry: enrich capture after PhysicalButtonMixin core init.
 */
async function enrichCaptureCascade(device, zclNode) {
  const cascade = loadCascade();
  const preferred = preferredLevels(device, cascade);
  try {
    device.log?.(`[CASCADE] preferred levels for ${productIdOf(device) || '?'}: [${preferred.join(',')}]`);
  } catch { /* ignore */ }

  const e000 = await ensureE000BoundLayers(device, zclNode);
  scheduleSilentBindRetry(device, zclNode);

  device._buttonCaptureCascade = {
    at: Date.now(),
    preferred,
    e000,
    levels: (cascade.levels || []).map((l) => l.id),
  };
  return device._buttonCaptureCascade;
}

module.exports = {
  loadCascade,
  preferredLevels,
  ensureE000BoundLayers,
  scheduleSilentBindRetry,
  enrichCaptureCascade,
};
