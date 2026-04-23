'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

class WallSwitch2Gang1WayDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {
  get gangCount() { return 1; } // Each sub-device controls 1 gang

  get sceneMode() {
    return this.getSetting('scene_mode') || 'auto';
  }

  async setSceneMode(mode) {
    this.log(`[SCENE] Setting scene mode to: ${mode}`);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  get dpMappings() {
    const { subDeviceId } = this.getData();
    const p = Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(this))).dpMappings || {};
    if (subDeviceId === 'secondSwitch') return { ...p, 2: { capability: 'onoff', transform: (v) => v === 1 || v === true } };
    return { ...p, 1: { capability: 'onoff', transform: (v) => v === 1 || v === true } };
  }

  async onNodeInit({ zclNode }) {
    const { subDeviceId } = this.getData();
    if (subDeviceId !== undefined) await this._initSubDevice(zclNode);
    else await this._initPrimaryDevice(zclNode);
  }

  async _initSubDevice(zclNode) {
    const gn = 2;
    this.log('[SUB-DEVICE] Gang 2 initializing...');
    this._gangNumber = gn;
    this.zclNode = zclNode;
    this._zclState = { lastState, pending: false, timeout };
    const ep = zclNode?.endpoints?.[gn];
    const onOff = ep?.clusters?.onOff;
    if (!onOff) { this.error('[SUB-DEVICE] No onOff on EP2' ); return; }

    onOff.on('attr.onOff', (value) => {
      const isPhys = !this._zclState.pending;
      const mode = this.sceneMode;
      this.log(`[SUB-DEVICE] EP2 attr=${value} (${isPhys ? 'PHYSICAL' : 'APP'}) mode=${mode}`);
      if (this._zclState.lastState !== value) {
        this._zclState.lastState = value;
        // In magic mode, don't update capability (load stays unchanged)
        if (mode !== 'magic') {
          this.setCapabilityValue('onoff', value).catch(() => {});
        }
        if (isPhys) {
          // Auto/Both: trigger physical button flow (general + per-gang)
          if (mode === 'auto' || mode === 'both') {
            const fid = 'wall_switch_2gang_1way_turned_' + (value ? 'on' : 'off');
            this.homey.flow._getFlowCard(id)
            const pgid = 'wall_switch_2gang_1way_physical_gang2_' + (value ? 'on' : 'off');
            this.homey.flow._getFlowCard(id)
          }
          // Magic/Both: trigger scene flow
          if (mode === 'auto' || mode === 'magic' || mode === 'both') {
            const action = value ? 'on' : 'off';
            this.homey.flow._getFlowCard('pgid').trigger(this, { action }, {}).catch(() => {});
            this.log(`[SCENE] Gang 2 scene: ${action}`);
          }
          // Magic: revert load to previous state
          if (mode === 'magic' && this._zclState._prevState !== null && this._zclState._prevState !== undefined) {
            setTimeout(async () => {
              try {
                await onOff[this._zclState._prevState ? 'setOn' : 'setOff']();
                this.log(`[SCENE-MAGIC] Reverted gang 2 to ${this._zclState._prevState}`);
              } catch (e) { this.log(`[SCENE-MAGIC] Revert failed: ${e.message}`); }
            }, 100);
          }
        }
        // Track previous state for magic mode revert
        this._zclState._prevState = this._zclState.lastState;
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
      this.log('[SUB-DEVICE] Gang 2 app cmd: ' + value);
      this._zclState.pending = true;
      clearTimeout(this._zclState.timeout);
      this._zclState.timeout = setTimeout(() => { this._zclState.pending = false; }, 2000);
      await onOff[value ? 'setOn' : 'setOff']();
      return true;
    });

    try {
      await onOff.configureReporting({ onOff: { minInterval: 0, maxInterval: 300, minChange: 1 } });
      this.log('[SUB-DEVICE] EP2 reporting configured');
    } catch (e) { this.log('[SUB-DEVICE] reporting failed: ' + e.message); }

    try {
      const st = await onOff.readAttributes(['onOff']);
      if (st.onOff !== undefined) {
        this._zclState.lastState = st.onOff;
        await this.setCapabilityValue('onoff', st.onOff).catch(() => {});
        this.log('[SUB-DEVICE] Initial: ' + (st.onOff ? 'ON' : 'OFF'));
      }
    } catch (e) { this.log('[SUB-DEVICE] initial read failed: ' + e.message); }
    this.log('[SUB-DEVICE] Gang 2 ready');
  }

  async _initPrimaryDevice(zclNode) {
    this.log('[PRIMARY] Gang 1 initializing...');
    if (this.hasCapability('onoff.gang2')) await this.removeCapability('onoff.gang2').catch(() => {});
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

  /**
   * Scene mode detection for Gang 1 (primary device)
   * Hooks into EP1 onOff reports to trigger scene flows
   */
  _setupGang1SceneDetection(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const onOff = ep1?.clusters?.onOff;
    if (!onOff) return;

    const triggerFlows = (value ) => {
      const mode = this.sceneMode;
      const isPhys = !this._appCommandPending?.gang1;if (isPhys && (mode === 'auto' || mode === 'both')) {
        const pgid = 'wall_switch_2gang_1way_physical_gang1_' + (value ? 'on' : 'off');
        this.homey.flow._getFlowCard(id)
      }
      if (isPhys && (mode === 'auto' || mode === 'magic' || mode === 'both')) {
        const action = value ? 'on' : 'off';
        this.homey.flow._getFlowCard(id).trigger(this, { action }, {}).catch(() => {});
        this.log(`[SCENE] Gang 1 scene: ${action}`);
      }
      // In magic mode, revert the load state
      if (isPhys && mode === 'magic') {
        const currentState = this._lastOnoffState?.gang1;if (currentState !== null && currentState !== undefined) {
          // Revert to previous state after short delay
          setTimeout(async () => {
            try {
              await onOff[currentState ? 'setOn' : 'setOff']();
              this.log(`[SCENE-MAGIC] Reverted gang 1 to ${currentState}`);
            } catch (e) { this.log(`[SCENE-MAGIC] Revert failed: ${e.message}`); }
          }, 100);
        }
      }
    };

    // Wrap the existing attr listener to add scene mode support
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

module.exports = WallSwitch2Gang1WayDevice;


