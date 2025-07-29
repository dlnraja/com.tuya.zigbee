/**
 * Driver Tuya Motion Sensor - Tuya
 * Capteur de mouvement Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaMotionSensor extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Motion Sensor Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Motion Sensor initialisé');

        // Capacités spécifiques Motion Sensor
        await this.registerMotionSensorCapabilities();

        // Listeners spécifiques Motion Sensor
        await this.registerMotionSensorListeners();
    }

    async registerMotionSensorCapabilities() {
        // Capacités Motion Sensor selon Homey SDK
        try {
            await this.registerCapability('alarm_motion', 'alarm');
            if (this.hasCapability('measure_temperature')) {
                await this.registerCapability('measure_temperature', 'sensor');
            }
            if (this.hasCapability('measure_humidity')) {
                await this.registerCapability('measure_humidity', 'sensor');
            }
            this.log('Capacités Motion Sensor Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Motion Sensor Tuya:', error);
        }
    }

    async registerMotionSensorListeners() {
        // Listeners Motion Sensor selon Homey SDK
        try {
            // Listeners spécifiques pour Motion Sensor Tuya
            this.on('data', this.onMotionSensorData.bind(this));
            this.on('dp_refresh', this.onMotionSensorDpRefresh.bind(this));
            
            this.log('Listeners Motion Sensor Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Motion Sensor Tuya:', error);
        }
    }

    // Callbacks Motion Sensor selon Homey SDK
    async onMotionSensorData(data) {
        try {
            this.log('Données Motion Sensor Tuya reçues:', data);
            
            // Traitement des données Motion Sensor
            if (data['1'] !== undefined) {
                await this.setCapabilityValue('alarm_motion', data['1'] === true);
            }
            if (data['2'] !== undefined && this.hasCapability('measure_temperature')) {
                await this.setCapabilityValue('measure_temperature', data['2']);
            }
            if (data['3'] !== undefined && this.hasCapability('measure_humidity')) {
                await this.setCapabilityValue('measure_humidity', data['3']);
            }
        } catch (error) {
            this.error('Erreur données Motion Sensor Tuya:', error);
        }
    }

    async onMotionSensorDpRefresh(dp) {
        try {
            this.log('DP refresh Motion Sensor Tuya:', dp);
            // Traitement spécifique pour Motion Sensor
        } catch (error) {
            this.error('Erreur DP refresh Motion Sensor Tuya:', error);
        }
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.log('Motion Sensor Tuya device uninitialized');
    }
}

module.exports = TuyaMotionSensor;