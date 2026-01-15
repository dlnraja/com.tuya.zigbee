'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.556: Safe flow card registration - no stderr on missing cards
 * v5.5.551: Fixed - removed non-existent flow card reference
 */
class UsbOutletAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutletAdvancedDriver v5.5.556 initializing...');
    await super.onInit();

    // v5.5.556: Safe flow card registration helper (no stderr on missing cards)
    const safeGetTrigger = (id) => {
      try {
        return this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.log(`[FLOW] Trigger '${id}' not defined - skipping`);
        return null;
      }
    };

    // Register flow cards that exist in driver.flow.compose.json
    this._turnedOnTrigger = safeGetTrigger('usb_outlet_advanced_turned_on');
    this._turnedOffTrigger = safeGetTrigger('usb_outlet_advanced_turned_off');
    this._powerChangedTrigger = safeGetTrigger('usb_outlet_advanced_measure_power_changed');
    this._voltageChangedTrigger = safeGetTrigger('usb_outlet_advanced_measure_voltage_changed');
    this._currentChangedTrigger = safeGetTrigger('usb_outlet_advanced_measure_current_changed');
    this._meterChangedTrigger = safeGetTrigger('usb_outlet_advanced_meter_power_changed');

    const registered = [this._turnedOnTrigger, this._turnedOffTrigger, this._powerChangedTrigger,
                        this._voltageChangedTrigger, this._currentChangedTrigger, this._meterChangedTrigger]
                       .filter(Boolean).length;
    this.log(`UsbOutletAdvancedDriver ✅ ${registered}/6 Flow cards registered`);
  }
}

module.exports = UsbOutletAdvancedDriver;
