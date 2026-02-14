'use strict';
const { BoundCluster } = require('zigbee-clusters');
try { require('./ZosungIRTransmitCluster'); } catch (e) { }
class ZosungIRTransmitBoundCluster extends BoundCluster {
  constructor({ device }) { super(); this._d = device; }
  startTransmit(d) { this._d?.emit('ir.startTransmit', d); }
  startTransmitAck(d) { this._d?.emit('ir.startTransmitAck', d); }
  codeDataRequest(d) { this._d?.emit('ir.codeDataRequest', d); }
  codeDataResponse(d) { this._d?.emit('ir.codeDataResponse', d); }
  doneSending(d) { this._d?.emit('ir.doneSending', d); }
  doneReceiving(d) { this._d?.emit('ir.doneReceiving', d); }
}
module.exports = ZosungIRTransmitBoundCluster;
