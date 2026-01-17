'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.575: CRITICAL FIX - Added missing condition/action run listeners
 * v5.5.556: Safe flow card registration - no stderr on missing cards
 */
class UsbOutletAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutletAdvancedDriver v5.5.575 initializing...');
    await super.onInit();

    // Safe flow card registration helper
    const safeGetTrigger = (id) => {
      try {
        return this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.log(`[FLOW] Trigger '${id}' not defined - skipping`);
        return null;
      }
    };

    // Register trigger cards
    this._turnedOnTrigger = safeGetTrigger('usb_outlet_advanced_turned_on');
    this._turnedOffTrigger = safeGetTrigger('usb_outlet_advanced_turned_off');
    this._powerChangedTrigger = safeGetTrigger('usb_outlet_advanced_measure_power_changed');
    this._voltageChangedTrigger = safeGetTrigger('usb_outlet_advanced_measure_voltage_changed');
    this._currentChangedTrigger = safeGetTrigger('usb_outlet_advanced_measure_current_changed');
    this._meterChangedTrigger = safeGetTrigger('usb_outlet_advanced_meter_power_changed');

    // v5.5.575: Register condition and action run listeners
    this._registerFlowCards();

    this.log('UsbOutletAdvancedDriver v5.5.575 ✅ Flow cards registered');
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      this.homey.flow.getConditionCard('usb_outlet_advanced_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ usb_outlet_advanced_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('usb_outlet_advanced_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ usb_outlet_advanced_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('usb_outlet_advanced_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ usb_outlet_advanced_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('usb_outlet_advanced_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ usb_outlet_advanced_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
  }
}

module.exports = UsbOutletAdvancedDriver;
