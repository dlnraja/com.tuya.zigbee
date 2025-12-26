'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     BUTTON 4 GANG - v5.5.260 FIXED FOR TS0044 / TS004F                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  v5.5.260: FIX for Cyril #699 - Physical buttons not working                ║
 * ║  - TS0044 uses 4 ENDPOINTS (1-4), one per button                             ║
 * ║  - Each endpoint sends scenes.recall or onOff commands                       ║
 * ║  - Battery reported via powerConfiguration cluster on EP1                   ║
 * ║                                                                              ║
 * ║  STRUCTURE TS0044:                                                           ║
 * ║  EP1: Button 1 (scenes, onOff, powerCfg, groups)                             ║
 * ║  EP2: Button 2 (scenes, onOff, groups)                                       ║
 * ║  EP3: Button 3 (scenes, onOff, groups)                                       ║
 * ║  EP4: Button 4 (scenes, onOff, groups)                                       ║
 * ║                                                                              ║
 * ║  ACTIONS: X_single, X_double, X_hold (X = button 1-4)                        ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Button4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════════════════');
    this.log('[BUTTON4] 🔘 Button4GangDevice v5.5.260 initializing...');
    this.log('[BUTTON4] Fix for Cyril #699: Physical buttons not working');
    this.log('═══════════════════════════════════════════════════════════════');

    // Set button count BEFORE calling super (ButtonDevice uses this)
    this.buttonCount = 4;

    // v5.5.260: Log available endpoints for debugging
    const availableEndpoints = Object.keys(zclNode?.endpoints || {});
    this.log(`[BUTTON4] 📡 Available endpoints: ${availableEndpoints.join(', ')}`);

    // Initialize base (power detection + button detection)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // v5.5.260: Setup battery reporting listener
    await this._setupBatteryReporting(zclNode);

    this.log('[BUTTON4] ✅ Button4GangDevice initialized - 4 buttons ready');
    this.log('═══════════════════════════════════════════════════════════════');
  }

  /**
   * v5.5.260: Setup battery reporting for sleepy devices
   * TS0044 reports battery on EP1 powerConfiguration cluster
   */
  async _setupBatteryReporting(zclNode) {
    try {
      const powerCluster = zclNode?.endpoints?.[1]?.clusters?.powerConfiguration
        || zclNode?.endpoints?.[1]?.clusters?.genPowerCfg
        || zclNode?.endpoints?.[1]?.clusters?.[1];

      if (powerCluster) {
        this.log('[BUTTON4-BATTERY] 🔋 Setting up battery reporting on EP1...');

        // Listen for battery attribute reports
        if (typeof powerCluster.on === 'function') {
          powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
            if (value !== undefined && value !== 255 && value !== 0) {
              const battery = Math.round(value / 2);
              this.log(`[BUTTON4-BATTERY] ✅ Battery report: ${battery}%`);
              await this.setCapabilityValue('measure_battery', battery).catch(() => { });
              await this.setStoreValue('last_battery_percentage', battery).catch(() => { });
            }
          });

          powerCluster.on('attr.batteryVoltage', async (value) => {
            if (value !== undefined && value > 0) {
              const voltage = value / 10;
              // CR2032/CR2450: 3.0V=100%, 2.0V=0%
              const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
              this.log(`[BUTTON4-BATTERY] ✅ Battery from voltage: ${voltage}V → ${battery}%`);
              await this.setCapabilityValue('measure_battery', battery).catch(() => { });
            }
          });

          this.log('[BUTTON4-BATTERY] ✅ Battery listeners registered');
        }
      } else {
        this.log('[BUTTON4-BATTERY] ⚠️ No powerConfiguration cluster found on EP1');
      }
    } catch (err) {
      this.log('[BUTTON4-BATTERY] ⚠️ Battery setup error:', err.message);
    }
  }

  async onDeleted() {
    this.log('Button4GangDevice deleted');

    // Cleanup timers
    if (this._clickState) {
      if (this._clickState.clickTimer) {
        clearTimeout(this._clickState.clickTimer);
      }
      if (this._clickState.longPressTimer) {
        clearTimeout(this._clickState.longPressTimer);
      }
    }
  }
}

module.exports = Button4GangDevice;
