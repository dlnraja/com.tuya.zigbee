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
    _ssot = JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
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
      || ''
    ).trim();
    const pid = String(
      device?.getSetting?.('zb_model_id')
      || device?.getStoreValue?.('zb_model_id')
      || device?.zclNode?.modelId
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
  if (cls === 'button') return 'scene';
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
 * Idempotent via `_homeyButtonUiCharterApplied`.
 */
async function applyHomeyButtonUiCharter(device) {
  if (!device || device._homeyButtonUiCharterApplied) {
    return { skipped: true, role: resolveUiRole(device) };
  }
  device._homeyButtonUiCharterApplied = true;
  const ssot = loadSsot();
  const role = resolveUiRole(device);
  const roleCfg = (ssot.roles && ssot.roles[role]) || {};
  const buttonInDeviceView = roleCfg.buttonTiles === 'device_view';
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
    device.log(`[P2492] Homey button UI charter (${role}) → ${changed.join(',')}`);
  }
  return { role, changed };
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
  if (typeof device.triggerButtonPress === 'function') {
    await device.triggerButtonPress(g, 'single', 1, { source: 'virtual' }).catch(() => {});
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
  handleVirtualUiPress,
};
