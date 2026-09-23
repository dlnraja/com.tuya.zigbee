'use strict';

/**
 * ZigBeeDriverFlowCardPatch
 *
 * WHY(P2676 / Bastien diag cb3c0c87 @ 1.0.51): hard require('homey-zigbeedriver')
 * at app.js load crashed the WHOLE app (MODULE_NOT_FOUND) → no lights/relays.
 * Soft-load: if the module is absent, skip the patch — do not brick boot.
 *
 * WHY(P2696): never use top-level `return` after soft-skip — CommonJS forbids it
 * (Illegal return statement) and Fleetwood/PRE_COMMIT_CHECKS fail Unified CI.
 */

let ZigBeeDriver = null;
try {
  ({ ZigBeeDriver } = require('homey-zigbeedriver'));
} catch (err) {
  // Contre quoi: Athom package missing node_modules/homey-zigbeedriver
  try {
    console.error(
      '[ZigBeeDriverFlowCardPatch] soft-skip — homey-zigbeedriver missing:',
      err && err.message,
    );
  } catch (_e) { /* soft */ }
}

if (!ZigBeeDriver) {
  module.exports = null;
} else {
  function getFlowCard(homey, id, type) {
    const methods = type === 'trigger'
      ? ['getDeviceTriggerCard', 'getTriggerCard']
      : type === 'action'
        ? ['getDeviceActionCard', 'getActionCard']
        : ['getDeviceConditionCard', 'getConditionCard'];

    for (const method of methods) {
      try {
        if (typeof homey?.flow?.[method] !== 'function') {
          continue;
        }
        const card = homey.flow[method](id);
        if (card) { return card; }
      } catch (err) {
        // Try the next SDK3/legacy getter.
      }
    }

    return null;
  }

  function isAlreadyRegisteredError(err) {
    const msg = String(err?.message || err || '');
    return /run listener.*already registered|already registered/i.test(msg);
  }

  if (ZigBeeDriver?.prototype && typeof ZigBeeDriver.prototype._getFlowCard !== 'function') {
    ZigBeeDriver.prototype._getFlowCard = function patchedGetFlowCard(id, type = 'trigger') {
      if (!global._registeredFlowCardListeners) {
        global._registeredFlowCardListeners = new Set();
      }
      const key = `${type}:${id}`;
      if (global._registeredFlowCardListeners.has(key) || global._registeredFlowCardListeners.has(id)) {
        return null;
      }

      const card = getFlowCard(this.homey, id, type);
      if (!card) { return null; }

      if (typeof card.registerRunListener === 'function' && !card.__tuyaRunListenerGuardInstalled) {
        const originalRegister = card.registerRunListener.bind(card);
        Object.defineProperty(card, '__tuyaRunListenerGuardInstalled', {
          value: true,
          configurable: false,
          enumerable: false,
          writable: false,
        });
        card.registerRunListener = (handler) => {
          if (global._registeredFlowCardListeners.has(key)) { return card; }
          try {
            const result = originalRegister(handler);
            global._registeredFlowCardListeners.add(key);
            global._registeredFlowCardListeners.add(id);
            return result;
          } catch (err) {
            if (isAlreadyRegisteredError(err)) {
              global._registeredFlowCardListeners.add(key);
              global._registeredFlowCardListeners.add(id);
              return card;
            }
            throw err;
          }
        };
      }

      return card;
    };
  }

  // P101: global null-safe getDeviceById — Gmail crash "Could not get device by id"
  // hits drivers that extend ZigBeeDriver directly (not BaseZigBeeDriver).
  if (ZigBeeDriver?.prototype && !ZigBeeDriver.prototype.__p101GetDeviceByIdPatched) {
    const originalGetDeviceById = ZigBeeDriver.prototype.getDeviceById;
    ZigBeeDriver.prototype.getDeviceById = function patchedGetDeviceById(id) {
      try {
        return originalGetDeviceById.call(this, id);
      } catch (err) {
        try {
          this.error?.(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err?.message || err}`);
        } catch (_e) { /* logging best-effort */ }
        try {
          const devices = typeof this.getDevices === 'function' ? this.getDevices() : [];
          const found = (devices || []).find((d) => {
            try {
              const data = d.getData?.() || {};
              return data.id === id || data.ieeeAddress === id;
            } catch (_e2) {
              return false;
            }
          });
          if (found) { return found; }
        } catch (_e3) { /* fallback search best-effort */ }
        return null;
      }
    };
    ZigBeeDriver.prototype.__p101GetDeviceByIdPatched = true;
  }

  module.exports = ZigBeeDriver;
}
