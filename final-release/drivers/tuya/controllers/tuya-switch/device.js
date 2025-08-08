/**
 * Driver Tuya Switch - Tuya
 * Compatible avec tous les switches Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaSwitch extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Switch Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Switch initialisé');

        // Capacités spécifiques Switch
        await this.registerSwitchCapabilities();

        // Listeners spécifiques Switch
        await this.registerSwitchListeners();
    }

    async registerSwitchCapabilities() {
        // Capacités Switch selon Homey SDK
        try {
            await this.registerCapability('onoff', 'switch');
            if (this.hasCapability('dim')) {
                await this.registerCapability('dim', 'dimmer');
            }
            if (this.hasCapability('measure_power')) {
                await this.registerCapability('measure_power', 'meter');
            }
            this.log('Capacités Switch Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Switch Tuya:', error);
        }
    }

    async registerSwitchListeners() {
        // Listeners Switch selon Homey SDK
        try {
            // Listeners spécifiques pour Switch Tuya
            this.on('data', this.onSwitchData.bind(this));
            this.on('dp_refresh', this.onSwitchDpRefresh.bind(this));
            
            this.log('Listeners Switch Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Switch Tuya:', error);
        }
    }

    // Callbacks Switch selon Homey SDK
    async onSwitchData(data) {
        try {
            this.log('Données Switch Tuya reçues:', data);
            
            // Traitement des données Switch
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
            this.error('Erreur données Switch Tuya:', error);
        }
    }

    async onSwitchDpRefresh(dp) {
        try {
            this.log('DP refresh Switch Tuya:', dp);
            // Traitement spécifique pour Switch
        } catch (error) {
            this.error('Erreur DP refresh Switch Tuya:', error);
        }
    }

    // Méthodes Switch selon Homey SDK
    async onOffSet(onoff) {
        try {
            await this.setData({
                '1': onoff
            });
            this.log(`Switch Tuya onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Switch Tuya onOff set:', error);
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
                this.log(`Switch Tuya dim set: ${dim}%`);
            }
        } catch (error) {
            this.error('Erreur Switch Tuya dim set:', error);
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
        this.log('Switch Tuya device uninitialized');
    }
}

module.exports = TuyaSwitch;