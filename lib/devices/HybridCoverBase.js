'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HybridCoverBase - Base class for curtains, blinds, shutters
 * v5.5.107 - Added tilt support for MOES roller blinds (Sharif's bug)
 * v5.3.66 - Fixed capability migration order + listener guards
 */
class HybridCoverBase extends ZigBeeDevice {

  get mainsPowered() { return true; }
  get maxListeners() { return 50; }

  get coverCapabilities() {
    return ['windowcoverings_state', 'windowcoverings_set'];
  }

  // v5.5.10: Extended capabilities for MOES and other blinds
  get optionalCapabilities() {
    return ['windowcoverings_tilt_set', 'dim', 'measure_battery'];
  }

  /**
   * v5.5.130: ENRICHED DP mappings from Zigbee2MQTT TS0601_cover documentation
   * https://www.zigbee2mqtt.io/devices/TS0601_cover_1.html
   *
   * Standard Tuya Curtain DPs:
   * DP1: control (enum: 0=open/up, 1=stop, 2=close/down)
   * DP2: percent_control (0-100, write)
   * DP3: percent_state (0-100, read)
   * DP5: direction (enum: 0=forward, 1=back) - motor direction
   * DP7: work_state (enum: 0=opening, 1=closing, 2=stopped)
   * DP8: motor_speed (0-255)
   * DP10: calibration_time (seconds)
   * DP13: battery (0-100)
   */
  get dpMappings() {
    return {
      // Control command (open/stop/close)
      1: {
        capability: 'windowcoverings_state', transform: (v) => {
          // Different devices use different value mappings
          if (v === 0 || v === 'open') return 'up';
          if (v === 1 || v === 'stop') return 'idle';
          if (v === 2 || v === 'close') return 'down';
          return 'idle';
        }
      },
      // Position control (write)
      2: { capability: 'windowcoverings_set', divisor: 100 },
      // Position state (read) - some devices use DP3
      3: { capability: 'windowcoverings_set', divisor: 100 },
      // Some devices use DP4 for position
      4: { capability: 'windowcoverings_set', divisor: 100 },

      // Motor direction (0=forward, 1=reverse)
      5: { capability: null, setting: 'reverse_direction' },

      // Work state - different mapping than DP1
      7: {
        capability: 'windowcoverings_state', transform: (v) => {
          if (v === 0 || v === 'opening') return 'up';
          if (v === 1 || v === 'closing') return 'down';
          return 'idle'; // v === 2 or 'stopped'
        }
      },

      // Motor speed (0-255)
      8: { capability: null, setting: 'motor_speed' },

      // Calibration time (seconds)
      10: { capability: null, setting: 'calibration_time' },

      // Battery for solar/battery curtains
      13: { capability: 'measure_battery', divisor: 1 },

      // v5.5.107: MOES Roller Blind DPs (TZE200_icka1clh)
      // DP 101: opening_mode (tilt=0, lift=1) - used for tilt capability
      101: {
        capability: 'windowcoverings_tilt_set',
        transform: (v) => v === 0 ? 0.5 : 1  // tilt mode = 50%, lift mode = 100%
      },
      // DP 102: backlight_mode (0=off, 1=on)
      102: { capability: null, setting: 'backlight_mode' },
      // DP 103: motor_direction (alternative)
      103: { capability: null, setting: 'motor_direction' },
      // DP 105: motor_speed (alternative, 0-255)
      105: { capability: null, setting: 'motor_speed' }
    };
  }

  async onNodeInit({ zclNode }) {
    // CRITICAL: Migrate capabilities FIRST before anything else
    await this._migrateCapabilities();

    if (this._hybridCoverInited) return;
    this._hybridCoverInited = true;

    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable('⚠️ Phantom device').catch(() => { });
      return;
    }

    this.zclNode = zclNode;
    this._bumpMaxListeners(zclNode);
    this._protocolInfo = this._detectProtocol();

    this.log(`[COVER] Model: ${this._protocolInfo.modelId} | Mode: ${this._protocolInfo.protocol}`);

    if (this._protocolInfo.isTuyaDP) {
      this._isPureTuyaDP = true;
      this._setupTuyaDPMode();
    } else {
      this._setupZCLMode(zclNode);
    }

    this._registerCapabilityListeners();
    this.log('[COVER] ✅ Ready');
  }

  _detectProtocol() {
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const modelId = settings.zb_modelId || store.modelId || '';
    const mfr = settings.zb_manufacturerName || store.manufacturerName || '';
    const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE');
    return { protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL', isTuyaDP, modelId, mfr };
  }

  async _migrateCapabilities() {
    // v5.5.10: Enhanced capability migration with logging
    const driverCaps = this.driver?.manifest?.capabilities || [];

    // Add required capabilities
    for (const cap of this.coverCapabilities) {
      if (!this.hasCapability(cap)) {
        this.log(`[COVER] Adding missing capability: ${cap}`);
        await this.addCapability(cap).catch((e) => {
          this.error(`[COVER] Failed to add ${cap}:`, e.message);
        });
      }
    }

    // Add optional capabilities if defined in driver manifest
    for (const cap of this.optionalCapabilities) {
      if (driverCaps.includes(cap) && !this.hasCapability(cap)) {
        this.log(`[COVER] Adding optional capability: ${cap}`);
        await this.addCapability(cap).catch(() => { });
      }
    }

    // Log current capabilities for debugging
    this.log(`[COVER] Current capabilities: ${this.getCapabilities().join(', ')}`);
  }

  _bumpMaxListeners(zclNode) {
    try {
      if (!zclNode?.endpoints) return;
      for (const ep of Object.values(zclNode.endpoints)) {
        if (typeof ep.setMaxListeners === 'function') ep.setMaxListeners(50);
        for (const c of Object.values(ep?.clusters || {})) {
          if (typeof c?.setMaxListeners === 'function') c.setMaxListeners(50);
        }
      }
    } catch (e) { }
  }

  _setupTuyaDPMode() {
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => this._handleDP(dpId, value));
    }
  }

  _setupZCLMode(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    const cluster = ep?.clusters?.windowCovering || ep?.clusters?.closuresWindowCovering;
    if (cluster) {
      cluster.on('attr.currentPositionLiftPercentage', (v) => {
        this.setCapabilityValue('windowcoverings_set', v / 100).catch(() => { });
      });
    }
  }

  _handleDP(dpId, raw) {
    const mapping = this.dpMappings[dpId];
    if (!mapping?.capability) return;

    let value = typeof raw === 'number' ? raw : Buffer.isBuffer(raw) ? raw.readIntBE(0, raw.length) : raw;
    if (mapping.divisor) value = value / mapping.divisor;
    if (mapping.transform) value = mapping.transform(value);

    // v5.5.107: Sanity checks for cover values
    if (value === null || value === undefined) return;
    if (mapping.capability === 'windowcoverings_set' && (value < 0 || value > 1)) {
      this.log(`[DP] ⚠️ Cover position out of range: ${value} - clamping`);
      value = Math.max(0, Math.min(1, value));
    }
    if (mapping.capability === 'windowcoverings_tilt_set' && (value < 0 || value > 1)) {
      this.log(`[DP] ⚠️ Tilt position out of range: ${value} - clamping`);
      value = Math.max(0, Math.min(1, value));
    }

    // v5.5.118: Use safe setter with dynamic capability addition
    this._safeSetCapability(mapping.capability, value);
  }

  /**
   * v5.5.118: Capabilities that can be dynamically added for covers
   */
  static get DYNAMIC_CAPABILITIES() {
    return [
      'windowcoverings_set', 'windowcoverings_state', 'windowcoverings_tilt_set',
      'dim', 'measure_battery'
    ];
  }

  /**
   * v5.5.118: Safe capability setter with dynamic addition
   */
  async _safeSetCapability(capability, value) {
    if (!this.hasCapability(capability)) {
      if (HybridCoverBase.DYNAMIC_CAPABILITIES.includes(capability)) {
        try {
          await this.addCapability(capability);
          this.log(`[CAP] ✨ DYNAMIC ADD: ${capability} (detected from DP/ZCL data)`);
        } catch (e) {
          this.log(`[CAP] ⚠️ Could not add ${capability}: ${e.message}`);
          return;
        }
      } else {
        return;
      }
    }
    this.setCapabilityValue(capability, value).catch(() => { });
  }

  _registerCapabilityListeners() {
    // Guard against double registration
    if (this._coverListenersRegistered) return;
    this._coverListenersRegistered = true;

    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        this.log(`[COVER] Setting position: ${Math.round(value * 100)}%`);
        if (this._isPureTuyaDP) {
          await this._sendTuyaDP(2, Math.round(value * 100), 'value');
        } else {
          // ZCL command
          const ep = this.zclNode?.endpoints?.[1];
          const cluster = ep?.clusters?.windowCovering || ep?.clusters?.closuresWindowCovering;
          if (cluster?.goToLiftPercentage) {
            await cluster.goToLiftPercentage({ percentageLiftValue: Math.round(value * 100) });
          }
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (state) => {
        this.log(`[COVER] Setting state: ${state}`);
        if (this._isPureTuyaDP) {
          const cmd = state === 'up' ? 0 : state === 'down' ? 2 : 1;
          await this._sendTuyaDP(1, cmd, 'enum');
        } else {
          // ZCL command
          const ep = this.zclNode?.endpoints?.[1];
          const cluster = ep?.clusters?.windowCovering || ep?.clusters?.closuresWindowCovering;
          if (cluster) {
            if (state === 'up') await cluster.upOpen?.();
            else if (state === 'down') await cluster.downClose?.();
            else await cluster.stop?.();
          }
        }
      });
    }

    // v5.5.107: Tilt support for MOES roller blinds (Sharif's fix)
    if (this.hasCapability('windowcoverings_tilt_set')) {
      this.registerCapabilityListener('windowcoverings_tilt_set', async (value) => {
        this.log(`[COVER] Setting tilt: ${Math.round(value * 100)}%`);
        if (this._isPureTuyaDP) {
          // DP 101: tilt=0, lift=1
          const mode = value < 0.5 ? 0 : 1;
          await this._sendTuyaDP(101, mode, 'enum');
        }
      });
    }

    // v5.5.107: Dim support (some devices use this for position)
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        this.log(`[COVER] Setting dim (position): ${Math.round(value * 100)}%`);
        if (this._isPureTuyaDP) {
          await this._sendTuyaDP(2, Math.round(value * 100), 'value');
        }
      });
    }
  }

  /**
   * Send Tuya DP command with fallback methods
   */
  async _sendTuyaDP(dpId, value, dataType = 'value') {
    try {
      // Method 1: TuyaEF00Manager
      if (this.tuyaEF00Manager?.sendDP) {
        return await this.tuyaEF00Manager.sendDP(dpId, value, dataType);
      }

      // Method 2: Direct cluster command
      const ep = this.zclNode?.endpoints?.[1];
      const tuyaCluster = ep?.clusters?.tuya || ep?.clusters?.manuSpecificTuya || ep?.clusters?.[61184];

      if (tuyaCluster) {
        const dpData = this._buildTuyaPayload(dpId, value, dataType);
        if (typeof tuyaCluster.dataRequest === 'function') {
          await tuyaCluster.dataRequest({ data: dpData });
        } else if (typeof tuyaCluster.setData === 'function') {
          await tuyaCluster.setData({ data: dpData });
        }
      }
    } catch (err) {
      this.error(`[COVER] Failed to send DP${dpId}:`, err.message);
    }
  }

  _buildTuyaPayload(dpId, value, dataType) {
    const buf = Buffer.alloc(6);
    buf.writeUInt8(dpId, 0);

    if (dataType === 'enum' || dataType === 'bool') {
      buf.writeUInt8(value ? 1 : 4, 1); // type: 1=bool, 4=enum
      buf.writeUInt16BE(1, 2); // length
      buf.writeUInt8(value, 4);
      return buf.slice(0, 5);
    } else {
      buf.writeUInt8(2, 1); // type: 2=value
      buf.writeUInt16BE(4, 2); // length
      buf.writeInt32BE(value, 4);
      return buf.slice(0, 8);
    }
  }

  async registerCapability(cap, cluster, opts) {
    if (this._isPureTuyaDP) return;
    return super.registerCapability(cap, cluster, opts);
  }
}

module.exports = HybridCoverBase;
