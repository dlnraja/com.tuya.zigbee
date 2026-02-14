'use strict';
const { BoundCluster } = require('zigbee-clusters');
try { require('./ZosungIRControlCluster'); } catch (e) { }
class ZosungIRControlBoundCluster extends BoundCluster {
  constructor({ device }) { super(); this._d = device; }
  IRLearn(d) { this._d?.emit('ir.learnStatus', d); }
  IRSend(d) { this._d?.emit('ir.sendResult', d); }
}
module.exports = ZosungIRControlBoundCluster;
