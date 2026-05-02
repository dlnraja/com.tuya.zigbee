'use strict';

const { safeDivide, safeMultiply } = require('../utils/tuyaUtils.js');
const Homey = require('homey');
const TuyaWiFiHybridManager = require('./TuyaWiFiHybridManager');
const CapabilityManagerMixin = require('../mixins/CapabilityManagerMixin');
const VirtualEnergyMeterMixin = require('../mixins/VirtualEnergyMeterMixin');

/**
 * TuyaLocalDevice v2.0.0
 * 
 * Base class for all Tuya WiFi devices.
 * Uses TuyaWiFiHybridManager for Local-First communication with Cloud fallback.
 */
class TuyaLocalDevice extends Homey.Device {
  /** Override: capability-to-DP mappings Array or dpMappings Object */
  get capabilityMap() { return []; }
  get dpMappings() { return {}; }
  
  /** Override: protocol version (default auto-detect) */
  get protocolVersion() { return 'auto'; }

  async onInit() {
    this.log('TuyaLocalDevice init:', this.getName());
    this._hybridManager = null;
    this._normalizedMappings = this._buildDPMappings();

    // v7.0.0: Apply BVB Safety Logic / Capability Setters
    Object.assign(this, CapabilityManagerMixin);
    Object.assign(this, VirtualEnergyMeterMixin);

    for (const cap of this._normalizedMappings) {
      if (!this.hasCapability(cap.capability)) continue;
      this.registerCapabilityListener(cap.capability, async (value) => {
        const dpValue = cap.toDevice ? cap.toDevice(value) : value;
        await this._setDP(cap.dp, dpValue);
      });
    }

    await this._initHybridManager();
    await this._initVirtualEnergy().catch(this.error);
  }

  /**
   * Translates any custom dpMappings object into the standard capabilityMap array
   * This is the heart of the Auto-Adaptive DP Engine.
   */
  _buildDPMappings() {
    let map = [...this.capabilityMap];
    const dps = this.dpMappings || {};
    
    for (const dpId in dps) {
      const config = dps[dpId];
      if (config && config.capability) {
        let toDevice = config.transform || config.toDevice;
        let fromDevice = config.reverseTransform || config.fromDevice;

        if (config.divisor) {
          if (!toDevice) toDevice = (v) => Math.round(safeMultiply(v, config.divisor));
          if (!fromDevice) fromDevice = (v) => safeDivide(v, config.divisor);
        } else if (config.multiplier) {
          if (!toDevice) toDevice = (v) => safeDivide(v, config.multiplier);
          if (!fromDevice) fromDevice = (v) => safeMultiply(v, config.multiplier);
        }

        map.push({
          dp: parseInt(dpId, 10),
          capability: config.capability,
          toDevice,
          fromDevice
        });
      }
    }
    return map;
  }

  async _initHybridManager() {
    this._hybridManager = new TuyaWiFiHybridManager(this);

    this._hybridManager.on('connected', (type) => {
      this.log(`Device available via ${type}`);
      this.setAvailable().catch(this.error);
      this.unsetWarning();
    });

    this._hybridManager.on('disconnected', (type) => {
      // We only set unavailable if BOTH fail? 
      // For now, if local fails, manager stays in fallback mode.
      // this.setUnavailable('Local connection lost').catch(this.error);
    });

    this._hybridManager.on('dp-update', (dps) => {
      this._onData(dps);
    });

    await this._hybridManager.initialize();
  }

  /**
   * Data Processor: Maps DPs to Capabilities
   */
  _onData(dps) {
    if (!dps) return;
    this.log('DPs Received:', JSON.stringify(dps));

    // v7.0.18: Trigger Universal Flow Cards for RAW DP monitoring
    if (this.homey.app.flowLoader) {
      for (const dpId in dps) {
        const dpNum = parseInt(dpId, 10);
        const dpVal = dps[dpId];
        this.homey.app.flowLoader.triggerDPReceived(this, dpNum, dpVal).catch(this.error);
      }
    }

    for (const mapping of this._normalizedMappings) {
      if (dps[mapping.dp] !== undefined) {
        const value = mapping.fromDevice ? mapping.fromDevice(dps[mapping.dp]) : dps[mapping.dp];
        
        // v7.0.0: Robust Setter with Throttling/BVB/Calibration
        if (typeof this._safeSetCapability === 'function') {
           this._safeSetCapability(mapping.capability, value).catch(this.error);
        } else {
           this.setCapabilityValue(mapping.capability, value).catch(this.error);
        }
      }
    }
  }

  /**
   * Hybrid DP Set-Request
   */
  async _setDP(dp, value) {
    if (!this._hybridManager) throw new Error('Hybrid Manager not initialized');
    await this._hybridManager.setDP(dp, value);
  }

  async _setMultipleDPs(dpsObj) {
    // Currently manager only supports single DP for cloud fallback simplicity
    // but we can extend it if needed.
    for (const dp in dpsObj) {
      await this._setDP(dp, dpsObj[dp]);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.some(k => ['device_id','local_key','ip_address','protocol_version'].includes(k))) {
      this.log('Settings changed, re-initializing hybrid manager...');
      if (this._hybridManager) await this._hybridManager.destroy();
      await this._initHybridManager();
    }
  }

  async onDeleted() {
    if (this._hybridManager) await this._hybridManager.destroy();
  }
}

module.exports = TuyaLocalDevice;
