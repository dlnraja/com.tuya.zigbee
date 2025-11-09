'use strict';

/**
 * TS0002 2-Gang Switch/Outlet Driver
 * 
 * Supports Tuya DP-based 2-gang switches and outlets
 * 
 * Capabilities:
 * - onoff (gang 1)
 * - onoff.gang2 (gang 2)
 * - measure_power (total, optional)
 * - measure_voltage (optional)
 * - measure_current (optional)
 * 
 * DPs:
 * - DP 1: Gang 1 state (bool)
 * - DP 2: Gang 2 state (bool)
 * - DP 7: Total power (W, optional)
 * - DP 6: Voltage (V * 10, optional)
 * - DP 5: Current (mA, optional)
 */

const { BaseHybridDevice } = require('../../lib/devices/BaseHybridDevice');
const { createCapabilitySafe } = require('../../lib/utils/capability-safe');
const { parseTuyaDp, mapDpToCapability, encodeDpValue } = require('../../lib/tuya/dp-parser-enhanced');

class TS0002Device extends BaseHybridDevice {
  
  /**
   * Device initialization
   */
  async onNodeInit() {
    this.log('');
    this.log('═══════════════════════════════════════════════════');
    this.log('🔌 TS0002 2-GANG SWITCH/OUTLET INITIALIZATION');
    this.log('═══════════════════════════════════════════════════');
    this.log('');
    
    // Call parent initialization
    await super.onNodeInit();
    
    // Create gang capabilities
    await this.setupCapabilities();
    
    // Setup Tuya DP listeners
    await this.setupTuyaListeners();
    
    // Setup capability listeners (for user control)
    await this.setupCapabilityListeners();
    
    // Initial state request
    await this.requestInitialState();
    
    this.log('');
    this.log('✅ TS0002 device initialized successfully');
    this.log('');
  }
  
  /**
   * Setup device capabilities
   */
  async setupCapabilities() {
    this.log('🔧 [SETUP] Creating capabilities...');
    
    // Gang 1 (main)
    await createCapabilitySafe(this, 'onoff');
    this.log('   ✅ Gang 1: onoff');
    
    // Gang 2
    await createCapabilitySafe(this, 'onoff.gang2');
    this.log('   ✅ Gang 2: onoff.gang2');
    
    // Optional: Power monitoring
    const hasPower = this.getSetting('has_power_monitoring');
    if (hasPower) {
      await createCapabilitySafe(this, 'measure_power');
      await createCapabilitySafe(this, 'measure_voltage');
      await createCapabilitySafe(this, 'measure_current');
      this.log('   ✅ Power monitoring capabilities added');
    }
    
    this.log('✅ [SETUP] Capabilities created');
  }
  
  /**
   * Setup Tuya DP listeners
   */
  async setupTuyaListeners() {
    this.log('📡 [SETUP] Setting up Tuya DP listeners...');
    
    if (!this.tuyaEF00Manager) {
      this.log('⚠️  [SETUP] TuyaEF00Manager not available - skipping DP listeners');
      return;
    }
    
    // Listen for all datapoints
    this.tuyaEF00Manager.on('datapoint', async ({ dp, value }) => {
      this.log(`[TUYA-DP] Received DP ${dp} = ${JSON.stringify(value)}`);
      
      // Map DP to capability
      const mapping = mapDpToCapability(dp, value, { 
        gangCount: 2,
        capabilityPrefix: 'onoff'
      });
      
      if (mapping) {
        try {
          await this.setCapabilityValue(mapping.capability, mapping.value);
          this.log(`   ✅ ${mapping.capability} = ${mapping.value}`);
          
          // Emit flow trigger
          this.emitFlowTrigger(mapping.capability, mapping.value);
          
        } catch (err) {
          this.error(`   ❌ Failed to set ${mapping.capability}:`, err.message);
        }
      } else {
        this.log(`   ℹ️  DP ${dp} not mapped to capability`);
      }
    });
    
    // Listen for specific DPs
    this.tuyaEF00Manager.on('dp-1', (value) => {
      this.log('[TUYA-DP] Gang 1 state changed:', value);
    });
    
    this.tuyaEF00Manager.on('dp-2', (value) => {
      this.log('[TUYA-DP] Gang 2 state changed:', value);
    });
    
    this.log('✅ [SETUP] Tuya DP listeners configured');
  }
  
  /**
   * Setup capability listeners (user control)
   */
  async setupCapabilityListeners() {
    this.log('🎛️  [SETUP] Setting up capability listeners...');
    
    // Gang 1 control
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[CONTROL] Gang 1 → ${value ? 'ON' : 'OFF'}`);
      await this.sendDP(1, value);
      return value;
    });
    
    // Gang 2 control
    this.registerCapabilityListener('onoff.gang2', async (value) => {
      this.log(`[CONTROL] Gang 2 → ${value ? 'ON' : 'OFF'}`);
      await this.sendDP(2, value);
      return value;
    });
    
    this.log('✅ [SETUP] Capability listeners configured');
  }
  
  /**
   * Send DP command to device
   * @param {number} dp - DP ID
   * @param {any} value - Value to send
   */
  async sendDP(dp, value) {
    try {
      if (!this.tuyaEF00Manager) {
        throw new Error('TuyaEF00Manager not available');
      }
      
      // Encode DP value
      const frame = encodeDpValue(dp, 0x01, value); // 0x01 = boolean type
      
      this.log(`[SEND-DP] Sending DP ${dp} = ${value}`);
      this.log(`[SEND-DP] Frame: ${frame.toString('hex')}`);
      
      // Send via TuyaEF00Manager
      await this.tuyaEF00Manager.sendDP(dp, 0x01, value);
      
      this.log(`✅ [SEND-DP] DP ${dp} sent successfully`);
      
    } catch (err) {
      this.error(`❌ [SEND-DP] Failed to send DP ${dp}:`, err.message);
      throw err;
    }
  }
  
  /**
   * Request initial device state
   */
  async requestInitialState() {
    this.log('🔄 [INIT] Requesting initial state...');
    
    if (!this.tuyaEF00Manager) {
      this.log('⚠️  [INIT] TuyaEF00Manager not available - skipping state request');
      return;
    }
    
    try {
      // Request gang states
      await this.tuyaEF00Manager.requestDP(1); // Gang 1
      await this.tuyaEF00Manager.requestDP(2); // Gang 2
      
      // Request power monitoring if available
      const hasPower = this.getSetting('has_power_monitoring');
      if (hasPower) {
        await this.tuyaEF00Manager.requestDP(7); // Power
        await this.tuyaEF00Manager.requestDP(6); // Voltage
        await this.tuyaEF00Manager.requestDP(5); // Current
      }
      
      this.log('✅ [INIT] Initial state requested');
      
    } catch (err) {
      this.error('❌ [INIT] Failed to request initial state:', err.message);
    }
  }
  
  /**
   * Emit flow trigger for capability change
   * @param {string} capability - Capability ID
   * @param {any} value - New value
   */
  emitFlowTrigger(capability, value) {
    try {
      // Determine which gang
      let gang = 1;
      if (capability === 'onoff.gang2') {
        gang = 2;
      }
      
      // Emit gang-specific trigger
      const tokens = {
        gang: gang,
        state: value
      };
      
      const state = {
        gang: gang
      };
      
      this.homey.flow
        .getDeviceTriggerCard('gang_turned_on_off')
        .trigger(this, tokens, state)
        .catch(err => {
          this.error('Failed to trigger flow:', err);
        });
      
      // Emit specific gang trigger
      if (value) {
        this.homey.flow
          .getDeviceTriggerCard(`gang_${gang}_turned_on`)
          .trigger(this, tokens, state)
          .catch(err => {
            this.error('Failed to trigger gang on flow:', err);
          });
      } else {
        this.homey.flow
          .getDeviceTriggerCard(`gang_${gang}_turned_off`)
          .trigger(this, tokens, state)
          .catch(err => {
            this.error('Failed to trigger gang off flow:', err);
          });
      }
      
    } catch (err) {
      this.error('Failed to emit flow trigger:', err);
    }
  }
  
  /**
   * Device deleted
   */
  async onDeleted() {
    this.log('🗑️  TS0002 device deleted');
    
    // Cleanup listeners
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.removeAllListeners('datapoint');
      this.tuyaEF00Manager.removeAllListeners('dp-1');
      this.tuyaEF00Manager.removeAllListeners('dp-2');
    }
    
    await super.onDeleted();
  }
  
}

module.exports = TS0002Device;
