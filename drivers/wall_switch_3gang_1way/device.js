'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

class WallSwitch3Gang1WayDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {
  get gangCount() { return 1; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log(`[SCENE] Setting scene mode to: ${mode}`);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  get dpMappings() {
    const { subDeviceId } = this.getData();
    const p = Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(this))).dpMappings || {};
    if (subDeviceId === 'secondSwitch') return { ...p, 2: { capability: 'onoff', transform: (v) => v === 1 || v === true } };
    if (subDeviceId === 'thirdSwitch') return { ...p, 3: { capability: 'onoff', transform: (v) => v === 1 || v === true } };
    return { ...p, 1: { capability: 'onoff', transform: (v) => v === 1 || v === true } };
  }

  async onNodeInit({ zclNode }) {
    const { subDeviceId } = this.getData();
    if (subDeviceId !== undefined) await this._initSubDevice(zclNode, subDeviceId);
    else await this._initPrimaryDevice(zclNode);
  }

  async _initSubDevice(zclNode, subDeviceId) {
    const gn = subDeviceId === 'secondSwitch' ? 2 : 3;
    this.log('[SUB-DEVICE] Gang ' + gn + ' initializing...');
    this._gangNumber = gn;
    this.zclNode = zclNode;
    this._zclState = { lastState: null, pending: false, timeout: null };
    const ep = zclNode?.endpoints?.[gn];
    const onOff = ep?.clusters?.onOff;
    if (!onOff) { this.error('[SUB-DEVICE] No onOff on EP' + gn); return; }

    onOff.on('attr.onOff', (value) => {
      const isPhys = !this._zclState.pending;
      this.log('[SUB-DEVICE] EP' + gn + ' attr=' + value + ' (' + (isPhys ? 'PHYSICAL' : 'APP') + ')');
      if (this._zclState.lastState !== value) {
        this._zclState.lastState = value;
        const mode = this.sceneMode;
        if (mode !== 'magic') this.setCapabilityValue('onoff', value).catch(() => {});
        if (isPhys && (mode === 'auto' || mode === 'both')) {
          const fid = 'wall_switch_3gang_1way_turned_' + (value ? 'on' : 'off');
          this.homey.flow.getDeviceTriggerCard(fid).trigger(this, {}, {}).catch(() => {});
        }
        if (isPhys && (mode === 'magic' || mode === 'both')) {
          this.homey.flow.getDeviceTriggerCard(`wall_switch_3gang_1way_gang${gn}_scene`)
            .trigger(this, { action: value ? 'on' : 'off' }, {}).catch(() => {});
        }
      }
    });

    this.registerCapabilityListener('onoff', async (value) => {
      this.log('[SUB-DEVICE] Gang ' + gn + ' app cmd: ' + value);
      this._zclState.pending = true;
      clearTimeout(this._zclState.timeout);
      this._zclState.timeout = setTimeout(() => { this._zclState.pending = false; }, 2000);
      await onOff[value ? 'setOn' : 'setOff']();
      return true;
    });

    try {
      await onOff.configureReporting({ onOff: { minInterval: 0, maxInterval: 300, minChange: 1 } });
      this.log('[SUB-DEVICE] EP' + gn + ' reporting configured');
    } catch (e) { this.log('[SUB-DEVICE] reporting failed: ' + e.message); }

    try {
      const st = await onOff.readAttributes(['onOff']);
      if (st.onOff !== undefined) {
        this._zclState.lastState = st.onOff;
        await this.setCapabilityValue('onoff', st.onOff).catch(() => {});
        this.log('[SUB-DEVICE] Initial: ' + (st.onOff ? 'ON' : 'OFF'));
      }
    } catch (e) { this.log('[SUB-DEVICE] initial read failed: ' + e.message); }
    this.log('[SUB-DEVICE] Gang ' + gn + ' ready');
  }

  async _initPrimaryDevice(zclNode) {
    this.log('[PRIMARY] Gang 1 initializing...');
    if (this.hasCapability('onoff.gang2')) await this.removeCapability('onoff.gang2').catch(() => {});
    if (this.hasCapability('onoff.gang3')) await this.removeCapability('onoff.gang3').catch(() => {});
    this._lastOnoffState = { gang1: null };
    this._appCommandPending = { gang1: false };
    this._appCommandTimeout = { gang1: null };
    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection(zclNode);
    this._setupGang1SceneDetection(zclNode);
    this.log('[PRIMARY] Gang 1 ready');
  }

  _setupGang1SceneDetection(zclNode) {
    const onOff = zclNode?.endpoints?.[1]?.clusters?.onOff;
    if (!onOff) return;
    onOff.on('attr.onOff', (value) => {
      const mode = this.sceneMode;
      const isPhys = !this._appCommandPending?.gang1;
      if (isPhys && (mode === 'magic' || mode === 'both')) {
        this.homey.flow.getDeviceTriggerCard('wall_switch_3gang_1way_gang1_scene')
          .trigger(this, { action: value ? 'on' : 'off' }, {}).catch(() => {});
        this.log(`[SCENE] Gang 1 scene: ${value ? 'on' : 'off'}`);
      }
    });
    this.log(`[SCENE] Gang 1 scene detection setup, mode=${this.sceneMode}`);
  }

  onDeleted() {
    if (this._zclState?.timeout) clearTimeout(this._zclState.timeout);
    super.onDeleted?.();
  }
}

module.exports = WallSwitch3Gang1WayDevice;
