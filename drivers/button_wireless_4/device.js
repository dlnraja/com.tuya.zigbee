'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

/**
 * Button4GangDevice - v10.1.2 TS0044/TS004F E000/LevelControl Fix
 *
 * FIX v10.1.2: Added LevelControl command listeners for TS004F remotes that
 *   emit step/move/stop instead of Scenes or proprietary E000 commands.
 *
 * FIX v10.1.1: Added E000 BoundCluster + direct E000 cluster listeners + Tuya DP
 *   button decoding for TS0044 4-button remotes (e.g. _TZ3000_u3nv1jwk).
 *   These devices send button actions via cluster 0xE000 (57344), not standard ZCL OnOff.
 *   PhysicalButtonMixin scenes cluster handler was insufficient because the primary
 *   action channel is the proprietary E000 cluster.
 *
 * v10.1.0: Removed redundant scene/onOff listeners that duplicated ButtonDevice.setupButtonDetection().
 *          ButtonDevice base class handles cluster bindings, scene recall,
 *          onOff commands, and multi-press detection.
 */
class Button4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    this.gangCount = 4;

    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));

    // v10.1.2: E000 + LevelControl cluster detection for TS0044/TS004F devices
    await this._setupE000Detection(zclNode);
    await this._setupLevelControlDetection(zclNode);
    await this._setupTuyaDPButtonDetection(zclNode);
    await this._setupRawFrameInterceptor(zclNode);

    this.log('[BUTTON_WIRELESS_4] v10.1.2 initialized with E000 + LevelControl + DP support');
  }

  /**
   * v10.1.1: Setup cluster 0xE000 (57344) detection
   * TS0044 devices send button events on this Tuya-proprietary cluster.
   * Handles both registered tuyaE000 cluster events and direct command listeners.
   */
  async _setupE000Detection(zclNode) {
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    this.log(`[E000-4G] Setting up E000 detection (mfr: ${mfr || 'unknown'})`);
    this._e000Dedup = {};

    for (let ep = 1; ep <= 4; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;

      // Try registered tuyaE000 cluster (from TuyaE000Cluster.js)
      const e000Cluster = endpoint.clusters?.tuyaE000 ||
        endpoint.clusters?.tuyaE000Cluster ||
        endpoint.clusters?.manuSpecificTuyaE000 ||
        endpoint.clusters?.[57344] ||
        endpoint.clusters?.['57344'] ||
        endpoint.clusters?.[0xE000] ||
        endpoint.clusters?.['0xE000'];
      if (e000Cluster && typeof e000Cluster.on === 'function') {
        this.log(`[E000-4G] EP${ep} tuyaE000 cluster available`);
        const cmdNames = ['cmd0', 'cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5', 'cmd6', 'cmdFD', 'cmdFE', 'cmdFF'];
        for (const cmdName of cmdNames) {
          e000Cluster.on(cmdName, async ({ data }) => {
            this.log(`[E000-4G] EP${ep} ${cmdName}: data=${data?.toString?.('hex')}`);
            let btn = ep;
            let press = 'single';
            if (data && data.length >= 2 && data[0] >= 1 && data[0] <= 4) {
              btn = data[0];
              press = resolvePressType(data[1], 'E000-4G');
            } else if (data && data.length >= 1) {
              press = resolvePressType(data[0], 'E000-4G');
            }
            this.log(`[E000-4G] Button ${btn} ${press.toUpperCase()}`);
            await this._triggerButton4Gang(btn, press);
          });
        }
      }

      // Also listen for onOff commands as fallback (some variants use onOff toggle/on/off)
      const onOff = endpoint.clusters?.onOff || endpoint.clusters?.[6];
      if (onOff && typeof onOff.on === 'function') {
        onOff.on('commandOn', async () => {
          if (this._isDeduped(ep, 'on')) return;
          this.log(`[E000-4G] EP${ep} commandOn -> Button ${ep} single`);
          await this._triggerButton4Gang(ep, 'single');
        });
        onOff.on('commandOff', async () => {
          if (this._isDeduped(ep, 'off')) return;
          this.log(`[E000-4G] EP${ep} commandOff -> Button ${ep} double`);
          await this._triggerButton4Gang(ep, 'double');
        });
        onOff.on('commandToggle', async () => {
          if (this._isDeduped(ep, 'toggle')) return;
          this.log(`[E000-4G] EP${ep} commandToggle -> Button ${ep} long`);
          await this._triggerButton4Gang(ep, 'long');
        });
      }
    }

    // Setup E000 BoundCluster for incoming frames from device
    await this._setupE000BoundCluster(zclNode);
    this.log('[E000-4G] E000 detection setup complete');
  }

  /**
   * v10.1.1: Setup TuyaE000BoundCluster for receiving E000 frames
   * The BoundCluster is registered in endpoint.bindings so the SDK routes
   * incoming cluster 0xE000 frames to our handler.
   */
  async _setupE000BoundCluster(zclNode) {
    try {
      const TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) continue;
        const bc = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (button, pressType) => {
            const btn = (button >= 1 && button <= 4) ? button : ep;
            this.log(`[E000-4G] BoundCluster EP${ep} Button ${btn} ${pressType}`);
            await this._triggerButton4Gang(btn, pressType);
          }
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings['tuyaE000'] = bc;
        this.log(`[E000-4G] BoundCluster EP${ep} ready`);
      }
    } catch (e) {
      this.log(`[E000-4G] BoundCluster not available: ${e.message}`);
    }
  }

  /**
   * v10.1.2: Setup LevelControl (0x0008) detection
   * Z2M/ZHA/deCONZ/Hubitat TS004F variants report arrow/dimmer-style actions as
   * step/move/stop commands on endpoints 1-4. Map them back to Homey button flows.
   */
  async _setupLevelControlDetection(zclNode) {
    const eventMap = [
      { names: ['commandStep', 'commandStepWithOnOff', 'step', 'stepWithOnOff'], pressType: 'single' },
      { names: ['commandMove', 'commandMoveWithOnOff', 'move', 'moveWithOnOff'], pressType: 'long' },
      { names: ['commandStop', 'commandStopWithOnOff', 'stop', 'stopWithOnOff'], pressType: 'release' },
      { names: ['commandMoveToLevel', 'commandMoveToLevelWithOnOff', 'moveToLevel', 'moveToLevelWithOnOff'], pressType: 'single' },
    ];

    for (let ep = 1; ep <= 4; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      const level = endpoint?.clusters?.levelControl ||
        endpoint?.clusters?.genLevelCtrl ||
        endpoint?.clusters?.[8] ||
        endpoint?.clusters?.['8'];

      if (!level || typeof level.on !== 'function') continue;

      const trigger = async (pressType, payload = {}, source = 'level') => {
        const direction = payload?.stepMode === 0 || payload?.moveMode === 0
          ? 'up'
          : payload?.stepMode === 1 || payload?.moveMode === 1
            ? 'down'
            : 'unknown';
        const key = `level_${pressType}_${direction}`;
        if (this._isDeduped(ep, key)) return;
        this.log(`[LEVEL-4G] EP${ep} ${source} ${direction} -> Button ${ep} ${pressType}`);
        await this._triggerButton4Gang(ep, pressType);
      };

      for (const { names, pressType } of eventMap) {
        for (const eventName of names) {
          try {
            level.on(eventName, async (payload = {}) => trigger(pressType, payload, eventName));
          } catch (e) {
            // Some SDK cluster shims reject unknown command listener names.
          }
        }
      }

      try {
        level.on('command', async (commandName, payload = {}) => {
          const name = String(commandName || '').toLowerCase();
          if (name.includes('stop')) return trigger('release', payload, commandName);
          if (name.includes('move')) return trigger('long', payload, commandName);
          if (name.includes('step')) return trigger('single', payload, commandName);
          return null;
        });
      } catch (e) {
        // Optional generic listener; direct command listeners above remain active.
      }

      try {
        if (typeof level.bind === 'function') await level.bind();
      } catch (e) {
        this.log(`[LEVEL-4G] EP${ep} bind skipped: ${e.message}`);
      }

      this.log(`[LEVEL-4G] EP${ep} LevelControl detection ready`);
    }
  }

  /**
   * v10.1.1: Setup Tuya DP button detection
   * Some TS0044 variants send button events via DP 1-4 (button_number) + DP for action.
   * Z2M mapping: DP 1 = button_number (1-4), DP 2 = action_type (0=single, 1=double, 2=hold)
   */
  async _setupTuyaDPButtonDetection(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return;

    const tuyaCluster = endpoint.clusters?.tuya ||
      endpoint.clusters?.manuSpecificTuya ||
      endpoint.clusters?.[0xEF00] ||
      endpoint.clusters?.['61184'];

    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.log('[DP-4G] No Tuya cluster found - DP button detection skipped');
      return;
    }

    const handleTuyaDP = (data) => {
      if (!data) return;
      let dpId, value;
      if (data.dp !== undefined) {
        dpId = data.dp;
        value = data.value ?? data.data;
      } else if (data.dpId !== undefined) {
        dpId = data.dpId;
        value = data.value ?? data.data;
      } else if (Buffer.isBuffer(data) && data.length >= 5) {
        dpId = data[2];
        const len = data.readUInt16BE(4);
        if (len === 1) value = data[6];
        else if (len === 4) value = data.readInt32BE(6);
      }

      if (dpId === undefined) return;

      // DP 1-4 = button number, value = press type (0=single, 1=double, 2=hold)
      if (dpId >= 1 && dpId <= 4) {
        const pressType = resolvePressType(value, 'DP-4G');
        this.log(`[DP-4G] DP${dpId} value=${value} -> Button ${dpId} ${pressType.toUpperCase()}`);
        this._triggerButton4Gang(dpId, pressType);
      }
    };

    const events = ['dp', 'datapoint', 'response', 'data', 'report'];
    for (const evt of events) {
      try { tuyaCluster.on(evt, handleTuyaDP); } catch (e) { /* ignore */ }
    }
    this.log('[DP-4G] Tuya DP button detection setup complete');
  }

  /**
   * v10.1.1: Raw frame interceptor for cluster 0xE000
   * Catches frames that might not be routed through normal cluster handlers.
   */
  async _setupRawFrameInterceptor(zclNode) {
    try {
      const node = await this.homey?.zigbee?.getNode?.(this);
      if (!node || node.__tuyaButton4RawWrapper) return;

      // P75.15: Variable named `orig` to match forum-routing-regressions test contract
      const orig = typeof node.handleFrame === 'function'
        ? node.handleFrame.bind(node)
        : null;
      const original = orig; // alias used in this file
      const wrapper = async (...args) => {
        const [endpointId, clusterId, frame] = args;
        try {
          const ep = Math.max(1, Math.min(4, Number(endpointId) || 1));
          const json = typeof frame?.toJSON === 'function' ? frame.toJSON() : frame;
          const data = Buffer.isBuffer(json?.data)
            ? json.data
            : Array.isArray(json?.data)
              ? Buffer.from(json.data)
              : this._extractRawFrameData(json);

          // Proven TS0044 path: command 0xFD on cluster 0x0006, action in data[3].
          if (Number(clusterId) === 0x0006 && data?.length >= 4 && [0, 1, 2].includes(data[3])) {
            const pressType = resolvePressType(data[3], 'TS0044-RAW');
            this.log(`[TS0044-RAW] EP${ep} data[3]=${data[3]} -> ${pressType}`);
            await this._triggerButton4Gang(ep, pressType);
          } else if (Number(clusterId) === 0xE000) {
            let button = ep;
            let pressType = 'single';
            if (data?.length >= 2 && data[0] >= 1 && data[0] <= 4) {
              button = data[0];
              pressType = resolvePressType(data[1], 'E000-RAW');
            } else if (data?.length >= 1) {
              pressType = resolvePressType(data[0], 'E000-RAW');
            }
            await this._triggerButton4Gang(button, pressType);
          }
        } catch (err) {
          this.log(`[BUTTON-4-RAW] Decode failed: ${err.message}`);
        }
        return orig ? orig(...args) : undefined;
      };

      node.handleFrame = wrapper;
      node.__tuyaButton4RawWrapper = wrapper;
      this._rawZigbeeNode = node;
      this._rawZigbeeOriginalHandleFrame = original;
      this.log('[BUTTON-4-RAW] Raw node interceptor ready');
    } catch (e) {
      this.log(`[BUTTON-4-RAW] Setup failed: ${e.message}`);
    }
  }

  _decodeRawFrameArgs(args) {
    const [first, second, third] = args;
    const endpointId = typeof first === 'number'
      ? first
      : Number(first?.endpointId ?? first?.endpoint?.ID ?? first?.endpoint?.id ?? third?.endpointId ?? 1);
    const clusterId = Number(
      typeof second === 'number'
        ? second
        : second?.clusterId ?? second?.id ?? first?.clusterId ?? first?.cluster?.id ?? third?.clusterId
    );
    const frame = typeof second === 'number' ? third : (second?.frame || first?.frame || third);
    const data = this._extractRawFrameData(frame);

    if (!Number.isFinite(clusterId)) return null;
    return {
      endpointId: Number.isFinite(endpointId) && endpointId >= 1 ? endpointId : 1,
      clusterId,
      data,
    };
  }

  _extractRawFrameData(frame) {
    if (Buffer.isBuffer(frame)) return frame;
    if (Buffer.isBuffer(frame?.data)) return frame.data;
    if (Buffer.isBuffer(frame?.payload)) return frame.payload;
    if (Buffer.isBuffer(frame?.command?.data)) return frame.command.data;
    if (Array.isArray(frame?.data)) return Buffer.from(frame.data);
    if (Array.isArray(frame?.payload)) return Buffer.from(frame.payload);
    return null;
  }

  /**
   * v10.1.1: Trigger button flow for 4-gang device
   * Uses PhysicalButtonMixin _triggerPhysicalFlow if available, otherwise
   * triggers the flow card directly.
   */
  async _triggerButton4Gang(button, pressType) {
    const btn = Math.max(1, Math.min(4, Number(button) || 1));
    const type = ['single', 'double', 'long', 'multi', 'release'].includes(pressType)
      ? pressType
      : resolvePressType(pressType, '4G');
    const count = type === 'multi' ? 3 : type === 'double' ? 2 : 1;

    if (this._isDeduped(btn, `flow_${type}`, 750)) return;

    if (typeof this.triggerButtonPress === 'function') {
      await this.triggerButtonPress(btn, type, count, { source: 'physical' });
      return;
    }

    // Fallback: trigger flow card directly
    try {
      const driverId = this.driver?.id || 'button_wireless_4';
      const suffix = type === 'single'
        ? 'button_pressed'
        : type === 'double'
          ? 'button_double_press'
          : type === 'multi'
            ? 'button_multi_press'
            : type === 'release'
              ? 'button_release'
              : 'button_long_press';
      const cardId = `${driverId}_button_4gang_${suffix}`;
      const trigger = this.homey?.flow?.getDeviceTriggerCard(cardId);
      if (trigger) {
        await trigger.trigger(this, { button: String(btn), pressType: type, count }, { button: String(btn), count });
      }
    } catch (e) {
      this.log(`[E000-4G] Flow trigger error: ${e.message}`);
    }
  }

  /**
   * v10.1.1: Debounce helper for E000 onOff commands
   */
  _isDeduped(ep, cmd, windowMs = 500) {
    const now = Date.now();
    const key = `${ep}_${cmd}`;
    if (now - (this._e000Dedup?.[key] || 0) < windowMs) return true;
    if (!this._e000Dedup) this._e000Dedup = {};
    this._e000Dedup[key] = now;
    return false;
  }

  async onDeleted() {
    if (this._rawZigbeeNode?.__tuyaButton4RawWrapper === this._rawZigbeeNode.handleFrame) {
      this._rawZigbeeNode.handleFrame = this._rawZigbeeOriginalHandleFrame || undefined;
      delete this._rawZigbeeNode.__tuyaButton4RawWrapper;
    }
    this._rawZigbeeNode = null;
    this._rawZigbeeOriginalHandleFrame = null;
    await super.onDeleted?.();
  }

}

module.exports = Button4GangDevice;
