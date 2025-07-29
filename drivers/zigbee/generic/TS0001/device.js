'use strict';

const Homey = require('homey-meshdriver');
const { ZigbeeDevice } = require('homey-meshdriver');

class TS0001 extends Homey.Device {
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
  async onInit({zclNode}) {
    this.printNode();
    // Capacité onoff (commutateur)
    this.registerCapability('onoff', 'genOnOff', {
      getOpts: { getOnStart: true, pollInterval: 60000 }
    });
    // Capacité mesure puissance instantanée
    this.registerCapability('measure_power', 'seMetering');
    // Capacité énergie cumulée
    this.registerCapability('meter_power', 'seMetering');
    // Capacité courant
    this.registerCapability('measure_current', 'haElectricalMeasurement');
    // Capacité tension
    this.registerCapability('measure_voltage', 'haElectricalMeasurement');
    // Capacité batterie
    this.registerCapability('measure_battery', 'genPowerCfg');
    // Capacité alarme batterie
    this.registerCapability('alarm_battery', 'genPowerCfg');
  }
}


    // Méthodes de fallback pour firmware inconnu
    async onInit() {
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
        await super.onInit();
        this.log('Driver en mode fallback - compatibilité limitée');
        this.setWarning('Firmware non reconnu - fonctionnalités limitées');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('Paramètres mis à jour en mode fallback');
    }

module.exports = TS0001;















