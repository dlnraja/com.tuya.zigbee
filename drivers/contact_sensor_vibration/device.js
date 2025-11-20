'use strict';

const SensorDevice = require('../../lib/devices/SensorDevice');
const { Cluster, CLUSTER } = require('zigbee-clusters');

/**
 * Contact & Vibration Sensor (HOBEIAN ZG-102ZM)
 *
 * Capabilities:
 * - alarm_contact: Door/Window contact status
 * - alarm_tamper: Vibration/Shock detection
 * - measure_battery: Battery percentage
 * - alarm_battery: Low battery alarm
 */
class ContactVibrationSensor extends SensorDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    this.printNode();

    // Enable debug
    this.enableDebug();
    this.printDebug('Contact & Vibration Sensor initialized');

    // Register capabilities
    await this.registerCapabilities(zclNode);

    // Configure reporting
    await this.configureReporting(zclNode);
  }

  async registerCapabilities(zclNode) {
    // IAS Zone - Contact & Vibration
    if (this.hasCapability('alarm_contact') || this.hasCapability('alarm_tamper')) {
      zclNode.endpoints[1].clusters.iasZone
        .on('zoneStatusChangeNotification', async payload => {
          this.printDebug('IAS Zone Status:', payload);

          // Bit 0: Alarm 1 (Contact)
          const contactAlarm = (payload.zoneStatus & 0x01) === 0x01;
          if (this.hasCapability('alarm_contact')) {
            await (async () => {
              this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_contact'} = ${contactAlarm}`);
              try {
                await this.setCapabilityValue('alarm_contact', contactAlarm);
                this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_contact'}`);
              } catch (err) {
                this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_contact'}`, err.message);
                throw err;
              }
            })().catch(this.error);
          }

          // Bit 1: Alarm 2 (Tamper/Vibration)
          const tamperAlarm = (payload.zoneStatus & 0x02) === 0x02;
          if (this.hasCapability('alarm_tamper')) {
            await (async () => {
              this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_tamper'} = ${tamperAlarm}`);
              try {
                await this.setCapabilityValue('alarm_tamper', tamperAlarm);
                this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_tamper'}`);
              } catch (err) {
                this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_tamper'}`, err.message);
                throw err;
              }
            })().catch(this.error);
          }

          // Bit 3: Battery low
          const batteryLow = (payload.zoneStatus & 0x08) === 0x08;
          if (this.hasCapability('alarm_battery')) {
            await (async () => {
              this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_battery'} = ${batteryLow}`);
              try {
                await this.setCapabilityValue('alarm_battery', batteryLow);
                this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_battery'}`);
              } catch (err) {
                this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_battery'}`, err.message);
                throw err;
              }
            })().catch(this.error);
          }
        });
    }

    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        reportParser: async value => {
          const batteryThreshold = this.getSetting('battery_low_threshold') || 20;
          const percentage = value / 2;

          if (this.hasCapability('alarm_battery')) {
            await (async () => {
              this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_battery'} = ${percentage < batteryThreshold}`);
              try {
                await this.setCapabilityValue('alarm_battery', percentage < batteryThreshold);
                this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_battery'}`);
              } catch (err) {
                this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_battery'}`, err.message);
                throw err;
              }
            })().catch(this.error);
          }

          return percentage;
        },
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
        },
      });
    }
  }

  async configureReporting(zclNode) {
    try {
      // Configure IAS Zone reporting
      await zclNode.endpoints[1].clusters.iasZone.configureReporting({
        zoneStatus: {
          minInterval: 0,
          maxInterval: 300,
          minChange: 1,
        },
      }).catch(err => {
        this.printDebug('Failed to configure IAS Zone reporting:', err);
      });

      // Configure Battery reporting
      await zclNode.endpoints[1].clusters.powerConfiguration.configureReporting({
        batteryPercentageRemaining: {
          minInterval: 3600,
          maxInterval: 86400,
          minChange: 2,
        },
      }).catch(err => {
        this.printDebug('Failed to configure battery reporting:', err);
      });

    } catch (err) {
      this.error('Error configuring reporting:', err);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.printDebug('Settings changed:', changedKeys);

    // Handle sensitivity change
    if (changedKeys.includes('sensitivity')) {
      try {
        const sensitivity = newSettings.sensitivity;
        this.printDebug('Setting sensitivity to:', sensitivity);

        // Write sensitivity attribute (manufacturer specific)
        // Note: This may require manufacturer-specific cluster
        // Adjust cluster/attribute based on device behavior
        await this.zclNode.endpoints[1].clusters.basic.writeAttributes({
          0x0500: sensitivity, // Manufacturer specific attribute
        }).catch(err => {
          this.printDebug('Failed to set sensitivity (normal for some devices):', err);
        });

      } catch (err) {
        this.error('Error setting sensitivity:', err);
        throw new Error(this.homey.__('settings.sensitivity_failed'));
      }
    }

    // Handle battery threshold change
    if (changedKeys.includes('battery_low_threshold')) {
      const currentBattery = this.getCapabilityValue('measure_battery');
      const threshold = newSettings.battery_low_threshold;

      if (currentBattery !== null && this.hasCapability('alarm_battery')) {
        await (async () => {
          this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_battery'} = ${currentBattery < threshold}`);
          try {
            await this.setCapabilityValue('alarm_battery', currentBattery < threshold);
            this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_battery'}`);
          } catch (err) {
            this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_battery'}`, err.message);
            throw err;
          }
        })().catch(this.error);
      }
    }
  }

  printDebug(...args) {
    if (this.isDebug) {
      this.log('[ContactVibrationSensor]', ...args);
    }
  }

  enableDebug() {
    this.isDebug = true;
  }

  disableDebug() {
    this.isDebug = false;
  }

}


  /**
   * Setup IAS Zone for Contact sensor (SDK3 Compliant)
   *
   * Based on Peter's successful diagnostic patterns:
   * - Temperature/Humidity/Lux work via standard clusters [OK]
   * - IAS Zone requires special SDK3 enrollment method
   *
   * Cluster 1280 (IASZone) - Motion/Alarm detection
   */
  /**
   * Setup IAS Zone (SDK3 - Based on IASZoneEnroller_SIMPLE_v4.0.6.js)
   * Version la plus récente du projet (2025-10-21)
   */
  async setupIASZone() {
  this.log('🔐 Setting up IAS Zone (SDK3 latest method)...');

  const endpoint = this.zclNode.endpoints[1];

  if (!endpoint?.clusters?.iasZone) {
    this.log('[INFO]  IAS Zone cluster not available');
    return;
  }

  try {
    // Step 1: Setup Zone Enroll Request listener (SYNCHRONOUS - property assignment)
    // SDK3: Use property assignment, NOT .on() event listener
    endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
      this.log('[MSG] Zone Enroll Request received');

      try {
        // Send response IMMEDIATELY (synchronous, no async, no delay)
        await endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0, // 0 = Success
          zoneId: 10
        });

        this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
      } catch (err) {
        this.error('Failed to send Zone Enroll Response:', err.message);
      }
    };

    this.log('[OK] Zone Enroll Request listener configured');

    // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
    // Per Homey docs: "driver could send Zone Enroll Response when initializing
    // regardless of having received Zone Enroll Request"
    this.log('[SEND] Sending proactive Zone Enroll Response...');

    try {
      // Send response IMMEDIATELY (synchronous, no async, no delay)
      await endpoint.clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0, // 0 = Success
        zoneId: 10
      });

      this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
    } catch (err) {
      this.error('Failed to send Zone Enroll Response:', err.message);
    }
  };

  this.log('[OK] Zone Enroll Request listener configured');

  // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
  // Per Homey docs: "driver could send Zone Enroll Response when initializing
  // regardless of having received Zone Enroll Request"
  this.log('[SEND] Sending proactive Zone Enroll Response...');

  try {
    // Send response IMMEDIATELY (synchronous, no async, no delay)
    await endpoint.clusters.iasZone.zoneEnrollResponse({
      enrollResponseCode: 0, // 0 = Success
      zoneId: 10
    });

    this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
  } catch (err) {
    this.error('Failed to send Zone Enroll Response:', err.message);
  }
} catch (err) {
  this.error('IAS Zone setup error:', err);
}

this.log('[OK] Zone Enroll Request listener configured');

// Step 2: Send proactive Zone Enroll Response (SDK3 official method)
// Per Homey docs: "driver could send Zone Enroll Response when initializing
// regardless of having received Zone Enroll Request"
this.log('[SEND] Sending proactive Zone Enroll Response...');

try {
  await endpoint.clusters.iasZone.zoneEnrollResponse({
    enrollResponseCode: 0,
    zoneId: 10
  });

  this.log('[OK] Proactive Zone Enroll Response sent');
} catch (err) {
  this.log('[WARN]  Proactive response failed (normal if device not ready):', err.message);
}

// Step 3: Setup Zone Status Change listener (property assignment)
// SDK3: Use .onZoneStatusChangeNotification property, NOT .on() event
endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
  this.log('[MSG] Zone notification received:', payload);

  if (payload && payload.zoneStatus !== undefined) {
    // Convert Bitmap to value if needed
    let status = payload.zoneStatus;
    if (status && typeof status.valueOf === 'function') {
      status = status.valueOf();
    }

    // Check alarm1 bit (motion/alarm detected)
    const alarm = (status & 0x01) !== 0;

    await (async () => {
      this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_contact'} = ${alarm}`);
      try {
        await this.setCapabilityValue('alarm_contact', alarm);
        this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_contact'}`);
      } catch (err) {
        this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_contact'}`, err.message);
        throw err;
      }
    })().catch(this.error);
    this.log(`${alarm ? '[ALARM]' : '[OK]'} Alarm: ${alarm ? 'TRIGGERED' : 'cleared'}`);
  }
};

this.log('[OK] Zone Status listener configured');

// Step 4: Setup Zone Status attribute listener (property assignment)
// Alternative listener for attribute reports
zclNode.endpoints[1].clusters.iasZone.onZoneStatus = async (zoneStatus) => {
  this.log('[DATA] Zone attribute report:', zoneStatus);

  let status = zoneStatus;
  if (status && typeof status.valueOf === 'function') {
    status = status.valueOf();
  }

  const alarm = (status & 0x01) !== 0;
  await (async () => {
    this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_contact'} = ${alarm}`);
    try {
      await this.setCapabilityValue('alarm_contact', alarm);
      this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_contact'}`);
    } catch (err) {
      this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_contact'}`, err.message);
      throw err;
    }
  })().catch(this.error);
};

this.log('[OK] IAS Zone configured successfully (SDK3 latest method)');

} catch (err) {
  this.error('IAS Zone setup failed:', err);
}
}

async triggerFlowCard(cardId, tokens = {}) {
  try {
    const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
    await flowCard.trigger(this, tokens).catch(err => this.error(err));
    this.log(`[OK] Flow triggered: ${cardId}`, tokens);
  } catch (err) {
    this.error(`[ERROR] Flow trigger error: ${cardId}`, err);
  }
}

module.exports = ContactVibrationSensor;
