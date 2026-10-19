'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { makeBound, makeDeduper, speedOf } = require('./knob-commands');

const D = 'smart_knob_zg101zd';
const TRIGGERS = {
  press: `${D}_press`,
  double_press: `${D}_double_press`,
  hold: `${D}_hold`,
  rotate_left: `${D}_rotate_left`,
  rotate_right: `${D}_rotate_right`,
  press_rotate_left: `${D}_press_rotate_left`,
  press_rotate_right: `${D}_press_rotate_right`,
};
const MODE_VALUE = { command: 0, event: 1 };

/**
 * HOBEIAN ZG-101ZD / Tuya ERS-10TZBVK-AA rotary knob, exact couple _TZ3000_abrsvsou + TS004F.
 * Mandatory path is native ZCL only: battery from powerConfiguration, gestures from bound onOff / levelControl /
 * colorControl. The Tuya event mode (genOnOff 0x8004) is an optional overlay chosen in the settings; it is
 * never written unless the user asks for it.
 */
class SmartKnobZg101zdDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this._zclNode = zclNode;
    this._dupe = makeDeduper();
    try {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
    } catch (e) { this.log('[ZG-101ZD] battery capability skipped:', e.message); }

    const { OnOff, Level, Color } = makeBound((decoded, ctx) => this._onCommand(decoded, ctx));
    const ep = zclNode.endpoints[1];
    for (const [name, Cls] of [[CLUSTER.ON_OFF.NAME, OnOff], [CLUSTER.LEVEL_CONTROL.NAME, Level], [CLUSTER.COLOR_CONTROL.NAME, Color]]) {
      try { ep.bind(name, new Cls()); } catch (e) { this.log(`[ZG-101ZD] bind ${name} skipped:`, e.message); }
    }

    const wanted = this.getSetting('operating_mode');
    if (wanted === 'command' || wanted === 'event') {
      this._writeMode(wanted).catch(() => {});
    }
    this.log('[ZG-101ZD] ready, operating_mode setting =', wanted || 'keep');
  }

  _onCommand(decoded, ctx) {
    if (!decoded) {
      this.log(`[ZG-101ZD] ignored cluster ${ctx.clusterId} cmd 0x${Number(ctx.cmdId).toString(16)}`);
      return;
    }
    if (this._dupe(ctx.clusterId, ctx.seq)) {return;}
    if (decoded.mode && this._lastMode !== decoded.mode) {
      this._lastMode = decoded.mode;
      this.setStoreValue('last_seen_mode', decoded.mode).catch(() => {});
    }
    const cardId = TRIGGERS[decoded.action];
    if (!cardId) {return;} // release: logged only
    const rotate = /rotate/.test(decoded.action);
    const tokens = rotate ? { step_size: Number(decoded.stepSize) || 0, speed: speedOf(decoded.stepSize) } : {};
    this.log(`[ZG-101ZD] ${decoded.action} (${decoded.mode})`, rotate ? JSON.stringify(tokens) : '');
    try {
      this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, tokens, {})
        .catch((e) => this.error(`[ZG-101ZD] trigger ${cardId}: ${e.message}`));
    } catch (e) { this.error(`[ZG-101ZD] card ${cardId}: ${e.message}`); }
  }

  async _writeMode(mode) {
    const value = MODE_VALUE[mode];
    if (value === undefined) {return false;}
    const cluster = this._zclNode && this._zclNode.endpoints[1] && this._zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME];
    if (!cluster) {return false;}
    try {
      const DeviceOperatingMode = require('../../lib/zigbee/DeviceOperatingMode');
      const r = await DeviceOperatingMode.writeOperationMode(this, this._zclNode, mode);
      this.log('[ZG-101ZD] operating mode write', mode, JSON.stringify(r));
      return !!(r && r.ok);
    } catch (e) {
      this.log('[ZG-101ZD] operating mode write failed (device asleep? press the knob once and save again):', e.message);
      return false;
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('operating_mode')) {
      const mode = newSettings.operating_mode;
      if (mode === 'command' || mode === 'event') {
        // Sleepy device: fire and forget, never block saving the settings.
        this._writeMode(mode).catch(() => {});
      }
    }
  }
}

module.exports = SmartKnobZg101zdDevice;
