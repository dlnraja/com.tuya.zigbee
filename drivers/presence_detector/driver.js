'use strict';

const { Driver } = require('homey');

/**
 * Presence Detector Driver
 *
 * v1.0.0: Virtual device driver for room presence detection.
 * This is a virtual driver - it does not pair with physical Zigbee devices.
 * Instead, users manually add the device and configure which room devices to monitor.
 *
 * Pairing flow:
 *   1. User adds "Virtual Presence Detector" from the app
 *   2. User enters a room name
 *   3. User selects which devices in that room to monitor
 *   4. The device starts inferring presence from those devices' signals
 */
class PresenceDetectorDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('[PRESENCE_DRIVER] Initializing...');

    // Register flow card action: manually set presence
    this._registerFlowCards();

    this.log('[PRESENCE_DRIVER] Ready');
  }

  /**
   * onPair is called when a user starts pairing a new device.
   */
  async onPair(session) {
    this.log('[PRESENCE_DRIVER] Pairing session started');

    session.setHandler('list_devices', async () => {
      // Return a single virtual device template
      return [
        {
          name: 'Virtual Presence Detector',
          data: {
            id: `presence_virtual_${Date.now()}`,
          },
          settings: {
            monitored_devices: [],
            presence_threshold: 40,
            absence_threshold: 10,
            timeout_minutes: 10,
            decay_half_life_seconds: 300,
            time_of_day_enabled: false,
            night_start_hour: 23,
            night_end_hour: 6,
            night_multiplier: 0.7,
          },
        },
      ];
    });

    session.setHandler('list_devices_selection', async () => {
      // Return all available Homey devices as selectable sources
      const devices = [];
      const drivers = Object.values(this.homey.drivers.getDrivers());

      for (const driver of drivers) {
        const driverDevices = driver.getDevices() || [];
        for (const device of driverDevices) {
          // Skip the presence detector itself
          if (device.driverId === 'presence_detector') continue;

          const caps = device.capabilities || [];
          const relevantCaps = caps.filter(c => [
            'alarm_motion', 'onoff', 'dim',
            'measure_temperature', 'measure_humidity',
            'measure_power', 'meter_power',
            'alarm_contact', 'button', 'alarm_1',
          ].includes(c));

          if (relevantCaps.length > 0) {
            devices.push({
              id: device.getData()?.id || device.id,
              name: device.name || 'Unknown Device',
              driverId: device.driverId,
              capabilities: relevantCaps,
            });
          }
        }
      }

      return devices;
    });
  }

  /**
   * Register app-level flow card listeners.
   * @private
   */
  _registerFlowCards() {
    // Action: Force presence in room
    this.homey.flow.getActionCard('virtual_presence_force_present')
      .registerRunListener(async (args) => {
        if (args.device && typeof args.device.forcePresent === 'function') {
          await args.device.forcePresent();
          return true;
        }
        return false;
      });

    // Action: Force clear in room
    this.homey.flow.getActionCard('virtual_presence_force_clear')
      .registerRunListener(async (args) => {
        if (args.device && typeof args.device.forceClear === 'function') {
          await args.device.forceClear();
          return true;
        }
        return false;
      });

    // Condition: Room is occupied
    this.homey.flow.getConditionCard('virtual_presence_is_occupied')
      .registerRunListener(async (args) => {
        if (args.device && typeof args.device.isPresent === 'function') {
          return args.device.isPresent();
        }
        return false;
      });

    // Condition: Confidence above threshold
    this.homey.flow.getConditionCard('virtual_presence_confidence_above')
      .registerRunListener(async (args) => {
        if (args.device && typeof args.device.getConfidence === 'function') {
          const threshold = args.threshold || 50;
          return args.device.getConfidence() >= threshold;
        }
        return false;
      });
  }
}

module.exports = PresenceDetectorDriver;
