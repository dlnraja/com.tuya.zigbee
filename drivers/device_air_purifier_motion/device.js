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
      await this.sendTuyaCommand(DP.speed,safeMultiply(Math.round(v), 10), "value");
      });
    this.log('Air Purifier ready');
  }

  handleTuyaDataReport(data) {
    if (!data || data.dp === null || data.dp === undefined) {return;}
    const v = data.data ?? data.value;
    // v9.0.404: real flow card IDs (the previous ones did not exist; the pm25
    // branch even referenced an out-of-scope `id` via the private _getFlowCard)
    const CARD_ON = 'device_air_purifier_motion_air_purifier_moti_84e10';
    const CARD_OFF = 'device_air_purifier_motion_air_purifier_moti_47f14';
    const CARD_PM25 = 'device_air_purifier_motion_air_purifier_moti_19b0d';
    const fire = (cardId, tokens = {}) => {
      try {
        this.homey.flow.getDeviceTriggerCard(cardId)?.trigger(this, tokens, {}).catch((err) => this.error(err));
      } catch (e) { this.log('[FLOW]', cardId, e.message); }
    };
    if (data.dp === DP.state) {
      const s = Boolean(v);
      if (this._lastOnoff !== s ) {
        this._lastOnoff = s;
        this['safeSetCapabilityValue']('onoff', s).catch(() => {});
        fire(s ? CARD_ON : CARD_OFF);
      }
    } else if (data.dp === DP.pm25) {
      const pm = typeof v === 'number' ? v : parseInt(v);
      if (this._lastPm25 !== pm) {
        this._lastPm25 = pm;
        this.safeSetCapabilityValue('measure_pm25', pm).catch(() => {});
        fire(CARD_PM25, { pm25: pm });
      }
    } else if (data.dp === DP.speed) {
      const spd = typeof v === 'number' ? v : parseInt(v);
      this['safeSetCapabilityValue']('dim', spd * 100).catch(() => {});
    }
  }

  onDeleted() { super.onDeleted?.(); }
}

module.exports = AirPurifierDevice;




