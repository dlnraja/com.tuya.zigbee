'use strict';
// WHY(P3233, 02/11/2026 Paris): a continuation driver (DRIVER_CONTINUATIONS.md) owns its own flow card ids
// (<cont>_x, filtered on driver_id=<cont>) but runs the root code, which asks for '<root>_x' cards.
// Wrap the root class so card lookups from a continuation instance resolve to its own '<cont>_x' card
// when that card exists, else fall back to the original id. Failsafe: any error leaves the instance untouched.
const FLOW_GETTERS = ['getActionCard', 'getConditionCard', 'getTriggerCard', 'getDeviceTriggerCard'];

function aliasId(cardId, rootId, contId, has) {
  if (typeof cardId !== 'string' || !cardId.startsWith(`${rootId}_`)) {return cardId;}
  const alt = contId + cardId.slice(rootId.length);
  return has(alt) ? alt : cardId;
}

function makeFlowProxy(flow, rootId, contId) {
  const tried = new Map();
  return new Proxy(flow, {
    get(t, k) {
      const v = t[k];
      if (!FLOW_GETTERS.includes(k) || typeof v !== 'function') {return typeof v === 'function' ? v.bind(t) : v;}
      return (cardId, ...rest) => {
        const has = (alt) => {
          if (tried.has(alt)) {return tried.get(alt);}
          let ok = false; try { ok = Boolean(v.call(t, alt)); } catch (_e) { ok = false; }
          tried.set(alt, ok); return ok;
        };
        return v.call(t, aliasId(cardId, rootId, contId, has), ...rest);
      };
    },
  });
}

function install(instance, rootId, contId) {
  try {
    const homey = instance.homey;
    if (!homey || !homey.flow || homey.__contAlias) {return false;}
    const flow = makeFlowProxy(homey.flow, rootId, contId);
    const hp = new Proxy(homey, { get: (t, k) => k === 'flow' ? flow : k === '__contAlias' ? true : t[k] });
    Object.defineProperty(instance, 'homey', { value: hp, configurable: true, writable: true });
    return true;
  } catch (_e) { return false; }
}

/** Subclass Root so instances of the continuation `contId` resolve '<rootId>_x' cards to '<contId>_x'. */
function continuationOf(Root, rootId, contId) {
  return class extends Root {
    constructor(...args) { super(...args); install(this, rootId, contId); }
  };
}

module.exports = { continuationOf, aliasId, makeFlowProxy, install };
