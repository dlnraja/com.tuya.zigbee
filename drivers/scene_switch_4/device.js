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
    this.gangCount = 4;

    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));

    // WHY P2277: Arlight TS1002 (_TZ3000_te34fjg4) is mains 230V scene panel — strip phantom battery
    const mfr = String(this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName || '').toLowerCase();
    const pid = String(this.getSetting?.('zb_model_id') || this.getData?.()?.modelId || '').toUpperCase();
    if (mfr.includes('te34fjg4') || pid === 'TS1002') {
      await this.removeCapability('measure_battery').catch(() => {});
      await this.removeCapability('alarm_battery').catch(() => {});
    }

    // v10.1.1: E000 + DP cluster detection for scene switch devices
    await this._setupE000Detection(zclNode);
    await this._setupOnOffFdBoundCluster(zclNode);
    await this._setupTuyaDPButtonDetection(zclNode);
    await this._setupRawFrameInterceptor(zclNode);

    // WHY(P2253): parallel hybrid stack — native ZCL + Tuya mfr 0xFD + E000 + EF00 RX + raw
    this.log('[SCENE_SWITCH_4] hybrid RX: OnOff-0xFD + E000 + DP(EF00 listen) + raw; TX: no 0x8004 on TS0044; blue LED=pairing/network only');
    this.log('[SCENE_SWITCH_4] v10.1.1+P2253 initialized with hybrid wrappers');
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
      if (!endpoint) {continue;}

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
          if (this._isDeduped(ep, 'on')) {return;}
          this.log(`[E000-S4] EP${ep} commandOn -> Button ${ep} single`);
          await this._triggerSceneSwitch4(ep, 'single');
        });
        onOff.on('commandOff', async () => {
          if (this._isDeduped(ep, 'off')) {return;}
          this.log(`[E000-S4] EP${ep} commandOff -> Button ${ep} double`);
          await this._triggerSceneSwitch4(ep, 'double');
        });
        onOff.on('commandToggle', async () => {
          if (this._isDeduped(ep, 'toggle')) {return;}
          this.log(`[E000-S4] EP${ep} commandToggle -> Button ${ep} long`);
          await this._triggerSceneSwitch4(ep, 'long');
        });
      }
    }

    await this._setupE000BoundCluster(zclNode);
    this.log('[E000-S4] E000 detection setup complete');
  }

  /**
   * ZHA TuyaSmartRemoteOnOffCluster + Koenkk TS0044:
   * physical press is manufacturer cmd 0xFD on genOnOff (cluster 6), per endpoint,
   * payload 0=single 1=double 2=hold. Standard commandOn/Off/Toggle is the TS004F
   * command-mode path ? not this remote. Bind OnOffBoundCluster so 0xFD is not dropped.
   */
  async _setupOnOffFdBoundCluster(zclNode) {
    try {
      const OnOffBoundCluster = require('../../lib/clusters/OnOffBoundCluster');
      const { PRESS_MAP } = require('../../lib/utils/TuyaPressTypeMap');
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) {continue;}
        const bc = new OnOffBoundCluster({
          onSetOn: async (payload) => {
            if (this._isDeduped(ep, 'fd-on')) {return;}
            let press = 'single';
            if (payload && (payload.cmdId === 0xFD || payload.scene !== undefined)) {
              press = PRESS_MAP[payload.scene] || payload.press || 'single';
            }
            this.log(`[ONOFF-S4] EP${ep} 0xFD scene=${payload?.scene} -> ${press}`);
            await this._triggerSceneSwitch4(ep, press);
          },
        });
        bc._device = this;
        if (!endpoint.bindings) {endpoint.bindings = {};}
        endpoint.bindings.onOff = bc;
        this.log(`[ONOFF-S4] BoundCluster EP${ep} ready (0xFD)`);
      }
    } catch (e) {
      this.log(`[ONOFF-S4] BoundCluster not available: ${e.message}`);
    }
  }

  /**
   * v10.1.1: Setup E000 BoundCluster
   */
  async _setupE000BoundCluster(zclNode) {
    try {
      const TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) {continue;}
        const bc = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (button, pressType) => {
            const btn = button >= 1 && button <= 4 ? button : ep;
            this.log(`[E000-S4] BoundCluster EP${ep} Button ${btn} ${pressType}`);
            await this._triggerSceneSwitch4(btn, pressType);
          }
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) {endpoint.bindings = {};}
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
    if (!endpoint?.clusters) {return;}

    const tuyaCluster = endpoint.clusters?.tuya ||
      endpoint.clusters?.manuSpecificTuya ||
      endpoint.clusters?.[0xEF00] ||
      endpoint.clusters?.['61184'];

    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.log('[DP-S4] No Tuya cluster found - DP button detection skipped');
      return;
    }

    const handleTuyaDP = (data) => {
      if (!data) {return;}
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
        if (len === 1) {value = data[6];}
        else if (len === 4) {value = data.readInt32BE(6);}
      }

      if (dpId === undefined) {return;}

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
      if (!zclNode || typeof zclNode.handleFrame !== 'function') {return;}
      const orig = zclNode.handleFrame.bind(zclNode);
      zclNode.handleFrame = async (epId, cId, f, m) => {
        if (cId === 6 || cId === 0x0006) {
          const json = typeof f?.toJSON === 'function' ? f.toJSON() : f;
          const d = Buffer.isBuffer(json?.data) ? json.data
            : Array.isArray(json?.data) ? Buffer.from(json.data)
            : Buffer.isBuffer(f) ? f : null;
          const cmd = f?.cmdId ?? f?.commandId;
          const looksFd = cmd === 0xFD || (d && d.length && d.includes(0xFD));
          if (looksFd) {
            const scene = (typeof cmd === 'number' && d && d.length) ? d[0]
              : (d && d.length > 1 ? d[d.length - 1] : 0);
            const pt = require('../../lib/utils/TuyaPressTypeMap').PRESS_MAP[scene] || 'single';
            this.log(`[ONOFF-S4-RAW] EP${epId} 0xFD scene=${scene} -> ${pt}`);
            await this._triggerSceneSwitch4(epId, pt);
          }
        }
        if (cId === 57344 || cId === 0xE000) {
          // v10.6.0 FIX: `f` is a raw Buffer — `f.data` is undefined, this
          // path was dead. Extract bytes the same way button_wireless_4 does.
          const json = typeof f?.toJSON === 'function' ? f.toJSON() : f;
          const d = Buffer.isBuffer(json?.data) ? json.data
            : Array.isArray(json?.data) ? Buffer.from(json.data)
            : Buffer.isBuffer(f) ? f : null;
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
    if (typeof this.triggerButtonPress === 'function') {
      await this.triggerButtonPress(button, pressType === 'long_press' ? 'long' : pressType, 1, { source: 'physical' });
      return;
    }
    if (typeof this._triggerPhysicalFlow === 'function') {
      this._triggerPhysicalFlow(button, pressType);
      return;
    }

    // WHY(P2283): compose uses scene_switch_4_button_{N}_{pressed|double|long}
    // — never invent scene_switch_4_button_4gang_button_pressed (no button index).
    try {
      const suffix = pressType === 'single' || pressType === 'pressed' ? 'pressed'
        : (pressType === 'double' || pressType === 'double_press') ? 'double'
          : (pressType === 'long' || pressType === 'long_press') ? 'long'
            : String(pressType || 'pressed');
      const candidates = [
        `scene_switch_4_button_${button}_${suffix}`,
        `scene_switch_4_button_4gang_button_${button}_${suffix}`,
        suffix === 'pressed' ? 'scene_switch_4_button_pressed'
          : suffix === 'double' ? 'scene_switch_4_button_double_press'
            : 'scene_switch_4_button_long_press',
      ];
      for (const cardId of candidates) {
        const trigger = this.homey?.flow?.getDeviceTriggerCard(cardId);
        if (trigger) {
          await trigger.trigger(this, { button, pressType });
          return;
        }
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
    if (now - (this._e000Dedup?.[key] || 0) < 500) {return true;}
    if (!this._e000Dedup) {this._e000Dedup = {};}
    this._e000Dedup[key] = now;
    return false;
  }

}

module.exports = SceneSwitch4Device;
