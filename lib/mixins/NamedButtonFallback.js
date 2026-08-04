'use strict';

/**
 * v9.0.411 (P92.119): Named maintenance-button fallbacks.
 *
 * Homey UI renders maintenanceAction capabilities (button.toggle,
 * button.toggle_N, button.identify, button.push, button.feed, ...) as
 * pressable buttons even when declared `setable: false`. Without a
 * registerCapabilityListener, pressing one logs
 * "Missing Capability Listener" and does nothing.
 *
 * The universal button.N listener (TuyaZigbeeDevice) only covered numeric
 * buttons. This module registers semantic fallbacks for the NAMED ones,
 * shared by TuyaZigbeeDevice and UnifiedSwitchBase (which does not chain
 * to TuyaZigbeeDevice.onNodeInit).
 *
 * Skip rules (rich implementations win, fallback never overrides):
 *  - button.toggle / button.toggle_N : skipped when VirtualButtonMixin is
 *    mixed in (`_handleVirtualToggle` exists on the prototype) — VBM
 *    registers its richer anti-spam/self-healing version later in init.
 *  - button.identify : skipped when `_handleVirtualIdentify` exists (VBM).
 *  - button.feed     : skipped when `_triggerFeed` exists (pet_feeder
 *    self-registers after super.onNodeInit).
 *  - button.push     : delegates to triggerFingerBotPress /
 *    _handleVirtualToggle when available, else toggles gang 1.
 *
 * Idempotent per device via `_namedButtonFallbacksRegistered` Set, so both
 * bases may call it without double registration.
 */

function _log(device, msg) {
  try { device.log(msg); } catch (_e) { /* no-op */ }
}

/**
 * Toggle the onoff state of a gang (gang 1 → `onoff`, else `onoff.gangN`).
 * Mirrors the universal button.N semantics, including virtual/physical dedup.
 */
async function _toggleGang(device, gang, sourceCap) {
  const now = Date.now();
  if (!device._virtualPhysicalDedup) {
    device._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
  }
  const lastPhysical = device._virtualPhysicalDedup.lastPhysicalPress[gang] || 0;
  if (now - lastPhysical < device._virtualPhysicalDedup.dedupWindow) {
    _log(device, `[DEDUP] Skipping ${sourceCap} (physical ${now - lastPhysical}ms ago)`);
    return true;
  }
  device._virtualPhysicalDedup.lastVirtualPress[gang] = now;

  const gangCap = device.hasCapability(`onoff.gang${gang}`) ? `onoff.gang${gang}`
    : (gang === 1 && device.hasCapability('onoff') ? 'onoff' : null);
  if (gangCap) {
    const current = device.getCapabilityValue(gangCap) === true;
    if (typeof device._setGangOnOff === 'function') {
      await device._setGangOnOff(gang, !current);
    } else if (typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue(gangCap, !current).catch(() => {});
    }
  } else {
    _log(device, `[BUTTON-UI] ${sourceCap}: no onoff capability for gang ${gang} (no-op)`);
  }
  if (typeof device.triggerButtonPress === 'function') {
    await device.triggerButtonPress(gang, 'single', 1, { source: 'virtual' }).catch(() => {});
  }
  return true;
}

/**
 * Identify/blink the device via the app-level FeatureFallbackRouter
 * (ZCL Identify → Tuya DP → software pulses), plain log as last resort.
 */
async function _identify(device) {
  const router = device.homey && device.homey.app && device.homey.app.featureFallbackRouter;
  if (router && typeof router.blink === 'function') {
    const res = await router.blink(device, 5).catch((e) => ({ ok: false, error: e.message }));
    if (res && res.ok) {
      _log(device, `[BUTTON-UI] button.identify → blink via ${res.path}`);
      return true;
    }
  }
  // Last resort: ZCL Identify cluster directly
  try {
    const identifyCluster = device.zclNode && device.zclNode.endpoints
      && device.zclNode.endpoints[1] && device.zclNode.endpoints[1].clusters
      && device.zclNode.endpoints[1].clusters.identify;
    if (identifyCluster && typeof identifyCluster.identify === 'function') {
      await identifyCluster.identify({ identifyTime: 5 });
      _log(device, '[BUTTON-UI] button.identify → ZCL Identify 5s');
      return true;
    }
  } catch (e) {
    _log(device, `[BUTTON-UI] identify cluster failed: ${e.message}`);
  }
  _log(device, '[BUTTON-UI] button.identify: no identify path available (no-op)');
  return true;
}

/**
 * Momentary push (fingerbot-style): dedicated press method when the driver
 * has one, rich virtual toggle when VBM is present, plain gang-1 toggle else.
 */
async function _push(device) {
  if (typeof device.triggerFingerBotPress === 'function') {
    await device.triggerFingerBotPress();
    return true;
  }
  if (typeof device._handleVirtualToggle === 'function') {
    await device._handleVirtualToggle(1);
    return true;
  }
  return _toggleGang(device, 1, 'button.push');
}

/**
 * Feed fallback (pet feeders without their own listener): Tuya DP3 = 1.
 */
async function _feed(device) {
  try {
    const ep1 = device.zclNode && device.zclNode.endpoints && device.zclNode.endpoints[1];
    const tuyaCluster = ep1 && ep1.clusters && (ep1.clusters.tuya || ep1.clusters[61184]);
    if (tuyaCluster) {
      await tuyaCluster.datapoint({ dp: 3, datatype: 2, value: 1 });
      _log(device, '[BUTTON-UI] button.feed → Tuya DP3=1');
      return true;
    }
  } catch (e) {
    _log(device, `[BUTTON-UI] button.feed failed: ${e.message}`);
  }
  _log(device, '[BUTTON-UI] button.feed: no Tuya cluster (no-op)');
  return true;
}

/**
 * Register fallback listeners for every named button.* capability the
 * device exposes and nobody richer claims. Safe to call multiple times.
 *
 * @param {Object} device - Homey device instance
 */
function registerNamedButtonFallbacks(device) {
  if (!device || typeof device.hasCapability !== 'function') { return; }
  if (!device._namedButtonFallbacksRegistered) {
    device._namedButtonFallbacksRegistered = new Set();
  }
  const done = device._namedButtonFallbacksRegistered;
  const caps = (typeof device.getCapabilities === 'function' && device.getCapabilities()) || [];

  const register = (cap, handler, label) => {
    if (done.has(cap)) { return; }
    try {
      device.registerCapabilityListener(cap, async () => {
        _log(device, `[BUTTON-UI] ${cap} pressed (virtual, ${label})`);
        try {
          return await handler();
        } catch (e) {
          _log(device, `[BUTTON-UI] ${cap} action failed: ${e.message}`);
          return true;
        }
      });
      done.add(cap);
      _log(device, `[BUTTON-UI] ✅ fallback listener: ${cap} (${label})`);
    } catch (e) {
      // Already registered by a richer path — that is fine, richer wins.
      done.add(cap);
      _log(device, `[BUTTON-UI] ${cap} already handled elsewhere: ${e.message}`);
    }
  };

  for (const cap of caps) {
    if (done.has(cap)) { continue; }
    let m;
    if (cap === 'button.toggle' || (m = /^button\.toggle_(\d+)$/.exec(cap))) {
      if (typeof device._handleVirtualToggle === 'function') { continue; } // VBM owns it
      const gang = m ? parseInt(m[1], 10) : 1;
      register(cap, () => _toggleGang(device, gang, cap), `toggle gang ${gang}`);
    } else if (cap === 'button.identify') {
      if (typeof device._handleVirtualIdentify === 'function') { continue; } // VBM owns it
      register(cap, () => _identify(device), 'identify/blink');
    } else if (cap === 'button.push') {
      register(cap, () => _push(device), 'momentary push');
    } else if (cap === 'button.feed') {
      if (typeof device._triggerFeed === 'function') { continue; } // pet_feeder owns it
      register(cap, () => _feed(device), 'feed DP3');
    }
  }
}

module.exports = { registerNamedButtonFallbacks };
