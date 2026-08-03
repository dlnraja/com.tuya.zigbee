'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('Tuya Zigbee 1-Gang Switch Driver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["remote_button_wireless_fingerbot_button_wire_c8def","remote_button_wireless_fingerbot_button_wire_a5c3a","remote_button_wireless_fingerbot_button_wire_208e1","remote_button_wireless_fingerbot_button_wire_5bcb0","remote_button_wireless_fingerbot_button_wire_2095c","remote_button_wireless_fingerbot_button_wire_70b04","remote_button_wireless_fingerbot_button_wire_7b2a1","remote_button_wireless_fingerbot_button_wire_dec14","remote_button_wireless_fingerbot_button_wire_4e036","remote_button_wireless_fingerbot_button_wire_5042e","remote_button_wireless_fingerbot_button_wire_558b6"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) {return;}
            args.device.emit(`flow:${  _tid}`, args);
          });
        }
      } catch (_err) { this.error(`Trigger ${  _tid  }: ${  _err.message}`); }
    }
    // END TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('remote_button_wireless_fingerbot_button_wire_76a5d');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition remote_button_wireless_fingerbot_button_wire_76a5d: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_d3f77');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_d3f77: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_4c144');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_4c144: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_91add');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_91add: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_d7759');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          if (typeof args.device.setBacklightMode === 'function') {await args.device.setBacklightMode(args.mode || args.value);}
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_d7759: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_84776');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          if (typeof args.device.setBacklightMode === 'function') {await args.device.setBacklightMode(args.mode || args.value);}
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_84776: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_c7b42');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          if (typeof args.device.setBacklightMode === 'function') {await args.device.setBacklightMode(args.mode || args.value);}
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_c7b42: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_83c2a');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action remote_button_wireless_fingerbot_button_wire_83c2a triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_83c2a: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_ecf53');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action remote_button_wireless_fingerbot_button_wire_ecf53 triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_ecf53: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_fingerbot_button_wire_de03b');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          if (typeof args.device.setSceneMode === 'function') {await args.device.setSceneMode(args.mode || args.value);}
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action remote_button_wireless_fingerbot_button_wire_de03b: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
