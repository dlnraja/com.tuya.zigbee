'use strict';

/**
 * Binding Persistence - PROTOCOL #11
 *
 * Persists Zigbee binding state across restarts and handles:
 * - Binding state persistence to device store
 * - Automatic rebinding on device rejoin
 * - Binding conflict resolution
 * - Group binding management
 * - Binding health monitoring
 *
 * @version 9.1.0
 */

class BindingPersistence {
  constructor(device, options = {}) {
    this.device = device;
    this.homey = device.homey;
    this.storeKey = options.storeKey || 'zigbee_bindings';
    this.autoRebind = options.autoRebind !== false;
    this.maxBindings = options.maxBindings || 16;

    this._bindings = new Map();
    this._initialized = false;
  }

  /**
   * Initialize - load persisted bindings
   */
  async initialize() {
    if (this._initialized) return;

    try {
      const stored = await this.homey.settings.get(this._getDeviceStoreKey());
      if (stored && Array.isArray(stored)) {
        for (const binding of stored) {
          this._bindings.set(binding.key, binding);
        }
      }
      this._initialized = true;
    } catch (err) {
      this.device.error('[BindingPersistence] Failed to load:', err.message);
      this._initialized = true;
    }
  }

  /**
   * Record a binding
   * @param {Object} binding - { clusterId, sourceEndpoint, targetAddress, targetEndpoint, type }
   */
  async addBinding(binding) {
    await this.initialize();

    if (this._bindings.size >= this.maxBindings) {
      this.device.log('[BindingPersistence] Max bindings reached, evicting oldest');
      const oldest = this._bindings.keys().next().value;
      this._bindings.delete(oldest);
    }

    const key = `${binding.clusterId}_${binding.sourceEndpoint}_${binding.targetAddress}_${binding.targetEndpoint || 1}`;
    const record = {
      key,
      clusterId: binding.clusterId,
      sourceEndpoint: binding.sourceEndpoint || 1,
      targetAddress: binding.targetAddress,
      targetEndpoint: binding.targetEndpoint || 1,
      type: binding.type || 'unicast', // unicast | group
      createdAt: Date.now(),
      lastVerified: null
    };

    this._bindings.set(key, record);
    await this._persist();

    return record;
  }

  /**
   * Remove a binding
   */
  async removeBinding(clusterId, sourceEndpoint, targetAddress, targetEndpoint = 1) {
    await this.initialize();

    const key = `${clusterId}_${sourceEndpoint}_${targetAddress}_${targetEndpoint}`;
    const existed = this._bindings.delete(key);

    if (existed) {
      await this._persist();
    }

    return existed;
  }

  /**
   * Get all persisted bindings for this device
   */
  async getBindings() {
    await this.initialize();
    return Array.from(this._bindings.values());
  }

  /**
   * Get bindings for a specific cluster
   */
  async getBindingsForCluster(clusterId) {
    await this.initialize();
    const result = [];
    for (const binding of this._bindings.values()) {
      if (binding.clusterId === clusterId) {
        result.push(binding);
      }
    }
    return result;
  }

  /**
   * Verify and restore bindings (call on device init/rejoin)
   * @param {Object} zclNode - The ZCL node for the device
   * @returns {{ restored: number, failed: number, skipped: number }}
   */
  async verifyAndRestoreBindings(zclNode) {
    await this.initialize();

    const results = { restored: 0, failed: 0, skipped: 0 };

    for (const [key, binding] of this._bindings.entries()) {
      try {
        if (!zclNode || !zclNode.endpoints) {
          results.skipped++;
          continue;
        }

        const endpoint = zclNode.endpoints[binding.sourceEndpoint];
        if (!endpoint || !endpoint.bind) {
          results.skipped++;
          continue;
        }

        // Attempt to re-bind
        await endpoint.bind(binding.clusterId, {
          address: binding.targetAddress,
          endpoint: binding.targetEndpoint,
          type: binding.type
        });

        binding.lastVerified = Date.now();
        results.restored++;
        this.device.log(`[BindingPersistence] Restored binding: ${key}`);

      } catch (err) {
        results.failed++;
        this.device.error(`[BindingPersistence] Failed to restore binding ${key}:`, err.message);
      }
    }

    if (results.restored > 0) {
      await this._persist();
    }

    return results;
  }

  /**
   * Add a group binding
   */
  async addGroupBinding(clusterId, sourceEndpoint, groupId) {
    return this.addBinding({
      clusterId,
      sourceEndpoint: sourceEndpoint || 1,
      targetAddress: groupId,
      targetEndpoint: 0xFF, // Broadcast for groups
      type: 'group'
    });
  }

  /**
   * Check if a binding exists
   */
  async hasBinding(clusterId, sourceEndpoint, targetAddress, targetEndpoint = 1) {
    await this.initialize();
    const key = `${clusterId}_${sourceEndpoint}_${targetAddress}_${targetEndpoint}`;
    return this._bindings.has(key);
  }

  /**
   * Get binding statistics
   */
  getStats() {
    const bindings = Array.from(this._bindings.values());
    return {
      total: bindings.length,
      maxBindings: this.maxBindings,
      byCluster: bindings.reduce((acc, b) => {
        acc[b.clusterId] = (acc[b.clusterId] || 0) + 1;
        return acc;
      }, {}),
      byType: {
        unicast: bindings.filter(b => b.type === 'unicast').length,
        group: bindings.filter(b => b.type === 'group').length
      },
      oldestBinding: bindings.length > 0
        ? new Date(Math.min(...bindings.map(b => b.createdAt)))
        : null
    };
  }

  /**
   * Clear all bindings
   */
  async clearAll() {
    this._bindings.clear();
    await this._persist();
  }

  /**
   * Get device-specific store key
   */
  _getDeviceStoreKey() {
    const data = this.device.getData ? this.device.getData() : {};
    return `${this.storeKey}_${data.id || 'unknown'}`;
  }

  /**
   * Persist bindings to device store
   */
  async _persist() {
    try {
      const arr = Array.from(this._bindings.values());
      await this.homey.settings.set(this._getDeviceStoreKey(), arr);
    } catch (err) {
      this.device.error('[BindingPersistence] Failed to persist:', err.message);
    }
  }
}

module.exports = BindingPersistence;
