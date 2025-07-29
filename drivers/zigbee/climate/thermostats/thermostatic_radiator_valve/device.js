'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class Thermostatic_radiator_valveDevice extends ZigbeeDevice {
    async onInit() {
        try {
            await super.onInit();
            
            // Enregistrer les capacités
            this.registerCapability('onoff', 'genOnOff');
            
            // Gestion d'erreur
            this.on('error', (error) => {
                this.log('Erreur device:', error);
            });
            
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        try {
            await super.onUninit();
        } catch (error) {
            this.log('Erreur déinitialisation:', error);
        }
    }
}

module.exports = Thermostatic_radiator_valveDevice;