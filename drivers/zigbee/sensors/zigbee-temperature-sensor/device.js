/**
 * Driver Zigbee Temperature Sensor - Zigbee
 * Capteur de température Zigbee
 * Architecture conforme Homey SDK 3
 */

const TuyaZigbeeDevice = require('../../zigbee-structure-template');

class ZigbeeTemperatureSensor extends TuyaZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Initialisation Temperature Sensor Zigbee
        await super.onNodeInit({ zclNode });

        this.log('Driver Zigbee Temperature Sensor initialisé');

        // Capacités spécifiques Temperature Sensor
        await this.registerTemperatureSensorCapabilities();

        // Listeners spécifiques Temperature Sensor
        await this.registerTemperatureSensorListeners();
    }

    async registerTemperatureSensorCapabilities() {
        // Capacités Temperature Sensor selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.msTemperatureMeasurement) {
                await this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
            }
            if (this.node.endpoints[1].clusters.msRelativeHumidity) {
                await this.registerCapability('measure_humidity', 'msRelativeHumidity');
            }
            this.log('Capacités Temperature Sensor Zigbee enregistrées');
        } catch (error) {
            this.error('Erreur capacités Temperature Sensor Zigbee:', error);
        }
    }

    async registerTemperatureSensorListeners() {
        // Listeners Temperature Sensor selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.msTemperatureMeasurement) {
                await this.registerReportListener(1, 'msTemperatureMeasurement', 'measuredValue', this.onTemperatureReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.msRelativeHumidity) {
                await this.registerReportListener(1, 'msRelativeHumidity', 'measuredValue', this.onHumidityReport.bind(this));
            }
            this.log('Listeners Temperature Sensor Zigbee configurés');
        } catch (error) {
            this.error('Erreur listeners Temperature Sensor Zigbee:', error);
        }
    }

    // Callbacks Temperature Sensor selon Homey SDK
    async onTemperatureReport(value) {
        try {
            const temperature = value / 100;
            await this.setCapabilityValue('measure_temperature', temperature);
            this.log(`Temperature: ${temperature}°C`);
        } catch (error) {
            this.error('Erreur Temperature:', error);
        }
    }

    async onHumidityReport(value) {
        try {
            const humidity = value / 100;
            await this.setCapabilityValue('measure_humidity', humidity);
            this.log(`Humidity: ${humidity}%`);
        } catch (error) {
            this.error('Erreur Humidity:', error);
        }
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.log('Temperature Sensor Zigbee device uninitialized');
    }
}

module.exports = ZigbeeTemperatureSensor;