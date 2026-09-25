#!/usr/bin/env node
'use strict';

/**
 * HomeyButtonUiCharter (P2492)
 *
 * WHY: Physical wall presses and Homey UI tiles must stay coherent — Homey
 * charter: switches = onoff primary; scene remotes = button.N in device view;
 * never invent onoff on class:button; maintenanceAction for secondary press tiles.
 *
 * Contre quoi: button spam on relays (P2463), dead Button 2 UI (P2397),
 * ghost loops (P2220), scene remotes stuck only in Maintenance with no feedback.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SSOT_PATH = path.join(ROOT, 'config', 'architecture', 'homey-button-ui-charter-ssot.json');

let _ssot;
function loadSsot() {
  if (_ssot) return _ssot;
  try {
    // WHY(P2505/TITAN): Buffer→JSON.parse avoids utf8 intermediate (M15 / heap)
    _ssot = JSON.parse(fs.readFileSync(SSOT_PATH));
  } catch {
    _ssot = { roles: {}, titles: {}, pulseMs: { switch: 280, scene: 420, knob: 350 } };
  }
  return _ssot;
}

function resolveUiRole(device) {
  // Prefer explicit couple hints from SSOT (P2494) when settings expose mfr+pid
  try {
    const ssot = loadSsot();
    const examples = ssot.identityRule?.examples || [];
    const mfr = String(
      device?.getSetting?.('zb_manufacturer_name')
      || device?.getStoreValue?.('zb_manufacturer_name')
      || device?.zclNode?.manufacturerName
      || device?.getData?.()?.manufacturerName
      || ''
    ).trim();
    const pid = String(
      device?.getSetting?.('zb_model_id')
      || device?.getStoreValue?.('zb_model_id')
      || device?.zclNode?.modelId
      || device?.getData?.()?.productId
      || device?.getData?.()?.modelId
      || ''
    ).trim();
    if (mfr && pid && examples.length) {
      const key = `${mfr}+${pid}`.toLowerCase();
      const hit = examples.find((e) => String(e.couple || '').toLowerCase() === key);
      if (hit?.role) return hit.role;
    }
  } catch (_e) { /* soft */ }

  try {
    const { isSceneRemoteDevice } = require('./scene-remote-classify');
    if (isSceneRemoteDevice(device)) {
      const id = String(device?.driver?.id || '');
      if (/smart_knob|knob_rotary/i.test(id)) return 'knob';
      return 'scene';
    }
  } catch (_e) { /* soft */ }
  const cls = device?.driver?.manifest?.class || device?.getClass?.();
  if (cls === 'button' || cls === 'remote') return 'scene';
  if (/knob/i.test(String(device?.driver?.id || ''))) return 'knob';
  return 'switch';
}

function titleFor(kind, n, ssot = loadSsot()) {
  const tpl = (ssot.titles && ssot.titles[kind]) || {};
  const fill = (s) => String(s || '').replace(/\{n\}/g, String(n));
  const out = {};
  for (const [lang, s] of Object.entries(tpl)) {
    out[lang] = fill(s);
  }
  if (!out.en) out.en = kind === 'channel' ? `Channel ${n}` : `Button ${n}`;
  return out;
}

function gangOnOffCap(device, gang) {
  if (!device || typeof device.hasCapability !== 'function') return null;
  if (device.hasCapability(`onoff.gang${gang}`)) return `onoff.gang${gang}`;
  if (device.hasCapability(`onoff.${gang}`)) return `onoff.${gang}`;
  if (gang === 1 && device.hasCapability('onoff')) return 'onoff';
  return null;
}

async function setCap(device, cap, value) {
  if (!cap) return false;
  try {
    if (typeof device.safeSetCapabilityValue === 'function') {
      await device.safeSetCapabilityValue(cap, value);
      return true;
    }
    if (typeof device._safeSetCapability === 'function') {
      await device._safeSetCapability(cap, value);
      return true;
    }
    if (typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue(cap, value);
      return true;
    }
  } catch (_e) { /* soft */ }
  return false;
}

/**
 * Apply Homey-charter capabilityOptions (titles + maintenanceAction).
 * Idempotent via `_homeyButtonUiCharterApplied`, except P2614 stale-heal:
 * scene/knob remotes that still have compose maintenanceAction:true get re-applied.
 */
async function applyHomeyButtonUiCharter(device) {
  if (!device) return { skipped: true, role: 'switch' };
  const ssot = loadSsot();
  const role = resolveUiRole(device);
  const roleCfg = (ssot.roles && ssot.roles[role]) || {};
  const buttonInDeviceView = roleCfg.buttonTiles === 'device_view';

  // WHY(P2614): paired devices keep stale Maintenance tiles from old compose —
  // force re-apply when scene/knob still shows maintenanceAction:true.
  let forceHeal = false;
  if ((role === 'scene' || role === 'knob') && typeof device.getCapabilityOptions === 'function') {
    try {
      const caps = (typeof device.getCapabilities === 'function' && device.getCapabilities()) || [];
      for (const cap of caps) {
        if (!/^button\.\d+$/.test(cap)) continue;
        const cur = device.getCapabilityOptions(cap);
        if (cur && cur.maintenanceAction === true) {
          forceHeal = true;
          break;
        }
      }
    } catch (_e) { /* soft */ }
  }

  if (device._homeyButtonUiCharterApplied && !forceHeal) {
    return { skipped: true, role };
  }
  device._homeyButtonUiCharterApplied = true;
  const changed = [];

  if (typeof device.setCapabilityOptions !== 'function') {
    return { role, changed, noApi: true };
  }

  const caps = (typeof device.getCapabilities === 'function' && device.getCapabilities()) || [];
  for (const cap of caps) {
    let opts = null;
    const mBtn = /^button\.(\d+)$/.exec(cap);
    const mOn = /^onoff\.gang(\d+)$/.exec(cap) || /^onoff\.(\d+)$/.exec(cap);
    if (mBtn) {
      const n = parseInt(mBtn[1], 10);
      opts = {
        title: titleFor('button', n, ssot),
        // Homey charter: scene/knob → visible device controls; switches → Maintenance
        maintenanceAction: !buttonInDeviceView,
        getable: false,
        setable: false,
      };
    } else if (cap === 'onoff') {
      opts = { title: titleFor('channel', 1, ssot) };
    } else if (mOn) {
      opts = { title: titleFor('channel', parseInt(mOn[1], 10), ssot) };
    }
    if (!opts) continue;
    try {
      await device.setCapabilityOptions(cap, opts);
      changed.push(cap);
    } catch (_e) { /* soft — Athom may reject some option merges */ }
  }

  if (changed.length && typeof device.log === 'function') {
    const healTag = forceHeal ? ' heal' : '';
    device.log(`[P2492${healTag ? '/P2614' : ''}] Homey button UI charter (${role}${healTag}) → ${changed.join(',')}`);
  }
  return { role, changed, healed: forceHeal };
}

/**
 * Physical press → Homey UI representation (elegant, role-aware).
 */
async function syncPhysicalToHomeyUi(device, gang = 1, opts = {}) {
  if (!device || opts.source === 'virtual') return { ok: false, reason: 'virtual' };
  const ssot = loadSsot();
  const role = resolveUiRole(device);
  const g = Math.max(1, Number(gang) || 1);
  const result = { role, gang: g, onoff: false, pulse: false };

  try {
    const { stampPhysical, ensureDedup } = require('./BidirectionalButtonState');
    ensureDedup(device);
    stampPhysical(device, g);
  } catch (_e) { /* soft */ }

  // Switches / knobs: keep onoff/dim tiles coherent with the wall
  if (role === 'switch' || role === 'knob') {
    const cap = gangOnOffCap(device, g);
    if (cap && opts.value != null) {
      result.onoff = await setCap(device, cap, opts.value === true);
    }
  }

  // Scene remotes: button pulse is the only tile feedback
  // Switches: pulse maintenance button lightly only if onoff was not updated
  const pulseMs = (ssot.pulseMs && ssot.pulseMs[role]) || 350;
  const shouldPulse = role === 'scene' || role === 'knob' || (role === 'switch' && !result.onoff);
  if (shouldPulse) {
    try {
      const { pulseButtonCapability } = require('./ensureGangUiCapabilities');
      result.pulse = !!pulseButtonCapability(device, g, pulseMs);
    } catch (_e) { /* soft */ }
  }

  return { ok: true, ...result };
}

/**
 * WHY(P2734 / Bastien bi-dir): soft complementary UI pulse for snappy remotes.
 * Contre quoi: skipUiPulse=true left Homey tiles dead (no physical→UI), OR full
 * charter sync OOMed Homey (P2707). Soft = throttled pulseButtonCapability only
 * (no await setCap storms / no onoff TX). Never mandatory — void-safe.
 *
 * @param {object} device
 * @param {number} [gang=1]
 * @param {object} [opts]
 * @returns {{ ok: boolean, pulsed?: boolean, skipped?: string }}
 */
function softPulsePhysicalUi(device, gang = 1, opts = {}) {
  if (!device || opts.source === 'virtual') return { ok: false, skipped: 'virtual' };
  const g = Math.max(1, Number(gang) || 1);
  const now = Date.now();
  try {
    device._softUiPulseAt = device._softUiPulseAt || {};
    const throttleMs = Math.max(40, Number(opts.throttleMs) || 80);
    if (now - (device._softUiPulseAt[g] || 0) < throttleMs) {
      return { ok: true, pulsed: false, skipped: 'throttle' };
    }
    device._softUiPulseAt[g] = now;
  } catch (_e) { /* soft */ }

  try {
    const { stampPhysical, ensureDedup } = require('./BidirectionalButtonState');
    const d = ensureDedup(device);
    // Snappy remotes: shorter virtual↔physical echo window (bi-dir UX)
    if (d && opts.snappy) d.dedupWindow = Math.min(Number(d.dedupWindow) || 2000, 400);
    stampPhysical(device, g);
  } catch (_e) { /* soft */ }

  try {
    const { pulseButtonCapability } = require('./ensureGangUiCapabilities');
    const pulseMs = Math.max(30, Math.min(120, Number(opts.pulseMs) || 50));
    const pulsed = !!pulseButtonCapability(device, g, pulseMs);
    return { ok: true, pulsed };
  } catch (_e) {
    return { ok: false, skipped: 'pulse-error' };
  }
}

/**
 * Homey UI button.N press → device TX / flows (shared by TuyaZigbeeDevice + tests).
 */
async function handleVirtualUiPress(device, gang = 1) {
  const g = Math.max(1, Number(gang) || 1);
  const now = Date.now();
  try {
    const { ensureDedup, stampVirtual, isWithinDedup } = require('./BidirectionalButtonState');
    ensureDedup(device);
    if (isWithinDedup(device, g, 'physical')) {
      if (typeof device.log === 'function') {
        device.log(`[P2492] UI press dropped (physical echo window)`);
      }
      return { path: 'dropped' };
    }
    stampVirtual(device, g, now);
  } catch (_e) {
    if (!device._virtualPhysicalDedup) {
      device._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
    }
    const lastPhysical = device._virtualPhysicalDedup.lastPhysicalPress[g] || 0;
    if (now - lastPhysical < (device._virtualPhysicalDedup.dedupWindow || 2000)) {
      return { path: 'dropped' };
    }
    device._virtualPhysicalDedup.lastVirtualPress[g] = now;
  }

  const role = resolveUiRole(device);
  let isScene = role === 'scene';
  try {
    const { isSceneRemoteDevice } = require('./scene-remote-classify');
    isScene = isSceneRemoteDevice(device) || role === 'scene';
  } catch (_e) { /* soft */ }

  if (!isScene && typeof device._handleVirtualToggle === 'function') {
    await device._handleVirtualToggle(g);
    if (typeof device.triggerButtonPress === 'function') {
      await device.triggerButtonPress(g, 'single', 1, { source: 'virtual' }).catch(() => {});
    }
    return { path: 'virtual-mixin', role };
  }

  const gangCap = gangOnOffCap(device, g);
  if (gangCap && !isScene) {
    const current = device.getCapabilityValue?.(gangCap) === true;
    const next = !current;
    if (typeof device.markAppCommand === 'function') device.markAppCommand(g, next);
    if (typeof device._setGangOnOff === 'function') {
      await device._setGangOnOff(g, next);
    } else {
      await setCap(device, gangCap, next);
    }
    if (typeof device.triggerButtonPress === 'function') {
      await device.triggerButtonPress(g, 'single', 1, { source: 'virtual' }).catch(() => {});
    }
    return { path: 'marked-toggle', role };
  }

  // Scene / flow-only — Homey charter: UI press fires flows, no onoff TX
  // WHY(P2734): snappy remotes — never await Flow cascade (same as physical)
  if (typeof device.triggerButtonPress === 'function') {
    try {
      const p = device.getDeviceProfile?.() || {};
      if (p.snappyRelayFlow) {
        Promise.resolve(device.triggerButtonPress(g, 'single', 1, { source: 'virtual' })).catch(() => {});
      } else {
        await device.triggerButtonPress(g, 'single', 1, { source: 'virtual' }).catch(() => {});
      }
    } catch (_e) {
      await device.triggerButtonPress(g, 'single', 1, { source: 'virtual' }).catch(() => {});
    }
  } else if (typeof device._triggerPhysicalFlow === 'function') {
    await device._triggerPhysicalFlow(g, 'single', { source: 'virtual', _internalTrigger: true }).catch(() => {});
  }
  return { path: 'scene-flow', role };
}

module.exports = {
  loadSsot,
  resolveUiRole,
  titleFor,
  gangOnOffCap,
  applyHomeyButtonUiCharter,
  syncPhysicalToHomeyUi,
  softPulsePhysicalUi,
  handleVirtualUiPress,
};
