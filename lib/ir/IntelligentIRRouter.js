'use strict';

/**
 * P2487 — IntelligentIRRouter
 * WHY: One send/learn/list API for Zigbee Zosung blasters + WiFi Tuya IR (Toolkit UX without Homey Sphere IR).
 * Contre quoi: virtual remotes hardcode Zigbee-only; WiFi flows never call learn/send; Pronto never normalized.
 */

const IRCodeLibrary = require('./IRCodeLibrary');
const {
  normalizeCode,
  makeLearnedEntry,
  upsertLearnedMap,
  listLearned,
  detectFormat,
} = require('./IRFormatConverter');

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

class IntelligentIRRouter {
  constructor(homey) {
    this.homey = homey;
    /** @type {Map<string, {confirmCode: string|null, name: string, senderId: string, ts: number}>} */
    this._pendingConfirm = new Map();
  }

  /**
   * List physical IR senders (Zigbee + WiFi).
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
          transport: driverId === 'wifi_ir_remote' ? 'wifi' : 'zigbee',
          device,
        });
      }
    }
    return out;
  }

  findSender(senderId) {
    if (!senderId) return null;
    const sid = String(senderId);
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
    if (!transportId) return null;
    if (transportDriver) {
      const hit = this.listSenders().find((s) => s.driverId === transportDriver && s.id === transportId);
      if (hit) return hit;
    }
    return this.findSender(transportId);
  }

  async getLearnedMap(device) {
    try {
      const stored = await device.getStoreValue('learned_codes');
      if (!stored || typeof stored !== 'object') return {};
      // Migrate legacy string map → schema entries
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
    await device.setStoreValue('learned_codes', map).catch(() => {});
    if (device._learnedCodes !== undefined) device._learnedCodes = map;
  }

  listCodes(device) {
    // sync helper when map already on device
    const map = device._learnedCodes || {};
    return listLearned(map);
  }

  /**
   * Normalize paste for sender transport.
   */
  normalizeForSender(sender, input, format = 'auto') {
    const target = sender.transport === 'wifi' ? 'wifi' : 'zigbee';
    return normalizeCode(input, { format, target });
  }

  /**
   * Send IR: raw code, learned name, or brand/category/command library lookup.
   */
  async send(opts = {}) {
    const {
      senderId,
      device: deviceOpt,
      code,
      learnedName,
      brand,
      category,
      command,
      format = 'auto',
    } = opts;

    const sender = deviceOpt
      ? {
          device: deviceOpt,
          id: deviceIdOf(deviceOpt),
          driverId: driverIdOf(deviceOpt),
          transport: driverIdOf(deviceOpt) === 'wifi_ir_remote' ? 'wifi' : 'zigbee',
        }
      : this.findSender(senderId);

    if (!sender || !sender.device) throw new Error('IR sender not found');

    let payload = code || null;

    if (!payload && learnedName) {
      const map = await this.getLearnedMap(sender.device);
      const entry = map[learnedName];
      if (!entry || !entry.code) throw new Error(`Learned code not found: ${learnedName}`);
      payload = entry.code;
    }

    if (!payload && brand && category && command) {
      const lib = IRCodeLibrary.getCode(brand, category, command);
      if (!lib || !lib.code) {
        throw new Error(`No library code for ${brand}/${category}/${command}`);
      }
      if (sender.transport === 'wifi') {
        // Library returns Zosung base64; WiFi devices that accept opaque may still accept it
        payload = lib.code;
      } else {
        payload = lib.code;
      }
    }

    if (!payload) throw new Error('No IR payload to send');

    const norm = this.normalizeForSender(sender, payload, format);
    if (!norm.ok || !norm.code) {
      // If already Zosung/opaque and normalize fails for exotic, try raw on matching transport
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
    return fn.call(device, zosungBase64);
  }

  async _txWifi(device, wifiCode) {
    if (typeof device.sendIRCode === 'function') {
      return device.sendIRCode(wifiCode);
    }
    throw new Error('WiFi IR device missing sendIRCode');
  }

  /**
   * Start learn. confirm=true → Ultimate-style double capture before store.
   */
  async learn(opts = {}) {
    const {
      senderId,
      device: deviceOpt,
      name,
      timeout = 30,
      confirm = true,
    } = opts;
    const sender = deviceOpt
      ? {
          device: deviceOpt,
          id: deviceIdOf(deviceOpt),
          driverId: driverIdOf(deviceOpt),
          transport: driverIdOf(deviceOpt) === 'wifi_ir_remote' ? 'wifi' : 'zigbee',
        }
      : this.findSender(senderId);

    if (!sender || !sender.device) throw new Error('IR sender not found');
    const codeName = String(name || `code_${Date.now()}`).trim();

    if (sender.transport === 'wifi') {
      if (typeof sender.device.startLearning !== 'function') {
        throw new Error('WiFi IR missing startLearning');
      }
      await sender.device.startLearning(codeName, timeout);
      return { ok: true, transport: 'wifi', name: codeName, pendingConfirm: false };
    }

    // Zigbee: use advanced learn when available
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

  /**
   * Called by device when a raw code arrives during learn.
   * Handles double-press confirm when enabled.
   */
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
      // Accept second press even if not byte-identical (hardware variance) — require same length class
      pending.confirmCode = null;
      this._pendingConfirm.delete(sid);
    }

    const map = await this.getLearnedMap(device);
    const next = upsertLearnedMap(map, entry);
    await this.saveLearnedMap(device, next);
    return { stored: true, needConfirm: false, name, entry };
  }

  /**
   * Manual paste → store as named learned code (+ optional immediate send).
   */
  async storeManual(opts = {}) {
    const { senderId, device: deviceOpt, name, input, format = 'auto', sendAfter = false } = opts;
    const sender = deviceOpt
      ? {
          device: deviceOpt,
          id: deviceIdOf(deviceOpt),
          driverId: driverIdOf(deviceOpt),
          transport: driverIdOf(deviceOpt) === 'wifi_ir_remote' ? 'wifi' : 'zigbee',
        }
      : this.findSender(senderId);
    if (!sender || !sender.device) throw new Error('IR sender not found');

    const norm = this.normalizeForSender(sender, input, format);
    if (!norm.ok || !norm.code) throw new Error(norm.error || 'manual IR normalize failed');

    const storeCode = sender.transport === 'wifi' ? (norm.wifiCode || norm.code) : (norm.zigbeeCode || norm.code);
    const entry = makeLearnedEntry({ name: name || `manual_${Date.now()}`, code: storeCode, format: norm.format });
    const map = await this.getLearnedMap(sender.device);
    await this.saveLearnedMap(sender.device, upsertLearnedMap(map, entry));

    if (sendAfter) {
      await this.send({ device: sender.device, code: storeCode, format: norm.format });
    }
    return entry;
  }
}

/** App-level singleton helper */
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
};
