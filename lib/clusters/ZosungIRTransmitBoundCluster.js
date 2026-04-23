'use strict';
const { BoundCluster } = require('zigbee-clusters');
try { require('./ZosungIRTransmitCluster'); } catch (e) { }
class ZosungIRTransmitBoundCluster extends BoundCluster {
  constructor({ device }) { super(); this._d = device; }
  _safe(name, d) { try { this._d?.emit('ir.' + name, d); } catch (e) { console.error('[IRTransmit] FRAME SAVED ', name, ':', e.message); } }
  startTransmit(d) { this._safe('startTransmit', d); }
  startTransmitAck(d) { this._safe('startTransmitAck', d); }
  codeDataRequest(d) { this._safe('codeDataRequest', d); }
  codeDataResponse(d) { this._safe('codeDataResponse', d); }
  doneSending(d) { this._safe('doneSending', d); }
  doneReceiving(d) { this._safe('doneReceiving', d); }
}
module.exports = ZosungIRTransmitBoundCluster;


