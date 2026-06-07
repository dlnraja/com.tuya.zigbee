'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { smartParse } = require('../../lib/managers/SmartDivisorManager');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const IntelligentDPAutoDiscovery = require('../../lib/sensors/IntelligentDPAutoDiscovery');

/**
 * CeilingPresenceSensorDevice - v8.0.0 MODERNIZED
 * Ceiling-mounted presence sensor (mmWave) with relay control.
 */
class CeilingPresenceSensorDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.log('[CEILING] 🚀 v8.0.0 Modernizing...');
      
      // Initialize v8 components
      this._inference = new IntelligentPresenceInference(this);
      this._discovery = new IntelligentDPAutoDiscovery(this);
      
      // Parent handles standard sensor logic
      await super.onNodeInit({ zclNode });

      // Setup capabilities and listeners
      await this._initCapabilities();
      
      // Relay control initialization
      await this._setupRelayControl(zclNode);

      this.log('[CEILING] ✅ Ready');
    }, 'onNodeInit');
  }

  async _initCapabilities() {
    const caps = ['alarm_motion', 'onoff', 'measure_luminance', 'measure_luminance.distance'];
    for (const cap of caps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }

    // Register onoff capability listener for relay control
    this.registerCapabilityListener('onoff', async (value) => {
      if (typeof this.markAppCommand === 'function') this.markAppCommand(1, value);
      this.log(`[CEILING] Relay control: ${value}`);
      return this._setRelay(value);
    });
  }

  /**
   * Main Tuya DP processing entry point
   */
  async onTuyaDP(dpId, value, dpType) {
    this.log(`[CEILING] 📥 DP${dpId} [type=${dpType}] = ${value}`);

    // 1. Static Mappings
    switch (dpId) {
      case 1: // Presence
        const presence = this._inference.updatePresenceDP(value);
        await this.setCapabilityValue('alarm_motion', presence).catch(() => { });
        
        // Auto relay control
        if (this.getSetting('relay_mode') === 'auto') {
          await this._handleAutoRelay(presence);
        }
        return;

      case 9: // Target Distance
        const distance = smartParse(value, null, { capability: 'measure_temperature' });
        this._inference.updateDistance(distance);
        return await this.setCapabilityValue('measure_luminance.distance', distance).catch(() => { });

      case 104: // Illuminance
        const lux = Math.max(0, value + (this.getSetting('illuminance_calibration') || 0));
        this._inference.updateLux(lux);
        return await this.setCapabilityValue('measure_luminance', lux).catch(() => {});

      case 101: // Relay / Detection Delay
      case 16:  // Relay Alt
        if (dpType === 'bool' || typeof value === 'boolean') {
          return await this.setCapabilityValue('onoff', value).catch(() => {});
        }
        break;
    }

    // 2. Fallback: Intelligent Auto-Discovery
    if (this._discovery) {
      const result = this._discovery.analyzeDP(dpId, value);
      if (result && result.confidence >= 80) {
        this.log(`[CEILING] 🧠 Discovery: DP${dpId} → ${result.capability}=${result.value}`);
        return await this.setCapabilityValue(result.capability, result.value).catch(() => {});
      }
    }
  }

  async _setupRelayControl(zclNode) {
    const onOffCluster = zclNode.endpoints[1]?.clusters?.onOff;
    if (onOffCluster) {
      onOffCluster.on('attr.onOff', async (value) => {
        this.log(`[CEILING] Relay state (ZCL): ${value}`);
        await this.setCapabilityValue('onoff', value).catch(() => { });
      });
      this._onOffCluster = onOffCluster;
    }
  }

  async _handleAutoRelay(presence) {
    const delay = presence ? this.getSetting('relay_delay_on') || 0 : this.getSetting('relay_delay_off') || 0;
    
    if (this._relayTimeout) {this.homey.clearTimeout(this._relayTimeout);}
    
    this._relayTimeout = this.homey.setTimeout(async () => { 
      await this._setRelay(presence);  
    }, delay * 1000);
  }

  async _setRelay(value) {
    try {
      if (this._onOffCluster) {
        if (value) {await this._onOffCluster.setOn();}
        else {await this._onOffCluster.setOff();}
      } else {
        // Fallback to Tuya DP
        if (this.sendTuyaCommand) {
          await this.sendTuyaCommand(101, value, 'bool').catch(() => this.sendTuyaCommand(16, value, 'bool'));
        }
      }
      await this.setCapabilityValue('onoff', value).catch(() => { });
      return true;
    } catch (err) {
      this.error('[CEILING] Relay set failed:', err.message);
      return false;
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (super.onSettings) {await super.onSettings({ oldSettings, newSettings, changedKeys });}

    for (const key of changedKeys) {
      const val = newSettings[key];
      switch (key) {
        case 'radar_sensitivity': await this.sendTuyaCommand(2, val, 'value').catch(() => {}); break;
        case 'minimum_range': await this.sendTuyaCommand(3, Math.round(val * 100), 'value').catch(() => {}); break;
        case 'maximum_range': await this.sendTuyaCommand(4, Math.round(val * 100), 'value').catch(() => {}); break;
        case 'fading_time': await this.sendTuyaCommand(102, val, 'value').catch(() => {}); break; 
      }
    }
  }

  onUninit() {
    if (this._relayTimeout) {this.homey.clearTimeout(this._relayTimeout);}
    if (super.onUninit) {super.onUninit();}
  }

  onDeleted() {
    this.log('[CEILING] Device deleted');
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = CeilingPresenceSensorDevice;
