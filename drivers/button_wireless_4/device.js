'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

/**
 * Button4GangDevice - v10.1.1 TS0044/TS004F E000 Fix
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

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    // v10.1.1: E000 cluster detection for TS0044/TS004F devices
    await this._setupE000Detection(zclNode);
    await this._setupTuyaDPButtonDetection(zclNode);
    await this._setupRawFrameInterceptor(zclNode);

    this.log('[BUTTON_WIRELESS_4] v10.1.1 initialized with E000 + DP support');
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
      const e000Cluster = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
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
      if (!zclNode || typeof zclNode.handleFrame !== 'function') return;
      const orig = zclNode.handleFrame.bind(zclNode);
      zclNode.handleFrame = async (epId, cId, f, m) => {
        if (cId === 57344 || cId === 0xE000) {
          const d = f?.data;
          this.log(`[E000-4G-RAW] EP${epId} E000 frame`);
          let btn = epId;
          let pt = 'single';
          if (d?.length >= 2 && d[0] >= 1 && d[0] <= 4) {
            btn = d[0];
            pt = resolvePressType(d[1], 'E000-RAW');
          } else if (d?.length >= 1) {
            pt = resolvePressType(d[0], 'E000-RAW');
          }
          await this._triggerButton4Gang(btn, pt);
        }
        return orig(epId, cId, f, m);
      };
      this.log('[E000-4G-RAW] Frame interceptor ready');
    } catch (e) {
      this.log(`[E000-4G-RAW] Setup failed: ${e.message}`);
    }
  }

  /**
   * v10.1.1: Trigger button flow for 4-gang device
   * Uses PhysicalButtonMixin _triggerPhysicalFlow if available, otherwise
   * triggers the flow card directly.
   */
  async _triggerButton4Gang(button, pressType) {
    // Use mixin's trigger if available
    if (typeof this._triggerPhysicalFlow === 'function') {
      this._triggerPhysicalFlow(button, pressType);
      return;
    }

    // Fallback: trigger flow card directly
    try {
      const driverId = this.driver?.id || 'button_wireless_4';
      const cardId = `${driverId}_button_4gang_button_${pressType === 'single' ? 'pressed' : pressType === 'double' ? 'double_press' : 'long_press'}`;
      const trigger = this.homey?.flow?.getDeviceTriggerCard(cardId);
      if (trigger) {
        await trigger.trigger(this, { button, pressType });
      }
    } catch (e) {
      this.log(`[E000-4G] Flow trigger error: ${e.message}`);
    }
  }

  /**
   * v10.1.1: Debounce helper for E000 onOff commands
   */
  _isDeduped(ep, cmd) {
    const now = Date.now();
    const key = `${ep}_${cmd}`;
    if (now - (this._e000Dedup?.[key] || 0) < 500) return true;
    if (!this._e000Dedup) this._e000Dedup = {};
    this._e000Dedup[key] = now;
    return false;
  }

}

module.exports = Button4GangDevice;
