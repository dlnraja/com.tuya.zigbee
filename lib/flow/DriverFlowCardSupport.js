'use strict';

const REGISTRY = Symbol.for('tuya.flow.runListenerRegistry');

function getRegistry() {
  if (!global[REGISTRY]) global[REGISTRY] = new Set();
  return global[REGISTRY];
}

function isAlreadyRegisteredError(err) {
  const msg = String(err?.message || err || '');
  return /run listener.*already registered|already registered/i.test(msg);
}

function logDebug(logger, message) {
  try {
    if (logger?.developerDebugMode && typeof logger.log === 'function') logger.log(message);
  } catch (_e) {
    // ignore logging failures
  }
}

function wrapFlowCard(card, key, logger) {
  if (!card || typeof card.registerRunListener !== 'function') return card;
  if (card.__tuyaRunListenerGuardInstalled) return card;

  const originalRegisterRunListener = card.registerRunListener.bind(card);
  Object.defineProperty(card, '__tuyaRunListenerGuardInstalled', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  card.registerRunListener = function guardedRegisterRunListener(listener) {
    const registry = getRegistry();
    if (registry.has(key)) {
      logDebug(logger, `[FLOW] Run listener already registered for ${key}; duplicate skipped`);
      return card;
    }

    try {
      const result = originalRegisterRunListener(listener);
      registry.add(key);
      return result;
    } catch (err) {
      if (isAlreadyRegisteredError(err)) {
        registry.add(key);
        logDebug(logger, `[FLOW] Run listener already registered for ${key}; duplicate skipped`);
        return card;
      }
      throw err;
    }
  };

  return card;
}

function getFlowCardFromHomey(homey, id, type, logger) {
  if (!id || !homey?.flow) return null;

  const normalizedType = type || 'trigger';
  const methods = {
    trigger: 'getTriggerCard',
    condition: 'getConditionCard',
    action: 'getActionCard',
    deviceTrigger: 'getDeviceTriggerCard',
    'device-trigger': 'getDeviceTriggerCard',
  };

  const method = methods[normalizedType] || methods.trigger;
  if (typeof homey.flow[method] !== 'function') return null;

  try {
    const card = homey.flow[method](id);
    return wrapFlowCard(card, `${normalizedType}:${id}`, logger);
  } catch (err) {
    logDebug(logger, `[FLOW] Card ${normalizedType}:${id} not available: ${err.message}`);
    return null;
  }
}

function installDriverFlowCardSupport(logger = null) {
  const patchPrototype = (prototype) => {
    if (!prototype || prototype._getFlowCard) return;
    Object.defineProperty(prototype, '_getFlowCard', {
      configurable: true,
      enumerable: false,
      writable: true,
      value(id, type = 'trigger') {
        return getFlowCardFromHomey(this.homey, id, type, this || logger);
      },
    });
  };

  try {
    const { ZigBeeDriver } = require('homey-zigbeedriver');
    patchPrototype(ZigBeeDriver?.prototype);
  } catch (_e) {
    // Dependency is available inside Homey runtime; local validators may omit it.
  }

  try {
    const Homey = require('homey');
    patchPrototype(Homey?.Driver?.prototype);
  } catch (_e) {
    // Same: keep local tooling resilient.
  }
}

function installHomeyFlowCardSafety(homey, logger = null) {
  const flow = homey?.flow;
  if (!flow || flow.__tuyaFlowCardSafetyInstalled) return false;

  const methods = {
    getTriggerCard: 'trigger',
    getConditionCard: 'condition',
    getActionCard: 'action',
    getDeviceTriggerCard: 'deviceTrigger',
  };

  for (const [method, type] of Object.entries(methods)) {
    if (typeof flow[method] !== 'function') continue;
    const original = flow[method].bind(flow);

    try {
      flow[method] = function guardedGetFlowCard(id, ...rest) {
        const card = original(id, ...rest);
        return wrapFlowCard(card, `${type}:${id}`, logger);
      };
    } catch (_e) {
      // Some SDK objects may expose readonly methods.
    }
  }

  try {
    Object.defineProperty(flow, '__tuyaFlowCardSafetyInstalled', {
      value: true,
      enumerable: false,
    });
  } catch (_e) {
    flow.__tuyaFlowCardSafetyInstalled = true;
  }

  return true;
}

module.exports = {
  installDriverFlowCardSupport,
  installHomeyFlowCardSafety,
  getFlowCardFromHomey,
};
