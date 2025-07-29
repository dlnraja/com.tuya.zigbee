/**
 * Driver Tuya Temperature Sensor - Tuya
 * Capteur de température Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaTemperatureSensor extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Temperature Sensor Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Temperature Sensor initialisé');

        // Capacités spécifiques Temperature Sensor
        await this.registerTemperatureSensorCapabilities();

        // Listeners spécifiques Temperature Sensor
        await this.registerTemperatureSensorListeners();
    }

    async registerTemperatureSensorCapabilities() {
        // Capacités Temperature Sensor selon Homey SDK
        try {
            await this.registerCapability('measure_temperature', 'sensor');
            if (this.hasCapability('measure_humidity')) {
                await this.registerCapability('measure_humidity', 'sensor');
            }
            this.log('Capacités Temperature Sensor Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Temperature Sensor Tuya:', error);
        }
    }

    async registerTemperatureSensorListeners() {
        // Listeners Temperature Sensor selon Homey SDK
        try {
            // Listeners spécifiques pour Temperature Sensor Tuya
            this.on('data', this.onTemperatureSensorData.bind(this));
            this.on('dp_refresh', this.onTemperatureSensorDpRefresh.bind(this));
            
            this.log('Listeners Temperature Sensor Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Temperature Sensor Tuya:', error);
        }
    }

    // Callbacks Temperature Sensor selon Homey SDK
    async onTemperatureSensorData(data) {
        try {
            this.log('Données Temperature Sensor Tuya reçues:', data);
            
            // Traitement des données Temperature Sensor
            if (data['1'] !== undefined) {
                await this.setCapabilityValue('measure_temperature', data['1']);
            }
            if (data['2'] !== undefined && this.hasCapability('measure_humidity')) {
                await this.setCapabilityValue('measure_humidity', data['2']);
            }
        } catch (error) {
            this.error('Erreur données Temperature Sensor Tuya:', error);
        }
    }

    async onTemperatureSensorDpRefresh(dp) {
        try {
            this.log('DP refresh Temperature Sensor Tuya:', dp);
            // Traitement spécifique pour Temperature Sensor
        } catch (error) {
            this.error('Erreur DP refresh Temperature Sensor Tuya:', error);
        }
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.log('Temperature Sensor Tuya device uninitialized');
    }
}

module.exports = TuyaTemperatureSensor;