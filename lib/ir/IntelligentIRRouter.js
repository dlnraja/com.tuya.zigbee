'use strict';

/**
 * P2487 — IntelligentIRRouter
 * WHY: One send/learn/list API for Zigbee Zosung + WiFi Tuya + Homey Pro 2023 onboard IR.
 * Contre quoi: virtual remotes hardcode Zigbee-only; WiFi flows never call learn/send; Homey path missing.
 */

const IRCodeLibrary = require('./IRCodeLibrary');
const {
  normalizeCode,
  makeLearnedEntry,
  upsertLearnedMap,
  listLearned,
  detectFormat,
  toProntoForHomey,
} = require('./IRFormatConverter');
const HomeyInfraredTx = require('./HomeyInfraredTx');
const { getGuard: getIRFloodGuard } = require('./IRFloodGuard');

const SENDER_DRIVERS = Object.freeze(['ir_blaster', 'blaster_remote', 'wifi_ir_remote']);

function safeGetDevices(homey, driverId) {
  try {
    const drv = homey.drivers.getDriver(driverId);
    if (!drv || typeof drv.getDevices !== 'function') return [];
    return drv.getDevices() || [];
  } catch (_) {
    return [];
  }
}

function deviceIdOf(device) {
  try {
    const data = device.getData && device.getData();
    return (data && (data.id || data.token)) || device.getId?.() || null;
  } catch (_) {
    return null;
  }
}

function driverIdOf(device) {
  try {
    if (typeof device.getDriver === 'function') {
      const d = device.getDriver();
      return d && (d.id || d.getManifest?.()?.id) || null;
    }
    if (device.driver && device.driver.id) return device.driver.id;
  } catch (_) { /* ignore */ }
  return null;
}

function transportOfDriver(driverId) {
  if (driverId === 'wifi_ir_remote') return 'wifi';
  if (driverId === HomeyInfraredTx.SENDER_ID || driverId === 'homey_infrared') return 'homey';
  return 'zigbee';
}

class IntelligentIRRouter {
  constructor(homey) {
    this.homey = homey;
    /** @type {Map<string, {confirmCode: string|null, name: string, senderId: string, ts: number}>} */
    this._pendingConfirm = new Map();
  }

  /**
   * List physical IR senders (Zigbee + WiFi + Homey onboard when available).
   */
  listSenders() {
    const out = [];
    for (const driverId of SENDER_DRIVERS) {
      for (const device of safeGetDevices(this.homey, driverId)) {
        const id = deviceIdOf(device);
        if (!id) continue;
        out.push({
          id,
          driverId,
          name: typeof device.getName === 'function' ? device.getName() : id,
          transport: transportOfDriver(driverId),
          device,
          learnSupported: true,
        });
      }
    }
    const homeySender = HomeyInfraredTx.getHomeyInfraredSender(this.homey);
    if (homeySender) out.push(homeySender);
    return out;
  }

  findSender(senderId) {
    if (!senderId) return null;
    const sid = String(senderId);
    if (sid === HomeyInfraredTx.SENDER_ID || sid === 'homey') {
      return HomeyInfraredTx.getHomeyInfraredSender(this.homey);
    }
    for (const s of this.listSenders()) {
      if (s.id === sid) return s;
    }
    return null;
  }

  /**
   * Resolve sender from virtual remote settings.
   */
  resolveTransportFromSettings(settings = {}) {
    const transportDriver = settings.transport_driver || (settings.blaster_id ? 'ir_blaster' : null);
    const transportId = settings.transport_id || settings.blaster_id || null;

    if (transportDriver === HomeyInfraredTx.SENDER_ID
      || transportId === HomeyInfraredTx.SENDER_ID
      || transportDriver === 'homey') {
      return HomeyInfraredTx.getHomeyInfraredSender(this.homey);
    }

    if (!transportId) return null;
    if (transportDriver) {
      const hit = this.listSenders().find((s) => s.driverId === transportDriver && s.id === transportId);
      if (hit) return hit;
    }
    return this.findSender(transportId);
  }

  async getLearnedMap(device) {
    if (!device || typeof device.getStoreValue !== 'function') return {};
    try {
      const stored = await device.getStoreValue('learned_codes');
      if (!stored || typeof stored !== 'object') return {};
      const out = {};
      for (const [k, v] of Object.entries(stored)) {
        if (v && typeof v === 'object' && v.code) {
          out[k] = v;
        } else if (typeof v === 'string') {
          out[k] = makeLearnedEntry({ name: k, code: v, format: detectFormat(v) });
        }
      }
      return out;
    } catch (_) {
      return {};
    }
  }

  async saveLearnedMap(device, map) {
    if (!device || typeof device.setStoreValue !== 'function') return;
    await device.setStoreValue('learned_codes', map).catch(() => {});
    if (device._learnedCodes !== undefined) device._learnedCodes = map;
  }

  listCodes(device) {
    const map = device && device._learnedCodes ? device._learnedCodes : {};
    return listLearned(map);
  }

  async renameCode(device, fromName, toName) {
    if (!device) throw new Error('device required');
    const from = String(fromName || '').trim();
    const to = String(toName || '').trim();
    if (!from || !to) throw new Error('from/to name required');
    const map = await this.getLearnedMap(device);
    if (!map[from]) throw new Error(`Learned code not found: ${from}`);
    if (to !== from && map[to]) throw new Error(`Name already used: ${to}`);
    const entry = { ...map[from], name: to, updatedAt: new Date().toISOString() };
    const next = { ...map };
    delete next[from];
    next[to] = entry;
    await this.saveLearnedMap(device, next);
    return entry;
  }

  async deleteCode(device, name) {
    if (!device) throw new Error('device required');
    const key = String(name || '').trim();
    if (!key) throw new Error('name required');
    const map = await this.getLearnedMap(device);
    if (!map[key]) return false;
    const next = { ...map };
    delete next[key];
    await this.saveLearnedMap(device, next);
    return true;
  }

  normalizeForSender(sender, input, format = 'auto') {
    const target = sender.transport === 'wifi'
      ? 'wifi'
      : (sender.transport === 'homey' ? 'homey' : 'zigbee');
    return normalizeCode(input, { format, target });
  }

  /**
   * @param {object} opts
   * @param {object} [opts.storeDevice] — where learned codes live (virtual remote when Homey TX)
   */
  async send(opts = {}) {
    const {
      senderId,
      device: deviceOpt,
      storeDevice: storeOpt,
      code,
      learnedName,
      brand,
      category,
      command,
      format = 'auto',
      repetitions = 1,
    } = opts;

    // Homey synthetic first: deviceOpt is often the virtual remote store, not the TX radio
    let sender = null;
    if (senderId === HomeyInfraredTx.SENDER_ID || senderId === 'homey') {
      sender = HomeyInfraredTx.getHomeyInfraredSender(this.homey);
    } else if (deviceOpt) {
      const did = driverIdOf(deviceOpt);
      if (SENDER_DRIVERS.includes(did)) {
        sender = {
          device: deviceOpt,
          id: deviceIdOf(deviceOpt),
          driverId: did,
          transport: transportOfDriver(did),
        };
      }
    }
    if (!sender) sender = this.findSender(senderId);

    if (!sender) throw new Error('IR sender not found');
    if (sender.transport === 'homey' && !sender.available) {
      throw new Error('Homey onboard IR not available on this Homey');
    }
    if (sender.transport !== 'homey' && !sender.device) {
      throw new Error('IR sender not found');
    }

    const storeDevice = storeOpt || (sender.transport === 'homey' ? deviceOpt : sender.device) || null;

    let payload = code || null;

    if (!payload && learnedName) {
      const map = await this.getLearnedMap(storeDevice || sender.device);
      const entry = map[learnedName];
      if (!entry || !entry.code) throw new Error(`Learned code not found: ${learnedName}`);
      payload = entry.code;
    }

    if (!payload && brand && category && command) {
      const lib = IRCodeLibrary.getCode(brand, category, command);
      if (!lib || !lib.code) {
        throw new Error(`No library code for ${brand}/${category}/${command}`);
      }
      payload = lib.code;
    }

    if (!payload) throw new Error('No IR payload to send');

    // WHY(P2501): intelligent anti-spam — dedup identical, throttle sender, cap reps, hard-stop global flood
    const flood = getIRFloodGuard(this.homey).checkSend({
      senderKey: sender.id || sender.driverId || 'ir',
      transport: sender.transport || 'default',
      payload,
      repetitions,
    });
    if (!flood.allow) {
      if (flood.hard) {
        throw new Error(`IR flood guard: ${flood.reason} — retry in ${Math.ceil((flood.retryAfterMs || 0) / 1000)}s`);
      }
      return {
        ok: true,
        skipped: true,
        reason: flood.reason,
        retryAfterMs: flood.retryAfterMs || 0,
      };
    }
    const reps = flood.repetitions;

    if (sender.transport === 'homey') {
      const pronto = toProntoForHomey(payload, format)
        || (this.normalizeForSender(sender, payload, format).prontoCode);
      if (!pronto) {
        throw new Error('Homey IR TX needs Pronto (or convertible) code');
      }
      return HomeyInfraredTx.sendPronto(this.homey, pronto, {
        repetitions: reps,
        skipFloodGuard: true,
      });
    }

    const norm = this.normalizeForSender(sender, payload, format);
    if (!norm.ok || !norm.code) {
      if (sender.transport === 'wifi') {
        return this._txWifi(sender.device, payload);
      }
      throw new Error(norm.error || 'IR normalize failed');
    }

    if (sender.transport === 'wifi') {
      return this._txWifi(sender.device, norm.wifiCode || norm.code);
    }
    return this._txZigbee(sender.device, norm.zigbeeCode || norm.code);
  }

  async _txZigbee(device, zosungBase64) {
    const fn = device.sendIRCode || device.sendIR || device._sendIR;
    if (typeof fn !== 'function') throw new Error('Zigbee blaster missing sendIRCode');
    // Router already passed flood guard — avoid double-throttle
    return fn.call(device, zosungBase64, { skipFloodGuard: true });
  }

  async _txWifi(device, wifiCode) {
    if (typeof device.sendIRCode === 'function') {
      return device.sendIRCode(wifiCode, { skipFloodGuard: true });
    }
    throw new Error('WiFi IR device missing sendIRCode');
  }

  async learn(opts = {}) {
    const {
      senderId,
      device: deviceOpt,
      name,
      timeout = 30,
      confirm = true,
    } = opts;
    let sender = deviceOpt
      ? {
          device: deviceOpt,
          id: deviceIdOf(deviceOpt),
          driverId: driverIdOf(deviceOpt),
          transport: transportOfDriver(driverIdOf(deviceOpt)),
        }
      : this.findSender(senderId);

    if (senderId === HomeyInfraredTx.SENDER_ID) {
      sender = HomeyInfraredTx.getHomeyInfraredSender(this.homey);
    }

    if (!sender) throw new Error('IR sender not found');
    if (sender.transport === 'homey' || sender.learnSupported === false) {
      throw new Error('Homey onboard IR is TX-only on Pro 2023 — learn via Zigbee/WiFi blaster, then send via Homey');
    }
    if (!sender.device) throw new Error('IR sender not found');

    const learnGate = getIRFloodGuard(this.homey).checkLearn({
      senderKey: sender.id || sender.driverId || 'ir',
    });
    if (!learnGate.allow) {
      throw new Error(`IR learn cooldown — wait ${Math.ceil((learnGate.retryAfterMs || 0) / 1000)}s`);
    }

    const codeName = String(name || `code_${Date.now()}`).trim();

    if (sender.transport === 'wifi') {
      if (typeof sender.device.startLearning !== 'function') {
        throw new Error('WiFi IR missing startLearning');
      }
      await sender.device.startLearning(codeName, timeout);
      return { ok: true, transport: 'wifi', name: codeName, pendingConfirm: false };
    }

    const device = sender.device;
    if (typeof device._enableAdvancedLearnMode === 'function') {
      await device._enableAdvancedLearnMode(timeout, {
        codeName,
        protocol: 'auto',
        frequency: 38000,
        category: 'uncategorized',
        confirm,
      });
    } else if (typeof device.enableLearnMode === 'function') {
      await device.enableLearnMode(timeout);
    } else {
      throw new Error('Zigbee blaster missing learn API');
    }

    if (confirm) {
      this._pendingConfirm.set(sender.id, {
        name: codeName,
        confirmCode: null,
        senderId: sender.id,
        ts: Date.now(),
      });
    }

    return { ok: true, transport: 'zigbee', name: codeName, pendingConfirm: !!confirm };
  }

  async onLearnedCapture(device, rawCode, meta = {}) {
    const sid = deviceIdOf(device);
    const pending = sid ? this._pendingConfirm.get(sid) : null;
    const name = meta.name || pending?.name || `code_${Date.now()}`;
    const format = detectFormat(rawCode);
    const entry = makeLearnedEntry({
      name,
      code: rawCode,
      format,
      protocol: meta.protocol || null,
      carrier: meta.carrier || null,
      icon: meta.icon || null,
    });

    if (pending && pending.confirmCode == null) {
      pending.confirmCode = rawCode;
      this._pendingConfirm.set(sid, pending);
      return { stored: false, needConfirm: true, name };
    }

    if (pending && pending.confirmCode != null) {
      pending.confirmCode = null;
      this._pendingConfirm.delete(sid);
    }

    const map = await this.getLearnedMap(device);
    const next = upsertLearnedMap(map, entry);
    await this.saveLearnedMap(device, next);
    return { stored: true, needConfirm: false, name, entry };
  }

  async storeManual(opts = {}) {
    const {
      senderId, device: deviceOpt, storeDevice: storeOpt, name, input, format = 'auto', sendAfter = false,
    } = opts;
    let sender = deviceOpt
      ? {
          device: deviceOpt,
          id: deviceIdOf(deviceOpt),
          driverId: driverIdOf(deviceOpt),
          transport: transportOfDriver(driverIdOf(deviceOpt)),
        }
      : this.findSender(senderId);

    if (senderId === HomeyInfraredTx.SENDER_ID) {
      sender = HomeyInfraredTx.getHomeyInfraredSender(this.homey);
    }
    if (!sender) throw new Error('IR sender not found');

    const storeDevice = storeOpt || (sender.transport === 'homey' ? deviceOpt : sender.device);
    if (!storeDevice) throw new Error('No device store for learned IR code');

    const norm = this.normalizeForSender(sender, input, format);
    if (!norm.ok || !norm.code) throw new Error(norm.error || 'manual IR normalize failed');

    const storeCode = sender.transport === 'homey'
      ? (norm.prontoCode || norm.code)
      : (sender.transport === 'wifi' ? (norm.wifiCode || norm.code) : (norm.zigbeeCode || norm.code));
    const entry = makeLearnedEntry({
      name: name || `manual_${Date.now()}`,
      code: storeCode,
      format: norm.format,
    });
    const map = await this.getLearnedMap(storeDevice);
    await this.saveLearnedMap(storeDevice, upsertLearnedMap(map, entry));

    if (sendAfter) {
      await this.send({
        senderId: sender.id,
        device: storeDevice,
        storeDevice,
        code: storeCode,
        format: norm.format,
      });
    }
    return entry;
  }
}

function getRouter(homey) {
  if (!homey) throw new Error('homey required');
  if (!homey.__intelligentIRRouter) {
    homey.__intelligentIRRouter = new IntelligentIRRouter(homey);
  }
  return homey.__intelligentIRRouter;
}

module.exports = {
  IntelligentIRRouter,
  getRouter,
  SENDER_DRIVERS,
  HOMEY_IR_SENDER_ID: HomeyInfraredTx.SENDER_ID,
};
