'use strict';

/**
 * Flow Card Manager
 * Centralise la gestion des flow cards pour tous les devices
 *
 * v5.5.700: Added case-insensitive argument handling via Util.js
 * v5.5.342: CRITICAL FIX - "cant get device by id" error prevention
 * All flow card handlers now wrapped with _safeDeviceHandler to gracefully
 * handle deleted/re-paired devices instead of throwing errors.
 */

const TuyaDPParser = require('../tuya/TuyaDPParser');
const { normalize, parseFlowBoolean } = require('../Util');

class FlowCardManager {
  constructor(homey) {
    this.homey = homey;
    this.triggers = {};
    this.actions = {};
    this.conditions = {};
  }

  /**
   * v5.5.342: CRITICAL - Safe device handler wrapper
   * Prevents "cant get device by id" errors when device was deleted/re-paired
   * but old flows still reference it.
   *
   * @param {Function} handler - The actual flow card handler
   * @param {string} cardName - Name of the flow card for logging
   * @param {*} defaultReturn - What to return if device is invalid (false for conditions, true for actions)
   */
  _safeDeviceHandler(handler, cardName, defaultReturn = false) {
    return async (args, state) => {
      try {
        // Validate device exists and has required methods
        if (!args || !args.device) {
          this.homey.app?.error?.(`[FLOW] ${cardName}: No device in args (device may have been deleted)`);
          return defaultReturn;
        }

        // Check if device object is valid (not a stale reference)
        if (typeof args.device.getCapabilityValue !== 'function' &&
          typeof args.device.setCapabilityValue !== 'function' &&
          typeof args.device.getAvailable !== 'function') {
          this.homey.app?.error?.(`[FLOW] ${cardName}: Invalid device reference (device may have been re-paired)`);
          return defaultReturn;
        }

        // Device is valid, execute handler
        return await handler(args, state);
      } catch (err) {
        // Catch "cant get device by id" and similar errors
        if (err.message?.includes('device') || err.message?.includes('Device')) {
          this.homey.app?.error?.(`[FLOW] ${cardName}: Device error - ${err.message}`);
          return defaultReturn;
        }
        // Re-throw other errors
        throw err;
      }
    };
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
    // temperature_above - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.temperature_above = this.homey.flow.getDeviceConditionCard('temperature_above');
      if (this.conditions.temperature_above) {
        this.conditions.temperature_above.registerRunListener(this._safeDeviceHandler(async (args) => {
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > args.temperature;
        }, 'temperature_above', false));
      }
    } catch (err) { }

    // temperature_below - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.temperature_below = this.homey.flow.getDeviceConditionCard('temperature_below');
      if (this.conditions.temperature_below) {
        this.conditions.temperature_below.registerRunListener(this._safeDeviceHandler(async (args) => {
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp < args.temperature;
        }, 'temperature_below', false));
      }
    } catch (err) { }

    // humidity_above - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.humidity_above = this.homey.flow.getDeviceConditionCard('humidity_above');
      if (this.conditions.humidity_above) {
        this.conditions.humidity_above.registerRunListener(this._safeDeviceHandler(async (args) => {
          const humidity = args.device.getCapabilityValue('measure_humidity') || 0;
          return humidity > args.humidity;
        }, 'humidity_above', false));
      }
    } catch (err) { }

    // humidity_below - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.humidity_below = this.homey.flow.getDeviceConditionCard('humidity_below');
      if (this.conditions.humidity_below) {
        this.conditions.humidity_below.registerRunListener(this._safeDeviceHandler(async (args) => {
          const humidity = args.device.getCapabilityValue('measure_humidity') || 0;
          return humidity < args.humidity;
        }, 'humidity_below', false));
      }
    } catch (err) { }

    // battery_below - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.battery_below = this.homey.flow.getDeviceConditionCard('battery_below');
      if (this.conditions.battery_below) {
        this.conditions.battery_below.registerRunListener(this._safeDeviceHandler(async (args) => {
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery < args.percentage;
        }, 'battery_below', false));
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

    // has_motion - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.has_motion = this.homey.flow.getDeviceConditionCard('has_motion');
      if (this.conditions.has_motion) {
        this.conditions.has_motion.registerRunListener(this._safeDeviceHandler(async (args) => {
          return args.device.getCapabilityValue('alarm_motion') || false;
        }, 'has_motion', false));
      }
    } catch (err) { }

    // is_open - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.is_open = this.homey.flow.getDeviceConditionCard('is_open');
      if (this.conditions.is_open) {
        this.conditions.is_open.registerRunListener(this._safeDeviceHandler(async (args) => {
          return args.device.getCapabilityValue('alarm_contact') || false;
        }, 'is_open', false));
      }
    } catch (err) { }

    // is_closed - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.is_closed = this.homey.flow.getDeviceConditionCard('is_closed');
      if (this.conditions.is_closed) {
        this.conditions.is_closed.registerRunListener(this._safeDeviceHandler(async (args) => {
          const contact = args.device.getCapabilityValue('alarm_contact') || false;
          return !contact;
        }, 'is_closed', false));
      }
    } catch (err) { }

    // alarm_active - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.alarm_active = this.homey.flow.getDeviceConditionCard('alarm_active');
      if (this.conditions.alarm_active) {
        this.conditions.alarm_active.registerRunListener(this._safeDeviceHandler(async (args) => {
          // Check any alarm_* capability
          const capabilities = args.device.getCapabilities?.() || [];
          for (const cap of capabilities) {
            if (cap.startsWith('alarm_') && args.device.getCapabilityValue(cap)) {
              return true;
            }
          }
          return false;
        }, 'alarm_active', false));
      }
    } catch (err) { }
  }

  /**
   * NOUVELLES ACTIONS (+10)
   */
  registerNewActions() {
    // set_brightness - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.set_brightness = this.homey.flow.getDeviceActionCard('set_brightness');
      if (this.actions.set_brightness) {
        this.actions.set_brightness.registerRunListener(this._safeDeviceHandler(async (args) => {
          const brightness = args.brightness / 100; // 0-100 -> 0-1
          await args.device.setCapabilityValue('dim', parseFloat(brightness));
          return true;
        }, 'set_brightness', true));
      }
    } catch (err) { }

    // dim_by - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.dim_by = this.homey.flow.getDeviceActionCard('dim_by');
      if (this.actions.dim_by) {
        this.actions.dim_by.registerRunListener(this._safeDeviceHandler(async (args) => {
          const current = args.device.getCapabilityValue('dim') || 0;
          const newValue = Math.max(0, Math.min(1, current - (args.percentage / 100)));
          await args.device.setCapabilityValue('dim', parseFloat(newValue));
          return true;
        }, 'dim_by', true));
      }
    } catch (err) { }

    // brighten_by - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.brighten_by = this.homey.flow.getDeviceActionCard('brighten_by');
      if (this.actions.brighten_by) {
        this.actions.brighten_by.registerRunListener(this._safeDeviceHandler(async (args) => {
          const current = args.device.getCapabilityValue('dim') || 0;
          const newValue = Math.max(0, Math.min(1, current + (args.percentage / 100)));
          await args.device.setCapabilityValue('dim', parseFloat(newValue));
          return true;
        }, 'brighten_by', true));
      }
    } catch (err) { }

    // set_color_temperature - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.set_color_temperature = this.homey.flow.getDeviceActionCard('set_color_temperature');
      if (this.actions.set_color_temperature) {
        this.actions.set_color_temperature.registerRunListener(this._safeDeviceHandler(async (args) => {
          // Convert 2700-6500K to 0-1 range
          const normalized = (args.temperature - 2700) / (6500 - 2700);
          await args.device.setCapabilityValue('light_temperature', parseFloat(normalized));
          return true;
        }, 'set_color_temperature', true));
      }
    } catch (err) { }

    // set_target_temperature - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.set_target_temperature = this.homey.flow.getDeviceActionCard('set_target_temperature');
      if (this.actions.set_target_temperature) {
        this.actions.set_target_temperature.registerRunListener(this._safeDeviceHandler(async (args) => {
          await args.device.setCapabilityValue('target_temperature', parseFloat(args.temperature));
          return true;
        }, 'set_target_temperature', true));
      }
    } catch (err) { }

    // increase_temperature - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.increase_temperature = this.homey.flow.getDeviceActionCard('increase_temperature');
      if (this.actions.increase_temperature) {
        this.actions.increase_temperature.registerRunListener(this._safeDeviceHandler(async (args) => {
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.setCapabilityValue('target_temperature', current + args.degrees);
          return true;
        }, 'increase_temperature', true));
      }
    } catch (err) { }

    // decrease_temperature - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.decrease_temperature = this.homey.flow.getDeviceActionCard('decrease_temperature');
      if (this.actions.decrease_temperature) {
        this.actions.decrease_temperature.registerRunListener(this._safeDeviceHandler(async (args) => {
          const current = args.device.getCapabilityValue('target_temperature') || 20;
          await args.device.setCapabilityValue('target_temperature', current - args.degrees);
          return true;
        }, 'decrease_temperature', true));
      }
    } catch (err) { }

    // identify_device - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.identify_device = this.homey.flow.getDeviceActionCard('identify_device');
      if (this.actions.identify_device) {
        this.actions.identify_device.registerRunListener(this._safeDeviceHandler(async (args) => {
          // Send identify command to device
          try {
            const endpoint = args.device.zclNode?.endpoints?.[1];
            if (endpoint?.clusters?.identify) {
              await endpoint.clusters.identify.identify({ identifyTime: 5 });
            }
          } catch (err) {
            args.device.error?.('Identify failed:', err.message);
          }
          return true;
        }, 'identify_device', true));
      }
    } catch (err) { }

    // reset_device - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.reset_device = this.homey.flow.getDeviceActionCard('reset_device');
      if (this.actions.reset_device) {
        this.actions.reset_device.registerRunListener(this._safeDeviceHandler(async (args) => {
          // Soft reset - reinitialize device
          try {
            if (typeof args.device.onNodeInit === 'function') {
              await args.device.onNodeInit({ zclNode: args.device.zclNode });
            }
          } catch (err) {
            args.device.error?.('Reset failed:', err.message);
          }
          return true;
        }, 'reset_device', true));
      }
    } catch (err) { }

    // send_custom_command - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.send_custom_command = this.homey.flow.getDeviceActionCard('send_custom_command');
      if (this.actions.send_custom_command) {
        this.actions.send_custom_command.registerRunListener(this._safeDeviceHandler(async (args) => {
          args.device.log?.('[CUSTOM-CMD] Sending:', args.command);
          // This is a placeholder - actual implementation depends on device
          return true;
        }, 'send_custom_command', true));
      }
    } catch (err) { }

    // v5.5.27: refresh_device - Request fresh data from device
    // v5.5.31: Enhanced with forceDataRecovery
    // v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.refresh_device = this.homey.flow.getDeviceActionCard('refresh_device');
      if (this.actions.refresh_device) {
        this.actions.refresh_device.registerRunListener(this._safeDeviceHandler(async (args) => {
          args.device.log?.('[FLOW-REFRESH] Manual refresh triggered');

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

          args.device.log?.('[FLOW-REFRESH] No refresh method available');
          return false;
        }, 'refresh_device', true));
      }
    } catch (err) { }

    // v5.5.342: Tuya DP actions wrapped with _safeDeviceHandler
    try {
      this.actions.send_tuya_dp_boolean = this.homey.flow.getDeviceActionCard('send_tuya_dp_boolean');
      if (this.actions.send_tuya_dp_boolean) {
        this.actions.send_tuya_dp_boolean.registerRunListener(this._safeDeviceHandler(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;
          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.BOOL, args.value);
        }, 'send_tuya_dp_boolean', true));
      }
    } catch (err) { }

    try {
      this.actions.send_command_boolean = this.homey.flow.getDeviceActionCard('send_command_boolean');
      if (this.actions.send_command_boolean) {
        this.actions.send_command_boolean.registerRunListener(this._safeDeviceHandler(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;
          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.BOOL, args.value);
        }, 'send_command_boolean', true));
      }
    } catch (err) { }

    try {
      this.actions.send_tuya_dp_number = this.homey.flow.getDeviceActionCard('send_tuya_dp_number');
      if (this.actions.send_tuya_dp_number) {
        this.actions.send_tuya_dp_number.registerRunListener(this._safeDeviceHandler(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;

          // v5.5.700: Case-insensitive dp_type matching
          const dpTypeNorm = normalize(args.dp_type);
          const dpType = dpTypeNorm === 'enum'
            ? TuyaDPParser.DP_TYPE.ENUM
            : dpTypeNorm === 'bitmap'
              ? TuyaDPParser.DP_TYPE.BITMAP
              : TuyaDPParser.DP_TYPE.VALUE;

          return manager.sendTuyaDP(args.dp_id, dpType, args.value);
        }, 'send_tuya_dp_number', true));
      }
    } catch (err) { }

    try {
      this.actions.send_command_number = this.homey.flow.getDeviceActionCard('send_command_number');
      if (this.actions.send_command_number) {
        this.actions.send_command_number.registerRunListener(this._safeDeviceHandler(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;

          // v5.5.700: Case-insensitive dp_type matching
          const dpTypeNorm = normalize(args.dp_type);
          const dpType = dpTypeNorm === 'enum'
            ? TuyaDPParser.DP_TYPE.ENUM
            : dpTypeNorm === 'bitmap'
              ? TuyaDPParser.DP_TYPE.BITMAP
              : TuyaDPParser.DP_TYPE.VALUE;

          return manager.sendTuyaDP(args.dp_id, dpType, args.value);
        }, 'send_command_number', true));
      }
    } catch (err) { }

    try {
      this.actions.send_tuya_dp_string = this.homey.flow.getDeviceActionCard('send_tuya_dp_string');
      if (this.actions.send_tuya_dp_string) {
        this.actions.send_tuya_dp_string.registerRunListener(this._safeDeviceHandler(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;
          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.STRING, args.value);
        }, 'send_tuya_dp_string', true));
      }
    } catch (err) { }

    try {
      this.actions.send_command_string = this.homey.flow.getDeviceActionCard('send_command_string');
      if (this.actions.send_command_string) {
        this.actions.send_command_string.registerRunListener(this._safeDeviceHandler(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.sendTuyaDP !== 'function') return false;
          return manager.sendTuyaDP(args.dp_id, TuyaDPParser.DP_TYPE.STRING, args.value);
        }, 'send_command_string', true));
      }
    } catch (err) { }

    try {
      this.actions.send_tuya_dp_json = this.homey.flow.getDeviceActionCard('send_tuya_dp_json');
      if (this.actions.send_tuya_dp_json) {
        this.actions.send_tuya_dp_json.registerRunListener(this._safeDeviceHandler(async (args) => {
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
        }, 'send_tuya_dp_json', true));
      }
    } catch (err) { }

    try {
      this.actions.send_command_json = this.homey.flow.getDeviceActionCard('send_command_json');
      if (this.actions.send_command_json) {
        this.actions.send_command_json.registerRunListener(this._safeDeviceHandler(async (args) => {
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
        }, 'send_command_json', true));
      }
    } catch (err) { }

    try {
      this.actions.request_tuya_dp = this.homey.flow.getDeviceActionCard('request_tuya_dp');
      if (this.actions.request_tuya_dp) {
        this.actions.request_tuya_dp.registerRunListener(this._safeDeviceHandler(async (args) => {
          const manager = args.device.tuyaEF00Manager;
          if (!manager || typeof manager.requestDP !== 'function') return false;
          return manager.requestDP(args.dp_id);
        }, 'request_tuya_dp', true));
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

    // THEN: Enable/disable motion sensor - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.enable_motion_sensor = this.homey.flow.getDeviceActionCard('enable_motion_sensor');
      if (this.actions.enable_motion_sensor) {
        this.actions.enable_motion_sensor.registerRunListener(this._safeDeviceHandler(async (args) => {
          await args.device.setCapabilityValue('alarm_motion_enabled', args.enabled);
          return true;
        }, 'enable_motion_sensor', true));
      }
    } catch (err) {
      this.homey.app?.log?.('Flow card enable_motion_sensor not available yet');
    }

    // AND: Motion detected in last X minutes - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.motion_in_last_minutes = this.homey.flow.getDeviceConditionCard('motion_in_last_minutes');
      if (this.conditions.motion_in_last_minutes) {
        this.conditions.motion_in_last_minutes.registerRunListener(this._safeDeviceHandler(async (args) => {
          const lastMotion = args.device.getStoreValue?.('last_motion_time') || 0;
          const minutesAgo = (Date.now() - lastMotion) / 60000;
          return minutesAgo <= args.minutes;
        }, 'motion_in_last_minutes', false));
      }
    } catch (err) {
      this.homey.app?.log?.('Flow card motion_in_last_minutes not available yet');
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

    // THEN: Reset energy meter - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.actions.reset_energy_meter = this.homey.flow.getDeviceActionCard('reset_energy_meter');
      if (this.actions.reset_energy_meter) {
        this.actions.reset_energy_meter.registerRunListener(this._safeDeviceHandler(async (args) => {
          await args.device.setStoreValue?.('energy_start', Date.now());
          await args.device.setCapabilityValue('meter_power', 0);
          return true;
        }, 'reset_energy_meter', true));
      }
    } catch (err) {
      this.homey.app?.log?.('Flow card reset_energy_meter not available yet');
    }

    // AND: Power consumption in range - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.power_in_range = this.homey.flow.getDeviceConditionCard('power_in_range');
      if (this.conditions.power_in_range) {
        this.conditions.power_in_range.registerRunListener(this._safeDeviceHandler(async (args) => {
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power >= args.min_watts && power <= args.max_watts;
        }, 'power_in_range', false));
      }
    } catch (err) {
      this.homey.app?.log?.('Flow card power_in_range not available yet');
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

    // AND: Temperature in range - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.temp_in_range = this.homey.flow.getDeviceConditionCard('temperature_in_range');
      if (this.conditions.temp_in_range) {
        this.conditions.temp_in_range.registerRunListener(this._safeDeviceHandler(async (args) => {
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp >= args.min_temp && temp <= args.max_temp;
        }, 'temperature_in_range', false));
      }
    } catch (err) {
      this.homey.app?.log?.('Flow card temperature_in_range not available yet');
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
      this.homey.app?.log?.('Flow card device_offline not available yet');
    }

    // AND: Device is reachable - v5.5.342: wrapped with _safeDeviceHandler
    try {
      this.conditions.device_reachable = this.homey.flow.getDeviceConditionCard('device_reachable');
      if (this.conditions.device_reachable) {
        this.conditions.device_reachable.registerRunListener(this._safeDeviceHandler(async (args) => {
          const offline = args.device.getCapabilityValue('alarm_offline') || false;
          return !offline;
        }, 'device_reachable', false));
      }
    } catch (err) {
      this.homey.app?.log?.('Flow card device_reachable not available yet');
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

    // v5.5.929: Switch backlight mode flow cards
    this.registerSwitchBacklightCards();

    // v5.5.929: Plug LED indicator + power-on behavior flow cards
    this.registerPlugLEDCards();
  }

  /**
   * v5.5.929: Register switch backlight mode flow cards (DP15)
   * Supports switch_1gang through switch_4gang
   */
  registerSwitchBacklightCards() {
    const switchDrivers = ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang'];
    
    for (const driver of switchDrivers) {
      // Basic backlight mode (DP15)
      this._registerSwitchCard(`${driver}_set_backlight`, async (args) => {
        if (typeof args.device.setBacklightMode === 'function') {
          await args.device.setBacklightMode(args.mode);
          return true;
        }
        throw new Error('Device does not support backlight control');
      });

      // LED color (DP103/104) - Z2M compatible
      this._registerSwitchCard(`${driver}_set_backlight_color`, async (args) => {
        if (typeof args.device.setBacklightColor === 'function') {
          await args.device.setBacklightColor(args.state, args.color);
          return true;
        }
        throw new Error('Device does not support LED color');
      });

      // LED brightness (DP102)
      this._registerSwitchCard(`${driver}_set_backlight_brightness`, async (args) => {
        if (typeof args.device.setBacklightBrightness === 'function') {
          await args.device.setBacklightBrightness(args.brightness);
          return true;
        }
        throw new Error('Device does not support LED brightness');
      });

      // Countdown timer (DP7/8/9)
      this._registerSwitchCard(`${driver}_set_countdown`, async (args) => {
        if (typeof args.device.setCountdown === 'function') {
          await args.device.setCountdown(1, args.seconds);
          return true;
        }
        throw new Error('Device does not support countdown');
      });

      // Child lock (DP101)
      this._registerSwitchCard(`${driver}_set_child_lock`, async (args) => {
        if (typeof args.device.setChildLock === 'function') {
          await args.device.setChildLock(args.locked === 'true');
          return true;
        }
        throw new Error('Device does not support child lock');
      });
    }
  }

  /**
   * v5.5.929: Helper to register switch flow cards with error handling
   */
  _registerSwitchCard(cardId, handler) {
    try {
      const card = this.homey.flow.getActionCard(cardId);
      if (card) {
        card.registerRunListener(this._safeDeviceHandler(handler, cardId, true));
        this.homey.app?.log?.(`[FLOW] ✅ ${cardId} registered`);
      }
    } catch (err) {
      // Card not defined - skip silently
    }
  }

  /**
   * v5.5.929: Register plug LED indicator and power-on behavior flow cards
   */
  registerPlugLEDCards() {
    // LED indicator mode
    try {
      const indicatorCard = this.homey.flow.getActionCard('plug_smart_set_indicator');
      if (indicatorCard) {
        indicatorCard.registerRunListener(this._safeDeviceHandler(async (args) => {
          this.homey.app?.log?.(`[FLOW] plug_smart_set_indicator: ${args.mode}`);
          if (typeof args.device.setIndicatorMode === 'function') {
            await args.device.setIndicatorMode(args.mode);
            return true;
          }
          throw new Error('Device does not support LED indicator control');
        }, 'plug_smart_set_indicator', true));
        this.homey.app?.log?.('[FLOW] ✅ plug_smart_set_indicator registered');
      }
    } catch (err) { }

    // Power-on behavior
    try {
      const powerOnCard = this.homey.flow.getActionCard('plug_smart_set_power_on');
      if (powerOnCard) {
        powerOnCard.registerRunListener(this._safeDeviceHandler(async (args) => {
          this.homey.app?.log?.(`[FLOW] plug_smart_set_power_on: ${args.behavior}`);
          if (typeof args.device.setPowerOnBehavior === 'function') {
            await args.device.setPowerOnBehavior(args.behavior);
            return true;
          }
          throw new Error('Device does not support power-on behavior control');
        }, 'plug_smart_set_power_on', true));
        this.homey.app?.log?.('[FLOW] ✅ plug_smart_set_power_on registered');
      }
    } catch (err) { }
  }
}

module.exports = FlowCardManager;
