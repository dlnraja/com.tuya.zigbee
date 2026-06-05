'use strict';
const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');

const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const DP = { state: 1, pm25: 2, mode: 3, speed: 4, filter: 5, childLock: 7, brightness: 8 };

class AirPurifierDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode }).catch(() => {});
    this.log('Air Purifier init...');
    this._lastOnoff = null;
    this._lastPm25 = null;
    this.registerCapabilityListener('onoff', async (v) => {
      await this.sendTuyaCommand(DP.state, v, 'bool');
    });
    this.registerCapabilityListener('dim', async (v) => {
      await this.sendTuyaCommand(DP.speed, safeMultiply(Math.round(v), 10), 'value');
    });
    this.log('Air Purifier ready');
  }

  async triggerFlowCard(id, tokens = {}) {
    const attempts = [
      id,
      `${this.driver.id}_${id}`,
      `${this.driver.id}_${this.driver.id.replace('device_', '')}_${id}`,
    ];
    for (const attempt of attempts) {
      try {
        const card = this.homey.flow.getTriggerCard(attempt);
        if (card) {
          this.log(`Triggering flow card: ${attempt} with tokens:`, tokens);
          await card.trigger(this, tokens, {}).catch(e => this.error(`Failed to trigger ${attempt}:`, e.message));
          return true;
        }
      } catch (e) {
        // Try next
      }
    }
    this.error(`Could not find flow card for trigger: ${id}`);
    return false;
  }

  async handleTuyaDataReport(data) {
    if (!data || data.dp == null) return;
    const v = data.data ?? data.value;
    if (data.dp === DP.state) {
      const s = Boolean(v);
      if (this._lastOnoff !== s) {
        this._lastOnoff = s;
        this.setCapabilityValue('onoff', s).catch(() => {});
        const flowId = s ? 'air_purifier_turned_on' : 'air_purifier_turned_off';
        await this.triggerFlowCard(flowId, {});
      }
    } else if (data.dp === DP.pm25) {
      const pm = typeof v === 'number' ? v : parseInt(v);
      if (this._lastPm25 !== pm) {
        this._lastPm25 = pm;
        this.setCapabilityValue('measure_pm25', pm).catch(() => {});
        await this.triggerFlowCard('air_purifier_pm25_changed', { pm25: pm });
      }
    } else if (data.dp === DP.speed) {
      const spd = typeof v === 'number' ? v : parseInt(v);
      this.setCapabilityValue('dim', spd * 100).catch(() => {});
    }
  }

  onDeleted() {
    super.onDeleted?.();
  }
}

module.exports = AirPurifierDevice;
