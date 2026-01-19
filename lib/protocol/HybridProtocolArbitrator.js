'use strict';

/**
 * HybridProtocolArbitrator - ZCL/Tuya arbitration
 * @version 5.5.672
 */

class HybridProtocolArbitrator {
  constructor(device) {
    this.device = device;
    this._protocol = 'unknown';
    this._events = new Map();
  }

  detectProtocol(zclNode) {
    const eps = zclNode?.endpoints || {};
    let hasTuya = false, hasZCL = false;
    
    for (const ep of Object.values(eps)) {
      if (ep.clusters?.[61184]) hasTuya = true;
      if (ep.clusters?.onOff || ep.clusters?.[6]) hasZCL = true;
    }
    
    this._protocol = hasTuya ? (hasZCL ? 'hybrid' : 'tuya') : 'zcl';
    return this._protocol;
  }

  shouldProcess(cap, val, src) {
    const key = `${cap}:${JSON.stringify(val)}`;
    const last = this._events.get(key);
    if (last && Date.now() - last < 300) return false;
    this._events.set(key, Date.now());
    return true;
  }

  get protocol() { return this._protocol; }
}

module.exports = HybridProtocolArbitrator;
