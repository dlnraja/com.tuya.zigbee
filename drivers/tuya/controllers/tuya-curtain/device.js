/**
 * Driver Tuya Curtain - Tuya
 * Rideau Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaCurtain extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Curtain Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Curtain initialisé');

        // Capacités spécifiques Curtain
        await this.registerCurtainCapabilities();

        // Listeners spécifiques Curtain
        await this.registerCurtainListeners();
    }

    async registerCurtainCapabilities() {
        // Capacités Curtain selon Homey SDK
        try {
            await this.registerCapability('onoff', 'switch');
            if (this.hasCapability('dim')) {
                await this.registerCapability('dim', 'dimmer');
            }
            if (this.hasCapability('curtain_set')) {
                await this.registerCapability('curtain_set', 'curtain');
            }
            this.log('Capacités Curtain Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Curtain Tuya:', error);
        }
    }

    async registerCurtainListeners() {
        // Listeners Curtain selon Homey SDK
        try {
            // Listeners spécifiques pour Curtain Tuya
            this.on('data', this.onCurtainData.bind(this));
            this.on('dp_refresh', this.onCurtainDpRefresh.bind(this));
            
            this.log('Listeners Curtain Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Curtain Tuya:', error);
        }
    }

    // Callbacks Curtain selon Homey SDK
    async onCurtainData(data) {
        try {
            this.log('Données Curtain Tuya reçues:', data);
            
            // Traitement des données Curtain
            if (data['1'] !== undefined) {
                await this.setCapabilityValue('onoff', data['1'] === true);
            }
            if (data['2'] !== undefined && this.hasCapability('dim')) {
                await this.setCapabilityValue('dim', data['2']);
            }
            if (data['3'] !== undefined && this.hasCapability('curtain_set')) {
                await this.setCapabilityValue('curtain_set', data['3']);
            }
        } catch (error) {
            this.error('Erreur données Curtain Tuya:', error);
        }
    }

    async onCurtainDpRefresh(dp) {
        try {
            this.log('DP refresh Curtain Tuya:', dp);
            // Traitement spécifique pour Curtain
        } catch (error) {
            this.error('Erreur DP refresh Curtain Tuya:', error);
        }
    }

    // Méthodes Curtain selon Homey SDK
    async onOffSet(onoff) {
        try {
            await this.setData({
                '1': onoff
            });
            this.log(`Curtain Tuya onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Curtain Tuya onOff set:', error);
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
                this.log(`Curtain Tuya dim set: ${dim}%`);
            }
        } catch (error) {
            this.error('Erreur Curtain Tuya dim set:', error);
            throw error;
        }
    }

    async curtainSet(position) {
        try {
            if (this.hasCapability('curtain_set')) {
                await this.setData({
                    '3': position
                });
                this.log(`Curtain Tuya position set: ${position}%`);
            }
        } catch (error) {
            this.error('Erreur Curtain Tuya position set:', error);
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
        this.log('Curtain Tuya device uninitialized');
    }
}

module.exports = TuyaCurtain;