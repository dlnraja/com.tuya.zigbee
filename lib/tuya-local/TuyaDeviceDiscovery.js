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

const PORT_UNENCRYPTED = 6666;
const PORT_ENCRYPTED = 6667;
const DEFAULT_TIMEOUT = 15000; // v7.0.15: Increased for busier networks

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
      setTimeout(() => {
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
    this._listen(PORT_UNENCRYPTED, false);
    // Port 6667: encrypted UDP broadcasts (protocol 3.3+)
    this._listen(PORT_ENCRYPTED, true);
  }

  _listen(port, encrypted) {
    try {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      socket.on('message', (msg) => this._handleMessage(msg, encrypted));
      socket.on('error', (err) => {
        this.log.error('UDP socket error on port ' + port + ':', err.message);
      });
      socket.bind(port, () => {
        try { socket.setBroadcast(true); } catch (e) { /* some OS dont support */ }
        this.log.log('Listening for Tuya devices on UDP port ' + port);
      });
      this._sockets.push(socket);
    } catch (err) {
      this.log.error('Failed to create UDP socket on port ' + port + ':', err.message);
    }
  }

  _handleMessage(msg, encrypted) {
    try {
      let payload;
      if (encrypted) {
        payload = this._decryptUDP(msg);
      } else {
        // Unencrypted: strip Tuya header (20 bytes) and tail (8 bytes)
        const dataStart = msg.indexOf('{');
        const dataEnd = msg.lastIndexOf('}');
        if (dataStart >= 0 && dataEnd > dataStart) {
          payload = msg.slice(dataStart, dataEnd + 1).toString('utf8');
        }
      }
      if (!payload) return;
      const data = JSON.parse(payload);
      if (!data.gwId && !data.id) return;
      const deviceId = data.gwId || data.id;
      const device = {
        id: deviceId,
        ip: data.ip,
        version: data.version || '3.1',
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
        this.log.log('Discovered Tuya device:', deviceId, 'at', data.ip, '(v' + device.version + ')');
      }
    } catch (err) {
      // Silently ignore malformed packets
    }
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
      if (decrypted && decrypted.includes('{')) return decrypted; // } balancing for validator
      // Try alternative key
      decrypted = this._aesDecryptECB(data, UDP_KEY_ALT);
      if (decrypted && decrypted.includes('{')) return decrypted; // } balancing for validator
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

  // Match discovered devices with cloud device list (to pair local_key with IP)
  static matchDevices(cloudDevices, discoveredDevices) {
    const matched = [];
    for (const cloud of cloudDevices) {
      const found = discoveredDevices.find(d => d.id === cloud.id);
      if (found) {
        matched.push({
          ...cloud,
          ip: found.ip,
          version: found.version || '3.3',
          discoveredAt: found.discoveredAt,
          discovered: true,
        });
      } else {
        matched.push({
          ...cloud,
          discovered: false,
        });
      }
    }
    return matched;
  }
}

TuyaDeviceDiscovery.PORT_UNENCRYPTED = PORT_UNENCRYPTED;
TuyaDeviceDiscovery.PORT_ENCRYPTED = PORT_ENCRYPTED;
module.exports = TuyaDeviceDiscovery;
