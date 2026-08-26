'use strict';

/**
 * BidirectionalButtonState — P2283 SSOT helpers for physical ↔ virtual buttons.
 *
 * WHY: Permanent closure of ghost loops / missed EP listeners / dedup desync.
 * Pour qui: Homey users (wall switches + TS004x remotes) + CI gates.
 * Contre quoi: gangCount≠buttonCount, virtual stamp missing, handleFrame overwrite.
 *
 * Cross-ref: docs/BIDIRECTIONAL_BUTTONS.md · P2220–P2221 · P2235 · P2282–P2283
 */

const DEDUP_WINDOW_MS = 2000;

/**
 * Endpoint / gang count for remotes (buttonCount) and wall switches (gangCount).
 * Never prefer only one — init must cover Math.max of both.
 */
function resolveGangCount(device, fallback = 1) {
  const g = Number(device?.gangCount);
  const b = Number(device?.buttonCount);
  const n = Math.max(
    Number.isFinite(g) && g > 0 ? g : 0,
    Number.isFinite(b) && b > 0 ? b : 0,
    Number(fallback) > 0 ? Number(fallback) : 1,
  );
  return n || 1;
}

function ensureDedup(device) {
  if (!device) {return null;}
  if (!device._virtualPhysicalDedup) {
    device._virtualPhysicalDedup = {
      lastVirtualPress: {},
      lastPhysicalPress: {},
      dedupWindow: DEDUP_WINDOW_MS,
    };
  }
  if (!device._virtualPhysicalDedup.lastVirtualPress) {
    device._virtualPhysicalDedup.lastVirtualPress = {};
  }
  if (!device._virtualPhysicalDedup.lastPhysicalPress) {
    device._virtualPhysicalDedup.lastPhysicalPress = {};
  }
  if (!device._virtualPhysicalDedup.dedupWindow) {
    device._virtualPhysicalDedup.dedupWindow = DEDUP_WINDOW_MS;
  }
  return device._virtualPhysicalDedup;
}

function stampVirtual(device, gang = 1, at = Date.now()) {
  const d = ensureDedup(device);
  if (!d) {return;}
  d.lastVirtualPress[gang] = at;
}

function stampPhysical(device, gang = 1, at = Date.now()) {
  const d = ensureDedup(device);
  if (!d) {return;}
  d.lastPhysicalPress[gang] = at;
}

function isWithinDedup(device, gang, against /* 'virtual' | 'physical' */) {
  const d = ensureDedup(device);
  if (!d) {return false;}
  const map = against === 'virtual' ? d.lastVirtualPress : d.lastPhysicalPress;
  const last = map[gang] || 0;
  return Date.now() - last < (d.dedupWindow || DEDUP_WINDOW_MS);
}

/**
 * Append-only zclNode.handleFrame wrapper. Never blind-overwrite.
 * WHY(P2283): scene_switch_4 / IO passive / raw L0 must chain, not orphan 0xFD.
 *
 * @param {object} node zclNode or this.node
 * @param {string} tag unique id for diagnostics
 * @param {(args: any[], next: Function) => any} handler
 *   Call next(...args) to continue the chain. May short-circuit by not calling next.
 */
function wrapHandleFrame(node, tag, handler) {
  if (!node || typeof handler !== 'function') {return false;}
  if (!node._bidirectionalHandleFrameChain) {
    node._bidirectionalHandleFrameChain = [];
    const root = typeof node.handleFrame === 'function'
      ? node.handleFrame.bind(node)
      : (..._a) => undefined;
    node._bidirectionalHandleFrameRoot = root;
    node.handleFrame = function bidirectionalHandleFrameChain(...args) {
      const chain = node._bidirectionalHandleFrameChain || [];
      let i = 0;
      const next = (...a) => {
        if (i < chain.length) {
          const entry = chain[i++];
          return entry.handler(a.length ? a : args, next);
        }
        return root(...(a.length ? a : args));
      };
      return next(...args);
    };
  }
  // Replace existing tag (re-arm) or push
  const chain = node._bidirectionalHandleFrameChain;
  const idx = chain.findIndex((e) => e.tag === tag);
  const entry = { tag, handler };
  if (idx >= 0) {chain[idx] = entry;}
  else {chain.push(entry);}
  return true;
}

module.exports = {
  DEDUP_WINDOW_MS,
  resolveGangCount,
  ensureDedup,
  stampVirtual,
  stampPhysical,
  isWithinDedup,
  wrapHandleFrame,
};
