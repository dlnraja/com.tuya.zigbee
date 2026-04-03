'use strict';
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const DP = { state: 1, brightness: 2, minBright: 3, lightType: 4, powerOn: 14 };

class SwitchDimmer1GangDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.log('Switch Dimmer 1-Gang init...');
    this._lastOnoffState = null;
    this._lastBrightness = null;
    this._appPending = false;
    this._appTimeout = null;
    await super.onNodeInit({ zclNode });
    this.registerCapabilityListener('onoff', async (v) => {
      this._mark(); await this.sendTuyaCommand(DP.state, v, 'bool');
    });
    this.registerCapabilityListener('dim', async (v) => {
      this._mark(); await this.sendTuyaCommand(DP.brightness, Math.round(10 + v * 990), 'value');
    });
    this.log('Switch Dimmer 1-Gang ready');
  }

  _mark() {
    this._appPending = true;
    clearTimeout(this._appTimeout);
    this._appTimeout = setTimeout(() => { this._appPending = false; }, 2000);
  }

  handleTuyaDataReport(data, isReport = false) {
    if (!data || data.dp == null) return;
    const phys = isReport && !this._appPending;
    const v = data.data ?? data.value;
    if (data.dp === DP.state) {
      const s = Boolean(v);
      if (this._lastOnoffState === s) return;
      this._lastOnoffState = s;
      this.setCapabilityValue('onoff', s).catch(() => {});
      if (phys) {
        const id = s ? 'switch_dimmer_1gang_turned_on' : 'switch_dimmer_1gang_turned_off';
        this.homey.flow.getDeviceTriggerCard(id).trigger(this, {}, {}).catch(() => {});
      }
    } else if (data.dp === DP.brightness) {
      const raw = typeof v === 'number' ? v : parseInt(v);
      if (this._lastBrightness !== null && Math.abs(raw - this._lastBrightness) < 10) return;
      const up = this._lastBrightness !== null && raw > this._lastBrightness;
      const dn = this._lastBrightness !== null && raw < this._lastBrightness;
      this._lastBrightness = raw;
      const dim = Math.max(0, Math.min(1, (raw - 10) / 990));
      this.setCapabilityValue('dim', dim).catch(() => {});
      if (phys && up) {
        this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_increased')
          .trigger(this, { brightness: dim }, {}).catch(() => {});
      } else if (phys && dn) {
        this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_decreased')
          .trigger(this, { brightness: dim }, {}).catch(() => {});
      }
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    for (const k of changedKeys) {
      if (k === 'min_brightness') await this.sendTuyaCommand(DP.minBright, newSettings[k] * 10, 'value').catch(() => {});
      if (k === 'power_on_behavior') await this.sendTuyaCommand(DP.powerOn, parseInt(newSettings[k]), 'enum').catch(() => {});
      if (k === 'light_type') await this.sendTuyaCommand(DP.lightType, parseInt(newSettings[k]), 'enum').catch(() => {});
    }
  }

  onDeleted() { clearTimeout(this._appTimeout); super.onDeleted?.(); }
}

module.exports = SwitchDimmer1GangDevice;
