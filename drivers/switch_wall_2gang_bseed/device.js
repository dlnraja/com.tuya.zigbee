'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * BSEED 2-Gang Switch Driver with Firmware Bug Workaround
 * 
 * **CRITICAL FIRMWARE BUG**: _TZ3000_l9brjwau has grouped endpoints
 * When you control ONE gang, BOTH gangs physically switch together.
 * 
 * WORKAROUND STRATEGY:
 * 1. Track desired states separately from hardware states
 * 2. Detect when opposite gang changes unexpectedly
 * 3. Send correction command to restore opposite gang state
 * 4. Add delays to prevent command conflicts
 * 
 * Logs analysis from user Loïc Salmona (Nov 1, 2025):
 * - Command Gang 1 OFF → Hardware switches BOTH gangs OFF
 * - Command Gang 2 ON → Hardware switches BOTH gangs ON
 * - This is HARDWARE/FIRMWARE issue, not driver bug
 * 
 * @author Dylan Rajasekaram <senetmarne@gmail.com>
 * @contributor Loïc Salmona (Bug report + extensive testing)
 */
class BseedSwitch2GangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('[BSEED] 🔧 Initializing with firmware bug workaround...');
    
    // Set gang count BEFORE parent init
    this.gangCount = 2;
    
    // Track desired states (what user wants)
    this.desiredStates = {
      gang1: false,
      gang2: false
    };
    
    // Track if we're actively correcting
    this.isCorrectingState = false;
    
    // Workaround settings
    this.workaroundEnabled = this.getSetting('bseed_workaround') !== false;
    this.syncDelay = this.getSetting('sync_delay_ms') || 500;
    
    // Initialize via parent (sets up multi-endpoint)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    // Override capability listeners with workaround
    if (this.workaroundEnabled) {
      this.setupBseedWorkaround();
    }
    
    this.log('[BSEED] ✅ Ready with workaround:', this.workaroundEnabled ? 'ENABLED' : 'DISABLED');
  }

  /**
   * Setup BSEED-specific workaround listeners
   */
  setupBseedWorkaround() {
    this.log('[BSEED] 🛠️ Installing firmware bug workaround...');
    
    // Override onoff capability (Gang 1)
    this.registerCapabilityListener('onoff', async (value) => {
      return await this.handleBseedGangCommand('gang1', value);
    });
    
    // Override onoff.gang2 capability (Gang 2)
    this.registerCapabilityListener('onoff.gang2', async (value) => {
      return await this.handleBseedGangCommand('gang2', value);
    });
    
    this.log('[BSEED] ✅ Workaround listeners installed');
  }

  /**
   * Handle gang command with BSEED firmware bug workaround
   * 
   * @param {string} gang - 'gang1' or 'gang2'
   * @param {boolean} targetState - desired state
   */
  async handleBseedGangCommand(gang, targetState) {
    const endpoint = gang === 'gang1' ? 1 : 2;
    const oppositeGang = gang === 'gang1' ? 'gang2' : 'gang1';
    const oppositeEndpoint = gang === 'gang1' ? 2 : 1;
    const capability = gang === 'gang1' ? 'onoff' : 'onoff.gang2';
    const oppositeCapability = gang === 'gang1' ? 'onoff.gang2' : 'onoff';
    
    this.log(`[BSEED] 🎯 Command: ${gang} → ${targetState}`);
    
    // Update desired state
    this.desiredStates[gang] = targetState;
    
    try {
      // STEP 1: Send primary command
      const cluster = this.zclNode.endpoints[endpoint].clusters.onOff;
      if (targetState) {
        await cluster.setOn();
        this.log(`[BSEED] ✓ ${gang} command sent: ON`);
      } else {
        await cluster.setOff();
        this.log(`[BSEED] ✓ ${gang} command sent: OFF`);
      }
      
      // STEP 2: Wait for hardware to settle (BSEED firmware delay)
      await this.sleep(this.syncDelay);
      
      // STEP 3: Check if opposite gang was affected by bug
      const oppositeCurrentState = this.getCapabilityValue(oppositeCapability);
      const oppositeDesiredState = this.desiredStates[oppositeGang];
      
      this.log(`[BSEED] 🔍 ${oppositeGang} check: desired=${oppositeDesiredState}, current=${oppositeCurrentState}`);
      
      // STEP 4: Correct opposite gang if needed
      if (oppositeCurrentState !== oppositeDesiredState && !this.isCorrectingState) {
        this.log(`[BSEED] ⚠️  ${oppositeGang} affected by firmware bug! Correcting...`);
        this.isCorrectingState = true;
        
        try {
          const oppositeCluster = this.zclNode.endpoints[oppositeEndpoint].clusters.onOff;
          if (oppositeDesiredState) {
            await oppositeCluster.setOn();
            this.log(`[BSEED] ✓ ${oppositeGang} corrected: ON`);
          } else {
            await oppositeCluster.setOff();
            this.log(`[BSEED] ✓ ${oppositeGang} corrected: OFF`);
          }
          
          // Update capability
          await this.setCapabilityValue(oppositeCapability, oppositeDesiredState);
        } catch (correctionErr) {
          this.error(`[BSEED] ❌ ${oppositeGang} correction failed:`, correctionErr.message);
        } finally {
          this.isCorrectingState = false;
        }
      }
      
      // STEP 5: Update primary gang capability
      await this.setCapabilityValue(capability, targetState);
      this.log(`[BSEED] ✅ ${gang} operation complete`);
      
    } catch (err) {
      this.error(`[BSEED] ❌ ${gang} command failed:`, err.message);
      throw err;
    }
  }

  /**
   * Override settings change to update workaround params
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[BSEED] ⚙️ Settings changed:', changedKeys);
    
    if (changedKeys.includes('bseed_workaround')) {
      this.workaroundEnabled = newSettings.bseed_workaround;
      this.log('[BSEED] Workaround:', this.workaroundEnabled ? 'ENABLED' : 'DISABLED');
      
      if (this.workaroundEnabled) {
        this.setupBseedWorkaround();
      }
    }
    
    if (changedKeys.includes('sync_delay_ms')) {
      this.syncDelay = newSettings.sync_delay_ms;
      this.log('[BSEED] Sync delay updated:', this.syncDelay, 'ms');
    }
    
    return super.onSettings({ oldSettings, newSettings, changedKeys });
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onDeleted() {
    this.log('[BSEED] Device deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = BseedSwitch2GangDevice;
