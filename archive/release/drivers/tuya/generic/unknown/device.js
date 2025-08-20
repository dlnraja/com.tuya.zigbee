#!/usr/bin/env node
'use strict';

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class UnknownDevice extends ZigbeeDevice {
    async onInit() {
        try {
            await super.onInit();
            
            // Enregistrer les capacités
            this.registerCapability('onoff', 'genOnOff');
            this.registerCapability('measure_power', 'genPowerCfg');
            this.registerCapability('measure_voltage', 'genPowerCfg');
            
            // Gestion d'erreur
            this.on('error', (error) => {
                this.log('Erreur device:', error);
            });
            
            this.log('Device initialisé avec succès');
            
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        try {
            await super.onUninit();
            this.log('Device déinitialisé');
        } catch (error) {
            this.log('Erreur déinitialisation:', error);
        }
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        try {
            this.log('Paramètres mis à jour:', changedKeys);
        } catch (error) {
            this.log('Erreur paramètres:', error);
        }
    }
}

module.exports = UnknownDevice;