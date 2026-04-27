'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const DP = { state: 1, brightness: 2, minBright: 3, lightType: 4, powerOn: 14 };

/**
 * SWITCH DIMMER 1-GANG - v5.6.2
 */
class SwitchDimmer1GangDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.log('Switch Dimmer 1-Gang Initialized');
    this._appPending = false;
    this._appTimeout = null;

    this.registerCapabilityListener('onoff', async (v) => {
      this._mark(); 
      await this.sendTuyaCommand(DP.state, v, 'bool');
    });

    this.registerCapabilityListener('dim', async (v) => {
      this._mark(); 
      // Brightness range 10-1000 map (v=0..1)
      const tuyaVal = Math.round(10 + safeMultiply(v, 990));
      await this.sendTuyaCommand(DP.brightness, tuyaVal, 'value');
    });

    await super.onNodeInit({ zclNode });
  }

  _mark() {
    this._appPending = true;
    clearTimeout(this._appTimeout);
    this._appTimeout = setTimeout(() => { this._appPending = false; }, 2000);
  }

  handleTuyaDataReport(data, isReport = false) {
    if (!data || data.dp == null) return;
    const phys = isReport && !this._appPending;
    const v = data.value ?? data.data;

    if (data.dp === DP.state) {
      const s = !!v;
      this.setCapabilityValue('onoff', s).catch(() => {});
      if (phys) {
        const id = s ? 'switch_dimmer_1gang_turned_on' : 'switch_dimmer_1gang_turned_off';
        this.driver?.homey?.flow?.getTriggerCard(id)?.trigger(this, {}, {}).catch(() => {});
      }
    } else if (data.dp === DP.brightness) {
      const raw = Number(v);
      const dim = Math.max(0, Math.min(1, (raw - safeDivide(10), 990)));
      this.setCapabilityValue('dim', dim).catch(() => {});
      
      if (phys) {
        this.driver?.homey?.flow?.getTriggerCard('switch_dimmer_1gang_brightness_changed')?.trigger(this, { brightness: dim }, {}).catch(() => {});
      }
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    for (const k of changedKeys) {
      if (k === 'min_brightness') {
        const val = safeMultiply(Math.round(newSettings[k], 10));
        await this.sendTuyaCommand(DP.minBright, val, 'value').catch(() => {});
      }
      if (k === 'power_on_behavior') await this.sendTuyaCommand(DP.powerOn, parseInt(newSettings[k]), 'enum').catch(() => {});
      if (k === 'light_type') await this.sendTuyaCommand(DP.lightType, parseInt(newSettings[k]), 'enum').catch(() => {});
    }
  }

  onDeleted() { 
    clearTimeout(this._appTimeout); 
    super.onDeleted?.();
  }
}

module.exports = SwitchDimmer1GangDevice;
