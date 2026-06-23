'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const DP = { state: 1, pm25: 2, mode: 3, speed: 4, filter: 5, childLock: 7, brightness: 8 };

class AirPurifierDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.log('Air Purifier init...');
    this._lastOnoff = null;
    this._lastPm25 = null;
    this.registerCapabilityListener('onoff', async (v) => {
      await this.sendTuyaCommand(DP.state, v, 'bool');
      });
    this.registerCapabilityListener('dim', async (v) => {
      await this.sendTuyaCommand(DP.speed, Math.round(safeMultiply(v, 10, 10)), "value");
      });
    this.log('Air Purifier ready');
  }

  async handleTuyaDataReport(data) {
    if (!data || data.dp === null || data.dp === undefined) return;
    const v = data.data ?? data.value;
    if (data.dp === DP.state) {
      const s = Boolean(v);
      if (this._lastOnoff !== s ) {
        this._lastOnoff = s;
        this.triggerCapabilityListener('onoff', s).catch(() => {});
        const id = s ? 'device_air_purifier_climate_air_purifier_climate_air_purifier_turned_on' : 'device_air_purifier_climate_air_purifier_climate_air_purifier_turned_off';
        try {
          const card =
      this.homey.flow.getDeviceTriggerCard(id)?.trigger(this, {}, {}).catch((err) => this.error(err))
          if (card) await card
        } catch (e) { this.error('[FLOW] Trigger onoff failed:', e.message); }
      }
    } else if (data.dp === DP.pm25) {
      const pm = typeof v === 'number' ? v : parseInt(v);
      if (this._lastPm25 !== pm) {
        this._lastPm25 = pm;
        this.safeSetCapabilityValue('measure_pm25', pm).catch(() => {});
        try {
          const card = this.homey.flow.getDeviceTriggerCard('device_air_purifier_climate_air_purifier_climate_air_purifier_pm25_changed', 'action')
          if (card ) await card.trigger(this, { pm25: pm }, {}).catch(() => {});
        } catch (e) { this.error('[FLOW] Trigger pm25 failed:', e.message); }
      }
    } else if (data.dp === DP.speed) {
      const spd = typeof v === 'number' ? v : parseInt(v);
      this.triggerCapabilityListener('dim', spd * 100).catch(() => {});
    }
  }

  onDeleted() { super.onDeleted?.(); }
}

module.exports = AirPurifierDevice;




