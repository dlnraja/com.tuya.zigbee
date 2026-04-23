'use strict';
const { safeMultiply } = require('../utils/tuyaUtils.js');
// v5.12.7: TuyaCloudMQTT - MQTT real-time updates for Tuya Cloud devices
// Pattern from jurgenheine/com.tuya.cloud (tuyamqttapi.js) + Drenso/com.tuya2 (TuyaHaClient.ts)
// Supports both v1.0 (AES-ECB) and v2.0 (AES-128-GCM) message encryption
const crypto = require('crypto');
const GCM_TAG_LENGTH = 16;

class TuyaCloudMQTT {
  constructor({ api, version = '2.0', log }) {
    this.api = api;
    this.version = version;
    this.log = log || console;
    this.client = null;
    this.running = false;
    this.listeners = new Set();
    this.deviceTopic = null;
    this._reconnectTimer = null;
  }

  async start() {
    this.running = true;
    await this._connect();
  }

  stop() {
    this.running = false;
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this.client) {
      try { this.client.end(true); } catch (e) { /* ignore */ }
      this.client = null;
    }
  }

  async _connect() {
    if (!this.running) return;
    try {
      const mqtt = require('mqtt');
      const config = await this.api._post('/v1.0/iot-03/open-hub/access-config', {
        uid: this.api.tokenInfo.uid,
        link_id: crypto.randomUUID(),
        link_type: 'mqtt',
        topics: 'device',
        msg_encrypted_version: this.version,
      });
      if (!config.success || !config.result) {
        this.log.error('MQTT config failed:', config);
        this._scheduleReconnect(30000);
        return;
      }
      const { url, client_id, username, password, expire_time, source_topic } = config.result;
      this.deviceTopic = source_topic.device;
      this.log.log('MQTT connecting:', url);

      if (this.client) { try { this.client.end(true); } catch (e) { /* */ } }
      this.client = mqtt.connect(url, { clientId: client_id, username, password });

      this.client.on('connect', () => {
        this.log.log('MQTT connected');
        this.client.subscribe(this.deviceTopic);
      });
      this.client.on('error', (err) => this.log.error('MQTT error:', err.message));
      this.client.on('end', () => this.log.log('MQTT ended'));
      this.client.on('message', (topic, payload) => this._onMessage(password, topic, payload));

      // Reconnect before token expires (expire_time is in seconds)
      const reconnectMs =Math.max((expire_time - 60, 1000), 60000);
      this._scheduleReconnect(reconnectMs);
    } catch (err) {
      this.log.error('MQTT connect error:', err.message);
      this._scheduleReconnect(30000);
    }
  }

  _scheduleReconnect(ms) {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this._connect(), ms);
  }

  _onMessage(password, topic, payload) {
    try {
      const message = JSON.parse(payload.toString());
      const decrypted = this.version === '2.0'
        ? this._decryptV2(message.data, password, message.t)
        : this._decryptV1(message.data, password);
      const data = JSON.parse(decrypted);
      this.log.log('MQTT message:', JSON.stringify(data));
      for (const listener of this.listeners) {
        try { listener(data); } catch (e) { this.log.error('Listener error:', e.message); }
      }
    } catch (err) {
      this.log.error('MQTT message parse error:', err.message);
    }
  }

  // v1.0: AES-ECB with password[8:24]
  _decryptV1(b64msg, password) {
    const key = password.substring(8, 24);
    const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(key, 'utf8'), null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(Buffer.from(b64msg, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  // v2.0: AES-128-GCM with IV, AAD=timestamp, AuthTag
  _decryptV2(b64data, password, timestamp) {
    const buf = Buffer.from(b64data, 'base64');
    const key = password.substring(8, 24);
    const ivLen = buf.readUIntBE(0, 4);
    const iv = buf.slice(4, ivLen + 4);
    const data = buf.slice(ivLen + 4, buf.length - GCM_TAG_LENGTH);
    const tag = buf.slice(buf.length - GCM_TAG_LENGTH);
    const aad = Buffer.allocUnsafe(6);
    aad.writeUIntBE(timestamp, 0, 6);
    const decipher = crypto.createDecipheriv('aes-128-gcm', Buffer.from(key, 'utf8'), iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(aad);
    let decrypted = decipher.update(data);
    return decrypted.toString('utf8');
  }

  onMessage(listener) { this.listeners.add(listener); }
  offMessage(listener) { this.listeners.delete(listener); }
}

module.exports = TuyaCloudMQTT;
