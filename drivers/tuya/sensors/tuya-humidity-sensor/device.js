/**
 * Driver Tuya Humidity Sensor - Tuya
 * Capteur d'humidité Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaHumiditySensor extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Humidity Sensor Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Humidity Sensor initialisé');

        // Capacités spécifiques Humidity Sensor
        await this.registerHumiditySensorCapabilities();

        // Listeners spécifiques Humidity Sensor
        await this.registerHumiditySensorListeners();
    }

    async registerHumiditySensorCapabilities() {
        // Capacités Humidity Sensor selon Homey SDK
        try {
            await this.registerCapability('measure_humidity', 'sensor');
            if (this.hasCapability('measure_temperature')) {
                await this.registerCapability('measure_temperature', 'sensor');
            }
            this.log('Capacités Humidity Sensor Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Humidity Sensor Tuya:', error);
        }
    }

    async registerHumiditySensorListeners() {
        // Listeners Humidity Sensor selon Homey SDK
        try {
            // Listeners spécifiques pour Humidity Sensor Tuya
            this.on('data', this.onHumiditySensorData.bind(this));
            this.on('dp_refresh', this.onHumiditySensorDpRefresh.bind(this));
            
            this.log('Listeners Humidity Sensor Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Humidity Sensor Tuya:', error);
        }
    }

    // Callbacks Humidity Sensor selon Homey SDK
    async onHumiditySensorData(data) {
        try {
            this.log('Données Humidity Sensor Tuya reçues:', data);
            
            // Traitement des données Humidity Sensor
            if (data['1'] !== undefined) {
                await this.setCapabilityValue('measure_humidity', data['1']);
            }
            if (data['2'] !== undefined && this.hasCapability('measure_temperature')) {
                await this.setCapabilityValue('measure_temperature', data['2']);
            }
        } catch (error) {
            this.error('Erreur données Humidity Sensor Tuya:', error);
        }
    }

    async onHumiditySensorDpRefresh(dp) {
        try {
            this.log('DP refresh Humidity Sensor Tuya:', dp);
            // Traitement spécifique pour Humidity Sensor
        } catch (error) {
            this.error('Erreur DP refresh Humidity Sensor Tuya:', error);
        }
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.log('Humidity Sensor Tuya device uninitialized');
    }
}

module.exports = TuyaHumiditySensor;