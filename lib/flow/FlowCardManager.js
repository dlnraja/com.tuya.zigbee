'use strict';

/**
 * Flow Card Manager
 * Centralise la gestion des flow cards pour tous les devices
 */

const TuyaDPParser = require('../tuya/TuyaDPParser');

class FlowCardManager {
  constructor(homey) {
    this.homey = homey;
    this.triggers = {};
    this.actions = {};
    this.conditions = {};
  }

  /**
   * Enregistre tous les flow cards au demarrage de l app
   */
  registerAll() {
    // Anciens flow cards (legacy)
    this.registerMotionSensorCards();
    this.registerSmartPlugCards();
    this.registerButtonCards();
    this.registerTemperatureSensorCards();
    this.registerDeviceHealthCards();

    // NOUVEAUX flow cards (+33)
    this.registerNewTriggers();
    this.registerNewConditions();
    this.registerNewActions();

    // ENERGY MONITORING flow cards (v5.1.2+)
    this.registerEnergyFlowCards();

    // v5.5.239: Universal flow cards
    this.registerUniversalFlowCards();
  }

  /**
   * NOUVEAUX TRIGGERS (+13)
   */
  registerNewTriggers() {
    // button_released
    try {
      this.triggers.button_released = this.homey.flow.getDeviceTriggerCard('button_released');
      if (this.triggers.button_released) {
        this.triggers.button_released.register();
      }
    } catch (err) { }

    // temperature_changed
    try {
      this.triggers.temperature_changed = this.homey.flow.getDeviceTriggerCard('temperature_changed');
      if (this.triggers.temperature_changed) {
        this.triggers.temperature_changed.register();
      }
    } catch (err) { }

    // humidity_changed
    try {
      this.triggers.humidity_changed = this.homey.flow.getDeviceTriggerCard('humidity_changed');
      if (this.triggers.humidity_changed) {
        this.triggers.humidity_changed.register();
      }
    } catch (err) { }

    // battery_low
    try {
      this.triggers.battery_low_new = this.homey.flow.getDeviceTriggerCard('battery_low');
      if (this.triggers.battery_low_new) {
        this.triggers.battery_low_new.register();
      }
    } catch (err) { }

    // motion_started
    try {
      this.triggers.motion_started = this.homey.flow.getDeviceTriggerCard('motion_started');
      if (this.triggers.motion_started) {
        this.triggers.motion_started.register();
      }
    } catch (err) { }

    // motion_stopped
    try {
      this.triggers.motion_stopped = this.homey.flow.getDeviceTriggerCard('motion_stopped');
      if (this.triggers.motion_stopped) {
        this.triggers.motion_stopped.register();
      }
    } catch (err) { }

    // presence_changed
    try {
      this.triggers.presence_changed = this.homey.flow.getDeviceTriggerCard('presence_changed');
      if (this.triggers.presence_changed) {
        this.triggers.presence_changed.register();
      }
    } catch (err) { }

    // contact_opened
    try {
      this.triggers.contact_opened = this.homey.flow.getDeviceTriggerCard('contact_opened');
      if (this.triggers.contact_opened) {
        this.triggers.contact_opened.register();
      }
    } catch (err) { }

    // contact_closed
    try {
      this.triggers.contact_closed = this.homey.flow.getDeviceTriggerCard('contact_closed');
      if (this.triggers.contact_closed) {
        this.triggers.contact_closed.register();
      }
    } catch (err) { }

    // alarm_triggered
    try {
      this.triggers.alarm_triggered = this.homey.flow.getDeviceTriggerCard('alarm_triggered');
      if (this.triggers.alarm_triggered) {
        this.triggers.alarm_triggered.register();
      }
    } catch (err) { }

    try {
      this.triggers.receive_status_boolean = this.homey.flow.getDeviceTriggerCard('receive_status_boolean');
      if (this.triggers.receive_status_boolean) {
        this.triggers.receive_status_boolean.register();
      }
    } catch (err) { }

    try {
      this.triggers.receive_status_number = this.homey.flow.getDeviceTriggerCard('receive_status_number');
      if (this.triggers.receive_status_number) {
        this.triggers.receive_status_number.register();
      }
    } catch (err) { }

    try {
      this.triggers.receive_status_string = this.homey.flow.getDeviceTriggerCard('receive_status_string');
      if (this.triggers.receive_status_string) {
        this.triggers.receive_status_string.register();
      }
    } catch (err) { }

    try {
      this.triggers.receive_status_json = this.homey.flow.getDeviceTriggerCard('receive_status_json');
      if (this.triggers.receive_status_json) {
        this.triggers.receive_status_json.register();
      }
    } catch (err) { }

    // device_online
    try {
      this.triggers.device_online = this.homey.flow.getDeviceTriggerCard('device_online');
      if (this.triggers.device_online) {
        this.triggers.device_online.register();
      }
    } catch (err) { }

    // device_offline (nouveau)
    try {
      this.triggers.device_offline_new = this.homey.flow.getDeviceTriggerCard('device_offline');
      if (this.triggers.device_offline_new) {
        this.triggers.device_offline_new.register();
      }
    } catch (err) { }

    // target_temperature_reached
    try {
      this.triggers.target_temperature_reached = this.homey.flow.getDeviceTriggerCard('target_temperature_reached');
      if (this.triggers.target_temperature_reached) {
        this.triggers.target_temperature_reached.register();
      }
    } catch (err) { }
  }

  /**
   * NOUVELLES CONDITIONS (+10)
   */
  registerNewConditions() {
    // temperature_above
    try {
      this.conditions.temperature_above = this.homey.flow.getDeviceConditionCard('temperature_above');
      if (this.conditions.temperature_above) {
        this.conditions.temperature_above.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] temperature_above: Invalid device reference');
            return false;
          }
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > args.temperature;
        });
      }
    } catch (err) { }

    // temperature_below
    try {
      this.conditions.temperature_below = this.homey.flow.getDeviceConditionCard('temperature_below');
      if (this.conditions.temperature_below) {
        this.conditions.temperature_below.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] temperature_below: Invalid device reference');
            return false;
          }
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp < args.temperature;
        });
      }
    } catch (err) { }

    // humidity_above
    try {
      this.conditions.humidity_above = this.homey.flow.getDeviceConditionCard('humidity_above');
      if (this.conditions.humidity_above) {
        this.conditions.humidity_above.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] humidity_above: Invalid device reference');
            return false;
          }
          const humidity = args.device.getCapabilityValue('measure_humidity') || 0;
          return humidity > args.humidity;
        });
      }
    } catch (err) { }

    // humidity_below
    try {
      this.conditions.humidity_below = this.homey.flow.getDeviceConditionCard('humidity_below');
      if (this.conditions.humidity_below) {
        this.conditions.humidity_below.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] humidity_below: Invalid device reference');
            return false;
          }
          const humidity = args.device.getCapabilityValue('measure_humidity') || 0;
          return humidity < args.humidity;
        });
      }
    } catch (err) { }

    // battery_below
    try {
      this.conditions.battery_below = this.homey.flow.getDeviceConditionCard('battery_below');
      if (this.conditions.battery_below) {
        this.conditions.battery_below.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] battery_below: Invalid device reference');
            return false;
          }
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery < args.percentage;
        });
      }
    } catch (err) { }

    // is_online - DISABLED (flow card not defined in app.json)
    /*
    try {
      this.conditions.is_online = this.homey.flow.getDeviceConditionCard('is_online');
      if (this.conditions.is_online) {
        this.conditions.is_online.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getAvailable !== 'function') {
            this.homey.app.error('[FLOW] is_online: Invalid device reference');
            return false;
          }
          return args.device.getAvailable();
        });
      }
    } catch (err) {}
    */

    // has_motion
    try {
      this.conditions.has_motion = this.homey.flow.getDeviceConditionCard('has_motion');
      if (this.conditions.has_motion) {
        this.conditions.has_motion.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] has_motion: Invalid device reference');
            return false;
          }
          return args.device.getCapabilityValue('alarm_motion') || false;
        });
      }
    } catch (err) { }

    // is_open
    try {
      this.conditions.is_open = this.homey.flow.getDeviceConditionCard('is_open');
      if (this.conditions.is_open) {
        this.conditions.is_open.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] is_open: Invalid device reference');
            return false;
          }
          return args.device.getCapabilityValue('alarm_contact') || false;
        });
      }
    } catch (err) { }

    // is_closed
    try {
      this.conditions.is_closed = this.homey.flow.getDeviceConditionCard('is_closed');
      if (this.conditions.is_closed) {
        this.conditions.is_closed.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] is_closed: Invalid device reference');
            return false;
          }
          const contact = args.device.getCapabilityValue('alarm_contact') || false;
          return !contact;
        });
      }
    } catch (err) { }

    // alarm_active
    try {
      this.conditions.alarm_active = this.homey.flow.getDeviceConditionCard('alarm_active');
      if (this.conditions.alarm_active) {
        this.conditions.alarm_active.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilities !== 'function' || typeof args.device.getCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] alarm_active: Invalid device reference');
            return false;
          }
          // Check any alarm_* capability
          const capabilities = args.device.getCapabilities();
          for (const cap of capabilities) {
            if (cap.startsWith('alarm_') && args.device.getCapabilityValue(cap)) {
              return true;
            }
          }
          return false;
        });
      }
    } catch (err) { }
  }

  /**
   * NOUVELLES ACTIONS (+10)
   */
  registerNewActions() {
    // set_brightness
    try {
      this.actions.set_brightness = this.homey.flow.getDeviceActionCard('set_brightness');
      if (this.actions.set_brightness) {
        this.actions.set_brightness.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.setCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] set_brightness: Invalid device reference');
            return false;
          }
          const brightness = args.brightness / 100; // 0-100 -> 0-1
          await args.device.setCapabilityValue('dim', brightness);
          return true;
        });
      }
    } catch (err) { }

    // dim_by
    try {
      this.actions.dim_by = this.homey.flow.getDeviceActionCard('dim_by');
      if (this.actions.dim_by) {
        this.actions.dim_by.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function' || typeof args.device.setCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] dim_by: Invalid device reference');
            return false;
          }
          const current = args.device.getCapabilityValue('dim') || 0;
          const newValue = Math.max(0, Math.min(1, current - (args.percentage / 100)));
          await args.device.setCapabilityValue('dim', newValue);
          return true;
        });
      }
    } catch (err) { }

    // brighten_by
    try {
      this.actions.brighten_by = this.homey.flow.getDeviceActionCard('brighten_by');
      if (this.actions.brighten_by) {
        this.actions.brighten_by.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function' || typeof args.device.setCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] brighten_by: Invalid device reference');
            return false;
          }
          const current = args.device.getCapabilityValue('dim') || 0;
          const newValue = Math.max(0, Math.min(1, current + (args.percentage / 100)));
          await args.device.setCapabilityValue('dim', newValue);
          return true;
        });
      }
    } catch (err) { }

    // set_color_temperature
    try {
      this.actions.set_color_temperature = this.homey.flow.getDeviceActionCard('set_color_temperature');
      if (this.actions.set_color_temperature) {
        this.actions.set_color_temperature.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.setCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] set_color_temperature: Invalid device reference');
            return false;
          }
          // Convert 2700-6500K to 0-1 range
          const normalized = (args.temperature - 2700) / (6500 - 2700);
          await args.device.setCapabilityValue('light_temperature', normalized);
          return true;
        });
      }
    } catch (err) { }

    // set_target_temperature
    try {
      this.actions.set_target_temperature = this.homey.flow.getDeviceActionCard('set_target_temperature');
      if (this.actions.set_target_temperature) {
        this.actions.set_target_temperature.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.setCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] set_target_temperature: Invalid device reference');
            return false;
          }
          await args.device.setCapabilityValue('target_temperature', args.temperature);
          return true;
        });
      }
    } catch (err) { }

    // increase_temperature
    try {
      this.actions.increase_temperature = this.homey.flow.getDeviceActionCard('increase_temperature');
      if (this.actions.increase_temperature) {
        this.actions.increase_temperature.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function' || typeof args.device.setCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] increase_temperature: Invalid device reference');
            return false;
          }
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.setCapabilityValue('target_temperature', current + args.degrees);
          return true;
        });
      }
    } catch (err) { }

    // decrease_temperature
    try {
      this.actions.decrease_temperature = this.homey.flow.getDeviceActionCard('decrease_temperature');
      if (this.actions.decrease_temperature) {
        this.actions.decrease_temperature.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.getCapabilityValue !== 'function' || typeof args.device.setCapabilityValue !== 'function') {
            this.homey.app.error('[FLOW] decrease_temperature: Invalid device reference');
            return false;
          }
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.setCapabilityValue('target_temperature', current - args.degrees);
          return true;
        });
      }
    } catch (err) { }

    // identify_device
    try {
      this.actions.identify_device = this.homey.flow.getDeviceActionCard('identify_device');
      if (this.actions.identify_device) {
        this.actions.identify_device.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.error !== 'function') {
            this.homey.app.error('[FLOW] identify_device: Invalid device reference');
            return false;
          }
          // Send identify command to device
          try {
            const endpoint = args.device.zclNode?.endpoints?.[1];
            if (endpoint?.clusters?.identify) {
              await endpoint.clusters.identify.identify({ identifyTime: 5 });
            }
          } catch (err) {
            args.device.error('Identify failed:', err.message);
          }
          return true;
        });
      }
    } catch (err) { }

    // reset_device
    try {
      this.actions.reset_device = this.homey.flow.getDeviceActionCard('reset_device');
      if (this.actions.reset_device) {
        this.actions.reset_device.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.error !== 'function') {
            this.homey.app.error('[FLOW] reset_device: Invalid device reference');
            return false;
          }
          // Soft reset - reinitialize device
          try {
            if (typeof args.device.onNodeInit === 'function') {
              await args.device.onNodeInit({ zclNode: args.device.zclNode });
            }
          } catch (err) {
            args.device.error('Reset failed:', err.message);
          }
          return true;
        });
      }
    } catch (err) { }

    // send_custom_command
    try {
      this.actions.send_custom_command = this.homey.flow.getDeviceActionCard('send_custom_command');
      if (this.actions.send_custom_command) {
        this.actions.send_custom_command.registerRunListener(async (args) => {
          if (!args.device || typeof args.device.log !== 'function') {
            this.homey.app.error('[FLOW] send_custom_command: Invalid device reference');
            return false;
          }
          args.device.log('[CUSTOM-CMD] Sending:', args.command);
          // This is a placeholder - actual implementation depends on device
          return true;
        });
      }
    } catch (err) { }

    // v5.5.27: refresh_device - Request fresh data from device
    // v5.5.31: Enhanced with forceDataRecovery
    try {
      this.actions.refresh_device = this.homey.flow.getDeviceActionCard('refresh_device');
      if (this.actions.refresh_device) {
        this.actions.refresh_device.registerRunListener(async (args) => {
          args.device.log('[FLOW-REFRESH] Manual refresh triggered');

          // v5.5.31: Use forceDataRecovery for comprehensive recovery
          if (typeof args.device.forceDataRecovery === 'function') {
            await args.device.forceDataRecovery();
          }

          // Use onFlowCardRefresh if available (from HybridSensorBase)
          if (typeof args.device.onFlowCardRefresh === 'function') {
            return args.device.onFlowCardRefresh();
          }

          // Fallback: try refreshAll
          if (typeof args.device.refreshAll === 'function') {
            return args.device.refreshAll();
          }

          // Last resort: try safeTuyaDataQuery with dpMappings
          if (typeof args.device.safeTuyaDataQuery === 'function' && args.device.dpMappings) {
            const dpIds = Object.keys(args.device.dpMappings).map(Number).filter(n => !isNaN(n));
            if (dpIds.length > 0) {
              return args.device.safeTuyaDataQuery(dpIds, { logPrefix: '[FLOW-REFRESH]' });
            }
          }

          args.device.log('[FLOW-REFRESH] No refresh method available');
          return false;
        });
      }
    } catch (err) { }

    try {
      this.actions.send_tuya_dp_boolean = this.homey.flow.getDeviceActionCard('send_tuya_dp_boolean');
      if (this.actions.send_tuya_dp_boolean) {
        this.actions.send_tuya_dp_boolean.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;
          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.BOOL, args.value);
        });
      }
    } catch (err) { }

    try {
      this.actions.send_command_boolean = this.homey.flow.getDeviceActionCard('send_command_boolean');
      if (this.actions.send_command_boolean) {
        this.actions.send_command_boolean.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;
          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.BOOL, args.value);
        });
      }
    } catch (err) { }

    try {
      this.actions.send_tuya_dp_number = this.homey.flow.getDeviceActionCard('send_tuya_dp_number');
      if (this.actions.send_tuya_dp_number) {
        this.actions.send_tuya_dp_number.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;

          const dpType = args.dp_type === 'enum'
            ? TuyaDPParser.DP_TYPE.ENUM
            : args.dp_type === 'bitmap'
              ? TuyaDPParser.DP_TYPE.BITMAP
              : TuyaDPParser.DP_TYPE.VALUE;

          return manager.sendTuyaDP(args.dp_id, dpType, args.value);
        });
      }
    } catch (err) { }

    try {
      this.actions.send_command_number = this.homey.flow.getDeviceActionCard('send_command_number');
      if (this.actions.send_command_number) {
        this.actions.send_command_number.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;

          const dpType = args.dp_type === 'enum'
            ? TuyaDPParser.DP_TYPE.ENUM
            : args.dp_type === 'bitmap'
              ? TuyaDPParser.DP_TYPE.BITMAP
              : TuyaDPParser.DP_TYPE.VALUE;

          return manager.sendTuyaDP(args.dp_id, dpType, args.value);
        });
      }
    } catch (err) { }

    try {
      this.actions.send_tuya_dp_string = this.homey.flow.getDeviceActionCard('send_tuya_dp_string');
      if (this.actions.send_tuya_dp_string) {
        this.actions.send_tuya_dp_string.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;
          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.STRING, args.value);
        });
      }
    } catch (err) { }

    try {
      this.actions.send_command_string = this.homey.flow.getDeviceActionCard('send_command_string');
      if (this.actions.send_command_string) {
        this.actions.send_command_string.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;
          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.STRING, args.value);
        });
      }
    } catch (err) { }

    try {
      this.actions.send_tuya_dp_json = this.homey.flow.getDeviceActionCard('send_tuya_dp_json');
      if (this.actions.send_tuya_dp_json) {
        this.actions.send_tuya_dp_json.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;

          let parsed;
          try {
            parsed = JSON.parse(args.value);
          } catch (e) {
            return false;
          }

          let raw;
          if (Array.isArray(parsed)) {
            raw = Buffer.from(parsed);
          } else if (parsed && typeof parsed === 'object' && typeof parsed.hex === 'string') {
            raw = Buffer.from(parsed.hex.replace(/^0x/i, ''), 'hex');
          } else if (parsed && typeof parsed === 'object' && typeof parsed.base64 === 'string') {
            raw = Buffer.from(parsed.base64, 'base64');
          } else {
            return false;
          }

          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.RAW, raw);
        });
      }
    } catch (err) { }

    try {
      this.actions.send_command_json = this.homey.flow.getDeviceActionCard('send_command_json');
      if (this.actions.send_command_json) {
        this.actions.send_command_json.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;

          let parsed;
          try {
            parsed = JSON.parse(args.value);
          } catch (e) {
            return false;
          }

          let raw;
          if (Array.isArray(parsed)) {
            raw = Buffer.from(parsed);
          } else if (parsed && typeof parsed === 'object' && typeof parsed.hex === 'string') {
            raw = Buffer.from(parsed.hex.replace(/^0x/i, ''), 'hex');
          } else if (parsed && typeof parsed === 'object' && typeof parsed.base64 === 'string') {
            raw = Buffer.from(parsed.base64, 'base64');
          } else {
            return false;
          }

          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.RAW, raw);
        });
      }
    } catch (err) { }

    try {
      this.actions.request_tuya_dp = this.homey.flow.getDeviceActionCard('request_tuya_dp');
      if (this.actions.request_tuya_dp) {
        this.actions.request_tuya_dp.registerRunListener(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.requestDP !== 'function') return false;
          return manager.requestDP(args.dp_id);
        });
      }
    } catch (err) { }
  }

  /**
   * MOTION SENSOR FLOW CARDS
   */
  registerMotionSensorCards() {
    // WHEN: Motion detected with specific lux level
    try {
      this.triggers.motion_alarm_lux = this.homey.flow.getDeviceTriggerCard('motion_alarm_lux');
      if (this.triggers.motion_alarm_lux) {
        this.triggers.motion_alarm_lux.registerRunListener(async (args, state) => {
          const lux = state.lux || 0;
          return lux >= args.lux_min && lux <= args.lux_max;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card motion_alarm_lux not available yet');
    }

    // WHEN: No motion for X minutes
    try {
      this.triggers.no_motion_timeout = this.homey.flow.getDeviceTriggerCard('no_motion_timeout');
      if (this.triggers.no_motion_timeout) {
        this.triggers.no_motion_timeout.register();
      }
    } catch (err) {
      this.homey.app.log('Flow card no_motion_timeout not available yet');
    }

    // THEN: Enable/disable motion sensor
    try {
      this.actions.enable_motion_sensor = this.homey.flow.getDeviceActionCard('enable_motion_sensor');
      if (this.actions.enable_motion_sensor) {
        this.actions.enable_motion_sensor.registerRunListener(async (args) => {
          await args.device.setCapabilityValue('alarm_motion_enabled', args.enabled);
          return true;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card enable_motion_sensor not available yet');
    }

    // AND: Motion detected in last X minutes
    try {
      this.conditions.motion_in_last_minutes = this.homey.flow.getDeviceConditionCard('motion_in_last_minutes');
      if (this.conditions.motion_in_last_minutes) {
        this.conditions.motion_in_last_minutes.registerRunListener(async (args) => {
          const lastMotion = args.device.getStoreValue('last_motion_time') || 0;
          const minutesAgo = (Date.now() - lastMotion) / 60000;
          return minutesAgo <= args.minutes;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card motion_in_last_minutes not available yet');
    }
  }

  /**
   * SMART PLUG FLOW CARDS
   */
  registerSmartPlugCards() {
    // WHEN: Power above threshold
    try {
      this.triggers.power_above_threshold = this.homey.flow.getDeviceTriggerCard('power_above_threshold');
      if (this.triggers.power_above_threshold) {
        this.triggers.power_above_threshold.registerRunListener(async (args, state) => {
          return state.power > args.watts;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card power_above_threshold not available yet');
    }

    // THEN: Reset energy meter
    try {
      this.actions.reset_energy_meter = this.homey.flow.getDeviceActionCard('reset_energy_meter');
      if (this.actions.reset_energy_meter) {
        this.actions.reset_energy_meter.registerRunListener(async (args) => {
          await args.device.setStoreValue('energy_start', Date.now());
          await args.device.setCapabilityValue('meter_power', 0);
          return true;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card reset_energy_meter not available yet');
    }

    // AND: Power consumption in range
    try {
      this.conditions.power_in_range = this.homey.flow.getDeviceConditionCard('power_in_range');
      if (this.conditions.power_in_range) {
        this.conditions.power_in_range.registerRunListener(async (args) => {
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power >= args.min_watts && power <= args.max_watts;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card power_in_range not available yet');
    }
  }

  /**
   * BUTTON FLOW CARDS
   */
  registerButtonCards() {
    // WHEN: Button pressed X times
    try {
      this.triggers.button_pressed_times = this.homey.flow.getDeviceTriggerCard('button_pressed_times');
      if (this.triggers.button_pressed_times) {
        this.triggers.button_pressed_times.registerRunListener(async (args, state) => {
          return state.presses === args.times;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card button_pressed_times not available yet');
    }

    // WHEN: Button long press
    try {
      this.triggers.button_long_press = this.homey.flow.getDeviceTriggerCard('button_long_press');
      if (this.triggers.button_long_press) {
        this.triggers.button_long_press.registerRunListener(async (args, state) => {
          return state.duration >= args.seconds;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card button_long_press not available yet');
    }
  }

  /**
   * TEMPERATURE SENSOR FLOW CARDS
   */
  registerTemperatureSensorCards() {
    // WHEN: Temperature crossed threshold
    try {
      this.triggers.temperature_crossed = this.homey.flow.getDeviceTriggerCard('temperature_crossed_threshold');
      if (this.triggers.temperature_crossed) {
        this.triggers.temperature_crossed.registerRunListener(async (args, state) => {
          if (args.direction === 'rising') {
            return state.oldTemp < args.threshold && state.newTemp >= args.threshold;
          } else {
            return state.oldTemp > args.threshold && state.newTemp <= args.threshold;
          }
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card temperature_crossed_threshold not available yet');
    }

    // AND: Temperature in range
    try {
      this.conditions.temp_in_range = this.homey.flow.getDeviceConditionCard('temperature_in_range');
      if (this.conditions.temp_in_range) {
        this.conditions.temp_in_range.registerRunListener(async (args) => {
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp >= args.min_temp && temp <= args.max_temp;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card temperature_in_range not available yet');
    }
  }

  /**
   * DEVICE HEALTH FLOW CARDS
   */
  registerDeviceHealthCards() {
    // WHEN: Device went offline
    try {
      this.triggers.device_offline = this.homey.flow.getDeviceTriggerCard('device_offline');
      if (this.triggers.device_offline) {
        this.triggers.device_offline.register();
      }
    } catch (err) {
      this.homey.app.log('Flow card device_offline not available yet');
    }

    // AND: Device is reachable
    try {
      this.conditions.device_reachable = this.homey.flow.getDeviceConditionCard('device_reachable');
      if (this.conditions.device_reachable) {
        this.conditions.device_reachable.registerRunListener(async (args) => {
          const offline = args.device.getCapabilityValue('alarm_offline') || false;
          return !offline;
        });
      }
    } catch (err) {
      this.homey.app.log('Flow card device_reachable not available yet');
    }
  }

  /**
   * ENERGY MONITORING FLOW CARDS (v5.1.2+)
   * Comprehensive energy management triggers, conditions, and actions
   */
  registerEnergyFlowCards() {
    // === TRIGGERS ===

    // High power alert
    try {
      this.triggers.energy_high_power = this.homey.flow.getDeviceTriggerCard('energy_high_power');
      if (this.triggers.energy_high_power) {
        this.triggers.energy_high_power.register();
      }
    } catch (err) { }

    // Overload alert
    try {
      this.triggers.energy_overload = this.homey.flow.getDeviceTriggerCard('energy_overload');
      if (this.triggers.energy_overload) {
        this.triggers.energy_overload.register();
      }
    } catch (err) { }

    // Standby mode entered
    try {
      this.triggers.energy_standby_entered = this.homey.flow.getDeviceTriggerCard('energy_standby_entered');
      if (this.triggers.energy_standby_entered) {
        this.triggers.energy_standby_entered.register();
      }
    } catch (err) { }

    // Standby mode exited
    try {
      this.triggers.energy_standby_exited = this.homey.flow.getDeviceTriggerCard('energy_standby_exited');
      if (this.triggers.energy_standby_exited) {
        this.triggers.energy_standby_exited.register();
      }
    } catch (err) { }

    // Voltage low
    try {
      this.triggers.energy_voltage_low = this.homey.flow.getDeviceTriggerCard('energy_voltage_low');
      if (this.triggers.energy_voltage_low) {
        this.triggers.energy_voltage_low.register();
      }
    } catch (err) { }

    // Voltage high
    try {
      this.triggers.energy_voltage_high = this.homey.flow.getDeviceTriggerCard('energy_voltage_high');
      if (this.triggers.energy_voltage_high) {
        this.triggers.energy_voltage_high.register();
      }
    } catch (err) { }

    // === CONDITIONS ===

    // Power above threshold
    try {
      this.conditions.energy_power_above = this.homey.flow.getConditionCard('energy_power_above');
      if (this.conditions.energy_power_above) {
        this.conditions.energy_power_above.registerRunListener(async (args) => {
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power > args.threshold;
        });
      }
    } catch (err) { }

    // Power below threshold
    try {
      this.conditions.energy_power_below = this.homey.flow.getConditionCard('energy_power_below');
      if (this.conditions.energy_power_below) {
        this.conditions.energy_power_below.registerRunListener(async (args) => {
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power < args.threshold;
        });
      }
    } catch (err) { }

    // Device in standby
    try {
      this.conditions.energy_in_standby = this.homey.flow.getConditionCard('energy_in_standby');
      if (this.conditions.energy_in_standby) {
        this.conditions.energy_in_standby.registerRunListener(async (args) => {
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power < 2; // Less than 2W = standby
        });
      }
    } catch (err) { }

    // === ACTIONS ===

    // Reset energy meter
    try {
      this.actions.energy_reset_meter = this.homey.flow.getActionCard('energy_reset_meter');
      if (this.actions.energy_reset_meter) {
        this.actions.energy_reset_meter.registerRunListener(async (args) => {
          // Try to reset energy meter via device method
          if (typeof args.device.resetEnergyMeter === 'function') {
            await args.device.resetEnergyMeter();
          } else {
            // Fallback: store current value as baseline
            const currentEnergy = args.device.getCapabilityValue('meter_power') || 0;
            await args.device.setStoreValue('energy_baseline', currentEnergy);
          }
          return true;
        });
      }
    } catch (err) { }

    this.homey.app?.log?.('[FlowCardManager] Energy flow cards registered');
  }

  /**
   * v5.5.239: Register new universal flow cards
   */
  registerUniversalFlowCards() {
    // === ACTIONS ===

    // Toggle on/off
    try {
      this.actions.toggle_onoff = this.homey.flow.getActionCard('toggle_onoff');
      if (this.actions.toggle_onoff) {
        this.actions.toggle_onoff.registerRunListener(async (args) => {
          const current = args.device.getCapabilityValue('onoff') || false;
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      }
    } catch (err) { }

    // Set brightness percent
    try {
      this.actions.set_brightness_percent = this.homey.flow.getActionCard('set_brightness_percent');
      if (this.actions.set_brightness_percent) {
        this.actions.set_brightness_percent.registerRunListener(async (args) => {
          await args.device.setCapabilityValue('dim', args.brightness / 100);
          return true;
        });
      }
    } catch (err) { }

    // Set fan speed
    try {
      this.actions.set_fan_speed = this.homey.flow.getActionCard('set_fan_speed');
      if (this.actions.set_fan_speed) {
        this.actions.set_fan_speed.registerRunListener(async (args) => {
          await args.device.setCapabilityValue('fan_speed', args.speed);
          return true;
        });
      }
    } catch (err) { }

    // Set valve position
    try {
      this.actions.set_valve_position = this.homey.flow.getActionCard('set_valve_position');
      if (this.actions.set_valve_position) {
        this.actions.set_valve_position.registerRunListener(async (args) => {
          await args.device.setCapabilityValue('valve_position', args.position / 100);
          return true;
        });
      }
    } catch (err) { }

    // === TRIGGERS ===

    // Motion detected
    try {
      this.triggers.motion_detected = this.homey.flow.getDeviceTriggerCard('motion_detected');
    } catch (err) { }

    // Contact changed
    try {
      this.triggers.contact_changed = this.homey.flow.getDeviceTriggerCard('contact_changed');
    } catch (err) { }

    // Water leak detected
    try {
      this.triggers.water_leak_detected = this.homey.flow.getDeviceTriggerCard('water_leak_detected');
    } catch (err) { }

    // Smoke detected
    try {
      this.triggers.smoke_detected = this.homey.flow.getDeviceTriggerCard('smoke_detected');
    } catch (err) { }

    // === CONDITIONS ===

    // Is motion detected
    try {
      this.conditions.is_motion_detected = this.homey.flow.getConditionCard('is_motion_detected');
      if (this.conditions.is_motion_detected) {
        this.conditions.is_motion_detected.registerRunListener(async (args) => {
          return args.device.getCapabilityValue('alarm_motion') || false;
        });
      }
    } catch (err) { }

    // Is contact open
    try {
      this.conditions.is_contact_open = this.homey.flow.getConditionCard('is_contact_open');
      if (this.conditions.is_contact_open) {
        this.conditions.is_contact_open.registerRunListener(async (args) => {
          return args.device.getCapabilityValue('alarm_contact') || false;
        });
      }
    } catch (err) { }

    // Temperature above
    try {
      this.conditions.temperature_above = this.homey.flow.getConditionCard('temperature_above');
      if (this.conditions.temperature_above) {
        this.conditions.temperature_above.registerRunListener(async (args) => {
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > args.temperature;
        });
      }
    } catch (err) { }

    this.homey.app?.log?.('[FlowCardManager] v5.5.239 Universal flow cards registered');
  }
}

module.exports = FlowCardManager;
