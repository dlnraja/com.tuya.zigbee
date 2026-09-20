'use strict';

/**
 * WallSceneRemoteHybridInit (P2608)
 *
 * Battery wall scene remotes (TS0043 / TS0044 / Zemismart / Moes / Lonsonho):
 * multi-path RX — Homey does not natively decode Tuya mfr OnOff 0xFD / E000 / EF00.
 *
 * WHY: 3–4 button CR2032/CR2450 wall stickies report via:
 *   - genOnOff manufacturer cmd 0xFD (payload 0/1/2 = single/double/hold) per EP
 *   - cluster 0xE000 proprietary frames
 *   - optional EF00 DPs 1..N
 *   - raw handleFrame catchers
 * Never write genOnOff 0x8004 on TS0041–44 (scene_mode_unsupported).
 *
 * Track: BOTH (Bastien house priority + public remotes).
 */

const { resolve: resolvePressType, PRESS_MAP } = require('../utils/TuyaPressTypeMap');

/**
 * @param {object} device Homey ZigBeeDevice
 * @param {object} zclNode
 * @param {object} opts
 * @param {number} opts.maxButtons 3 or 4
 * @param {string} [opts.tag]
 * @param {(btn:number, press:string)=>Promise<void>} opts.onPress
 */
/**
 * Soft mains/battery power policy for remotes (P2609).
 * Battery stickies keep measure_battery; AC/USB remotes strip phantom battery.
 */
async function applyRemotePowerPolicy(device, opts = {}) {
  const tag = opts.tag || 'WALL-REMOTE-PWR';
  let mains = !!(device.mainsPowered || opts.forceMains);
  try {
    const energy = typeof device.getEnergy === 'function' ? device.getEnergy() : null;
    const batteries = energy?.batteries || [];
    if (!mains && Array.isArray(batteries) && batteries.length === 0
      && (opts.stripWhenNoBatteries !== false)) {
      // Compose without energy.batteries often = mains/USB scene panel
      const caps = typeof device.getCapabilities === 'function' ? device.getCapabilities() : [];
      if (caps.includes('measure_power') || caps.includes('meter_power')) mains = true;
    }
  } catch (_e) { /* soft */ }

  if (!mains) return false;
  try {
    device.mainsPowered = true;
    if (typeof device.hasCapability === 'function' && device.hasCapability('measure_battery')) {
      await device.removeCapability('measure_battery').catch(() => {});
      device.log?.(`[${tag}] stripped phantom measure_battery (mains remote)`);
    }
    if (typeof device.hasCapability === 'function' && device.hasCapability('alarm_battery')) {
      await device.removeCapability('alarm_battery').catch(() => {});
    }
  } catch (_e) { /* soft */ }
  return true;
}

async function installWallSceneRemoteHybrid(device, zclNode, opts = {}) {
  // WHY(P2629/P2630): opts.skipEf00Tx — interview has no 61184; never queue EF00 TX
  if (opts.skipEf00Tx) {
    try { device._skipEf00Tx = true; device._noEf00 = true; } catch (_e) { /* soft */ }
  }

  if (device._wallSceneRemoteHybridInstalled) {
    return true;
  }

  const maxButtons = Math.max(1, Math.min(6, Number(opts.maxButtons) || 3));
  const tag = opts.tag || `WALL-REMOTE-${maxButtons}`;
  const onPress = typeof opts.onPress === 'function'
    ? opts.onPress
    : async (btn, press) => {
      if (typeof device.triggerButtonPress === 'function') {
        await device.triggerButtonPress(btn, press, 1, { source: `wall-hybrid-${maxButtons}` });
      } else if (typeof device.triggerButtonFlow === 'function') {
        await device.triggerButtonFlow(btn, press);
      } else if (typeof device._triggerButtonPress === 'function') {
        await device._triggerButtonPress(btn, press);
      }
    };

  const log = (...a) => { try { device.log?.(`[${tag}]`, ...a); } catch (_e) { /* */ } };

  // WHY(P2609): AC wall panels must not show phantom CR2032
  if (opts.applyPowerPolicy !== false) {
    try { await applyRemotePowerPolicy(device, { tag, forceMains: opts.forceMains }); } catch (_e) { /* soft */ }
  }

  // Dedup shared with driver if present
  if (!device._wallRemoteDedup) device._wallRemoteDedup = {};
  const isDeduped = (key, ms = 400) => {
    if (typeof device._isDeduped === 'function') return device._isDeduped(key, ms);
    const now = Date.now();
    const last = device._wallRemoteDedup[key] || 0;
    if (now - last < ms) return true;
    device._wallRemoteDedup[key] = now;
    return false;
  };

  const fire = async (btn, press, src) => {
    const b = Math.max(1, Math.min(maxButtons, Number(btn) || 1));
    const p = press || 'single';
    if (isDeduped(`${b}-${p}-${src}`)) return;
    log(`${src} btn${b} ${p}`);
    await onPress(b, p);
  };

  // 1) E000 cluster + BoundCluster (soft)
  for (let ep = 1; ep <= maxButtons; ep++) {
    const endpoint = zclNode?.endpoints?.[ep];
    if (!endpoint) continue;

    const e000 = endpoint.clusters?.tuyaE000
      || endpoint.clusters?.[57344]
      || endpoint.clusters?.[0xE000];
    if (e000 && typeof e000.on === 'function') {
      for (const cmdName of ['cmd0', 'cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5', 'cmd6', 'cmdFD', 'cmdFE', 'cmdFF']) {
        try {
          e000.on(cmdName, async ({ data } = {}) => {
            let btn = ep;
            let press = 'single';
            if (data && data.length >= 2 && data[0] >= 1 && data[0] <= maxButtons) {
              btn = data[0];
              press = resolvePressType(data[1], tag);
            } else if (data && data.length >= 1) {
              press = resolvePressType(data[0], tag);
            }
            await fire(btn, press, `E000-${cmdName}`);
          });
        } catch (_e) { /* */ }
      }
    }

    // Standard onOff fallback (some white-labels)
    const onOff = endpoint.clusters?.onOff || endpoint.clusters?.[6];
    if (onOff && typeof onOff.on === 'function') {
      try {
        onOff.on('commandOn', async () => { await fire(ep, 'single', 'onOff-on'); });
        onOff.on('commandOff', async () => { await fire(ep, 'double', 'onOff-off'); });
        onOff.on('commandToggle', async () => { await fire(ep, 'long', 'onOff-toggle'); });
      } catch (_e) { /* */ }
    }
  }

  try {
    const TuyaE000BoundCluster = require('../clusters/TuyaE000BoundCluster');
    for (let ep = 1; ep <= maxButtons; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;
      const bc = new TuyaE000BoundCluster({
        device,
        onButtonPress: async (button, pressType) => {
          const btn = button >= 1 && button <= maxButtons ? button : ep;
          await fire(btn, pressType, 'E000-bound');
        },
      });
      bc.endpoint = ep;
      if (!endpoint.bindings) endpoint.bindings = {};
      endpoint.bindings.tuyaE000 = bc;
    }
    log('E000 BoundCluster armed');
  } catch (e) {
    log('E000 BoundCluster soft-skip:', e.message);
  }

  // 2) OnOff 0xFD BoundCluster — only if mixin did not already own it
  if (!device._onOffFdBoundClusterInitialized) {
    try {
      const OnOffBoundCluster = require('../clusters/OnOffBoundCluster');
      for (let ep = 1; ep <= maxButtons; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) continue;
        const bc = new OnOffBoundCluster({
          onSetOn: async (payload) => {
            let press = 'single';
            if (payload && (payload.cmdId === 0xFD || payload.scene !== undefined)) {
              press = PRESS_MAP[payload.scene] || payload.press || 'single';
            }
            await fire(ep, press, 'OnOff-0xFD');
          },
        });
        bc._device = device;
        if (!endpoint.bindings) endpoint.bindings = {};
        // Do not overwrite mixin binding if present
        if (!endpoint.bindings.onOff) endpoint.bindings.onOff = bc;
      }
      log('OnOff 0xFD BoundCluster armed (gap-fill)');
    } catch (e) {
      log('OnOffBound soft-skip:', e.message);
    }
  } else {
    log('skip OnOffBound — PhysicalButtonMixin owns 0xFD');
  }

  // 3) EF00 DP listen (exotic MCU remotes)
  try {
    const ep1 = zclNode?.endpoints?.[1];
    const tuya = ep1?.clusters?.tuya
      || ep1?.clusters?.manuSpecificTuya
      || ep1?.clusters?.[0xEF00]
      || ep1?.clusters?.[61184];
    if (tuya && typeof tuya.on === 'function') {
      const handleDp = (data) => {
        if (!data) return;
        let dpId; let value;
        if (data.dp !== undefined) {
          dpId = data.dp;
          value = data.value ?? data.data;
        } else if (data.dpId !== undefined) {
          dpId = data.dpId;
          value = data.value ?? data.data;
        } else if (Buffer.isBuffer(data) && data.length >= 5) {
          dpId = data[2];
          const len = data.readUInt16BE(4);
          if (len === 1) value = data[6];
        }
        if (dpId >= 1 && dpId <= maxButtons) {
          fire(dpId, resolvePressType(value, `${tag}-DP`), `EF00-DP${dpId}`);
        }
      };
      for (const evt of ['dp', 'datapoint', 'response', 'data', 'report']) {
        try { tuya.on(evt, handleDp); } catch (_e) { /* */ }
      }
      log('EF00 DP listen armed');
    }
  } catch (e) {
    log('EF00 soft-skip:', e.message);
  }

  // 4) E000 raw interceptor (append-only)
  try {
    const { installE000RawInterceptor } = require('../utils/ButtonE000RawInterceptor');
    installE000RawInterceptor(device, zclNode, {
      tag: `${tag}-e000-raw`,
      maxButton: maxButtons,
      logPrefix: tag,
      pressContext: tag,
    });
  } catch (e) {
    log('E000 raw soft-skip:', e.message);
  }

  // 5) Raw wrapHandleFrame for 0xFD + E000 (append-only; skip 0xFD if mixin owns)
  try {
    const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
    wrapHandleFrame(zclNode, `${tag}-raw`, async (args, next) => {
      const epId = args[0];
      const cId = args[1];
      const f = args[2];
      try {
        if (!device._onOffFdBoundClusterInitialized && (cId === 6 || cId === 0x0006)) {
          const json = typeof f?.toJSON === 'function' ? f.toJSON() : f;
          const d = Buffer.isBuffer(json?.data) ? json.data
            : Array.isArray(json?.data) ? Buffer.from(json.data)
            : Buffer.isBuffer(f) ? f : null;
          const cmd = f?.cmdId ?? f?.commandId ?? f?.command?.id;
          const looksFd = cmd === 0xFD || cmd === 253 || (d && d.length && d.includes(0xFD));
          if (looksFd) {
            const scene = (typeof cmd === 'number' && cmd === 0xFD && d && d.length) ? d[0]
              : (d && d.length > 1 ? d[d.length - 1] : 0);
            const pt = PRESS_MAP[scene] || 'single';
            const gang = (epId >= 1 && epId <= maxButtons) ? epId : 1;
            await fire(gang, pt, 'raw-0xFD');
          }
        }
        if (cId === 57344 || cId === 0xE000) {
          const json = typeof f?.toJSON === 'function' ? f.toJSON() : f;
          const d = Buffer.isBuffer(json?.data) ? json.data
            : Array.isArray(json?.data) ? Buffer.from(json.data)
            : Buffer.isBuffer(f) ? f : null;
          let btn = (epId >= 1 && epId <= maxButtons) ? epId : 1;
          let pt = 'single';
          if (d?.length >= 2 && d[0] >= 1 && d[0] <= maxButtons) {
            btn = d[0];
            pt = resolvePressType(d[1], `${tag}-raw-e000`);
          } else if (d?.length >= 1) {
            pt = resolvePressType(d[0], `${tag}-raw-e000`);
          }
          await fire(btn, pt, 'raw-E000');
        }
      } catch (_e) { /* never break chain */ }
      return next();
    });
    log('raw wrapHandleFrame armed');
  } catch (e) {
    log('raw wrap soft-skip:', e.message);
  }

  device._wallSceneRemoteHybridInstalled = true;
  device._wallSceneRemoteMaxButtons = maxButtons;
  log(`hybrid RX ready (ZCL onOff/0xFD + E000 + EF00 + raw) maxButtons=${maxButtons}; never 0x8004 on TS0043/44`);
  return true;
}

module.exports = {
  installWallSceneRemoteHybrid,
  applyRemotePowerPolicy,
};
