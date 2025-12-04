'use strict';

const BaseHybridDevice = require('../devices/BaseHybridDevice');
const DynamicCapabilityManager = require('./DynamicCapabilityManager');
const DynamicFlowCardManager = require('./DynamicFlowCardManager');
const DynamicEnergyManager = require('./DynamicEnergyManager');
const SmartFlowManager = require('./SmartFlowManager');

/**
 * AutoAdaptiveDevice - v5.3.59
 *
 * Self-adapting device base class that:
 * 1. Auto-discovers capabilities from Tuya DPs
 * 2. Dynamically creates flow cards for new capabilities
 * 3. Smart energy monitoring and tracking
 * 4. Intelligent real-time flow triggering
 * 5. Learns device features over time
 * 6. Persists discoveries across restarts
 *
 * Usage:
 * class MyDevice extends AutoAdaptiveDevice {
 *   async onNodeInit({ zclNode }) {
 *     await super.onNodeInit({ zclNode });
 *     // Device is now fully self-adapting!
 *   }
 * }
 */
class AutoAdaptiveDevice extends BaseHybridDevice {

  /**
   * Initialize the auto-adaptive system
   */
  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════════════════');
    this.log('[AUTO-ADAPTIVE] 🚀 Initializing FULL auto-adaptive system...');
    this.log('═══════════════════════════════════════════════════════════════');

    // Initialize base first
    await super.onNodeInit({ zclNode }).catch(err => {
      this.error('[AUTO-ADAPTIVE] Base init error:', err.message);
    });

    // Create ALL dynamic managers
    this.dynamicCapabilityManager = new DynamicCapabilityManager(this);
    this.dynamicFlowCardManager = new DynamicFlowCardManager(this);
    this.dynamicEnergyManager = new DynamicEnergyManager(this);
    this.smartFlowManager = new SmartFlowManager(this);

    // Initialize ALL managers
    await this.dynamicCapabilityManager.initialize();
    await this.dynamicFlowCardManager.initialize();
    await this.dynamicEnergyManager.initialize();
    await this.smartFlowManager.initialize();

    // Connect managers - when capability discovered, create flow cards
    this.dynamicCapabilityManager.on('capabilityDiscovered', async (data) => {
      await this.dynamicFlowCardManager.onCapabilityDiscovered(data);
    });

    this.dynamicCapabilityManager.on('valueChanged', async (data) => {
      await this.dynamicFlowCardManager.onValueChanged(data);
    });

    this.dynamicCapabilityManager.on('capabilityAdded', async (data) => {
      this.log(`[AUTO-ADAPTIVE] 🆕 New capability added: ${data.capability}`);
      await this._onNewCapabilityAdded(data.capability);
    });

    // Connect energy manager events
    this.dynamicEnergyManager.on('energyDiscovered', async (data) => {
      this.log(`[AUTO-ADAPTIVE] ⚡ Energy DP discovered: DP${data.dpId} → ${data.mapping.capability}`);
    });

    this.dynamicEnergyManager.on('energyChanged', async (data) => {
      await this.smartFlowManager.triggerFlow(`${data.capability}_changed`, { value: data.value });
    });

    this.dynamicEnergyManager.on('thresholdExceeded', async (data) => {
      this.log(`[AUTO-ADAPTIVE] ⚠️ Threshold exceeded: ${data.capability} = ${data.value} (${data.type})`);
      await this.smartFlowManager.triggerFlow(`${data.capability}_threshold_${data.type}`, data);
    });

    // Setup Tuya DP auto-discovery listener
    await this._setupAutoDiscoveryListener();

    // Log stats
    const flowStats = this.dynamicFlowCardManager.getStats();
    const energyStats = this.dynamicEnergyManager.getStats();
    this.log('[AUTO-ADAPTIVE] ═══════════════════════════════════════════════');
    this.log(`[AUTO-ADAPTIVE] ✅ FULL System Initialized!`);
    this.log(`[AUTO-ADAPTIVE]    📊 Discovered DPs: ${this.dynamicCapabilityManager.getDiscoveries().length}`);
    this.log(`[AUTO-ADAPTIVE]    🔔 Flow Triggers: ${flowStats.triggers}`);
    this.log(`[AUTO-ADAPTIVE]    ❓ Flow Conditions: ${flowStats.conditions}`);
    this.log(`[AUTO-ADAPTIVE]    ▶️ Flow Actions: ${flowStats.actions}`);
    this.log(`[AUTO-ADAPTIVE]    ⚡ Energy DPs: ${energyStats.discoveredDPs.length}`);
    this.log('[AUTO-ADAPTIVE] ═══════════════════════════════════════════════');
  }

  /**
   * Setup listener for auto-discovering capabilities from Tuya DPs
   */
  async _setupAutoDiscoveryListener() {
    this.log('[AUTO-ADAPTIVE] Setting up auto-discovery listener...');

    // Listen to TuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', async ({ dpId, value, dpType }) => {
        await this._onDPReceived(dpId, value, dpType);
      });
      this.log('[AUTO-ADAPTIVE] ✅ Listening to TuyaEF00Manager');
    }

    // Also setup direct cluster listener
    const endpoint = this.zclNode?.endpoints?.[1];
    if (endpoint) {
      // Find Tuya cluster
      const tuyaCluster = endpoint.clusters.tuya
        || endpoint.clusters.tuyaSpecific
        || endpoint.clusters.manuSpecificTuya
        || endpoint.clusters['61184']
        || endpoint.clusters[61184];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('dataReport', (data) => {
          this._parseAndProcessTuyaData(data);
        });

        tuyaCluster.on('response', (data) => {
          this._parseAndProcessTuyaData(data);
        });

        this.log('[AUTO-ADAPTIVE] ✅ Listening to Tuya cluster directly');
      }

      // Raw frame listener for maximum compatibility
      if (typeof endpoint.on === 'function') {
        endpoint.on('frame', (frame) => {
          if (frame && (frame.cluster === 0xEF00 || frame.cluster === 61184)) {
            this._parseTuyaFrame(frame.data);
          }
        });
        this.log('[AUTO-ADAPTIVE] ✅ Listening to raw frames');
      }
    }
  }

  /**
   * Handle incoming DP - route to ALL managers
   */
  async _onDPReceived(dpId, value, dpType = null) {
    this.log(`[AUTO-ADAPTIVE] 📥 DP${dpId} = ${value} (type: ${dpType})`);

    try {
      // Process for capabilities
      const mapping = await this.dynamicCapabilityManager.processDP(dpId, value, dpType);

      // Process for energy (power, voltage, current, energy)
      if (this.dynamicEnergyManager) {
        await this.dynamicEnergyManager.processDP(dpId, value, dpType);
      }

      if (mapping) {
        // Also call device-specific handler if exists
        await this._handleDeviceSpecificDP(dpId, value, mapping);
      }
    } catch (err) {
      this.error('[AUTO-ADAPTIVE] DP processing error:', err.message);
    }
  }

  /**
   * Parse and process Tuya data from various formats
   */
  _parseAndProcessTuyaData(data) {
    if (!data) return;

    // Try different formats
    const dp = data.dpId ?? data.dp ?? data.datapoint;
    const value = data.dpValue ?? data.value ?? data.data;
    const dpType = data.dpType ?? data.type;

    if (dp !== undefined && value !== undefined) {
      this._onDPReceived(dp, value, dpType);
    } else if (data.datapoints && Array.isArray(data.datapoints)) {
      for (const dpData of data.datapoints) {
        const dpId = dpData.dp ?? dpData.dpId;
        const dpValue = dpData.value ?? dpData.dpValue;
        const dpDataType = dpData.type ?? dpData.dpType;
        if (dpId !== undefined) {
          this._onDPReceived(dpId, dpValue, dpDataType);
        }
      }
    } else if (Buffer.isBuffer(data)) {
      this._parseTuyaFrame(data);
    }
  }

  /**
   * Parse raw Tuya frame buffer
   * Format: [status:1][transid:1][dp:1][type:1][len:2][value:N]...
   */
  _parseTuyaFrame(buffer) {
    if (!buffer || buffer.length < 6) return;

    try {
      let offset = 2; // Skip status and transid

      while (offset < buffer.length - 4) {
        const dp = buffer[offset];
        const type = buffer[offset + 1];
        const len = (buffer[offset + 2] << 8) | buffer[offset + 3];

        if (offset + 4 + len > buffer.length) break;

        const valueBuffer = buffer.slice(offset + 4, offset + 4 + len);
        let value;

        // Parse value based on type
        switch (type) {
          case 0: // Raw
            value = valueBuffer;
            break;
          case 1: // Bool
            value = valueBuffer[0] === 1;
            break;
          case 2: // Value (big-endian int)
            if (len === 1) value = valueBuffer[0];
            else if (len === 2) value = valueBuffer.readInt16BE(0);
            else if (len === 4) value = valueBuffer.readInt32BE(0);
            else value = valueBuffer.readIntBE(0, len);
            break;
          case 3: // String
            value = valueBuffer.toString('utf8');
            break;
          case 4: // Enum
            value = valueBuffer[0];
            break;
          default:
            value = valueBuffer;
        }

        this._onDPReceived(dp, value, type);
        offset += 4 + len;
      }
    } catch (err) {
      this.error('[AUTO-ADAPTIVE] Frame parse error:', err.message);
    }
  }

  /**
   * Override in subclass for device-specific DP handling
   */
  async _handleDeviceSpecificDP(dpId, value, mapping) {
    // Default: no-op, subclass can override
  }

  /**
   * Called when a new capability is dynamically added
   */
  async _onNewCapabilityAdded(capabilityId) {
    // Default: log it
    this.log(`[AUTO-ADAPTIVE] New capability ready: ${capabilityId}`);
  }

  /**
   * Get auto-discovery status for debugging
   */
  getAutoAdaptiveStatus() {
    const discoveries = this.dynamicCapabilityManager?.getDiscoveries() || [];
    const flowStats = this.dynamicFlowCardManager?.getStats() || {};

    return {
      initialized: !!this.dynamicCapabilityManager,
      discoveries: discoveries.map(d => ({
        dp: d.dpId,
        capability: d.capability,
        confidence: d.confidence,
        discoveredAt: d.discoveredAt
      })),
      flowCards: flowStats,
      capabilities: this.getCapabilities()
    };
  }

  /**
   * Force re-discovery of all DPs (useful after firmware update)
   */
  async resetDiscoveries() {
    this.log('[AUTO-ADAPTIVE] Resetting all discoveries...');
    await this.setStoreValue('dynamic_capabilities', {});
    this.dynamicCapabilityManager._discoveredDPs.clear();
    this.log('[AUTO-ADAPTIVE] ✅ Discoveries reset');
  }

  /**
   * Request all known DPs to trigger re-discovery
   */
  async requestAllDPs() {
    this.log('[AUTO-ADAPTIVE] Requesting all DPs...');

    if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestAllDPs === 'function') {
      await this.tuyaEF00Manager.requestAllDPs();
    }
  }
}

module.exports = AutoAdaptiveDevice;
