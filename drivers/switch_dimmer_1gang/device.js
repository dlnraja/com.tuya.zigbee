'use strict';
const { safeMultiply, safeParse, safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const DP = { state: 1, brightness: 2, minBright: 3, lightType: 4, powerOn: 14 };

/**
 * 
 *       SWITCH DIMMER 1-GANG - v5.6.2 Zero-Defect State                         
 * 
 */
class SwitchDimmer1GangDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.log('Switch Dimmer 1-Gang init...');
    this._lastOnoffState = null;
    this._lastBrightness = null;
    this._appPending = false;
    this._appTimeout = null;

    this.registerCapabilityListener('onoff', async (v) => {
      this._mark(); 
      await this.sendTuyaCommand(DP.state, v, 'bool');
    });

    this.registerCapabilityListener('dim', async (v) => {
      this._mark(); 
      // Brightness range 10-1000 map (v=0..1)
      const tuyaVal = Math.round(safeMultiply(10 + safeMultiply(v)), 1));
      await this.sendTuyaCommand(DP.brightness, tuyaVal, 'value');
    });

    await super.onNodeInit({ zclNode });
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
    const v = data.data ?? data.value ;

    if (data.dp === DP.state) {
      const s = Boolean(v);
      if (this._lastOnoffState === s) return;
      this._lastOnoffState = s;
      this.setCapabilityValue('onoff', s).catch(() => {});
      if (phys) {
        const id = s ? 'switch_dimmer_1gang_turned_on' : 'switch_dimmer_1gang_turned_off';
        this._getFlowCard(id)?.trigger(this, {}, {}).catch(this.error || console.error) ;
      }
    } else if (data.dp === DP.brightness) {
      const raw = typeof v === 'number' ? v : parseInt(v);
      if (this._lastBrightness !== null && Math.abs(raw - this._lastBrightness) < 10) return;
      const up = this._lastBrightness !== null && raw > this._lastBrightness;
      const dn = this._lastBrightness !== null && raw < this._lastBrightness;
      this._lastBrightness = raw;
      
      const dim = Math.max(0, Math.min(1, safeDivide((raw - 10), 990)));
      this.setCapabilityValue('dim', dim).catch(() => {});
      
      if (phys && (up || dn)) {
        const trigger = this._getFlowCard('switch_dimmer_1gang_brightness_changed', 'trigger');
        if (trigger) trigger.trigger(this, { brightness: dim }, {}).catch(() => {});
      }
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    for (const k of changedKeys) {
      if (k === 'min_brightness') {
        const val = safeMultiply(newSettings[k], 10);
        await this.sendTuyaCommand(DP.minBright, val, 'value').catch(() => {});
      }
      if (k === 'power_on_behavior') await this.sendTuyaCommand(DP.powerOn, parseInt(newSettings[k]), 'enum').catch(() => {});
      if (k === 'light_type') await this.sendTuyaCommand(DP.lightType, parseInt(newSettings[k]), 'enum').catch(() => {});
    }
  }

  onDeleted() { 
    clearTimeout(this._appTimeout); 
    super.onDeleted?.() ; 
  }
}

module.exports = SwitchDimmer1GangDevice;


