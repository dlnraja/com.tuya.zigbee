'use strict';
// v5.12.9: TuyaLocalDevice - Enhanced base class for Tuya WiFi local LAN control
// Uses the highly robust, rate-limited and queued TuyaLocalClient wrapper.
// Pattern from: tuya-local (HA), heszegi, rebtor, TinyTuya, Drenso/com.tuya2
const Homey = require('homey');
const TuyaLocalClient = require('./TuyaLocalClient');
const CapabilityMapCache = require('../utils/CapabilityMapCache');
const { getDeviceCache, removeDeviceCache } = require('../managers/DPCache');
// v9.0.40: SmartDivisorManager for WiFi devices with smartDivisor: true
const { smartParse } = require('../managers/SmartDivisorManager');
const { allowsCloudFallback, normalizeWiFiConnectionPolicy } = require('../wifi/WiFiConnectionPolicy');

class TuyaLocalDevice extends Homey.Device {
  /** Override: capability-to-DP mappings [{capability, dp, toDevice, fromDevice}] */
  get capabilityMap() {
    // v9.0.40: Use centralized CapabilityMapCache (WeakMap) for GC-friendly caching
    const cached = CapabilityMapCache.get(this);
    if (cached) return cached;

    if (this.dpMappings) {
      const map = [];
      for (const [dp, cfg] of Object.entries(this.dpMappings)) {
        if (cfg && cfg.capability) {
          const dpNum = isNaN(dp) ? dp : parseInt(dp, 10);
          map.push({
            capability: cfg.capability,
            dp: dpNum,
            toDevice: cfg.reverseTransform || ((v) => {
              if (cfg.divisor) {return v * cfg.divisor;}
              if (cfg.multiplier) {return v / cfg.multiplier;}
              return v;
            }),
            fromDevice: cfg.transform || ((v) => {
              // v9.0.40: SmartDivisorManager auto-detection for WiFi devices
              // Fixes 1000x energy bug (raw kWh*100 values shown as-is)
              if (cfg.smartDivisor === true) {
                return smartParse(v, dpNum, {
                  manufacturerName: this.getSetting?.('zb_manufacturer_name') || '',
                  capability: cfg.capability,
                  deviceId: this.getData?.()?.id || '',
                  protocol: 'wifi',
                });
              }
              if (cfg.divisor) {return v / cfg.divisor;}
              if (cfg.multiplier) {return v * cfg.multiplier;}
              return v;
            })
          });
        }
      }
      CapabilityMapCache.set(this, map);
      return map;
    }
    CapabilityMapCache.set(this, []);
    return [];
  }
  /** Override: protocol version (default auto-detect) */
  get protocolVersion() { return 'auto'; }

  
  /** Safe app getter to prevent proxy crash */
  get safeApp() {
    try { if (!this.homey || this.homey.isDestroyed) return null; return this.homey.app; } catch(e) { return null; }
  }

  /**
   * safeSetCapabilityValue - Hardened setter that checks _destroyed flag
   * Required by CORE_RULES R1: prevents crashes after device destroy
   */
  async safeSetCapabilityValue(capability, value) {
    if (this._destroyed) return;
    try {
      if (!this.hasCapability(capability)) return;
      const previousValue = this.getCapabilityValue(capability);
      const result = await this.setCapabilityValue(capability, value);

      // v9.2.0: Generic capability change trigger (Device Capabilities inspired)
      if (value !== previousValue) {
        try {
          const app = this.homey?.app;
          if (app?.featureFlowCards?.triggerCapabilityChanged) {
            const deviceId = this.getData?.()?.id || this.getId?.();
            app.featureFlowCards.triggerCapabilityChanged(deviceId, capability, value, previousValue);
          }
        } catch (_e) { /* non-critical */ }
      }

      return result;
    } catch (err) {
      // Only log if not destroyed (avoid post-cleanup noise)
      if (!this._destroyed) {
        this.error(`[safeSet] ${capability} failed:`, err.message || err);
      }
    }
  }

  /**
   * v9.0.40: SDK3 isFirstInit() pattern - returns true only on first pairing
   * Use this for one-time setup actions (adding capabilities, initial configuration)
   * that should not repeat on every app restart.
   * @returns {boolean}
   */
  isFirstInit() {
    if (this.getStoreValue('_isFirstInitDone')) return false;
    this.setStoreValue('_isFirstInitDone', true).catch(() => {});
    return true;
  }

  getWiFiConnectionPolicy() {
    const stored = this.getStoreValue?.('wifi_connection_policy') || this.getStoreValue?.('wifiConnectionPolicy') || {};
    return normalizeWiFiConnectionPolicy(stored);
  }

  _allowsCloudKeyRecovery() {
    return allowsCloudFallback(this.getWiFiConnectionPolicy());
  }

  async onInit() {
    this.log('TuyaLocalDevice init:', this.getName());
    this._destroyed = false; // v9.0.40: Lifecycle guard
    this._connected = false;
    this._client = null;
    this._lastKnownDps = null; // v9.0.40: Cached DP values for offline mode

    // v9.0.40: Initialize DP cache for offline fallback
    this._dpCache = getDeviceCache(this.getId());

    // v9.0.40: Warm up capability map cache
    CapabilityMapCache.warmup(this);

    for (const cap of this.capabilityMap) {
      if (!this.hasCapability(cap.capability)) {continue;}
      this.registerCapabilityListener(cap.capability, async (value) => {
        const dpValue = cap.toDevice ? cap.toDevice(value) : value;
        await this._setDP(cap.dp, dpValue);
      });
    }
    await this._createDevice();
  }

  async _createDevice() {
    const settings = this.getSettings();
    const deviceId = settings.device_id;
    const localKey = settings.local_key || settings.device_key;
    const ipAddress = settings.ip || settings.device_ip || settings.ip_address;

    if (!deviceId || !localKey) {
      this.log('Missing device_id or local_key/device_key');
      await this.setUnavailable('Missing device credentials.');
      return;
    }
    try {
      const version = settings.protocol_version || this.protocolVersion;
      this._client = new TuyaLocalClient({
        id: deviceId,
        key: localKey,
        ip: ipAddress || undefined,
        version: version === 'auto' ? '3.3' : version,
        autoDetectProtocol: version === 'auto',
        resolveIP: (id) => {
          if (this.homey && this.safeApp && this.safeApp?._tuyaUDPDiscovery) {
            const discovered = this.safeApp?._tuyaUDPDiscovery.getDevice(id);
            return discovered ? discovered.ip : null;
          }
          return null;
        },
        log: (...args) => this.log('[TUYA-TCP]', ...args),
      });

      this._client.on('connected', () => this._onConnected());
      this._client.on('disconnected', () => this._onDisconnected());
      this._client.on('error', (err) => this._onError(err));
      this._client.on('dp-update', (dps) => this._onData({ dps }));
      this._client.on('auth-error', (err) => {
        if (this._allowsCloudKeyRecovery()) {
          this.setWarning('Authentication failed: Local key might have changed. Attempting opted-in cloud recovery...');
          this._attemptLocalKeyRecovery();
          return;
        }
        this.setWarning('Authentication failed: Local key might have changed. Local-first mode keeps cloud fallback disabled; update the key from Repair.');
      });

      // v9.0.40: Connection state tracking for offline mode
      this._client.on('connection-state', (state) => {
        if (this._destroyed) return;
        if (state === 'disconnected') {
          this._lastKnownDps = { ...this._client.lastDps };
          this.log(`[OFFLINE] Device offline. Cached ${Object.keys(this._lastKnownDps).length} DP values.`);
        } else if (state === 'connected' && this._lastKnownDps) {
          this.log('[OFFLINE] Device back online. Resuming normal operation.');
          this._lastKnownDps = null;
        }
      });

      // v7.5.0: Dynamic IP self-healing cache
      this._client.on('ip-resolved', (resolvedIp) => {
        const settings = this.getSettings();
        const newSettings = {};
        if (settings.ip !== undefined && settings.ip !== resolvedIp) newSettings.ip = resolvedIp;
        if (settings.device_ip !== undefined && settings.device_ip !== resolvedIp) newSettings.device_ip = resolvedIp;
        if (settings.ip_address !== undefined && settings.ip_address !== resolvedIp) newSettings.ip_address = resolvedIp;

        if (Object.keys(newSettings).length > 0) {
          this.log(`[TUYA-TCP] Dynamic IP change detected, storing resolved IP ${resolvedIp} in settings`);
          this.setSettings(newSettings).catch(this.error);
        }
      });

      // v7.5.0: Dynamic Protocol Version self-healing cache
      this._client.on('version-resolved', (resolvedVersion) => {
        const settings = this.getSettings();
        if (settings.protocol_version !== undefined && settings.protocol_version !== resolvedVersion) {
          this.log(`[TUYA-TCP] Auto-detected protocol version v${resolvedVersion}, storing in settings`);
          this.setSettings({ protocol_version: resolvedVersion }).catch(this.error);
        }
      });

      await this._client.connect();
    } catch (err) {
      this.error('TuyaLocalClient create failed:', err.message);
      await this.setUnavailable(`Client: ${  err.message}`);
    }
  }

  _onConnected() {
    if (this._destroyed) return; // v9.0.40: Guard
    this.log('Connected');
    this._connected = true;
    this.setAvailable().catch(this.error);
    this.unsetWarning();

    // v9.0.40: Periodic UPDATEDPS command to force WiFi devices to refresh data points
    // Prevents stale data when device doesn't proactively report changes
    this._startUpdatedpsPolling();
  }

  /**
   * v9.0.40: Start periodic UPDATEDPS polling for WiFi devices
   * Sends an empty set command to trigger the device to report all current DP values
   */
  _startUpdatedpsPolling() {
    this._stopUpdatedpsPolling();
    const intervalMs = 60000; // Every 60 seconds
    this._updatedpsInterval = this.homey.setInterval(async () => {
      if (this._destroyed || !this._connected || !this._client) return;
      try {
        // Send UPDATEDPS command (empty dps object forces device to refresh all DPs)
        await this._client.refresh();
      } catch (err) {
        // Non-critical - just log and continue
        if (!this._destroyed) {
          this.log('[UPDATEDPS] Refresh failed (non-critical):', err.message);
        }
      }
    }, intervalMs);
  }

  /**
   * v9.0.40: Stop UPDATEDPS polling
   */
  _stopUpdatedpsPolling() {
    if (this._updatedpsInterval) {
      clearInterval(this._updatedpsInterval);
      this._updatedpsInterval = null;
    }
  }

  _onDisconnected() {
    if (this._destroyed) return; // v9.0.40: Guard
    this.log('Disconnected - entering offline mode');
    this._connected = false;
    // v9.0.40: Don't mark unavailable immediately - let client retry with backoff
    // Only mark unavailable after sustained disconnection (handled by connection-state event)
    this.setWarning('Device disconnected. Reconnecting automatically...');
  }

  _onError(err) {
    if (this._destroyed) return; // v9.0.40: Guard
    const msg = err.message || '';
    this.error('Device error:', msg);
    if (msg.includes('find()') || msg.includes('timeout')) {
      this.setWarning('Discovery timeout: Please assign a Static IP in settings if your router blocks UDP broadcasts.');
    }
  }

  async _onData(data) {
    if (this._destroyed) return; // v9.0.40: Guard against post-destroy data
    if (!data || !data.dps) {return;}
    this.log('DPs:', JSON.stringify(data.dps));

    // v9.0.40: Cache DP values for offline fallback
    if (this._dpCache) {
      this._dpCache.updateFromDps(data.dps);
    }

    try {
      await this._processDPUpdate(data.dps);
    } catch (err) {
      this.error('[TUYA-TCP] Raw DP hook failed:', err.message || err);
    }

    for (const cap of this.capabilityMap) {
      if (data.dps[cap.dp] !== undefined) {
        const value = cap.fromDevice ? cap.fromDevice(data.dps[cap.dp]) : data.dps[cap.dp];
        await this.safeSetCapabilityValue(cap.capability, value).catch(this.error);
      }
    }
  }

  async _processDPUpdate(_dps) {
    // Optional subclass hook for generic/raw DP drivers.
  }

  async _setDP(dp, value) {
    if (!this._client) {
      throw new Error('Device client not initialized');
    }
    // v9.0.40: Let TuyaLocalClient handle offline queuing
    const dpId = isNaN(dp) ? dp : parseInt(dp, 10);
    await this._client.setDP(dpId, value);
  }

  async _setMultipleDPs(dpsObj) {
    if (!this._client) {
      throw new Error('Device client not initialized');
    }
    await this._client.setDPs(dpsObj);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    let needsRecreation = false;
    for (const key of changedKeys) {
      if (['device_id', 'local_key', 'device_key'].includes(key)) {
        needsRecreation = true;
      }
      if (['ip', 'device_ip', 'ip_address'].includes(key)) {
        const val = newSettings[key];
        if (this._client && val !== this._client.ip) {
          needsRecreation = true;
        }
      }
      if (key === 'protocol_version') {
        const val = newSettings[key];
        if (this._client && val !== this._client.version) {
          needsRecreation = true;
        }
      }
    }

    if (needsRecreation) {
      this.log('[TUYA-TCP] Setting change requires client recreation, restarting connection...');
      this._destroyDevice();
      await this._createDevice();
    }
  }


  _destroyDevice() {
    this._stopUpdatedpsPolling(); // v9.0.40: Stop UPDATEDPS polling
    if (this._client) {
      try {
        this._client.destroy();
      } catch (e) { /* ignore */ }
      this._client = null;
    }
    this._connected = false;
  }

  async _attemptLocalKeyRecovery() {
    if (!this._allowsCloudKeyRecovery()) {
      this.log('[TUYA-TCP] Cloud key recovery skipped by local-first policy.');
      return;
    }
    if (this._isRecoveringKey) return;
    // v9.0.40: Max 3 retry attempts, then cool down for 1 hour
    if (!this._keyRecoveryAttempts) this._keyRecoveryAttempts = 0;
    if (this._keyRecoveryAttempts >= 3) {
      if (!this._keyRecoveryCooldown || Date.now() - this._keyRecoveryCooldown < 3600000) return;
      this._keyRecoveryAttempts = 0; // Reset after cooldown
    }
    this._isRecoveringKey = true;
    
    this.log('[TUYA-TCP] 🔄 Attempting intelligent Local Key auto-recovery...');
    
    try {
      const accessId = this.homey.settings.get('tuya_cloud_access_id');
      const accessKey = this.homey.settings.get('tuya_cloud_access_secret');
      const region = this.homey.settings.get('tuya_cloud_region') || 'eu';
      
      if (!accessId || !accessKey) {
        this.log('[TUYA-TCP] ❌ Cannot auto-recover key: Cloud API credentials missing in app settings.');
        this._isRecoveringKey = false;
        return;
      }
      
      const deviceId = this.getSettings().device_id;
      if (!deviceId) {
        this._isRecoveringKey = false;
        return;
      }

      const TuyaCloudAPI = require('./TuyaCloudAPI');
      const api = new TuyaCloudAPI({ accessId, accessKey, region, log: this.log.bind(this) });
      
      this.log(`[TUYA-TCP] ☁️ Fetching fresh local_key for device ${deviceId}...`);
      const res = await api.getDeviceInfo(deviceId);
      
      if (res && res.success && res.result && res.result.local_key) {
        const newLocalKey = res.result.local_key;
        this.log(`[TUYA-TCP] ✅ New local_key fetched successfully!`);
        
        // Update settings without triggering onSettings reload (or handle it correctly)
        await this.setSettings({ local_key: newLocalKey }).catch(this.error);
        
        if (this._client) {
          this._client.updateKey(newLocalKey);
          // The client will use the new key on its next auto-reconnect attempt
        }
        this.setWarning('Local key auto-recovered successfully. Reconnecting...');
      } else {
        this.log('[TUYA-TCP] ❌ Cloud API returned failure or no local_key:', res);
        this.setWarning('Auto-recovery failed. Please check your Cloud API credentials or re-pair.');
      }
    } catch (err) {
      this.error('[TUYA-TCP] ❌ Auto-recovery error:', err.message);
    }

    this._keyRecoveryAttempts++; // v9.0.40: Track attempts
    if (this._keyRecoveryAttempts >= 3) {
      this._keyRecoveryCooldown = Date.now(); // v9.0.40: Start cooldown
      this.log('[TUYA-TCP] ⏸️ Key recovery max attempts reached, cooling down for 1 hour');
    }
    this._isRecoveringKey = false;
  }

  async onUninit() {
    this._destroyed = true; // v9.0.40: Set before cleanup
    CapabilityMapCache.invalidate(this); // v9.0.40: Release cache on uninit
    if (this._dpCache) { this._dpCache.destroy(); this._dpCache = null; }
    this._destroyDevice();
    if (super.onUninit) {
      await super.onUninit();
    }
  }

  async onDeleted() {
    this._destroyed = true; // v9.0.40: Set before cleanup
    CapabilityMapCache.invalidate(this); // v9.0.40: Release cache on deletion
    removeDeviceCache(this.getId()); // v9.0.40: Remove DP cache on deletion
    this._dpCache = null;
    this._destroyDevice();
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }

  /**
   * triggerFlowCard - Safe helper to trigger a device flow card using modern SDKv3 API
   * Follows strict SDK3 patterns for device-specific triggers.
   *
   * @param {string} cardId - Flow trigger card ID
   * @param {Object} [tokens={}] - Dynamic flow tokens
   * @param {Object} [state={}] - Flow card state
   * @returns {Promise<boolean>} - True if triggered successfully
   */
  async triggerFlowCard(cardId, tokens = {}, state = {}) {
    this.log(`[FLOW] 🎬 Triggering card: ${cardId}`);
    try {
      let card = null;

      // 1. Try modern SDKv3 getDeviceTriggerCard
      if (this.homey.flow && typeof this.homey.flow.getDeviceTriggerCard === 'function') {
        try {
          card = this.homey.flow.getDeviceTriggerCard(cardId);
        } catch (e) {
          // If not found as device trigger
        }
      }

      if (card && typeof card.trigger === 'function') {
        await card.trigger(this, tokens, state);
        this.log(`[FLOW] ✅ Card triggered successfully: ${cardId}`);
        return true;
      } else {
        this.log(`⚠️ [FLOW] Card not found or trigger is not a function: ${cardId}`);
      }
    } catch (err) {
      this.error(`❌ [FLOW] Error triggering card ${cardId}:`, err.message);
    }
    return false;
  }

}

module.exports = TuyaLocalDevice;
