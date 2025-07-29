/**
 * Driver Tuya Wall Switch - Tuya
 * Interrupteur mural Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaWallSwitch extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Wall Switch Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Wall Switch initialisé');

        // Capacités spécifiques Wall Switch
        await this.registerWallSwitchCapabilities();

        // Listeners spécifiques Wall Switch
        await this.registerWallSwitchListeners();
    }

    async registerWallSwitchCapabilities() {
        // Capacités Wall Switch selon Homey SDK
        try {
            await this.registerCapability('onoff', 'switch');
            if (this.hasCapability('dim')) {
                await this.registerCapability('dim', 'dimmer');
            }
            if (this.hasCapability('measure_power')) {
                await this.registerCapability('measure_power', 'meter');
            }
            this.log('Capacités Wall Switch Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Wall Switch Tuya:', error);
        }
    }

    async registerWallSwitchListeners() {
        // Listeners Wall Switch selon Homey SDK
        try {
            // Listeners spécifiques pour Wall Switch Tuya
            this.on('data', this.onWallSwitchData.bind(this));
            this.on('dp_refresh', this.onWallSwitchDpRefresh.bind(this));
            
            this.log('Listeners Wall Switch Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Wall Switch Tuya:', error);
        }
    }

    // Callbacks Wall Switch selon Homey SDK
    async onWallSwitchData(data) {
        try {
            this.log('Données Wall Switch Tuya reçues:', data);
            
            // Traitement des données Wall Switch
            if (data['1'] !== undefined) {
                await this.setCapabilityValue('onoff', data['1'] === true);
            }
            if (data['2'] !== undefined && this.hasCapability('dim')) {
                await this.setCapabilityValue('dim', data['2']);
            }
            if (data['3'] !== undefined && this.hasCapability('measure_power')) {
                await this.setCapabilityValue('measure_power', data['3']);
            }
        } catch (error) {
            this.error('Erreur données Wall Switch Tuya:', error);
        }
    }

    async onWallSwitchDpRefresh(dp) {
        try {
            this.log('DP refresh Wall Switch Tuya:', dp);
            // Traitement spécifique pour Wall Switch
        } catch (error) {
            this.error('Erreur DP refresh Wall Switch Tuya:', error);
        }
    }

    // Méthodes Wall Switch selon Homey SDK
    async onOffSet(onoff) {
        try {
            await this.setData({
                '1': onoff
            });
            this.log(`Wall Switch Tuya onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Wall Switch Tuya onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            if (this.hasCapability('dim')) {
                const level = Math.round(dim);
                await this.setData({
                    '2': level
                });
                this.log(`Wall Switch Tuya dim set: ${dim}%`);
            }
        } catch (error) {
            this.error('Erreur Wall Switch Tuya dim set:', error);
            throw error;
        }
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.log('Wall Switch Tuya device uninitialized');
    }
}

module.exports = TuyaWallSwitch;