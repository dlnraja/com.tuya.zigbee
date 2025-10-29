'use strict';

/**
 * CapabilityManager - Safe capability creation and management
 * 
 * Prevents duplicate capability errors by checking existence before creation.
 * Implements defensive programming patterns for Homey SDK3.
 * 
 * @author Dylan Rajasekaram
 * @version 4.9.164
 */

class CapabilityManager {
  constructor(homey) {
    this.homey = homey;
    this.createdCapabilities = new Set();
  }

  /**
   * Create a capability only if it doesn't already exist
   * Prevents "A Capability with ID already exists" errors
   * 
   * @param {string} capId - Full capability ID (e.g., 'homey:app:com.dlnraja.tuya.zigbee:fan_speed')
   * @param {object} capProps - Capability properties (title, type, etc.)
   * @returns {Promise<object|null>} Created or existing capability, or null if error
   */
  async createCapabilityIfMissing(capId, capProps) {
    try {
      // Check if we already created this in this session
      if (this.createdCapabilities.has(capId)) {
        this.homey.log(`[CAPABILITY] Already created in session: ${capId}`);
        return null;
      }

      // Try to get existing capability
      try {
        const existing = await this.homey.capabilities.getCapability(capId);
        if (existing) {
          this.homey.log(`[CAPABILITY] ✅ Already exists: ${capId}`);
          this.createdCapabilities.add(capId);
          return existing;
        }
      } catch (getErr) {
        // Capability doesn't exist, proceed to create
        this.homey.log(`[CAPABILITY] Not found, creating: ${capId}`);
      }

      // Create new capability safely
      const created = await this.homey.capabilities.create({
        id: capId,
        ...capProps
      });
      
      this.createdCapabilities.add(capId);
      this.homey.log(`[CAPABILITY] ✅ Created: ${capId}`);
      return created;
      
    } catch (err) {
      // Log but don't crash - capability might already exist from previous run
      this.homey.error(`[CAPABILITY] ❌ Failed to create ${capId}:`, err.message);
      
      // If error is "already exists", mark as created to avoid retry
      if (err.message && err.message.includes('already exists')) {
        this.createdCapabilities.add(capId);
      }
      
      return null;
    }
  }

  /**
   * Create multiple capabilities in batch
   * Stops at first critical error but continues on "already exists"
   * 
   * @param {Array<{id: string, props: object}>} capabilities
   * @returns {Promise<number>} Number of successfully created capabilities
   */
  async createCapabilitiesBatch(capabilities) {
    let created = 0;
    
    for (const cap of capabilities) {
      const result = await this.createCapabilityIfMissing(cap.id, cap.props);
      if (result) created++;
    }
    
    this.homey.log(`[CAPABILITY] Batch complete: ${created}/${capabilities.length} created`);
    return created;
  }

  /**
   * Check if capability exists without creating it
   * 
   * @param {string} capId - Capability ID to check
   * @returns {Promise<boolean>} True if exists
   */
  async exists(capId) {
    try {
      const cap = await this.homey.capabilities.getCapability(capId);
      return !!cap;
    } catch (err) {
      return false;
    }
  }

  /**
   * Safely remove a capability (with guards)
   * 
   * @param {string} capId - Capability ID to remove
   * @returns {Promise<boolean>} True if removed
   */
  async removeCapability(capId) {
    try {
      if (!await this.exists(capId)) {
        this.homey.log(`[CAPABILITY] Cannot remove (doesn't exist): ${capId}`);
        return false;
      }

      await this.homey.capabilities.delete(capId);
      this.createdCapabilities.delete(capId);
      this.homey.log(`[CAPABILITY] ✅ Removed: ${capId}`);
      return true;
      
    } catch (err) {
      this.homey.error(`[CAPABILITY] ❌ Failed to remove ${capId}:`, err.message);
      return false;
    }
  }

  /**
   * Get statistics about managed capabilities
   * 
   * @returns {object} Stats
   */
  getStats() {
    return {
      created: this.createdCapabilities.size,
      capabilities: Array.from(this.createdCapabilities)
    };
  }
}

module.exports = CapabilityManager;
