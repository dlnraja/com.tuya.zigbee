'use strict';
/**
 * P2933 — ZCL Time cluster (0x000A) server on Homey's side: devices that read genTime
 * (Tuya LCD/TRV clocks, ZCL spec 3.12) get UTC, timezone and DST from the Homey clock.
 * Bound only when nothing else owns the binding. Credits: ZCL spec; Z2M/zigbee-herdsman
 * genTime server behaviour (MIT); deCONZ time cluster answers (BSD-3). Own code.
 */
const { BoundCluster } = require('zigbee-clusters');
const { zclTimeValues } = require('../tuya/TuyaMcuTimeService');

class TimeServerBoundCluster extends BoundCluster {
  constructor(getTimeZone) { super(); this._tz = getTimeZone || (() => null); }
  _v() { return zclTimeValues({ timeZone: this._tz() }); }
  get time() { return this._v().time; }
  get timeStatus() { return ['synchronized']; }
  get timeZone() { return this._v().timeZone; }
  get dstShift() { return this._v().dstShift; }
  get standardTime() { return this._v().standardTime; }
  get localTime() { return this._v().localTime; }
}

function bindTimeServer(device) {
  const ep = device && device.zclNode && device.zclNode.endpoints && device.zclNode.endpoints[1];
  if (!ep || typeof ep.bind !== 'function') {return false;}
  try { require('./ZigbeeLibBackports').apply?.(); } catch (_e) { /* optional */ }
  const cur = ep.bindings && ep.bindings.time;
  if (cur && cur instanceof BoundCluster) {return false;} // someone else owns it
  try {
    ep.bind('time', new TimeServerBoundCluster(() => { try { return device.homey.clock.getTimezone(); } catch (_e) { return null; } }));
    return true;
  } catch (_e) { return false; }
}

module.exports = { TimeServerBoundCluster, bindTimeServer };
