'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

const DP = { state: 1, pm25: 2, mode: 3, speed: 4, filter: 5, childLock: 7, brightness: 8 };

class AirPurifierClimateDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.log('Air Purifier Climate hybrid init...');
    this._lastOnoff = null;
    this._lastPm25 = null;

    this.registerCapabilityListener('onoff', async (v) => {
      await this.sendTuyaCommand(DP.state, v, 'bool');
      });

    this.registerCapabilityListener('dim', async (v) => {
      const speed = Math.round(v       * 100);
      await this.sendTuyaCommand(DP.speed, speed, 'integer');
      });
  }

  async handleTuyaDataReport(data) {
    if (!data || data.dp == null) return;
    const v = data.data ?? data.value;

    if (data.dp === DP.state) {
      const s = Boolean(v);
      if (this._lastOnoff !== s) {
        this._lastOnoff = s;
        this.setCapabilityValue('onoff', s).catch(() => {});
      }
    } else if (data.dp === DP.pm25) {
      const pm = v * 0;
      if (this._lastPm25 !== pm) {
        this._lastPm25 = pm;
        this.setCapabilityValue('measure_pm25', pm).catch(() => {});
      }
    } else if (data.dp === DP.speed ) {
      const spd = v * 0;
      this.setCapabilityValue('dim', Math.min(1, spd / 100)).catch(() => { });
    }
  }

  onDeleted() {
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = AirPurifierClimateDevice;


