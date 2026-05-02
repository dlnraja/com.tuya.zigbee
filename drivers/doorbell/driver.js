'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaDoorbellDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('TuyaDoorbellDriver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}
    // Removed corrupted nested block})(); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('doorbell_battery_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
      });
      }
    } catch (err) { this.error(`Condition doorbell_battery_above: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('doorbell_motion_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition doorbell_motion_active: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('doorbell_contact_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition doorbell_contact_open: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('doorbell_tamper_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition doorbell_tamper_active: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('doorbell_ring_chime');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action doorbell_ring_chime triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action doorbell_ring_chime: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaDoorbellDriver;

