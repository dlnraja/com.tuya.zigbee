'use strict';
const { safeMultiply, safeParse, safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

const DP = { state: 1, pm25: 2, mode: 3, speed: 4, filter: 5, childLock: 7, brightness: 8 };

class AirPurifierDevice extends TuyaSpecificClusterDevice {
  async onNodeInit() {
    this.log('Air Purifier init...');
    this._lastOnoff = null;
    this._lastPm25 = null;

    this.registerCapabilityListener('onoff', async (v) => {
      await this.sendTuyaCommand(DP.state, v, 'bool');
    });

    this.registerCapabilityListener('dim', async (v) => {
      const speed = Math.round(safeMultiply(v, 3)); // Example: 0-3 speed levels
      await this.sendTuyaCommand(DP.speed, speed, 'integer');
    });

    this.log('Air Purifier ready');
  }

  handleTuyaDataReport(data) {
    if (!data || data.dp == null) {
      return;
    }
    const v = data.data ?? data.value;

    if (data.dp === DP.state) {
      const s = Boolean(v);
      if (this._lastOnoff !== s) {
        this._lastOnoff = s;
        this.setCapabilityValue('onoff', s).catch(() => {});
        const id = s ? 'air_purifier_turned_on' : 'air_purifier_turned_off';
        const card = this.homey.app?._safeGetTriggerCard?.(id);
        if (card) {
          card.trigger(this, {}, {}).catch(() => {});
        }
      }
    } else if (data.dp === DP.pm25) {
      const pm = safeParse(v);
      if (this._lastPm25 !== pm) {
        this._lastPm25 = pm;
        this.setCapabilityValue('measure_pm25', pm).catch(() => {});
        const card = this.homey.app?._safeGetTriggerCard?.('air_purifier_pm25_changed');
        if (card) {
          card.trigger(this, { pm25: pm }, {}).catch(() => {});
        }
      }
    } else if (data.dp === DP.speed) {
      const spd = safeParse(v);
      this.setCapabilityValue('dim', Math.min(1, safeDivide(spd, 3))).catch(() => { });
    }
  }

  onDeleted() {
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = AirPurifierDevice;
