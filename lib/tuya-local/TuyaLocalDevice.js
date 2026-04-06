const Homey = require('homey');
const TuyaLocalClient = require('./TuyaLocalClient');
const CapabilityManagerMixin = require('../mixins/CapabilityManagerMixin');

class TuyaLocalDevice extends Homey.Device {
  /** Override: capability-to-DP mappings [{capability, dp, toDevice, fromDevice}] */
  get capabilityMap() { return []; }
  /** Override: protocol version (default auto-detect) */
  get protocolVersion() { return 'auto'; }

  async onInit() {
    this.log('TuyaLocalDevice init:', this.getName());
    this._client = null;

    // v7.0.0: Apply BVB Safety Logic
    Object.assign(this, CapabilityManagerMixin);

    for (const cap of this.capabilityMap) {
      if (!this.hasCapability(cap.capability)) continue;
      this.registerCapabilityListener(cap.capability, async (value) => {
        const dpValue = cap.toDevice ? cap.toDevice(value) : value;
        await this._setDP(cap.dp, dpValue);
      });
    }
    await this._initClient();
  }

  async _initClient() {
    const settings = this.getSettings();
    const { device_id, local_key, ip_address } = settings;
    if (!device_id || !local_key) {
      this.log('Missing device_id or local_key');
      await this.setUnavailable('Missing device credentials.');
      return;
    }

    const version = settings.protocol_version || this.protocolVersion;
    
    this._client = new TuyaLocalClient({
      id: device_id,
      key: local_key,
      ip: ip_address || null,
      version: version === 'auto' ? '3.3' : version,
      autoDetectProtocol: version === 'auto',
      autoHealing: true,
      log: (msg) => this.log(msg),
    });

    this._client.on('connected', () => {
      this.log('Connected');
      this.setAvailable().catch(this.error);
      this.unsetWarning();
    });

    this._client.on('disconnected', () => {
      this.log('Disconnected');
      this.setUnavailable('Disconnected').catch(this.error);
    });

    this._client.on('dp-update', (dps) => {
      this._onData(dps);
    });

    this._client.on('ip-updated', (newIp) => {
      this.log('IP Auto-Healed to:', newIp);
      this.setSettings({ ip_address: newIp }).catch(this.error);
    });

    this._client.on('auth-error', () => {
      this.setWarning('Authentication failed: Local key might have changed.');
    });

    this._client.on('error', (err) => {
      if (err.message.includes('timeout') || err.message.includes('find')) {
        this.setWarning('Discovery timeout: Check IP or LAN broadcast permissions.');
      }
    });

    await this._client.connect();
  }

  _onData(dps) {
    if (!dps) return;
    this.log('DPs:', JSON.stringify(dps));
    for (const cap of this.capabilityMap) {
      if (dps[cap.dp] !== undefined) {
        const value = cap.fromDevice ? cap.fromDevice(dps[cap.dp]) : dps[cap.dp];
        // v7.0.0: Robust Setter with Throttling/BVB/Calibration
        this._safeSetCapability(cap.capability, value).catch(this.error);
      }
    }
  }

  async _setDP(dp, value) {
    if (!this._client || !this._client.connected) {
      throw new Error('Device not connected');
    }
    const dpNum = parseInt(dp, 10);
    await this._client.setDP(dpNum, value);
  }

  async _setMultipleDPs(dpsObj) {
    if (!this._client || !this._client.connected) {
      throw new Error('Device not connected');
    }
    await this._client.setDPs(dpsObj);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.some(k => ['device_id','local_key','ip_address','protocol_version'].includes(k))) {
      if (this._client) await this._client.destroy();
      await this._initClient();
    }
  }

  async onDeleted() {
    if (this._client) await this._client.destroy();
  }
}

module.exports = TuyaLocalDevice;