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
    this.log('[BUTTON4] 🔘 Button4GangDevice v5.5.295 initializing...');
    this.log('[BUTTON4] FORUM FIX: Physical buttons TS004F not working');
    this.log('[BUTTON4] Research: 10 sources analyzed - scene cluster priority');
    this.log('═══════════════════════════════════════════════════════════════');

    // Set button count BEFORE calling super (ButtonDevice uses this)
    this.buttonCount = 4;

    // v5.5.295: Log available endpoints for debugging
    const availableEndpoints = Object.keys(zclNode?.endpoints || {});
    this.log(`[BUTTON4] 📡 Available endpoints: ${availableEndpoints.join(', ')}`);

    // Initialize base (power detection + button detection)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // v5.5.295: FORUM FIX - Enhanced physical button detection
    // Based on research from Zigbee2MQTT, ZHA, SmartThings patterns
    await this._setupEnhancedPhysicalButtonDetection(zclNode);

    // v5.5.260: Setup battery reporting listener
    await this._setupBatteryReporting(zclNode);

    this.log('[BUTTON4] ✅ Button4GangDevice initialized - 4 buttons ready');
    this.log('═══════════════════════════════════════════════════════════════');
  }

  /**
   * v5.5.333: FORUM FIX - Enhanced physical button detection for TS004F
   * Based on research from 10+ sources: Zigbee2MQTT, ZHA, SmartThings, etc.
   * Added support for _TZ3000_wkai4ga5 and _TZ3000_5tqxpine (Eftychis report)
   *
   * CRITICAL FINDINGS:
   * - TS004F physical buttons send scene.recall commands
   * - Some devices use multistateInput cluster (cluster 18)
   * - Virtual buttons (app icons) use onOff commands
   * - Need BOTH listeners for complete functionality
   * - Scene commands: 0=single, 1=double, 2=long press
   */
  async _setupEnhancedPhysicalButtonDetection(zclNode) {
    this.log('[BUTTON4-PHYSICAL] 🔧 Setting up enhanced physical button detection...');
    this.log('[BUTTON4-PHYSICAL] Research base: Z2M, ZHA, SmartThings, deCONZ patterns');

    const manufacturerName = this.getData()?.manufacturerName || '';
    this.log(`[BUTTON4-PHYSICAL] Manufacturer: ${manufacturerName}`);

    try {
      // Setup scene cluster listeners on all 4 endpoints for physical buttons
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) {
          this.log(`[BUTTON4-PHYSICAL] ⚠️ Endpoint ${ep} not found`);
          continue;
        }

        // v5.5.333: Setup scenes cluster listener
        const scenesCluster = endpoint.clusters?.scenes || endpoint.clusters?.genScenes || endpoint.clusters?.[5];
        if (scenesCluster) {
          this.log(`[BUTTON4-PHYSICAL] 📡 Setting up scene listener on EP${ep}...`);

          // CRITICAL: Listen for scene recall commands (physical button presses)
          scenesCluster.on('command', async (commandName, commandPayload) => {
            if (commandName === 'recall') {
              const sceneId = commandPayload?.sceneId ?? commandPayload?.scene ?? 0;

              // Map scene ID to press type based on research
              const pressTypeMap = {
                0: 'single',    // Scene 0 = single press
                1: 'double',    // Scene 1 = double press
                2: 'long',      // Scene 2 = long/hold press
                3: 'single',    // Some variants use 3 for single
                4: 'double',    // Some variants use 4 for double
                5: 'long'       // Some variants use 5 for long
              };

              const pressType = pressTypeMap[sceneId] || 'single';

              this.log(`[BUTTON4-PHYSICAL] 🔘 Physical Button ${ep} ${pressType.toUpperCase()} (scene ${sceneId})`);
              this.log(`[BUTTON4-PHYSICAL] ✅ Triggering flow for physical press`);

              // Trigger button flow
              await this.triggerButtonPress(ep, pressType);
            } else {
              this.log(`[BUTTON4-PHYSICAL] 📡 Other scene command on EP${ep}: ${commandName}`, commandPayload);
            }
          });

          this.log(`[BUTTON4-PHYSICAL] ✅ Scene listener configured for EP${ep}`);
        } else {
          this.log(`[BUTTON4-PHYSICAL] ⚠️ No scenes cluster on EP${ep}`);
        }

        // v5.5.333: Setup multistateInput cluster listener (for _TZ3000_wkai4ga5, _TZ3000_5tqxpine)
        const multistateCluster = endpoint.clusters?.multistateInput || endpoint.clusters?.genMultistateInput || endpoint.clusters?.[18];
        if (multistateCluster) {
          this.log(`[BUTTON4-PHYSICAL] 📡 Setting up multistateInput listener on EP${ep}...`);

          // Listen for presentValue attribute changes
          if (typeof multistateCluster.on === 'function') {
            multistateCluster.on('attr.presentValue', async (value) => {
              this.log(`[BUTTON4-MULTISTATE] EP${ep} presentValue: ${value}`);

              // Map multistate values to press types
              // 0=single, 1=double, 2=long (common pattern)
              const pressTypeMap = { 0: 'single', 1: 'double', 2: 'long' };
              const pressType = pressTypeMap[value] || 'single';

              this.log(`[BUTTON4-MULTISTATE] 🔘 Button ${ep} ${pressType.toUpperCase()} (multistate ${value})`);
              await this.triggerButtonPress(ep, pressType);
            });

            this.log(`[BUTTON4-PHYSICAL] ✅ MultistateInput listener configured for EP${ep}`);
          }
        }

        // Also ensure onOff cluster is available for virtual buttons (app icons)
        const onOffCluster = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
        if (onOffCluster) {
          this.log(`[BUTTON4-PHYSICAL] 📱 OnOff cluster available on EP${ep} (virtual buttons)`);

          // v5.5.333: Also listen for onOff commands as button events
          if (typeof onOffCluster.on === 'function') {
            onOffCluster.on('command', async (commandName, commandPayload) => {
              this.log(`[BUTTON4-ONOFF] EP${ep} command: ${commandName}`, commandPayload);

              // Map onOff commands to press types
              const commandMap = {
                'on': 'single',
                'setOn': 'single',
                'off': 'double',
                'setOff': 'double',
                'toggle': 'long'
              };

              const pressType = commandMap[commandName];
              if (pressType) {
                this.log(`[BUTTON4-ONOFF] 🔘 Button ${ep} ${pressType.toUpperCase()} (${commandName})`);
                await this.triggerButtonPress(ep, pressType);
              }
            });
          }
        }
      }

      this.log('[BUTTON4-PHYSICAL] ✅ Enhanced physical button detection configured');
      this.log('[BUTTON4-PHYSICAL] 🔄 Scenes, MultistateInput, and OnOff listeners active');

    } catch (error) {
      this.log('[BUTTON4-PHYSICAL] ❌ Setup error:', error.message);
    }
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
