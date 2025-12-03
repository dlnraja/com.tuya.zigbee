'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

/**
 * DimmerDualChannelDevice - SDK Compliant Light Driver
 *
 * Implements registerMultipleCapabilityListener for onoff+dim coupling
 * as per Homey SDK Best Practices:
 * https://apps.developer.homey.app/the-basics/devices/best-practices/lights
 */
class DimmerDualChannelDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('DimmerDualChannelDevice initializing...');

    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // SDK Best Practice: Register coupled onoff+dim listener with debounce
    await this._registerLightCapabilities();

    this.log('DimmerDualChannelDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  /**
   * SDK Best Practice: Coupled onoff+dim capability listener
   *
   * "The onoff and dim capabilities should be coupled together and debounced.
   * This can be done using the Device#registerMultipleCapabilityListener() method."
   */
  async _registerLightCapabilities() {
    const caps = this.getCapabilities();
    const hasOnOff = caps.includes('onoff');
    const hasDim = caps.includes('dim');

    if (hasOnOff && hasDim) {
      this.log('[LIGHT-SDK] Registering coupled onoff+dim listener (500ms debounce)');

      this.registerMultipleCapabilityListener(['onoff', 'dim'], async (values, opts) => {
        const { onoff, dim } = values;

        this.log(`[LIGHT-SDK] Capability change: onoff=${onoff}, dim=${dim}`);

        // SDK Rule: onoff capability is leading in conflicts
        if (dim > 0 && onoff === false) {
          // User wants off, but dim > 0 → turn off
          this.log('[LIGHT-SDK] Conflict: dim > 0 but onoff=false → turning OFF');
          await this._setLightState(false, 0);
        } else if (dim <= 0 && onoff === true) {
          // User wants on, but dim = 0 → turn on (restore last dim)
          this.log('[LIGHT-SDK] Conflict: dim=0 but onoff=true → turning ON');
          const lastDim = this.getStoreValue('last_dim') || 1;
          await this._setLightState(true, lastDim);
        } else {
          // Normal case: apply both
          await this._setLightState(onoff, dim);
        }

        // Store last non-zero dim for restore
        if (dim > 0) {
          await this.setStoreValue('last_dim', dim).catch(() => {});
        }
      }, 500); // 500ms debounce as per SDK

    } else if (hasOnOff) {
      this.log('[LIGHT-SDK] Only onoff capability - using single listener');
      this.registerCapabilityListener('onoff', async (value) => {
        await this._setLightState(value, value ? 1 : 0);
      });
    }

    // Register color capabilities if present
    const colorCaps = ['light_hue', 'light_saturation', 'light_temperature', 'light_mode'];
    const presentColorCaps = colorCaps.filter(c => caps.includes(c));

    if (presentColorCaps.length > 0) {
      this.log(`[LIGHT-SDK] Registering color capabilities: ${presentColorCaps.join(', ')}`);

      this.registerMultipleCapabilityListener(presentColorCaps, async (values, opts) => {
        this.log('[LIGHT-SDK] Color change:', values);
        await this._setColorState(values);
      }, 500);
    }
  }

  /**
   * Set light on/off and dim state
   * Override in subclass for specific protocol handling
   */
  async _setLightState(onoff, dim) {
    this.log(`[LIGHT] Setting state: onoff=${onoff}, dim=${dim}`);

    // Update capabilities
    if (this.hasCapability('onoff')) {
      await this.setCapabilityValue('onoff', onoff).catch(this.error);
    }
    if (this.hasCapability('dim') && dim !== undefined) {
      await this.setCapabilityValue('dim', dim).catch(this.error);
    }

    // Send to device via ZCL
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (endpoint) {
        // OnOff cluster
        const onOffCluster = endpoint.clusters?.onOff;
        if (onOffCluster) {
          if (onoff) {
            await onOffCluster.setOn().catch(() => {});
          } else {
            await onOffCluster.setOff().catch(() => {});
          }
        }

        // Level cluster for dim
        if (dim !== undefined && dim > 0) {
          const levelCluster = endpoint.clusters?.levelControl;
          if (levelCluster) {
            const level = Math.round(dim * 254);
            await levelCluster.moveToLevel({ level, transitionTime: 5 }).catch(() => {});
          }
        }
      }
    } catch (err) {
      this.error('[LIGHT] ZCL command failed:', err.message);
    }
  }

  /**
   * Set color state (hue, saturation, temperature)
   * Override in subclass for specific protocol handling
   */
  async _setColorState(values) {
    this.log('[LIGHT] Setting color:', values);

    // Update capabilities
    for (const [cap, value] of Object.entries(values)) {
      if (this.hasCapability(cap) && value !== undefined) {
        await this.setCapabilityValue(cap, value).catch(this.error);
      }
    }

    // Send to device via ZCL
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const colorCluster = endpoint?.clusters?.colorControl;

      if (colorCluster) {
        if (values.light_hue !== undefined || values.light_saturation !== undefined) {
          const hue = Math.round((values.light_hue ?? this.getCapabilityValue('light_hue') ?? 0) * 254);
          const saturation = Math.round((values.light_saturation ?? this.getCapabilityValue('light_saturation') ?? 1) * 254);
          await colorCluster.moveToHueAndSaturation({ hue, saturation, transitionTime: 5 }).catch(() => {});
        }

        if (values.light_temperature !== undefined) {
          // Convert 0-1 to mireds (153-500 typical range)
          const mireds = Math.round(153 + (1 - values.light_temperature) * (500 - 153));
          await colorCluster.moveToColorTemperature({ colorTemperature: mireds, transitionTime: 5 }).catch(() => {});
        }
      }
    } catch (err) {
      this.error('[LIGHT] Color command failed:', err.message);
    }
  }

  async onDeleted() {
    this.log('DimmerDualChannelDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = DimmerDualChannelDevice;
