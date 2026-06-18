'use strict';
const { BoundCluster } = require('zigbee-clusters');
try { require('./ZosungIRControlCluster'); } catch (e) { /* Parent cluster may not be available */ }
class ZosungIRControlBoundCluster extends BoundCluster {
  constructor({ device }) { super(); this._d = device; }
  _safe(name, d) { try { this._d?.emit(`ir.${  name}`, d); } catch (e) { /* Frame error handled silently */ } }
  IRLearn(d) { this._safe('learnStatus', d); }
  IRSend(d) { this._safe('sendResult', d); }
}
module.exports = ZosungIRControlBoundCluster;
