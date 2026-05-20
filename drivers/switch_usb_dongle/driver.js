'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v7.5.50: USB 2-Port Relay & Zigbee Repeater Driver
 * Supports _TZ3000_h1ipgkwn / TS0002
 * Flow cards are simple: on/off per USB port
 */
class SwitchUsbDongleDriver extends ZigBeeDriver {

  async onInit() {
    this.log('[USB-DONGLE] Driver v7.5.50 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION - USB Port 1 is on
    try {
      const card = this.homey.flow.getConditionCard('switch_usb_dongle_port1_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
        this.log('[FLOW] ✅ switch_usb_dongle_port1_is_on');
      }
    } catch (err) {
      this.error('[FLOW] switch_usb_dongle_port1_is_on:', err.message);
    }

    // CONDITION - USB Port 2 is on
    try {
      const card = this.homey.flow.getConditionCard('switch_usb_dongle_port2_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff.l2') === true;
        });
        this.log('[FLOW] ✅ switch_usb_dongle_port2_is_on');
      }
    } catch (err) {
      this.error('[FLOW] switch_usb_dongle_port2_is_on:', err.message);
    }

    // ACTION - Turn USB Port 1 On
    try {
      const card = this.homey.flow.getActionCard('switch_usb_dongle_turn_on_port1');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
        this.log('[FLOW] ✅ switch_usb_dongle_turn_on_port1');
      }
    } catch (err) {
      this.error('[FLOW] switch_usb_dongle_turn_on_port1:', err.message);
    }

    // ACTION - Turn USB Port 1 Off
    try {
      const card = this.homey.flow.getActionCard('switch_usb_dongle_turn_off_port1');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
        this.log('[FLOW] ✅ switch_usb_dongle_turn_off_port1');
      }
    } catch (err) {
      this.error('[FLOW] switch_usb_dongle_turn_off_port1:', err.message);
    }

    // ACTION - Turn USB Port 2 On
    try {
      const card = this.homey.flow.getActionCard('switch_usb_dongle_turn_on_port2');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.setCapabilityValue('onoff.l2', true).catch(() => {});
          return true;
        });
        this.log('[FLOW] ✅ switch_usb_dongle_turn_on_port2');
      }
    } catch (err) {
      this.error('[FLOW] switch_usb_dongle_turn_on_port2:', err.message);
    }

    // ACTION - Turn USB Port 2 Off
    try {
      const card = this.homey.flow.getActionCard('switch_usb_dongle_turn_off_port2');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.setCapabilityValue('onoff.l2', false).catch(() => {});
          return true;
        });
        this.log('[FLOW] ✅ switch_usb_dongle_turn_off_port2');
      }
    } catch (err) {
      this.error('[FLOW] switch_usb_dongle_turn_off_port2:', err.message);
    }

    // ACTION - Toggle USB Port 1
    try {
      const card = this.homey.flow.getActionCard('switch_usb_dongle_toggle_port1');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const v = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !v).catch(() => {});
          return true;
        });
        this.log('[FLOW] ✅ switch_usb_dongle_toggle_port1');
      }
    } catch (err) {
      this.error('[FLOW] switch_usb_dongle_toggle_port1:', err.message);
    }

    // ACTION - Toggle USB Port 2
    try {
      const card = this.homey.flow.getActionCard('switch_usb_dongle_toggle_port2');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const v = args.device.getCapabilityValue('onoff.l2');
          await args.device.setCapabilityValue('onoff.l2', !v).catch(() => {});
          return true;
        });
        this.log('[FLOW] ✅ switch_usb_dongle_toggle_port2');
      }
    } catch (err) {
      this.error('[FLOW] switch_usb_dongle_toggle_port2:', err.message);
    }

    this.log('[USB-DONGLE] ✅ Flow cards registered');
  }
}

module.exports = SwitchUsbDongleDriver;
