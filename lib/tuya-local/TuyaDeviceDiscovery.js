const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');
'use strict';
// v5.12.7: TuyaDeviceDiscovery - UDP LAN device discovery for Tuya WiFi devices
// Scans local network on ports 6666 (unencrypted) and 6667 (encrypted v3.3+)
// Pattern from tuyapi, TinyTuya scanner, tuya-local (HA), rebtor/nl.rebtor.tuya
const dgram = require('dgram');
const { EventEmitter } = require('events');
const {
  decryptUdpEcb,
  decryptUdpGcm,
  stripUdpFrame,
  buildActiveProbePayload,
} = require('./UdpDiscoveryKeys');

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
    this._scanTimer = null;
    this._scanResolve = null;
  }

  // Start discovery scan, returns promise with all found devices
  async scan(timeoutMs) {
    const timeout = timeoutMs || this.timeout;
    this._devices.clear();
    this._running = true;
    this._startListening();
    this._sendActiveProbe();
    return new Promise((resolve) => {
      this._scanResolve = resolve;
      this._scanTimer = safeSetTimeout(() => {
        this._finishScan();
      }, timeout);
      this._scanTimer.unref?.();
    });
  }

  _finishScan() {
    const resolve = this._scanResolve;
    this._scanResolve = null;
    this.stop();
    if (resolve) {
      resolve(Array.from(this._devices.values()));
    }
  }

  stop() {
    this._running = false;
    if (this._scanTimer) {
      clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
    for (const sock of this._sockets) {
      try { sock.close(); } catch (e) { /* ignore */ }
    }
    this._sockets = [];
    if (this._scanResolve) {
      const resolve = this._scanResolve;
      this._scanResolve = null;
      resolve(Array.from(this._devices.values()));
    }
  }

  _startListening() {
    // Port 6666: unencrypted UDP broadcasts (protocol 3.1)
    this._listen(PORT_UNENCRYPTED, false, false);
    // Port 6667: encrypted UDP broadcasts (protocol 3.3+)
    this._listen(PORT_ENCRYPTED, true, false);
    // Port 6668: GCM encrypted UDP broadcasts (protocol 3.5)
    this._listen(PORT_GCM, true, true);
    // Port 7000: legacy unencrypted broadcasts (TinyTuya-documented, older 3.1)
    this._listen(7000, false, false);
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
      if (msg.length < 8 || msg.length > 4096) { return; }
      const { decryptUdpDiscoveryMessage, guessProtocolFromDiscovery } = require('./UdpDiscoveryKeys');
      const decoded = decryptUdpDiscoveryMessage(msg);
      if (!decoded?.payload) { return; }
      let data;
      try { data = JSON.parse(decoded.payload); } catch { return; }
      if (!data.gwId && !data.id) { return; }
      const deviceId = data.gwId || data.id;
      const version = guessProtocolFromDiscovery({
        version: data.version,
        frame: decoded.frame,
        encrypted: encrypted || !!data.encrypt,
        gcm: gcm || decoded.frame === '6699',
      });
      const device = {
        id: deviceId,
        ip: data.ip,
        version,
        productKey: data.productKey || '',
        encrypted: encrypted || decoded.frame !== 'plaintext',
        frame: decoded.frame,
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
        this.log.log('Discovered Tuya device:', deviceId, 'at', data.ip, `(v${device.version}/${decoded.frame})`);
      }
    } catch (_err) {
      // Silently ignore malformed packets
    }
  }

  _decryptUDPGCM(msg) {
    const { decrypt6699Frame, decryptUdpGcm, stripUdpFrame } = require('./UdpDiscoveryKeys');
    return decrypt6699Frame(msg) || decryptUdpGcm(stripUdpFrame(msg));
  }

  _decryptUDP(msg) {
    const { decryptUdpEcb, stripUdpFrame } = require('./UdpDiscoveryKeys');
    return decryptUdpEcb(stripUdpFrame(msg));
  }

  _aesDecryptECB(data, key) {
    try {
      const crypto = require('crypto');
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

  /** TinyTuya active probe during pairing scan — plaintext + 3.5 GCM solicitation */
  _sendActiveProbe() {
    const {
      buildActiveProbePayload,
      packDiscoverySolicitation,
      listLanBroadcastTargets,
    } = require('./UdpDiscoveryKeys');
    const targets = listLanBroadcastTargets();
    for (const sock of this._sockets) {
      for (const t of targets) {
        try {
          const plain = Buffer.from(buildActiveProbePayload(t.ip));
          sock.send(plain, PORT_UNENCRYPTED, t.broadcast);
          sock.send(plain, PORT_ENCRYPTED, t.broadcast);
          const gcmPkt = packDiscoverySolicitation(t.ip);
          sock.send(gcmPkt, 7000, t.broadcast);
          sock.send(gcmPkt, PORT_ENCRYPTED, t.broadcast);
        } catch { /* non-fatal */ }
      }
    }
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
