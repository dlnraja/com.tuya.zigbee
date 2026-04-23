'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

class WallSwitch3Gang1WayDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {
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
    this._zclState = { lastState, pending: false, timeout };
    const ep = zclNode?.endpoints?.[gn];
    const onOff = ep?.clusters?.onOff;
    if (!onOff) { this.error('[SUB-DEVICE] No onOff on EP' + gn ); return; }

    onOff.on('attr.onOff', (value) => {
      const isPhys = !this._zclState.pending;
      this.log('[SUB-DEVICE] EP' + gn + ' attr=' + value + ' (' + (isPhys ? 'PHYSICAL' : 'APP') + ')');
      if (this._zclState.lastState !== value) {
        this._zclState.lastState = value;
        const mode = this.sceneMode;
        if (mode !== 'magic') this.setCapabilityValue('onoff', value).catch(() => {});
        if (isPhys && (mode === 'auto' || mode === 'both')) {
          const fid = `wall_switch_3gang_1way_turned_${value ? 'on' : 'off'}`;
          const trigger =
      this._getFlowCard(fid)?.trigger(this, {}, {}).catch(this.error || console.error)
          if (trigger) trigger

          const pgid = `wall_switch_3gang_1way_physical_gang${gn}_${value ? 'on' : 'off'}`;
          const pTrigger = this._getFlowCard(pgid)?.trigger(this, {}, {}).catch(this.error || console.error)
          if (pTrigger) pTrigger
        }
        if (isPhys && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
          const sid = `wall_switch_3gang_1way_gang${gn}_scene`;const sTrigger =
      this._getFlowCard(sid)?.trigger(this, {}, {}).catch(this.error || console.error)
          if (sTrigger ) sTrigger.trigger(this , { action: value ? 'on' : 'off' }, {}).catch(() => {});
        }
      }
    });

    // Fix Issue #170: Handle ZCL Commands (Physical buttons that don't send attr.onOff)
    if (typeof onOff.on === 'function') {
      const fakeAttr = (val) => {
        if (val === 'toggle') val = !this.getCapabilityValue('onoff');
        onOff.emit('attr.onOff', val);
      };
      onOff.on('commandOn', () => fakeAttr(true));
      onOff.on('commandOff', () => fakeAttr(false));
      onOff.on('commandToggle', () => fakeAttr('toggle'));
      onOff.on('setOn', () => fakeAttr(true));
      onOff.on('setOff', () => fakeAttr(false));
      onOff.on('toggle', () => fakeAttr('toggle'));
    }

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
    this._lastOnoffState = { gang1 };
    this._appCommandPending = { gang1: false };
    this._appCommandTimeout = { gang1 };
    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected
    this._registerCapabilityListeners(); // rule-12a injected
    await this.initPhysicalButtonDetection(zclNode);
    this._setupGang1SceneDetection(zclNode);
    this.log('[PRIMARY] Gang 1 ready');
  }

  _setupGang1SceneDetection(zclNode) {
    const onOff = zclNode?.endpoints?.[1]?.clusters?.onOff;
    if (!onOff) return;
    
    const triggerFlows = (value ) => {
      const mode = this.sceneMode;
      const isPhys = !this._appCommandPending?.gang1;if (isPhys && (mode === 'auto' || mode === 'both')) {
        const pgid = `wall_switch_3gang_1way_physical_gang1_${value ? 'on' : 'off'}`;
        const pTrigger = this._getFlowCard(pgid)?.trigger(this, {}, {}).catch(this.error || console.error)
        if (pTrigger) pTrigger
      }
      if (isPhys && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
        const sid = 'wall_switch_3gang_1way_gang1_scene';const sTrigger =
      this._getFlowCard(sid)?.trigger(this, {}, {}).catch(this.error || console.error)
        if (sTrigger ) {
          sTrigger.trigger(this , { action: value ? 'on' : 'off' }, {}).catch(() => {});
          this.log(`[SCENE] Gang 1 scene: ${value ? 'on' : 'off'}`);
        }
      }
    };

    onOff.on('attr.onOff', triggerFlows);

    if (typeof onOff.on === 'function') {
      const fakeAttr = (val) => {
        if (val === 'toggle') val = !this.getCapabilityValue('onoff');
        triggerFlows(val);
      };
      onOff.on('commandOn', () => fakeAttr(true));
      onOff.on('commandOff', () => fakeAttr(false));
      onOff.on('commandToggle', () => fakeAttr('toggle'));
      onOff.on('setOn', () => fakeAttr(true));
      onOff.on('setOff', () => fakeAttr(false));
      onOff.on('toggle', () => fakeAttr('toggle'));
    }

    this.log(`[SCENE] Gang 1 scene detection setup, mode=${this.sceneMode}`);
  }

  onDeleted() {
    if (this._zclState?.timeout) clearTimeout(this._zclState.timeout );
    super.onDeleted?.();
  }
}

module.exports = WallSwitch3Gang1WayDevice;


