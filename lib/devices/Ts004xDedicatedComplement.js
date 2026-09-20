'use strict';

/**
 * Ts004xDedicatedComplement (P2616)
 *
 * Complementary hotfix stacks that historically lived on dedicated TS0044 drivers
 * and must NOT be wiped when fleet WallSceneRemoteHybridInit is installed (P2520).
 *
 * Arms (soft, append-only, dedup via caller onPress):
 *   - LevelControl step/move (TS004F-ish white-labels)
 *   - Raw wrapHandleFrame with parseZclHeader (P2328 precise 0xFD)
 *   - Unrecognized-frame diag (no silent drop)
 *
 * Hybrid already covers E000 / OnOff-0xFD / EF00 / raw-basic — this module is
 * the complementary FALLBACK layer for exotic variants on TS0043/44.
 *
 * Track: BOTH
 */

const { resolve: resolvePressType } = require('../utils/TuyaPressTypeMap');

/**
 * @param {object} device
 * @param {object} zclNode
 * @param {object} opts
 * @param {number} opts.maxButtons
 * @param {string} [opts.tag]
 * @param {(btn:number, press:string)=>Promise<void>} opts.onPress
 * @param {boolean} [opts.enableLevelControl=true]
 */
async function installTs004xDedicatedComplement(device, zclNode, opts = {}) {
  if (device._ts004xDedicatedComplementInstalled) return true;

  const maxButtons = Math.max(1, Math.min(6, Number(opts.maxButtons) || 3));
  const tag = opts.tag || `TS004X-DED-${maxButtons}`;
  const onPress = typeof opts.onPress === 'function'
    ? opts.onPress
    : async (btn, press) => {
      if (typeof device.triggerButtonPress === 'function') {
        await device.triggerButtonPress(btn, press, 1, { source: `${tag}-dedicated` });
      }
    };
  const log = (...a) => { try { device.log?.(`[${tag}]`, ...a); } catch (_e) { /* */ } };

  if (!device._ts004xDedup) device._ts004xDedup = {};
  const isDeduped = (key, ms = 500) => {
    const now = Date.now();
    const last = device._ts004xDedup[key] || 0;
    if (now - last < ms) return true;
    device._ts004xDedup[key] = now;
    return false;
  };

  // LevelControl — complementary to hybrid (TS004F command-mode cousins)
  if (opts.enableLevelControl !== false) {
    try {
      for (let ep = 1; ep <= maxButtons; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        const lc = endpoint?.clusters?.levelControl || endpoint?.clusters?.[8];
        if (!lc || typeof lc.on !== 'function') continue;
        const fireLc = async (press, src) => {
          if (isDeduped(`lc-${ep}-${src}`)) return;
          log(`LevelControl EP${ep} ${src} -> btn${ep} ${press}`);
          await onPress(ep, press);
        };
        try { lc.on('commandStep', async () => { await fireLc('single', 'step'); }); } catch (_e) { /* */ }
        try { lc.on('commandStepWithOnOff', async () => { await fireLc('single', 'stepOnOff'); }); } catch (_e) { /* */ }
        try { lc.on('commandMove', async () => { await fireLc('long', 'move'); }); } catch (_e) { /* */ }
        try { lc.on('commandMoveWithOnOff', async () => { await fireLc('long', 'moveOnOff'); }); } catch (_e) { /* */ }
        try { lc.on('commandStop', async () => { await fireLc('release', 'stop'); }); } catch (_e) { /* */ }
        try { lc.on('commandStopWithOnOff', async () => { await fireLc('release', 'stopOnOff'); }); } catch (_e) { /* */ }
      }
      log('LevelControl complementary armed');
    } catch (e) {
      log('LevelControl soft-skip:', e.message);
    }
  }

  // Raw parseZclHeader 0xFD + E000 + unrecognized diag (P2328 complementary)
  try {
    const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
    const node = zclNode || device.zclNode;
    if (node && typeof node.handleFrame === 'function') {
      wrapHandleFrame(node, `${tag}-raw-p2328`, async (args, next) => {
        const [endpointId, clusterId, frame] = args;
        try {
          const ep = Math.max(1, Math.min(maxButtons, Number(endpointId) || 1));
          const json = typeof frame?.toJSON === 'function' ? frame.toJSON() : frame;
          const data = Buffer.isBuffer(json?.data)
            ? json.data
            : Array.isArray(json?.data)
              ? Buffer.from(json.data)
              : Buffer.isBuffer(frame) ? frame : null;

          const { parseZclHeader } = require('../zigbee/ZigbeeHelpers');
          const hdr = data ? parseZclHeader(data) : null;

          // Gap-fill precise 0xFD only when mixin BoundCluster not already owning
          if (!device._onOffFdBoundClusterInitialized
              && Number(clusterId) === 0x0006 && hdr && hdr.cmdId === 0xFD
              && data && data.length === hdr.payloadOffset + 1
              && [0, 1, 2].includes(data[hdr.payloadOffset])) {
            const pressType = resolvePressType(data[hdr.payloadOffset], `${tag}-RAW`);
            if (!isDeduped(`rawfd-${ep}-${pressType}`, 400)) {
              log(`P2328 EP${ep} 0xFD action=${data[hdr.payloadOffset]} -> ${pressType}`);
              await onPress(ep, pressType);
            }
          } else if (Number(clusterId) === 0xE000 || Number(clusterId) === 57344) {
            let button = ep;
            let pressType = 'single';
            if (data?.length >= 2 && data[0] >= 1 && data[0] <= maxButtons) {
              button = data[0];
              pressType = resolvePressType(data[1], `${tag}-E000-RAW`);
            } else if (data?.length >= 1) {
              pressType = resolvePressType(data[0], `${tag}-E000-RAW`);
            }
            if (!isDeduped(`rawe000-${button}-${pressType}`, 400)) {
              await onPress(button, pressType);
            }
          } else if (!device._onOffFdBoundClusterInitialized
              && Number(clusterId) !== 0x0006
              && Number(clusterId) !== 1
              && Number(clusterId) !== 0) {
            // Soft unrecognized diag — never throw
            try {
              const hex = data ? data.slice(0, 16).toString('hex') : '';
              if (hex && !isDeduped(`unrec-${clusterId}-${hex}`, 5000)) {
                log(`unrecognized EP${ep} cluster=0x${Number(clusterId).toString(16)} data=${hex}`);
              }
            } catch (_e) { /* */ }
          }
        } catch (err) {
          log(`raw decode soft-fail: ${err.message}`);
        }
        return next(...args);
      });
      log('P2328 raw parseZclHeader complementary armed');
    }
  } catch (e) {
    log('raw complement soft-skip:', e.message);
  }

  device._ts004xDedicatedComplementInstalled = true;
  log(`dedicated complement ready maxButtons=${maxButtons}`);
  return true;
}

module.exports = {
  installTs004xDedicatedComplement,
};
