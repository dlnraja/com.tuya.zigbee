'use strict';

/**
 * Tests for capability-safe.js
 */

const { expect } = require('chai');
const { createCapabilitySafe, removeCapabilitySafe, getTrackedCapabilities } = require('../lib/utils/capability-safe');

describe('capability-safe', () => {
  
  // Mock device
  let mockDevice;
  
  beforeEach(() => {
    mockDevice = {
      hasCapability: function(capId) {
        return this._capabilities && this._capabilities.includes(capId);
      },
      addCapability: async function(capId) {
        if (!this._capabilities) this._capabilities = [];
        if (this._capabilities.includes(capId)) {
          throw new Error('Capability already exists');
        }
        this._capabilities.push(capId);
      },
      removeCapability: async function(capId) {
        if (!this._capabilities) this._capabilities = [];
        const index = this._capabilities.indexOf(capId);
        if (index > -1) {
          this._capabilities.splice(index, 1);
        }
      },
      getStore: async function() {
        return this._store || {};
      },
      setStore: async function(store) {
        this._store = store;
      },
      log: console.log,
      error: console.error,
      _capabilities: [],
      _store: {}
    };
  });
  
  describe('createCapabilitySafe', () => {
    
    it('should create new capability successfully', async () => {
      const result = await createCapabilitySafe(mockDevice, 'measure_battery');
      expect(result).to.be.true;
      expect(mockDevice.hasCapability('measure_battery')).to.be.true;
    });
    
    it('should skip existing capability', async () => {
      // Add capability first
      await mockDevice.addCapability('measure_battery');
      
      // Try to add again
      const result = await createCapabilitySafe(mockDevice, 'measure_battery');
      expect(result).to.be.false;
    });
    
    it('should track capability in store', async () => {
      await createCapabilitySafe(mockDevice, 'measure_battery');
      
      const store = await mockDevice.getStore();
      expect(store._createdCapabilities).to.have.property('measure_battery');
      expect(store._createdCapabilities.measure_battery).to.be.true;
    });
    
    it('should not create duplicate even if store says created', async () => {
      // Mark as created in store
      mockDevice._store = {
        _createdCapabilities: {
          'measure_battery': true
        }
      };
      
      const result = await createCapabilitySafe(mockDevice, 'measure_battery');
      expect(result).to.be.false;
    });
    
    it('should handle invalid device gracefully', async () => {
      const result = await createCapabilitySafe(null, 'measure_battery');
      expect(result).to.be.false;
    });
    
    it('should handle invalid capability ID gracefully', async () => {
      const result = await createCapabilitySafe(mockDevice, null);
      expect(result).to.be.false;
    });
    
  });
  
  describe('removeCapabilitySafe', () => {
    
    it('should remove existing capability', async () => {
      // Add capability first
      await createCapabilitySafe(mockDevice, 'measure_battery');
      
      // Remove it
      const result = await removeCapabilitySafe(mockDevice, 'measure_battery');
      expect(result).to.be.true;
      expect(mockDevice.hasCapability('measure_battery')).to.be.false;
    });
    
    it('should return false for non-existent capability', async () => {
      const result = await removeCapabilitySafe(mockDevice, 'measure_battery');
      expect(result).to.be.false;
    });
    
    it('should update store when removing', async () => {
      // Add and then remove
      await createCapabilitySafe(mockDevice, 'measure_battery');
      await removeCapabilitySafe(mockDevice, 'measure_battery');
      
      const store = await mockDevice.getStore();
      expect(store._createdCapabilities).to.not.have.property('measure_battery');
    });
    
  });
  
  describe('getTrackedCapabilities', () => {
    
    it('should return empty array initially', async () => {
      const tracked = await getTrackedCapabilities(mockDevice);
      expect(tracked).to.be.an('array');
      expect(tracked).to.have.lengthOf(0);
    });
    
    it('should return tracked capabilities', async () => {
      await createCapabilitySafe(mockDevice, 'measure_battery');
      await createCapabilitySafe(mockDevice, 'measure_temperature');
      
      const tracked = await getTrackedCapabilities(mockDevice);
      expect(tracked).to.be.an('array');
      expect(tracked).to.have.lengthOf(2);
      expect(tracked).to.include('measure_battery');
      expect(tracked).to.include('measure_temperature');
    });
    
  });
  
});
