'use strict';

/**
 * ButtonE000RawInterceptor - P2387 SSOT for E000 raw frame gap-fill on button remotes.
 *
 * WHY: Several button drivers blind-overwrote zclNode.handleFrame, orphaning
 * PhysicalButtonMixin 0xFD chain (P2328). Always use wrapHandleFrame append-only.
 *
 * Pour qui: button_wireless_* / remote_button_* / scene_switch fleet (BOTH).
 * Contre quoi: ghost/double flows, dead physical buttons after update.
 */

const { wrapHandleFrame } = require('./BidirectionalButtonState');
const { resolve: resolvePressType } = require('./TuyaPressTypeMap');

const E000_CID = 0xE000;
const E000_CID_ALT = 57344;

function extractFrameData(frame) {
  const json = typeof frame?.toJSON === 'function' ? frame.toJSON() : frame;
  if (Buffer.isBuffer(json?.data)) { return json.data; }
  if (Array.isArray(json?.data)) { return Buffer.from(json.data); }
  if (Buffer.isBuffer(frame?.data)) { return frame.data; }
  return null;
}

function isE000Cluster(clusterId) {
  const c = Number(clusterId);
  return c === E000_CID || c === E000_CID_ALT;
}

/**
 * Install append-only E000 (and optional custom) raw handler on zclNode.handleFrame.
 *
 * @param {object} device ButtonDevice (or subclass)
 * @param {object} zclNode Zigbee node
 * @param {object} [options]
 * @param {string} [options.tag='button-e000-raw'] unique wrap tag
 * @param {number} [options.maxButton=2] max button index in payload
 * @param {string} [options.logPrefix='BTN-RAW'] log prefix
 * @param {string} [options.pressContext='E000-RAW'] TuyaPressTypeMap context
 * @param {function} [options.onFrame] async (epId, cId, frame, meta) => void - custom per-frame hook
 * @returns {boolean}
 */
function installE000RawInterceptor(device, zclNode, options = {}) {
  const {
    tag = 'button-e000-raw',
    maxButton = 2,
    logPrefix = 'BTN-RAW',
    pressContext = 'E000-RAW',
    onFrame = null,
  } = options;

  if (!zclNode || typeof zclNode.handleFrame !== 'function') { return false; }

  wrapHandleFrame(zclNode, tag, async (args, next) => {
    const [epId, cId, frame, meta] = args;
    try {
      if (typeof onFrame === 'function') {
        await onFrame.call(device, epId, cId, frame, meta);
      } else if (isE000Cluster(cId)) {
        const max = Math.max(1, Number(maxButton) || 1);
        // WHY(Bastien TS0043 phantom toggles): ignore phantom endpoints beyond maxButton and ZCL Global frames
        if (Number(epId) < 1 || Number(epId) > max) { return next(...args); }
        const d = extractFrameData(frame);
        let hdr = null;
        try {
          const { parseZclHeader } = require('../zigbee/ZigbeeHelpers');
          hdr = d && d.length >= 3 ? parseZclHeader(d) : null;
        } catch (_e) { /* soft */ }
        if (hdr && !hdr.clusterSpecific) { return next(...args); }
        const payload = (hdr && hdr.clusterSpecific && d.length > hdr.payloadOffset)
          ? d.slice(hdr.payloadOffset)
          : d;
        device.log?.(`[${logPrefix}] EP${epId} E000`);
        let btn = Math.max(1, Number(epId) || 1);
        let pt = 'single';
        if (payload?.length >= 2 && payload[0] >= 1 && payload[0] <= max) {
          btn = payload[0];
          pt = resolvePressType(payload[1], pressContext);
        } else if (payload?.length >= 1) {
          pt = resolvePressType(payload[0], pressContext);
        }
        if (typeof device.triggerButtonPress === 'function') {
          await device.triggerButtonPress(btn, pt);
        }
      }
    } catch (e) {
      device.log?.(`[${logPrefix}] ${e.message}`);
    }
    return next(...args);
  });

  device.log?.(`[${logPrefix}] P2387 wrapHandleFrame tagged ${tag}`);
  return true;
}

module.exports = {
  E000_CID,
  E000_CID_ALT,
  extractFrameData,
  isE000Cluster,
  installE000RawInterceptor,
};
