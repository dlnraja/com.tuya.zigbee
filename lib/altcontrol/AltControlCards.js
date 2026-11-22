'use strict';
// P3380 (forum 21313 #296 Peter_Kawa, t1013u/t1014u): universal escape-hatch flow cards.
// (a) opt-in Tuya cloud tap-to-run scene, (b) raw DP / raw ZCL send + raw DP trigger/condition,
// (c) user DP -> capability mapping so an unknown DP becomes a normal Homey capability without a new version.
// Additive only: existing tuya_dp_* cards are untouched. Inputs validated, sends rate-limited, no secrets logged.
const core = require('./AltControlCore');

const STORE_KEY = 'altUserDpMap';

function deviceIdOf(device) {
  try { return (device.getData && device.getData().id) || device.id || ''; } catch (_) { return ''; }
}

async function sendDpOnDevice(device, dp, value, type) {
  if (typeof device.sendTuyaDP === 'function') { await device.sendTuyaDP(dp, value, type); return 'sendTuyaDP'; }
  if (device.tuyaEF00Manager && typeof device.tuyaEF00Manager.sendDP === 'function') {
    await device.tuyaEF00Manager.sendDP(dp, value, type); return 'ef00';
  }
  if (typeof device._setDP === 'function') { await device._setDP(dp, value); return 'wifi-local'; }
  return null;
}

class AltControlCards {
  constructor(homey, { log } = {}) {
    this.homey = homey;
    this.log = typeof log === 'function' ? log : () => {};
    this.sendLimiter = new core.RateLimiter({ limit: 5, windowMs: 2000 });
    this.sceneLimiter = new core.RateLimiter({ limit: 20, windowMs: 3600000 });
    this._watch = null; // Set of "deviceId|dp" referenced by alt_tuya_dp_received flows (null = unknown)
  }

  register() {
    const reg = (kind, id, fn) => {
      try {
        const card = kind === 'action' ? this.homey.flow.getActionCard(id)
          : kind === 'condition' ? this.homey.flow.getConditionCard(id) : this.homey.flow.getTriggerCard(id);
        if (card && typeof card.registerRunListener === 'function') { card.registerRunListener(fn); return card; }
      } catch (e) { this.log(`[ALT] ${id} unavailable: ${e.message}`); }
      return null;
    };
    reg('action', 'alt_tuya_dp_send', (a) => this.runDpSend(a));
    reg('action', 'alt_zcl_frame_send', (a) => this.runZclFrame(a));
    reg('action', 'alt_zcl_attribute_write', (a) => this.runZclAttribute(a));
    reg('action', 'alt_dp_map_set', (a) => this.runMapSet(a));
    reg('action', 'alt_dp_map_clear', (a) => this.runMapClear(a));
    reg('action', 'alt_tuya_scene_trigger', (a) => this.runScene(a));
    reg('condition', 'alt_tuya_dp_is', async (a) => {
      const dp = core.checkDpId(a.dp);
      if (!dp || !a.device) {return false;}
      const vals = (a.device.getStoreValue && a.device.getStoreValue('lastDPValues')) || {};
      const d = core.describeDpValue(vals[dp]);
      const want = String(a.value == null ? '' : a.value).trim().toLowerCase();
      return d.text.toLowerCase() === want || d.hex === want || (want !== '' && Number(want) === d.number && d.type !== 'string');
    });
    this._trigger = reg('trigger', 'alt_tuya_dp_received', async (a, s) => {
      if (!s || deviceIdOf(a.device) !== s.deviceId) {return false;}
      return Number(a.dp) === 0 || Number(a.dp) === s.dp;
    });
    if (this._trigger && typeof this._trigger.on === 'function') {
      this._trigger.on('update', () => { this._watch = null; });
    }
  }

  async runDpSend(args) {
    const dp = core.checkDpId(args.dp);
    const type = (args.dp_type && args.dp_type.id) || args.dp_type;
    if (!dp) {throw new Error('DP must be 1-255');}
    const parsed = core.parseTypedDpValue(type, args.value);
    if (!parsed.ok) {throw new Error(parsed.error);}
    if (!this.sendLimiter.allow(`dp:${deviceIdOf(args.device)}`)) {throw new Error('Too many sends, slow down (max 5 per 2 s)');}
    const path = await sendDpOnDevice(args.device, dp, parsed.value, type);
    if (!path) {throw new Error('This device has no Tuya DP channel');}
    this.log(`[ALT] DP${dp} (${type}) sent via ${path}`);
    return true;
  }

  async _zigbeeNode(device) {
    if (!this.homey.zigbee || typeof this.homey.zigbee.getNode !== 'function') {return null;}
    try { return await this.homey.zigbee.getNode(device); } catch (_) { return null; }
  }

  async _sendFrame(args, frameOpts) {
    const ep = Number.isInteger(Number(args.endpoint)) ? Number(args.endpoint) : NaN;
    const cluster = Number(args.cluster);
    if (!(ep >= 1 && ep <= 240) || !Number.isInteger(cluster) || cluster < 0 || cluster > 0xFFFF) {
      throw new Error('Endpoint 1-240 and cluster 0-65535 required');
    }
    const built = core.buildZclFrame({ ...frameOpts, seq: Math.floor(Math.random() * 256) });
    if (!built.ok) {throw new Error(built.error);}
    if (!this.sendLimiter.allow(`zcl:${deviceIdOf(args.device)}`)) {throw new Error('Too many sends, slow down (max 5 per 2 s)');}
    const node = await this._zigbeeNode(args.device);
    if (!node || typeof node.sendFrame !== 'function') {throw new Error('Not a Zigbee device of this app');}
    await node.sendFrame(ep, cluster, built.frame);
    this.log(`[ALT] ZCL ep${ep} cluster 0x${cluster.toString(16)} ${built.frame.length}B sent`);
    return true;
  }

  async runZclFrame(args) {
    return this._sendFrame(args, {
      frameType: (args.frame_type && args.frame_type.id) || args.frame_type,
      commandId: args.command, payloadHex: args.payload, manufacturerCode: args.manufacturer_code,
    });
  }

  async runZclAttribute(args) {
    const typeName = (args.data_type && args.data_type.id) || args.data_type;
    const p = core.buildWriteAttributePayload(args.attribute, typeName, args.value);
    if (!p.ok) {throw new Error(p.error);}
    return this._sendFrame(args, { frameType: 'global', commandId: 0x02, payloadHex: p.payloadHex, manufacturerCode: args.manufacturer_code });
  }

  async runMapSet(args) {
    const { ok, errors } = core.parseDpMapSpec(args.mapping);
    if (!ok.length) {throw new Error(`No valid mapping (format dp:capability[:divisor[:offset]])${errors.length ? `: ${errors[0]}` : ''}`);}
    const cur = (args.device.getStoreValue && args.device.getStoreValue(STORE_KEY)) || {};
    for (const e of ok) {cur[String(e.dp)] = { capability: e.capability, divisor: e.divisor, offset: e.offset };}
    const keys = Object.keys(cur).slice(-32);
    const next = {}; for (const k of keys) {next[k] = cur[k];}
    await args.device.setStoreValue(STORE_KEY, next);
    // WHY: replay the last known value so the capability shows up immediately
    const vals = (args.device.getStoreValue && args.device.getStoreValue('lastDPValues')) || {};
    for (const e of ok) { if (vals[e.dp] !== undefined) {await applyUserDpMap(args.device, e.dp, vals[e.dp], this.log);} }
    this.log(`[ALT] user DP map set: ${ok.map((e) => `${e.dp}->${e.capability}`).join(', ')}${errors.length ? ` (ignored ${errors.length})` : ''}`);
    return true;
  }

  async runMapClear(args) {
    await args.device.setStoreValue(STORE_KEY, {});
    return true;
  }

  async runScene(args) {
    const s = this.homey.settings;
    if (s.get('alt_tuya_scenes_enabled') !== true) {
      throw new Error('Tuya cloud scenes are disabled. Enable them and enter your Tuya IoT project keys in the app settings.');
    }
    const accessId = s.get('tuya_cloud_access_id');
    const accessKey = s.get('tuya_cloud_access_secret');
    if (!accessId || !accessKey) {throw new Error('Tuya IoT project keys missing in the app settings');}
    if (!this.sceneLimiter.allow('scene')) {throw new Error('Scene rate limit reached (20 per hour)');}
    const TuyaCloudAPI = require('../tuya-local/TuyaCloudAPI');
    if (!this._cloud || this._cloud.accessId !== accessId) {
      this._cloud = new TuyaCloudAPI({ accessId, accessKey, region: s.get('tuya_cloud_region') || 'eu', log: () => {} });
    }
    const res = await this._cloud.triggerScene(String(args.home_id || '').trim(), String(args.scene_id || '').trim());
    if (!res || !res.success) {throw new Error(`Tuya scene refused (${(res && (res.code || res.msg)) || 'no answer'})`);}
    this.log('[ALT] Tuya scene triggered');
    return true;
  }

  async _watched(deviceId, dp) {
    if (!this._trigger || typeof this._trigger.getArgumentValues !== 'function') {return true;}
    if (!this._watch) {
      try {
        const all = await this._trigger.getArgumentValues();
        this._watch = new Set((all || []).map((a) => `${deviceIdOf(a.device)}|${Number(a.dp) || 0}`));
      } catch (_) { return true; }
    }
    return this._watch.has(`${deviceId}|${dp}`) || this._watch.has(`${deviceId}|0`);
  }

  /** Called on every DP report (Zigbee EF00 and Wi-Fi). Fires only when a flow watches this device. */
  async onDp(device, dp, value, dpType) {
    let mapped = false;
    try { mapped = await applyUserDpMap(device, dp, value, this.log); } catch (_) { /* never break RX */ }
    if (!mapped) {
      try { await require('./SocketMeteringFallback').applySocketMetering(device, dp, value); } catch (_) { /* optional */ }
    }
    if (!this._trigger) {return;}
    const deviceId = deviceIdOf(device);
    if (!await this._watched(deviceId, dp)) {return;}
    const d = core.describeDpValue(value, dpType);
    await this._trigger.trigger(
      { dp, dp_type: d.type, value: d.text, value_number: Number.isFinite(d.number) ? d.number : 0, hex: d.hex },
      { deviceId, dp },
    ).catch(() => {});
  }
}

/** Apply the user DP map stored on the device. Adds a standard capability once if missing. */
async function applyUserDpMap(device, dp, value, log = () => {}) {
  const map = device && device.getStoreValue && device.getStoreValue(STORE_KEY);
  const entry = map && map[String(dp)];
  if (!entry) {return false;}
  const capability = core.normaliseCapabilityId(entry.capability);
  if (!capability) {return false;}
  const v = core.convertMappedValue({ capability, divisor: entry.divisor || 1, offset: entry.offset || 0 }, value);
  if (v === undefined) {return false;}
  if (!device.hasCapability(capability)) {
    if (typeof device.addCapability !== 'function') {return false;}
    await device.addCapability(capability);
    log(`[ALT] added ${capability} for user-mapped DP${dp}`);
  }
  await device.setCapabilityValue(capability, v);
  return true;
}

module.exports = AltControlCards;
module.exports.applyUserDpMap = applyUserDpMap;
module.exports.STORE_KEY = STORE_KEY;
