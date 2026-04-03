'use strict';

/**
 * SMART-ADAPT MANAGER (V2 - Read-Only Mode)
 *
 * AUDIT V2 CHANGES:
 * - Default mode: ANALYSIS ONLY (read-only)
 * - No automatic capability modifications unless experimental mode enabled
 * - Detailed logging of what WOULD be changed
 * - Aligns with Homey guidelines: static drivers preferred
 *
 * Philosophy:
 * - Smart-Adapt becomes a "lint" tool that suggests changes
 * - Actual modifications require user opt-in via experimental_smart_adapt flag
 * - Apps like Tuya/Xiaomi/Hue don't do dynamic capability changes → we shouldn't either
 */

class SmartAdaptManager {

  constructor(homey) {
    this.homey = homey;
    this.experimentalMode = false;
    this.suggestions = new Map();
    this.init();
  }

  /**
   * Initialize Smart-Adapt Manager
   */
  init() {
    // Get experimental mode flag
    this.experimentalMode = this.homey.settings.get('experimental_smart_adapt') || false;

    // Listen for settings changes
    this.homey.settings.on('set', (key) => {
      if (key === 'experimental_smart_adapt') {
        this.experimentalMode = this.homey.settings.get('experimental_smart_adapt');
        this.homey.log(`[SMART-ADAPT] Experimental mode ${this.experimentalMode ? 'ENABLED' : 'DISABLED'}`);
      }
    });

    const mode = this.experimentalMode ? 'EXPERIMENTAL (modifies devices)' : 'ANALYSIS ONLY (read-only)';
    this.homey.log(`[SMART-ADAPT] Initialized in ${mode} mode`);
  }

  /**
   * Analyze device and suggest capabilities
   * Does NOT modify device unless experimental mode enabled
   */
  async analyzeDevice(device, deviceData) {
    const analysis = {
      deviceId: device.getData().id,
      deviceName: device.getName(),
      driverName: device.driver.id,
      suggestions: [],
      warnings: [],
      actions: []
    };

    // Detect device type from driver name
    const isButton = this.isButtonDevice(device.driver.id);
    const isSwitch = this.isSwitchDevice(device.driver.id);
    const isSensor = this.isSensorDevice(device.driver.id);

    // Analyze capabilities
    const currentCapabilities = device.getCapabilities();

    // BUTTON/REMOTE DEVICES
    if (isButton) {
      analysis.suggestions.push({
        type: 'BUTTON_DETECTED',
        message: 'Button/remote device - should only have measure_battery and Flow cards',
        severity: 'info'
      });

      // Check for invalid capabilities
      if (currentCapabilities.includes('onoff')) {
        analysis.warnings.push({
          capability: 'onoff',
          message: 'Buttons should NOT have onoff capability',
          action: 'remove'
        });

        analysis.actions.push({
          type: 'remove_capability',
          capability: 'onoff',
          reason: 'Buttons are controllers, not controllable devices'
        });
      }

      if (currentCapabilities.includes('dim')) {
        analysis.warnings.push({
          capability: 'dim',
          message: 'Buttons should NOT have dim capability',
          action: 'remove'
        });

        analysis.actions.push({
          type: 'remove_capability',
          capability: 'dim',
          reason: 'Buttons are controllers, not dimmable lights'
        });
      }

      if (!currentCapabilities.includes('measure_battery')) {
        analysis.suggestions.push({
          capability: 'measure_battery',
          message: 'Button devices should have measure_battery',
          action: 'add'
        });

        analysis.actions.push({
          type: 'add_capability',
          capability: 'measure_battery',
          reason: 'Buttons are battery-powered'
        });
      }
    }

    // SWITCH DEVICES
    if (isSwitch) {
      analysis.suggestions.push({
        type: 'SWITCH_DETECTED',
        message: 'Switch device - should have onoff capability',
        severity: 'info'
      });

      if (!currentCapabilities.includes('onoff')) {
        analysis.warnings.push({
          capability: 'onoff',
          message: 'Switches MUST have onoff capability',
          action: 'add'
        });

        analysis.actions.push({
          type: 'add_capability',
          capability: 'onoff',
          reason: 'Switches need onoff for control'
        });
      }
    }

    // SENSOR DEVICES
    if (isSensor) {
      analysis.suggestions.push({
        type: 'SENSOR_DETECTED',
        message: 'Sensor device - check appropriate measure_* capabilities',
        severity: 'info'
      });
    }

    // Store suggestions
    this.suggestions.set(device.getData().id, analysis);

    // Log analysis
    this.logAnalysis(analysis);

    // Apply actions ONLY if experimental mode
    if (this.experimentalMode && analysis.actions.length > 0) {
      this.homey.log(`[SMART-ADAPT] EXPERIMENTAL MODE: Applying ${analysis.actions.length} actions...`);
      await this.applyActions(device, analysis.actions);
    }

    return analysis;
  }

  /**
   * Log analysis results
   */
  logAnalysis(analysis) {
    this.homey.log('');
    this.homey.log('╔═══════════════════════════════════════════╗');
    this.homey.log('║   SMART-ADAPT ANALYSIS                   ║');
    this.homey.log('╚═══════════════════════════════════════════╝');
    this.homey.log(`Device: ${analysis.deviceName}`);
    this.homey.log(`Driver: ${analysis.driverName}`);
    this.homey.log('');

    if (analysis.warnings.length > 0) {
      this.homey.log('⚠️  WARNINGS:');
      analysis.warnings.forEach(w => {
        this.homey.log(`   - ${w.message}`);
        this.homey.log(`     Capability: ${w.capability}`);
        this.homey.log(`     Action: ${w.action}`);
      });
      this.homey.log('');
    }

    if (analysis.actions.length > 0) {
      const mode = this.experimentalMode ? 'WILL APPLY' : 'WOULD APPLY (if experimental mode enabled)';
      this.homey.log(`📝 ACTIONS (${mode}):`);
      analysis.actions.forEach(a => {
        this.homey.log(`   ${a.type}: ${a.capability}`);
        this.homey.log(`   Reason: ${a.reason}`);
      });
      this.homey.log('');
    }

    if (!this.experimentalMode && analysis.actions.length > 0) {
      this.homey.log('💡 TIP: Enable "Experimental Smart-Adapt" in app settings to auto-apply these changes');
      this.homey.log('');
    }

    this.homey.log('═══════════════════════════════════════════');
    this.homey.log('');
  }

  /**
   * Apply actions to device (EXPERIMENTAL MODE ONLY)
   */
  async applyActions(device, actions) {
    for (const action of actions) {
      try {
        if (action.type === 'add_capability') {
          this.homey.log(`[SMART-ADAPT] Adding capability: ${action.capability}`);
          await device.addCapability(action.capability);
        } else if (action.type === 'remove_capability') {
          this.homey.log(`[SMART-ADAPT] Removing capability: ${action.capability}`);
          await device.removeCapability(action.capability);
        }
      } catch (err) {
        this.homey.error(`[SMART-ADAPT] Failed to ${action.type} ${action.capability}:`, err.message);
      }
    }
  }

  /**
   * Check if device is a button/remote
   */
  isButtonDevice(driverId) {
    return driverId.includes('button_') ||
      driverId.includes('remote_') ||
      driverId.includes('wireless_');
  }

  /**
   * Check if device is a switch
   */
  isSwitchDevice(driverId) {
    return driverId.includes('switch_') &&
      !driverId.includes('wireless');
  }

  /**
   * Check if device is a sensor
   */
  isSensorDevice(driverId) {
    return driverId.includes('sensor_') ||
      driverId.includes('climate_') ||
      driverId.includes('motion_') ||
      driverId.includes('contact_');
  }

  /**
   * Get suggestions for a device
   */
  getSuggestions(deviceId) {
    return this.suggestions.get(deviceId);
  }

  /**
   * Get all suggestions
   */
  getAllSuggestions() {
    return Array.from(this.suggestions.values());
  }

  /**
   * Clear suggestions
   */
  clearSuggestions() {
    this.suggestions.clear();
  }
}

module.exports = SmartAdaptManager;
