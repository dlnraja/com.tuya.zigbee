'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

/**
 * SceneSwitch4Device - v10.1.1 E000 + DP Fix
 *
 * FIX v10.1.1: Added E000 BoundCluster + direct E000 cluster listeners + Tuya DP
 *   button decoding for scene switch 4-gang devices.
 *   These devices declare cluster 57344 (0xE000) and 61184 (0xEF00) in compose.json
 *   but the ButtonDevice base class only handles ZCL scenes/onOff clusters.
 *
 * v10.0.0: Initial universal standard
 */
class SceneSwitch4Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;

    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));

    // v10.1.1: E000 + DP cluster detection for scene switch devices
    await this._setupE000Detection(zclNode);
    await this._setupTuyaDPButtonDetection(zclNode);
    await this._setupRawFrameInterceptor(zclNode);

    this.log('[SCENE_SWITCH_4] v10.1.1 initialized with E000 + DP support');
  }

  /**
   * v10.1.1: Setup cluster 0xE000 (57344) detection
   */
  async _setupE000Detection(zclNode) {
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    this.log(`[E000-S4] Setting up E000 detection (mfr: ${mfr || 'unknown'})`);
    this._e000Dedup = {};

    for (let ep = 1; ep <= 4; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;

      // Try registered tuyaE000 cluster
      const e000Cluster = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
      if (e000Cluster && typeof e000Cluster.on === 'function') {
        this.log(`[E000-S4] EP${ep} tuyaE000 cluster available`);
        const cmdNames = ['cmd0', 'cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5', 'cmd6', 'cmdFD', 'cmdFE', 'cmdFF'];
        for (const cmdName of cmdNames) {
          e000Cluster.on(cmdName, async ({ data }) => {
            this.log(`[E000-S4] EP${ep} ${cmdName}: data=${data?.toString?.('hex')}`);
            let btn = ep;
            let press = 'single';
            if (data && data.length >= 2 && data[0] >= 1 && data[0] <= 4) {
              btn = data[0];
              press = resolvePressType(data[1], 'E000-S4');
            } else if (data && data.length >= 1) {
              press = resolvePressType(data[0], 'E000-S4');
            }
            this.log(`[E000-S4] Button ${btn} ${press.toUpperCase()}`);
            await this._triggerSceneSwitch4(btn, press);
          });
        }
      }

      // onOff command fallback
      const onOff = endpoint.clusters?.onOff || endpoint.clusters?.[6];
      if (onOff && typeof onOff.on === 'function') {
        onOff.on('commandOn', async () => {
          if (this._isDeduped(ep, 'on')) return;
          this.log(`[E000-S4] EP${ep} commandOn -> Button ${ep} single`);
          await this._triggerSceneSwitch4(ep, 'single');
        });
        onOff.on('commandOff', async () => {
          if (this._isDeduped(ep, 'off')) return;
          this.log(`[E000-S4] EP${ep} commandOff -> Button ${ep} double`);
          await this._triggerSceneSwitch4(ep, 'double');
        });
        onOff.on('commandToggle', async () => {
          if (this._isDeduped(ep, 'toggle')) return;
          this.log(`[E000-S4] EP${ep} commandToggle -> Button ${ep} long`);
          await this._triggerSceneSwitch4(ep, 'long');
        });
      }
    }

    await this._setupE000BoundCluster(zclNode);
    this.log('[E000-S4] E000 detection setup complete');
  }

  /**
   * v10.1.1: Setup E000 BoundCluster
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
            this.log(`[E000-S4] BoundCluster EP${ep} Button ${btn} ${pressType}`);
            await this._triggerSceneSwitch4(btn, pressType);
          }
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings['tuyaE000'] = bc;
        this.log(`[E000-S4] BoundCluster EP${ep} ready`);
      }
    } catch (e) {
      this.log(`[E000-S4] BoundCluster not available: ${e.message}`);
    }
  }

  /**
   * v10.1.1: Tuya DP button detection (0xEF00 cluster)
   */
  async _setupTuyaDPButtonDetection(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return;

    const tuyaCluster = endpoint.clusters?.tuya ||
      endpoint.clusters?.manuSpecificTuya ||
      endpoint.clusters?.[0xEF00] ||
      endpoint.clusters?.['61184'];

    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.log('[DP-S4] No Tuya cluster found - DP button detection skipped');
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

      if (dpId >= 1 && dpId <= 4) {
        const pressType = resolvePressType(value, 'DP-S4');
        this.log(`[DP-S4] DP${dpId} value=${value} -> Button ${dpId} ${pressType.toUpperCase()}`);
        this._triggerSceneSwitch4(dpId, pressType);
      }
    };

    const events = ['dp', 'datapoint', 'response', 'data', 'report'];
    for (const evt of events) {
      try { tuyaCluster.on(evt, handleTuyaDP); } catch (e) { /* ignore */ }
    }
    this.log('[DP-S4] Tuya DP button detection setup complete');
  }

  /**
   * v10.1.1: Raw frame interceptor for cluster 0xE000
   */
  async _setupRawFrameInterceptor(zclNode) {
    try {
      if (!zclNode || typeof zclNode.handleFrame !== 'function') return;
      const orig = zclNode.handleFrame.bind(zclNode);
      zclNode.handleFrame = async (epId, cId, f, m) => {
        if (cId === 57344 || cId === 0xE000) {
          const d = f?.data;
          this.log(`[E000-S4-RAW] EP${epId} E000 frame`);
          let btn = epId;
          let pt = 'single';
          if (d?.length >= 2 && d[0] >= 1 && d[0] <= 4) {
            btn = d[0];
            pt = resolvePressType(d[1], 'E000-S4-RAW');
          } else if (d?.length >= 1) {
            pt = resolvePressType(d[0], 'E000-S4-RAW');
          }
          await this._triggerSceneSwitch4(btn, pt);
        }
        return orig(epId, cId, f, m);
      };
      this.log('[E000-S4-RAW] Frame interceptor ready');
    } catch (e) {
      this.log(`[E000-S4-RAW] Setup failed: ${e.message}`);
    }
  }

  /**
   * v10.1.1: Trigger button flow for scene switch 4-gang
   */
  async _triggerSceneSwitch4(button, pressType) {
    if (typeof this._triggerPhysicalFlow === 'function') {
      this._triggerPhysicalFlow(button, pressType);
      return;
    }

    try {
      const cardId = `scene_switch_4_button_4gang_button_${pressType === 'single' ? 'pressed' : pressType === 'double' ? 'double_press' : 'long_press'}`;
      const trigger = this.homey?.flow?.getDeviceTriggerCard(cardId);
      if (trigger) {
        await trigger.trigger(this, { button, pressType });
      }
    } catch (e) {
      this.log(`[E000-S4] Flow trigger error: ${e.message}`);
    }
  }

  /**
   * v10.1.1: Debounce helper
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

module.exports = SceneSwitch4Device;
