/**
 * Driver Tuya Contact Sensor - Tuya
 * Capteur de contact Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaContactSensor extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Contact Sensor Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Contact Sensor initialisé');

        // Capacités spécifiques Contact Sensor
        await this.registerContactSensorCapabilities();

        // Listeners spécifiques Contact Sensor
        await this.registerContactSensorListeners();
    }

    async registerContactSensorCapabilities() {
        // Capacités Contact Sensor selon Homey SDK
        try {
            await this.registerCapability('alarm_contact', 'alarm');
            if (this.hasCapability('measure_temperature')) {
                await this.registerCapability('measure_temperature', 'sensor');
            }
            if (this.hasCapability('measure_humidity')) {
                await this.registerCapability('measure_humidity', 'sensor');
            }
            this.log('Capacités Contact Sensor Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Contact Sensor Tuya:', error);
        }
    }

    async registerContactSensorListeners() {
        // Listeners Contact Sensor selon Homey SDK
        try {
            // Listeners spécifiques pour Contact Sensor Tuya
            this.on('data', this.onContactSensorData.bind(this));
            this.on('dp_refresh', this.onContactSensorDpRefresh.bind(this));
            
            this.log('Listeners Contact Sensor Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Contact Sensor Tuya:', error);
        }
    }

    // Callbacks Contact Sensor selon Homey SDK
    async onContactSensorData(data) {
        try {
            this.log('Données Contact Sensor Tuya reçues:', data);
            
            // Traitement des données Contact Sensor
            if (data['1'] !== undefined) {
                await this.setCapabilityValue('alarm_contact', data['1'] === true);
            }
            if (data['2'] !== undefined && this.hasCapability('measure_temperature')) {
                await this.setCapabilityValue('measure_temperature', data['2']);
            }
            if (data['3'] !== undefined && this.hasCapability('measure_humidity')) {
                await this.setCapabilityValue('measure_humidity', data['3']);
            }
        } catch (error) {
            this.error('Erreur données Contact Sensor Tuya:', error);
        }
    }

    async onContactSensorDpRefresh(dp) {
        try {
            this.log('DP refresh Contact Sensor Tuya:', dp);
            // Traitement spécifique pour Contact Sensor
        } catch (error) {
            this.error('Erreur DP refresh Contact Sensor Tuya:', error);
        }
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.log('Contact Sensor Tuya device uninitialized');
    }
}

module.exports = TuyaContactSensor;