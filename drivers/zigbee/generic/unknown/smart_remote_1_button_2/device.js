"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { debug, CLUSTER } = require('zigbee-clusters');

class smart_remote_1_button_2 extends Homey.Device {
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: GENERIC_ONOFF (high)
    // Compatibilité: OK
    // Capabilities supportées: onoff
    // Limitations: 
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: GENERIC_ONOFF (high)
    // Compatibilité: OK
    // Capabilities supportées: onoff
    // Limitations: 
    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
    async onInit() {
        try {
        await super.onInit();
        
        // Register capabilities
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
        
        // Start polling
        this.startPolling();
    }
  async onNodeInit({ zclNode }) {
    this.printNode();

    const node = await this.homey.zigbee.getNode(this);
    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      if (clusterId === 6) {
        this.log(
          "endpointId:",
          endpointId,
          ", clusterId:",
          clusterId,
          ", frame:",
          frame,
          ", meta:",
          meta
        );
        this.log("Frame JSON data:", frame.toJSON());
        this.buttonCommandParser(frame);
      }
      else if(clusterId === 8)
      {
        this.log(
          "endpointId:",
          endpointId,
          ", clusterId:",
          clusterId,
          ", frame:",
          frame,
          ", meta:",
          meta
        );
        this.log("Frame JSON data:", frame.toJSON());
        this.buttonCommandParserCL8(frame);
      }
    };

    this._buttonPressedTriggerDevice = this.homey.flow
      .getDeviceTriggerCard("smart_remote_1_button_2")
      .registerRunListener(async (args, state) => {
        return null, args.action === state.action;
      });
  }

  buttonCommandParser(frame) {
    var action = frame[2] === 1 ? "oneClick" : "twoClicks";
    return this._buttonPressedTriggerDevice
      .trigger(this, {}, { action: `${action}` })
      .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
      .catch((err) => this.error("Error triggering 1 button Smart Remote", err));
  }

  buttonCommandParserCL8(frame) {
    var action = frame[2] === 0 ? "oneClick" : "twoClicks";
    return this._buttonPressedTriggerDevice
      .trigger(this, {}, { action: `${action}` })
      .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
      .catch((err) => this.error("Error triggering 1 button Smart Remote", err));
  }

  onDeleted() {
    this.log("1 button Smart Remote Controller has been removed");
  }
}


    // Méthodes de fallback pour firmware inconnu
    async onInit() {
        try {
        await super.onInit();
        this.log('Driver en mode fallback - compatibilité limitée');
        this.setWarning('Firmware non reconnu - fonctionnalités limitées');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('Paramètres mis à jour en mode fallback');
    }


    // Méthodes de fallback pour firmware inconnu
    async onInit() {
        try {
        await super.onInit();
        this.log('Driver en mode fallback - compatibilité limitée');
        this.setWarning('Firmware non reconnu - fonctionnalités limitées');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('Paramètres mis à jour en mode fallback');
    }


    // Méthodes de fallback pour firmware inconnu
    async onInit() {
        try {
        await super.onInit();
        this.log('Driver en mode fallback - compatibilité limitée');
        this.setWarning('Firmware non reconnu - fonctionnalités limitées');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('Paramètres mis à jour en mode fallback');
    }

module.exports = smart_remote_1_button_2;
































