'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');

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
      // DP 101: opening_mode (tilt=0, lift=1) - FIXED: Don't auto-set tilt values
      101: {
        capability: null,
        internal: 'opening_mode'  // Store internally, don't set tilt capability directly
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
    this.log('[COVER] 🏠 HybridCoverBase initializing...');
    this.log('[COVER] 📦 App version:', this.homey.manifest.version);

    // v5.5.933: ENHANCED - Cache manufacturer info BEFORE protocol detection
    // This fixes _TZE204_xu4a5rhj being detected as ZCL instead of TUYA_DP
    try {
      const data = this.getData() || {};
      const store = this.getStore?.() || {};
      const settings = this.getSettings?.() || {};
      
      // v5.5.933: Try multiple sources for manufacturer info (prioritize zclNode)
      const node = zclNode?.endpoints?.[1]?.node || zclNode;
      let mfrName = node?.manufacturerName || zclNode?.manufacturerName || 
                    data.manufacturerName || store.manufacturerName || '';
      let modelId = node?.modelId || zclNode?.modelId || 
                    data.modelId || data.productId || store.modelId || '';
      
      // v5.5.933: Also try reading from basic cluster
      if ((!mfrName || !modelId) && zclNode?.endpoints?.[1]?.clusters?.basic) {
        try {
          const basic = zclNode.endpoints[1].clusters.basic;
          if (!mfrName && basic.manufacturerName) mfrName = basic.manufacturerName;
          if (!modelId && basic.modelId) modelId = basic.modelId;
        } catch (e) { /* ignore */ }
      }
      
      // v5.5.933: CRITICAL - Cache these for _detectProtocol() to use
      // Settings update is async and getSettings() may return old cached values
      this._cachedMfr = mfrName;
      this._cachedModelId = modelId;
      
      const updates = {};
      if (mfrName && !settings.zb_manufacturer_name) updates.zb_manufacturer_name = mfrName;
      if (modelId && !settings.zb_model_id) updates.zb_model_id = modelId;
      if (Object.keys(updates).length > 0) {
        await this.setSettings(updates).catch(() => {});
        this.log(`[COVER] 💾 Saved device info: ${JSON.stringify(updates)}`);
      }
      
      // v5.5.933: Log what we found for debugging
      this.log(`[COVER] 🔍 Device info: mfr=${mfrName || 'unknown'}, model=${modelId || 'unknown'}`);
    } catch (e) { 
      this.log(`[COVER] ⚠️ Error getting device info: ${e.message}`);
    }

    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable('⚠️ Phantom device').catch(() => { });
      return;
    }

    // v5.6.0: Apply dynamic manufacturerName configuration
    await this._applyManufacturerConfig();

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

  /**
   * v5.6.0: Applique la configuration dynamique basée sur manufacturerName
   */
  async _applyManufacturerConfig() {
    // v5.5.916: Fixed manufacturer/model retrieval - use settings/store like other drivers
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData() || {};
    
    const manufacturerName = settings.zb_manufacturer_name || 
                             store.manufacturerName || 
                             data.manufacturerName || 
                             'unknown';
    const productId = settings.zb_model_id || 
                      store.modelId || 
                      data.productId || 
                      'unknown';

    this.log(`[COVER] 🔍 Analyzing config for: ${manufacturerName} / ${productId}`);

    // Get dynamic configuration
    const config = ManufacturerVariationManager.getManufacturerConfig(
      manufacturerName,
      productId,
      'curtain_motor'
    );

    // Apply configuration
    ManufacturerVariationManager.applyManufacturerConfig(this, config);

    // Override DP mappings if dynamic ones are provided
    if (config.dpMappings && Object.keys(config.dpMappings).length > 0) {
      this._dynamicDpMappings = { ...this.dpMappings, ...config.dpMappings };
      this.log(`[COVER] 🔄 Using dynamic DP mappings: ${Object.keys(config.dpMappings).join(', ')}`);
    }

    this.log(`[COVER] ⚙️ Protocol: ${config.protocol}`);
    this.log(`[COVER] 🔌 Endpoints: ${Object.keys(config.endpoints).join(', ')}`);
    this.log(`[COVER] 📡 ZCL Clusters: ${config.zclClusters.join(', ')}`);

    if (config.specialHandling) {
      this.log(`[COVER] ⭐ Special handling: ${config.specialHandling}`);
    }
  }

  /**
   * v5.5.933: FIXED - Protocol detection must also check zclNode and cached mfr info
   * Previous version didn't check zclNode or _cachedMfr causing _TZE204_* to be detected as ZCL
   */
  _detectProtocol() {
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData?.() || {};
    
    // v5.5.933: Also try zclNode directly (most reliable at first init)
    const node = this.zclNode?.endpoints?.[1]?.node || this.zclNode;
    const zclMfr = node?.manufacturerName || this.zclNode?.manufacturerName || '';
    const zclModel = node?.modelId || this.zclNode?.modelId || '';
    
    // v5.5.933: Try ALL sources for model ID (zclNode first, then cached, then settings)
    const modelId = zclModel || 
                    this._cachedModelId ||
                    settings.zb_model_id || settings.zb_modelId || 
                    store.modelId || store.productId || 
                    data.modelId || data.productId || '';
    
    // v5.5.933: Try ALL sources for manufacturer name (zclNode first, then cached, then settings)
    const mfr = zclMfr ||
                this._cachedMfr ||
                settings.zb_manufacturer_name || settings.zb_manufacturerName || 
                store.manufacturerName || data.manufacturerName || '';
    
    // TS0601 devices OR _TZE* manufacturers ALWAYS use Tuya DP protocol
    const isTuyaDP = modelId === 'TS0601' || modelId.startsWith('TS0601') || 
                     mfr.startsWith('_TZE') || mfr.startsWith('_tze');
    
    this.log(`[COVER] 🔍 Protocol detection: model=${modelId || 'unknown'}, mfr=${mfr || 'unknown'}, isTuyaDP=${isTuyaDP}`);
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

  /**
   * v5.5.305: FIXED diagnostic check - no longer throws on missing device ID
   * The device ID check was too strict and caused "Device ID not available" errors
   * Now uses soft warnings instead of hard failures for non-critical checks
   */
  async _diagnosticCheck() {
    try {
      // v5.5.305: Soft check for device ID - don't throw, just warn
      const deviceId = this.getData()?.id;
      if (!deviceId) {
        this.log('[COVER] ⚠️ Device ID not in getData(), using alternative identification');
        // Try alternative: use __id or zclNode address
        const altId = this.__id || this.zclNode?.networkAddress;
        if (altId) {
          this.log(`[COVER] ℹ️ Using alternative ID: ${altId}`);
        }
        // Don't throw - continue with command attempt
      }

      // v5.5.305: Soft registry check - don't throw
      if (deviceId) {
        try {
          const device = this.homey.app?.getDevice?.({ id: deviceId });
          if (!device) {
            this.log('[COVER] ⚠️ Device not found in registry (may be normal during init)');
          }
        } catch (registryError) {
          // Ignore registry errors - not critical
        }
      }

      // Critical check: zclNode must exist
      if (!this.zclNode) {
        throw new Error('ZCL node not available - device may be offline or need re-pairing');
      }

      const ep = this.zclNode?.endpoints?.[1];
      if (!ep) {
        throw new Error('Endpoint 1 not available - device communication issue, try power cycle');
      }

      // Check if Tuya cluster is available (soft check for Tuya devices)
      const tuyaCluster = ep?.clusters?.tuya || ep?.clusters?.manuSpecificTuya || ep?.clusters?.[61184];
      if (this._isPureTuyaDP && !tuyaCluster) {
        this.log('[COVER] ⚠️ Tuya cluster not found, will try direct communication');
        // Don't throw - some devices work without explicit cluster reference
      }

      // Check TuyaEF00Manager availability for DP devices (soft check)
      if (this._isPureTuyaDP && !this.tuyaEF00Manager?.sendDP) {
        this.log('[COVER] ⚠️ TuyaEF00Manager not available, using direct cluster communication');
      }

      this.log('[COVER] 🔍 Diagnostic check passed - proceeding with command');
    } catch (diagnosticError) {
      this.error('[COVER] 🚨 Diagnostic failed:', diagnosticError.message);
      // Set device unavailable with helpful error message
      await this.setUnavailable(`Communication error: ${diagnosticError.message}`).catch(() => { });
      throw diagnosticError;
    }
  }

  _registerCapabilityListeners() {
    // Guard against double registration
    if (this._coverListenersRegistered) return;
    this._coverListenersRegistered = true;

    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        try {
          this.log(`[COVER] Setting position: ${Math.round(value * 100)}%`);

          // v5.5.202: Diagnostic check before sending command
          await this._diagnosticCheck();

          if (this._isPureTuyaDP) {
            await this._sendTuyaDP(2, Math.round(value * 100), 'value');
          } else {
            // ZCL command
            const ep = this.zclNode?.endpoints?.[1];
            const cluster = ep?.clusters?.windowCovering || ep?.clusters?.closuresWindowCovering;
            if (cluster?.goToLiftPercentage) {
              await cluster.goToLiftPercentage({ percentageLiftValue: Math.round(value * 100) });
            } else {
              throw new Error('Window covering cluster not available');
            }
          }
          this.log('[COVER] ✅ Position command completed successfully');
        } catch (err) {
          // v5.5.352: Graceful timeout handling - don't throw for timeouts
          if (err.message?.includes('Timeout')) {
            this.log(`[COVER] ⚠️ Position command timed out - device may still respond`);
            // Don't throw - the device often executes despite timeout
          } else {
            this.error('[COVER] ❌ Failed to set position:', err.message);
            throw err;
          }
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (state) => {
        try {
          this.log(`[COVER] Setting state: ${state}`);

          // v5.5.202: Diagnostic check before sending command
          await this._diagnosticCheck();

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
            } else {
              throw new Error('Window covering cluster not available');
            }
          }
          this.log(`[COVER] ✅ State command (${state}) completed successfully`);
        } catch (err) {
          // v5.5.352: Graceful timeout handling
          // "idle" commands are non-critical - device stops automatically
          if (err.message?.includes('Timeout')) {
            if (state === 'idle') {
              this.log(`[COVER] ⚠️ Idle command timed out - device will stop automatically`);
            } else {
              this.log(`[COVER] ⚠️ State command (${state}) timed out - device may still respond`);
            }
            // Don't throw - reduces user-facing errors for transient Zigbee issues
          } else {
            this.error(`[COVER] ❌ Failed to set state to ${state}:`, err.message);
            throw err;
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
   * Send Tuya DP command with enhanced reliability and fallback methods
   * v5.5.202: Enhanced for better curtain motor communication
   */
  async _sendTuyaDP(dpId, value, dataType = 'value') {
    const maxRetries = 3;
    const retryDelay = 500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(`[COVER] Sending DP${dpId}=${value} (${dataType}) attempt ${attempt}/${maxRetries}`);

        // Method 1: TuyaEF00Manager
        if (this.tuyaEF00Manager?.sendDP) {
          await this.tuyaEF00Manager.sendDP(dpId, value, dataType);
          this.log(`[COVER] ✅ DP${dpId} sent via TuyaEF00Manager`);
          return;
        }

        // Method 2: Direct cluster datapoint command (v5.5.939 FIX)
        const ep = this.zclNode?.endpoints?.[1];
        const tuyaCluster = ep?.clusters?.tuya || ep?.clusters?.manuSpecificTuya || ep?.clusters?.[61184];

        if (tuyaCluster && typeof tuyaCluster.datapoint === 'function') {
          // v5.5.939: Build COMPLETE DP frame [seq:2][dp:1][type:1][len:2][data:N]
          const dtMap = { bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };
          const dt = dtMap[dataType] || 2;
          const dataBuf = (dataType === 'bool') ? Buffer.from([value ? 1 : 0])
            : (dataType === 'enum') ? Buffer.from([value])
            : Buffer.from([0, 0, 0, 0].map((_, i) => (value >> (24 - i * 8)) & 0xFF));
          const dataLen = dataBuf.length;
          const seq = Math.floor(Math.random() * 65535);
          const cmd = Buffer.alloc(6 + dataLen);
          cmd.writeUInt16BE(seq, 0);
          cmd[2] = dpId;
          cmd[3] = dt;
          cmd.writeUInt16BE(dataLen, 4);
          dataBuf.copy(cmd, 6);

          // Use { data: cmd } format - NOT { dp, datatype, data }
          await tuyaCluster.datapoint({ data: cmd });
          this.log(`[COVER] ✅ DP${dpId} sent via datapoint({data})`);
          return;
        }

        throw new Error('No available communication method found');

      } catch (err) {
        this.error(`[COVER] DP${dpId} attempt ${attempt} failed:`, err.message);

        if (attempt === maxRetries) {
          this.error(`[COVER] ❌ All ${maxRetries} attempts failed for DP${dpId}=${value}`);
          this.error('[COVER] Device may be offline or communication issues present');
          throw err;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }


  async registerCapability(cap, cluster, opts) {
    if (this._isPureTuyaDP) return;
    return super.registerCapability(cap, cluster, opts);
  }
}

module.exports = HybridCoverBase;
