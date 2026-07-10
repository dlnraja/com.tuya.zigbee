'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

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
      if (card) return card;
    } catch (err) {
      // Try the next SDK3/legacy getter.
    }
  }

  return null;
}

if (ZigBeeDriver?.prototype && typeof ZigBeeDriver.prototype._getFlowCard !== 'function') {
  ZigBeeDriver.prototype._getFlowCard = function patchedGetFlowCard(id, type = 'trigger') {
    if (!global._registeredFlowCardListeners) {
      global._registeredFlowCardListeners = new Set();
    }
    if (global._registeredFlowCardListeners.has(id)) {
      return null;
    }

    const card = getFlowCard(this.homey, id, type);
    if (!card) return null;

    if (typeof card.registerRunListener === 'function') {
      const originalRegister = card.registerRunListener.bind(card);
      card.registerRunListener = (handler) => {
        if (global._registeredFlowCardListeners.has(id)) return card;
        global._registeredFlowCardListeners.add(id);
        return originalRegister(handler);
      };
    }

    return card;
  };
}

module.exports = ZigBeeDriver;
