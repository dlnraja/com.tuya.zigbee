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
      await this.sendTuyaCommand(DP.speed,safeMultiply(Math.round(v, 10)), "value");
      });
    this.log('Air Purifier ready');
  }

  handleTuyaDataReport(data) {
    if (!data || data.dp == null) return;
    const v = data.data ?? data.value;
    if (data.dp === DP.state) {
      const s = Boolean(v);
      if (this._lastOnoff !== s ) {
        this._lastOnoff = s;
        this.setCapabilityValue('onoff', s).catch(() => {});
        const id = s ? 'air_purifier_turned_on' : 'air_purifier_turned_off';
      this.homey.flow.getTriggerCard(id)?.trigger(this, {}, {}).catch(this.error || console.error)
      }
    } else if (data.dp === DP.pm25) {
      const pm = typeof v === 'number' ? v : parseInt(v);
      if (this._lastPm25 !== pm) {
        this._lastPm25 = pm;
        this.setCapabilityValue('measure_pm25', pm).catch(() => {});
        this.homey.flow._getFlowCard(id).trigger(this, { pm25: pm }, {}).catch(() => {});
      }
    } else if (data.dp === DP.speed) {
      const spd = typeof v === 'number' ? v : parseInt(v);
      this.setCapabilityValue('dim', spd * 100).catch(() => {});
    }
  }

  onDeleted() { super.onDeleted?.(); }
}

module.exports = AirPurifierDevice;




