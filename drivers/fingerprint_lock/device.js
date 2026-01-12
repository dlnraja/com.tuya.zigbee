'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Fingerprint Smart Lock Device
 *
 * DP mappings:
 * DP1: Lock state (true=locked)
 * DP3: Battery percentage
 * DP7: Unlock mode (fingerprint/password/card/app)
 * DP8: Unlock records
 * DP12: Child lock
 * DP13: Tamper alarm
 */
class FingerprintLockDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Fingerprint Smart Lock initializing...');

    // Register lock capability
    if (this.hasCapability('locked')) {
      this.registerCapabilityListener('locked', async (value) => {
        await this._setLock(value);
      });
    }

    // Try door lock cluster
    const ep1 = zclNode.endpoints[1];
    if (ep1?.clusters?.doorLock) {
      this.registerCapability('locked', CLUSTER.DOOR_LOCK);
    }

    await this._setupTuyaDP(zclNode);
    await this._setupBattery(zclNode);

    this.log('Fingerprint Smart Lock initialized');
  }

  async _setLock(lock) {
    const ep1 = this.zclNode.endpoints[1];

    const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
    if (tuyaCluster) {
      await tuyaCluster.datapoint({ dp: 1, datatype: 1, value: lock });
      return;
    }

    const doorLock = ep1?.clusters?.doorLock;
    if (doorLock) {
      if (lock) {
        await doorLock.lock();
      } else {
        await doorLock.unlock();
      }
    }
  }

  async _setupBattery(zclNode) {
    const ep1 = zclNode.endpoints[1];
    const powerCfg = ep1?.clusters?.powerConfiguration || ep1?.clusters?.[1];

    if (powerCfg && this.hasCapability('measure_battery')) {
      powerCfg.on('attr.batteryPercentageRemaining', (value) => {
        this.setCapabilityValue('measure_battery', value / 2).catch(this.error);
      });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] DP cluster found');

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  _handleDP(dp, value) {
    if (dp === undefined) return;
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 1: // Lock state
        this.setCapabilityValue('locked', !!value).catch(this.error);
        break;

      case 3: // Battery
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', value).catch(this.error);
        }
        break;

      case 7: // Unlock mode
        this.log(`Unlock mode: ${value}`);
        break;

      case 13: // Tamper
        if (this.hasCapability('alarm_tamper')) {
          this.setCapabilityValue('alarm_tamper', !!value).catch(this.error);
        }
        break;
    }
  }
}

module.exports = FingerprintLockDevice;
