'use strict';
// v5.12.7: TuyaDeviceDiscovery - UDP LAN device discovery for Tuya WiFi devices
// Scans local network on ports 6666 (unencrypted) and 6667 (encrypted v3.3+)
// Pattern from tuyapi, TinyTuya scanner, tuya-local (HA), rebtor/nl.rebtor.tuya
const dgram = require('dgram');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// Tuya UDP discovery key (well-known, same across all implementations)
const UDP_KEY = Buffer.from('6c1ec8e2bb9bb59ab50b0daf649b5cb0', 'hex');
// Alternative: md5('yGAdlopoPVldABfn') used by some implementations
const UDP_KEY_ALT = crypto.createHash('md5').update('yGAdlopoPVldABfn').digest();
const UDP_KEY_RAW = Buffer.from('yGAdlopoPVldABfn');
const UDP_KEY_GCM = crypto.createHash('md5').update('yGAdlopoPVldABfn', 'utf8').digest();

const PORT_UNENCRYPTED = 6666;
const PORT_ENCRYPTED = 6667;
const PORT_GCM = 6668;
const DEFAULT_TIMEOUT = 10000;

class TuyaDeviceDiscovery extends EventEmitter {
  constructor({ log, timeout = DEFAULT_TIMEOUT } = {}) {
    super();
    this.log = log || console;
    this.timeout = timeout;
    this._devices = new Map();
    this._sockets = [];
    this._running = false;
  }

  // Start discovery scan, returns promise with all found devices
  async scan(timeoutMs) {
    const timeout = timeoutMs || this.timeout;
    this._devices.clear();
    this._running = true;
    this._startListening();
    return new Promise((resolve) => {
      this.homey.setTimeout(() => {
        if (this._destroyed) return;
        this.stop();
        resolve(Array.from(this._devices.values()));
      }, timeout);
    });
  }

  stop() {
    this._running = false;
    for (const sock of this._sockets) {
      try { sock.close(); } catch (e) { /* ignore */ }
    }
    this._sockets = [];
  }

  _startListening() {
    // Port 6666: unencrypted UDP broadcasts (protocol 3.1)
    this._listen(PORT_UNENCRYPTED, false, false);
    // Port 6667: encrypted UDP broadcasts (protocol 3.3+)
    this._listen(PORT_ENCRYPTED, true, false);
    // Port 6668: GCM encrypted UDP broadcasts (protocol 3.5)
    this._listen(PORT_GCM, true, true);
  }

  _listen(port, encrypted, gcm = false) {
    try {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      socket.on('message', (msg) => this._handleMessage(msg, encrypted, gcm));
      socket.on('error', (err) => {
        this.log.error(`UDP socket error on port ${  port  }:`, err.message);
      });
      socket.bind({ port: port, exclusive: false }, () => {
        try { socket.setBroadcast(true); } catch (e) { /* some OS dont support */ }
        this.log.log(`Listening for Tuya devices on UDP port ${  port}`);
      });
      this._sockets.push(socket);
    } catch (err) {
      this.log.error(`Failed to create UDP socket on port ${  port  }:`, err.message);
    }
  }

  _handleMessage(msg, encrypted, gcm = false) {
    try {
      if (msg.length < 28 || msg.length > 4096) {return;}
      let payload;
      if (encrypted && gcm) {
        payload = this._decryptUDPGCM(msg);
      } else if (encrypted) {
        payload = this._decryptUDP(msg);
      } else {
        // Unencrypted: strip Tuya header (20 bytes) and tail (8 bytes)
        const dataStart = msg.indexOf('{');
        const dataEnd = msg.lastIndexOf('}');
        if (dataStart >= 0 && dataEnd > dataStart) {
          payload = msg.slice(dataStart, dataEnd + 1).toString('utf8');
        }
      }
      if (!payload) {return;}
      const data = JSON.parse(payload);
      if (!data.gwId && !data.id) {return;}
      const deviceId = data.gwId || data.id;
      const device = {
        id: deviceId,
        ip: data.ip,
        version: data.version || (gcm ? '3.5' : '3.3'),
        productKey: data.productKey || '',
        encrypted: encrypted,
        gwId: data.gwId || '',
        active: data.active || 0,
        ablilty: data.ablilty || 0,
        encrypt: data.encrypt || false,
        discoveredAt: Date.now(),
      };
      const isNew = !this._devices.has(deviceId);
      this._devices.set(deviceId, device);
      if (isNew) {
        this.emit('device', device);
        this.log.log('Discovered Tuya device:', deviceId, 'at', data.ip, `(v${  device.version  })`);
      }
    } catch (err) {
      // Silently ignore malformed packets
    }
  }

  _decryptUDPGCM(msg) {
    try {
      let data = msg;
      if (data.length > 28) {
        const signature = data.readUInt32BE(0);
        if (signature === 0x000055AA || signature === 0x00006699) {
          data = data.slice(20, data.length - 8);
        }
      }
      if (data.length < 28) {return null;}
      const iv = data.slice(0, 12);
      const tag = data.slice(-16);
      const ct = data.slice(12, data.length - 16);
      const decipher = crypto.createDecipheriv('aes-128-gcm', UDP_KEY_GCM, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (err) { /* ignore */ }
    return null;
  }

  _decryptUDP(msg) {
    // Tuya UDP encrypted format:
    // Header (20 bytes) + encrypted payload + tail (8 bytes)
    // The payload is AES-128-ECB encrypted with the well-known UDP key
    try {
      // Try to find the encrypted data (skip header, remove tail)
      let data = msg;
      // Look for standard Tuya prefix 0x000055AA
      if (data.length > 28 && data.readUInt32BE(0) === 0x000055AA) {
        // Skip 20-byte header, remove 8-byte tail (4 CRC + 4 suffix 0x0000AA55)
        data = data.slice(20, data.length - 8);
      }
      // Try decryption with primary key
      let decrypted = this._aesDecryptECB(data, UDP_KEY);
      if (decrypted && decrypted.includes('{')) {return decrypted;}
      // Try alternative key
      decrypted = this._aesDecryptECB(data, UDP_KEY_ALT);
      if (decrypted && decrypted.includes('{')) {return decrypted;}
    } catch (err) { /* ignore */ }
    return null;
  }

  _aesDecryptECB(data, key) {
    try {
      const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
      decipher.setAutoPadding(true);
      let decrypted = decipher.update(data);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    } catch { return null; }
  }

  // Brand classification helper for multi-brand Tuya WiFi ecosystems (Moes, Lidl, Legrand, Somfy, Avatto, etc.)
  static classifyBrand(productKey, category, productName) {
    const name = (productName || '').toLowerCase();
    const cat = (category || '').toLowerCase();
    const pk = (productKey || '').toLowerCase();

    if (name.includes('moes') || pk.includes('moes') || pk.includes('mso')) {return 'Moes';}
    if (name.includes('lidl') || name.includes('silvercrest') || pk.includes('lidl') || pk.includes('slv')) {return 'Lidl';}
    if (name.includes('legrand') || name.includes('bticino') || pk.includes('legrand')) {return 'Legrand';}
    if (name.includes('somfy') || pk.includes('somfy')) {return 'Somfy';}
    if (name.includes('avatto') || pk.includes('avatto') || pk.includes('ava')) {return 'Avatto';}
    return 'Tuya / SmartLife';
  }

  // Classify category code or name into a user-friendly device type
  static classifyDeviceType(category, productKey, productName) {
    const cat = (category || '').toLowerCase();
    const name = (productName || '').toLowerCase();
    const pk = (productKey || '').toLowerCase();

    if (cat === 'dj' || name.includes('light') || name.includes('bulb') || name.includes('strip') || name.includes('led')) {
      return 'Light';
    }
    if (cat === 'tgq' || name.includes('dimmer')) {
      return 'Dimmer';
    }
    if (cat === 'kg' || name.includes('switch') || name.includes('button')) {
      return 'Switch';
    }
    if (cat === 'cz' || name.includes('plug') || name.includes('outlet') || name.includes('socket')) {
      return 'Plug';
    }
    if (cat === 'cl' || name.includes('curtain') || name.includes('shutter') || name.includes('roller')) {
      return 'Curtain Motor';
    }
    if (cat === 'wk' || name.includes('thermostat') || name.includes('heater') || name.includes('trv')) {
      return 'Thermostat';
    }
    if (cat === 'pir' || name.includes('motion') || name.includes('presence') || name.includes('radar')) {
      return 'Motion Sensor';
    }
    if (cat === 'cr' || name.includes('contact') || name.includes('door') || name.includes('window')) {
      return 'Contact Sensor';
    }
    if (cat === 'sg' || cat === 'smoke' || name.includes('smoke')) {
      return 'Smoke Detector';
    }
    if (cat === 'ws' || name.includes('water') || name.includes('leak') || name.includes('rain')) {
      return 'Water Sensor';
    }
    if (cat === 'bj' || name.includes('siren') || name.includes('alarm')) {
      return 'Siren';
    }
    if (cat === 'ms' || name.includes('lock')) {
      return 'Smart Lock';
    }
    if (cat === 'wg' || cat === 'wg2' || name.includes('gateway') || name.includes('bridge') || name.includes('hub')) {
      return 'Zigbee Gateway';
    }
    return 'Generic Tuya Device';
  }

  // Match discovered devices with cloud device list (to pair local_key with IP)
  static matchDevices(cloudDevices, discoveredDevices) {
    const matched = [];
    for (const cloud of cloudDevices) {
      const found = discoveredDevices.find(d => d.id === cloud.id);
      const brand = TuyaDeviceDiscovery.classifyBrand(cloud.product_id, cloud.category, cloud.product_name || cloud.name);
      const deviceType = TuyaDeviceDiscovery.classifyDeviceType(cloud.category, cloud.product_id, cloud.product_name || cloud.name);
      matched.push({
        ...cloud,
        ip: found ? found.ip : cloud.ip || '',
        version: found ? found.version : '3.3',
        discovered: !!found,
        brand: brand,
        deviceType: deviceType,
      });
    }
    return matched;
  }
}

TuyaDeviceDiscovery.PORT_UNENCRYPTED = PORT_UNENCRYPTED;
TuyaDeviceDiscovery.PORT_ENCRYPTED = PORT_ENCRYPTED;
module.exports = TuyaDeviceDiscovery;