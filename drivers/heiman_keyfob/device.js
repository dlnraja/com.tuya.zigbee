'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { IasAceBoundCluster, CLUSTER_NAME } = require('../../lib/clusters/IasAceCluster');

/**
 * HEIMAN HM1RC-2-E alarm keyfob (modelId RC-EF-3.0): disarm, arm home,
 * arm all zones and emergency, sent as IAS ACE 0x0501 client commands.
 * Ids and button meaning from Koenkk/zigbee-herdsman-converters PR #2182
 * (arnaud-gouder) and dresden-elektronik/deconz-rest-plugin #3828.
 * Own implementation on the shared IasAceBoundCluster; native ZCL only.
 */
const ARM_TRIGGER = { 0: 'heiman_keyfob_disarm', 1: 'heiman_keyfob_arm_home', 2: 'heiman_keyfob_arm_home', 3: 'heiman_keyfob_arm_all' };
const ARM_NAMES = { disarm: 0, armDayHomeZonesOnly: 1, armNightSleepZonesOnly: 2, armAllZones: 3 };

function armModeOf(payload) {
  const m = payload?.armMode;
  if (typeof m === 'number') {return m;}
  if (typeof m === 'string' && m in ARM_NAMES) {return ARM_NAMES[m];}
  return null;
}

class HeimanKeyfobDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const ep = zclNode.endpoints[1];
    this._lastPress = 0;
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'powerConfiguration', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: (v) => {
          if (v === 255) {return null;}
          return Math.round(v / 2);
        },
        reportOpts: { configureAttributeReporting: { minInterval: 3600, maxInterval: 43200, minChange: 2 } },
      });
    }
    const bound = new IasAceBoundCluster({
      onArm: (p) => this._fire(ARM_TRIGGER[armModeOf(p)]),
      onEmergency: () => this._fire('heiman_keyfob_emergency'),
      onPanic: () => this._fire('heiman_keyfob_emergency'),
      onFire: () => this._fire('heiman_keyfob_emergency'),
    });
    let bound1 = false;
    for (const name of [CLUSTER_NAME, 'iasACE']) {
      try { ep.bind(name, bound); bound1 = true; break; } catch (_e) { /* try the other registered name */ }
    }
    if (!bound1) {this.error('IAS ACE bind failed');}
  }

  _fire(cardId) {
    if (!cardId) {return;}
    const now = Date.now();
    if (now - this._lastPress < 400 && cardId === this._lastCard) {return;} // radio retries
    this._lastPress = now;
    this._lastCard = cardId;
    this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, {}, {}).catch((e) => this.error(cardId, e.message));
  }
}

module.exports = HeimanKeyfobDevice;
module.exports.armModeOf = armModeOf;
module.exports.ARM_TRIGGER = ARM_TRIGGER;
