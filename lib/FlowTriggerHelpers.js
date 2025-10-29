'use strict';

/**
 * Flow Trigger Helpers
 * 
 * Helper methods to easily trigger flow cards from devices
 * Automatically handles token creation and state management
 */

class FlowTriggerHelpers {
  
  constructor(device) {
    this.device = device;
  }
  
  /**
   * Trigger: button_released
   * @param {number} duration - Duration in seconds
   */
  async triggerButtonReleased(duration) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('button_released')
        .trigger(this.device, {
          duration: Math.round(duration * 10) / 10
        });
      this.device.log('[FLOW] ✅ Triggered: button_released (', duration, 's)');
    } catch (err) {
      this.device.error('[FLOW] ❌ button_released failed:', err.message);
    }
  }
  
  /**
   * Trigger: temperature_changed
   * @param {number} current - Current temperature
   * @param {number} previous - Previous temperature
   */
  async triggerTemperatureChanged(current, previous) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('temperature_changed')
        .trigger(this.device, {
          current: Math.round(current * 10) / 10,
          previous: Math.round(previous * 10) / 10,
          change: Math.round((current - previous) * 10) / 10
        });
      this.device.log('[FLOW] ✅ Triggered: temperature_changed', current, '°C');
    } catch (err) {
      this.device.error('[FLOW] ❌ temperature_changed failed:', err.message);
    }
  }
  
  /**
   * Trigger: humidity_changed
   * @param {number} current - Current humidity
   * @param {number} previous - Previous humidity
   */
  async triggerHumidityChanged(current, previous) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('humidity_changed')
        .trigger(this.device, {
          current: Math.round(current),
          previous: Math.round(previous),
          change: Math.round(current - previous)
        });
      this.device.log('[FLOW] ✅ Triggered: humidity_changed', current, '%');
    } catch (err) {
      this.device.error('[FLOW] ❌ humidity_changed failed:', err.message);
    }
  }
  
  /**
   * Trigger: battery_low
   * @param {number} battery - Battery percentage
   * @param {number} voltage - Voltage (optional)
   */
  async triggerBatteryLow(battery, voltage = null) {
    try {
      const tokens = {
        battery: Math.round(battery)
      };
      if (voltage !== null) {
        tokens.voltage = Math.round(voltage * 100) / 100;
      }
      
      await this.device.homey.flow.getDeviceTriggerCard('battery_low')
        .trigger(this.device, tokens);
      this.device.log('[FLOW] ✅ Triggered: battery_low', battery, '%');
    } catch (err) {
      this.device.error('[FLOW] ❌ battery_low failed:', err.message);
    }
  }
  
  /**
   * Trigger: motion_started
   */
  async triggerMotionStarted() {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('motion_started')
        .trigger(this.device, {
          timestamp: new Date().toISOString()
        });
      this.device.log('[FLOW] ✅ Triggered: motion_started');
    } catch (err) {
      this.device.error('[FLOW] ❌ motion_started failed:', err.message);
    }
  }
  
  /**
   * Trigger: motion_stopped
   * @param {number} duration - Duration in seconds
   */
  async triggerMotionStopped(duration) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('motion_stopped')
        .trigger(this.device, {
          duration: Math.round(duration),
          timestamp: new Date().toISOString()
        });
      this.device.log('[FLOW] ✅ Triggered: motion_stopped (', duration, 's)');
    } catch (err) {
      this.device.error('[FLOW] ❌ motion_stopped failed:', err.message);
    }
  }
  
  /**
   * Trigger: presence_changed
   * @param {boolean} present - Is present
   */
  async triggerPresenceChanged(present) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('presence_changed')
        .trigger(this.device, {
          present: present,
          status: present ? 'present' : 'absent'
        });
      this.device.log('[FLOW] ✅ Triggered: presence_changed', present);
    } catch (err) {
      this.device.error('[FLOW] ❌ presence_changed failed:', err.message);
    }
  }
  
  /**
   * Trigger: contact_opened
   * @param {number} duration_closed - How long was it closed (seconds)
   */
  async triggerContactOpened(duration_closed = 0) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('contact_opened')
        .trigger(this.device, {
          duration_closed: Math.round(duration_closed),
          timestamp: new Date().toISOString()
        });
      this.device.log('[FLOW] ✅ Triggered: contact_opened');
    } catch (err) {
      this.device.error('[FLOW] ❌ contact_opened failed:', err.message);
    }
  }
  
  /**
   * Trigger: contact_closed
   * @param {number} duration_open - How long was it open (seconds)
   */
  async triggerContactClosed(duration_open = 0) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('contact_closed')
        .trigger(this.device, {
          duration_open: Math.round(duration_open),
          timestamp: new Date().toISOString()
        });
      this.device.log('[FLOW] ✅ Triggered: contact_closed');
    } catch (err) {
      this.device.error('[FLOW] ❌ contact_closed failed:', err.message);
    }
  }
  
  /**
   * Trigger: alarm_triggered
   * @param {string} type - Alarm type (motion, contact, tamper, etc.)
   */
  async triggerAlarmTriggered(type) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('alarm_triggered')
        .trigger(this.device, {
          type: type,
          timestamp: new Date().toISOString()
        });
      this.device.log('[FLOW] ✅ Triggered: alarm_triggered (', type, ')');
    } catch (err) {
      this.device.error('[FLOW] ❌ alarm_triggered failed:', err.message);
    }
  }
  
  /**
   * Trigger: device_online
   * @param {number} offline_duration - How long was it offline (seconds)
   */
  async triggerDeviceOnline(offline_duration = 0) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('device_online')
        .trigger(this.device, {
          offline_duration: Math.round(offline_duration),
          timestamp: new Date().toISOString()
        });
      this.device.log('[FLOW] ✅ Triggered: device_online (was offline', offline_duration, 's)');
    } catch (err) {
      this.device.error('[FLOW] ❌ device_online failed:', err.message);
    }
  }
  
  /**
   * Trigger: device_offline
   */
  async triggerDeviceOffline() {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('device_offline')
        .trigger(this.device, {
          timestamp: new Date().toISOString()
        });
      this.device.log('[FLOW] ✅ Triggered: device_offline');
    } catch (err) {
      this.device.error('[FLOW] ❌ device_offline failed:', err.message);
    }
  }
  
  /**
   * Trigger: target_temperature_reached
   * @param {number} target - Target temperature
   * @param {number} current - Current temperature
   */
  async triggerTargetTemperatureReached(target, current) {
    try {
      await this.device.homey.flow.getDeviceTriggerCard('target_temperature_reached')
        .trigger(this.device, {
          target: Math.round(target * 10) / 10,
          current: Math.round(current * 10) / 10
        });
      this.device.log('[FLOW] ✅ Triggered: target_temperature_reached', target, '°C');
    } catch (err) {
      this.device.error('[FLOW] ❌ target_temperature_reached failed:', err.message);
    }
  }
}

module.exports = FlowTriggerHelpers;
