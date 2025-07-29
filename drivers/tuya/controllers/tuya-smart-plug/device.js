/**
 * Driver Tuya Smart Plug - Tuya
 * Prise intelligente Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaSmartPlug extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Smart Plug Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Smart Plug initialisé');

        // Capacités spécifiques Smart Plug
        await this.registerSmartPlugCapabilities();

        // Listeners spécifiques Smart Plug
        await this.registerSmartPlugListeners();
    }

    async registerSmartPlugCapabilities() {
        // Capacités Smart Plug selon Homey SDK
        try {
            await this.registerCapability('onoff', 'switch');
            if (this.hasCapability('dim')) {
                await this.registerCapability('dim', 'dimmer');
            }
            if (this.hasCapability('measure_power')) {
                await this.registerCapability('measure_power', 'meter');
            }
            if (this.hasCapability('measure_current')) {
                await this.registerCapability('measure_current', 'meter');
            }
            if (this.hasCapability('measure_voltage')) {
                await this.registerCapability('measure_voltage', 'meter');
            }
            this.log('Capacités Smart Plug Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Smart Plug Tuya:', error);
        }
    }

    async registerSmartPlugListeners() {
        // Listeners Smart Plug selon Homey SDK
        try {
            // Listeners spécifiques pour Smart Plug Tuya
            this.on('data', this.onSmartPlugData.bind(this));
            this.on('dp_refresh', this.onSmartPlugDpRefresh.bind(this));
            
            this.log('Listeners Smart Plug Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Smart Plug Tuya:', error);
        }
    }

    // Callbacks Smart Plug selon Homey SDK
    async onSmartPlugData(data) {
        try {
            this.log('Données Smart Plug Tuya reçues:', data);
            
            // Traitement des données Smart Plug
            if (data['1'] !== undefined) {
                await this.setCapabilityValue('onoff', data['1'] === true);
            }
            if (data['2'] !== undefined && this.hasCapability('dim')) {
                await this.setCapabilityValue('dim', data['2']);
            }
            if (data['3'] !== undefined && this.hasCapability('measure_power')) {
                await this.setCapabilityValue('measure_power', data['3']);
            }
            if (data['4'] !== undefined && this.hasCapability('measure_current')) {
                await this.setCapabilityValue('measure_current', data['4']);
            }
            if (data['5'] !== undefined && this.hasCapability('measure_voltage')) {
                await this.setCapabilityValue('measure_voltage', data['5']);
            }
        } catch (error) {
            this.error('Erreur données Smart Plug Tuya:', error);
        }
    }

    async onSmartPlugDpRefresh(dp) {
        try {
            this.log('DP refresh Smart Plug Tuya:', dp);
            // Traitement spécifique pour Smart Plug
        } catch (error) {
            this.error('Erreur DP refresh Smart Plug Tuya:', error);
        }
    }

    // Méthodes Smart Plug selon Homey SDK
    async onOffSet(onoff) {
        try {
            await this.setData({
                '1': onoff
            });
            this.log(`Smart Plug Tuya onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Smart Plug Tuya onOff set:', error);
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
                this.log(`Smart Plug Tuya dim set: ${dim}%`);
            }
        } catch (error) {
            this.error('Erreur Smart Plug Tuya dim set:', error);
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
        this.log('Smart Plug Tuya device uninitialized');
    }
}

module.exports = TuyaSmartPlug;