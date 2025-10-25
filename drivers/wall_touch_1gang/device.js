'use strict';

const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * Wall Touch Button 3 Gang - EXEMPLE HYBRIDE INTELLIGENT
 * 
 * Démontre la puissance du système BaseHybridDevice:
 * - Auto-détection batterie vs secteur
 * - Masquage intelligent des capacités
 * - Transition transparente entre modes
 * - Flow cards adaptatives
 */
class WallTouch3GangHybridDevice extends BaseHybridDevice {

  async onNodeInit() {
    // Time sync (Tuya devices)
    this.setupTimeSync().catch(() => {});

    this.log('🎨 WallTouch3GangHybrid initializing...');
    
    // Init base hybrid (auto-détection power source)
    await super.onNodeInit();
    
    // Init buttons
    await this.initializeButtons();
    
    // Init temperature monitoring
    await this.initializeTemperature();
    
    // Init tamper detection
    await this.initializeTamper();
    
    this.log('✅ WallTouch3GangHybrid ready');
    this.log(`   Power: ${this.powerType}`);
    this.log(`   Battery: ${this.batteryType || 'N/A'}`);
  }

  /**
   * Initialize 3-button functionality
   */
  async initializeButtons() {
    this.log('🔘 Initializing 3-gang buttons...');
    
    const buttons = ['button1', 'button2', 'button3'];
    
    for (const button of buttons) {
      const capabilityId = `onoff.${button}`;
      
      // Register capability
      if (!this.hasCapability(capabilityId)) {
        await this.addCapability(capabilityId);
        this.log(`➕ Added capability: ${capabilityId}`);
      }
      
      // Register listener
      this.registerCapabilityListener(capabilityId, async (value) => {
        return this.onButtonChanged(button, value);
      });
      
      // Register cluster for each endpoint
      const endpoint = parseInt(button.replace('button', ''));
      this.registerCapability(capabilityId, this.CLUSTER.ON_OFF, {
        endpoint: endpoint
      });
      
      this.log(`✅ Button ${endpoint} registered`);
    }
    
    // Listen for button press events (scene mode)
    this.registerMultipleCapabilityListener(
      buttons.map(b => `onoff.${b}`),
      async (valueObj) => {
        return this.onMultipleButtonPress(valueObj);
      },
      500
    );
  }

  /**
   * Handle button state change
   */
  async onButtonChanged(button, value) {
    const buttonNumber = parseInt(button.replace('button', ''));
    
    this.log(`🔘 Button ${buttonNumber} changed to: ${value ? 'ON' : 'OFF'}`);
    
    // Trigger flow card
    await this.triggerButtonPressed(buttonNumber, value);
    
    // Check switch type
    const switchType = this.getSetting('switch_type');
    
    if (switchType === 'momentary') {
      // Auto-reset after delay
      setTimeout(async () => {
        await this.setCapabilityValue(`onoff.${button}`, false);
      }, 200);
    }
    
    return Promise.resolve();
  }

  /**
   * Handle multiple button press (combinations)
   */
  async onMultipleButtonPress(valueObj) {
    const pressed = Object.keys(valueObj)
      .filter(key => valueObj[key])
      .map(key => parseInt(key.replace('onoff.button', '')));
    
    if (pressed.length > 1) {
      this.log(`🔘 Multiple buttons pressed: ${pressed.join(', ')}`);
      
      // Trigger combination flow card
      await this.triggerButtonCombination(pressed);
    }
  }

  /**
   * Initialize temperature monitoring
   */
  async initializeTemperature() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }
    
    this.log('🌡️ Initializing temperature monitoring...');
    
    this.registerCapability('measure_temperature', this.CLUSTER.TEMPERATURE_MEASUREMENT, {
      get: 'measuredValue',
      reportParser: (value) => {
        return Math.round((value / 100) * 10) / 10;
      },
      report: 'measuredValue',
      getOpts: {
        getOnStart: true
      }
    });
    
    this.log('✅ Temperature monitoring ready');
  }

  /**
   * Initialize tamper detection
   */
  async initializeTamper() {
    if (!this.hasCapability('alarm_tamper')) {
      return;
    }
    
    this.log('🚨 Initializing tamper detection...');
    
    // Listen for IAS Zone status changes
    if (this.zclNode.endpoints[1]?.clusters?.iasZone) {
      this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', async (payload) => {
        const tamper = (payload.zoneStatus & 0x04) > 0;
        
        this.log(`🚨 Tamper detected: ${tamper}`);
        
        await this.setCapabilityValue('alarm_tamper', tamper);
        
        if (tamper) {
          await this.triggerTamperAlarm();
        }
      });
    }
    
    this.log('✅ Tamper detection ready');
  }

  /**
   * FLOW CARDS TRIGGERS
   */

  async triggerButtonPressed(buttonNumber, state) {
    const driver = this.driver;
    const tokens = {
      button: buttonNumber,
      state: state ? 'on' : 'off'
    };
    
    this.log(`🔔 Triggering button_pressed: Button ${buttonNumber} ${tokens.state}`);
    
    // Trigger generic button press
    await driver.triggerButtonPressed(this, tokens);
    
    // Trigger specific button
    const specificTrigger = `button${buttonNumber}_pressed`;
    if (driver[specificTrigger]) {
      await driver[specificTrigger](this, tokens);
    }
  }

  async triggerButtonCombination(buttons) {
    const driver = this.driver;
    const tokens = {
      buttons: buttons.join(','),
      count: buttons.length
    };
    
    this.log(`🔔 Triggering button_combination: ${tokens.buttons}`);
    
    await driver.triggerButtonCombination(this, tokens);
  }

  async triggerTamperAlarm() {
    const driver = this.driver;
    
    this.log('🔔 Triggering tamper_alarm');
    
    await driver.triggerTamperAlarm(this);
  }

  async triggerPowerSourceChanged(from, to) {
    const driver = this.driver;
    const tokens = {
      from: from,
      to: to
    };
    
    this.log(`🔔 Triggering power_source_changed: ${from} → ${to}`);
    
    await driver.triggerPowerSourceChanged(this, tokens);
  }

  /**
   * Override power detection to add flow trigger
   */
  async detectPowerSource() {
    const previousPowerType = this.powerType;
    
    await super.detectPowerSource();
    
    // Trigger flow if changed
    if (previousPowerType && previousPowerType !== 'UNKNOWN' && 
        previousPowerType !== this.powerType) {
      await this.triggerPowerSourceChanged(
        previousPowerType.toLowerCase(),
        this.powerType.toLowerCase()
      );
    }
  }

  /**
   * Settings changed handler
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('⚙️ Settings changed:', changedKeys);
    
    // Power source changed
    if (changedKeys.includes('power_source')) {
      this.log(`🔌 Power source setting changed: ${oldSettings.power_source} → ${newSettings.power_source}`);
      
      await this.detectPowerSource();
      await this.configurePowerCapabilities();
    }
    
    // Reporting interval changed
    if (changedKeys.includes('reporting_interval')) {
      this.log(`📊 Reporting interval changed: ${newSettings.reporting_interval}s`);
      
      // Reconfigure reporting
      await this.configureReporting();
    }
    
    // Button mode changed
    if (changedKeys.includes('button_mode')) {
      this.log(`🔘 Button mode changed: ${newSettings.button_mode}`);
      
      // Reconfigure button behavior
      await this.configureButtonMode(newSettings.button_mode);
    }
  }

  /**
   * Configure reporting intervals
   */
  async configureReporting() {
    const interval = this.getSetting('reporting_interval') || 300;
    
    this.log(`📊 Configuring reporting (${interval}s)...`);
    
    // Configure battery reporting (if battery mode)
    if (this.powerType === 'BATTERY' && this.hasCapability('measure_battery')) {
      try {
        await this.configureAttributeReporting([{
          endpointId: 1,
          cluster: this.CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: interval,
          maxInterval: interval * 3,
          minChange: 5
        }]);
        
        this.log('✅ Battery reporting configured');
      } catch (err) {
        this.error('Failed to configure battery reporting:', err);
      }
    }
    
    // Configure temperature reporting
    if (this.hasCapability('measure_temperature')) {
      try {
        await this.configureAttributeReporting([{
          endpointId: 1,
          cluster: this.CLUSTER.TEMPERATURE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: interval,
          maxInterval: interval * 3,
          minChange: 50 // 0.5°C
        }]);
        
        this.log('✅ Temperature reporting configured');
      } catch (err) {
        this.error('Failed to configure temperature reporting:', err);
      }
    }
  }

  /**
   * Configure button mode (command vs scene)
   */
  async configureButtonMode(mode) {
    this.log(`🔘 Configuring button mode: ${mode}`);
    
    // This would configure the device's operating mode
    // Implementation depends on device's specific Zigbee commands
    
    if (mode === 'scene') {
      this.log('📍 Scene mode: Buttons trigger flows only');
    } else {
      this.log('🎮 Command mode: Buttons control devices directly');
    }
  }

  /**
   * Device deleted handler
   */
  async onDeleted() {
    this.log('🗑️ WallTouch3GangHybrid deleted');
    
    // Cleanup
    await super.onDeleted();
  }

  /**
   * Setup Time Synchronization
   * Required for Tuya devices to function properly
   */
  async setupTimeSync() {
    try {
      // Time cluster synchronization
      if (this.zclNode.endpoints[1]?.clusters?.time) {
        this.log('Setting up time synchronization...');
        
        // Calculate Zigbee epoch time (seconds since 2000-01-01 00:00:00 UTC)
        const zigbeeEpochStart = new Date('2000-01-01T00:00:00Z').getTime();
        const currentTime = Date.now();
        const zigbeeTime = Math.floor((currentTime - zigbeeEpochStart) / 1000);
        
        // Write time to device
        await this.zclNode.endpoints[1].clusters.time.writeAttributes({
          time: zigbeeTime,
          timeStatus: {
            master: true,
            synchronized: true,
            masterZoneDst: false,
            superseding: false
          }
        }).catch(err => this.log('Time sync write failed (non-critical):', err.message));
        
        // Setup periodic time sync (every 24 hours)
        this.timeSyncInterval = setInterval(async () => {
          const newZigbeeTime = Math.floor((Date.now() - zigbeeEpochStart) / 1000);
          await this.zclNode.endpoints[1].clusters.time.writeAttributes({
            time: newZigbeeTime
          }).catch(err => this.log('Time resync failed:', err.message));
          this.log('Time resynchronized');
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        this.log('Time synchronization configured');
      }
    } catch (err) {
      this.error('Time sync setup failed (non-critical):', err);
    }
  }
  
  /**
   * Cleanup time sync interval on device removal
   */
  async onDeleted() {
    if (this.timeSyncInterval) {
      clearInterval(this.timeSyncInterval);
    }
    await super.onDeleted?.();
  }

}

module.exports = WallTouch3GangHybridDevice;
