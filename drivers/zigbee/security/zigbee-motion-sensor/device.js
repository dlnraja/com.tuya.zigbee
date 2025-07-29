/**
 * Driver Zigbee Motion Sensor - Zigbee
 * Capteur de mouvement Zigbee
 * Architecture conforme Homey SDK 3
 */

const TuyaZigbeeDevice = require('../../zigbee-structure-template');

class ZigbeeMotionSensor extends TuyaZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Initialisation Motion Sensor Zigbee
        await super.onNodeInit({ zclNode });

        this.log('Driver Zigbee Motion Sensor initialisé');

        // Capacités spécifiques Motion Sensor
        await this.registerMotionSensorCapabilities();

        // Listeners spécifiques Motion Sensor
        await this.registerMotionSensorListeners();
    }

    async registerMotionSensorCapabilities() {
        // Capacités Motion Sensor selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.ssIasZone) {
                await this.registerCapability('alarm_motion', 'ssIasZone');
            }
            if (this.node.endpoints[1].clusters.msTemperatureMeasurement) {
                await this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
            }
            if (this.node.endpoints[1].clusters.msRelativeHumidity) {
                await this.registerCapability('measure_humidity', 'msRelativeHumidity');
            }
            this.log('Capacités Motion Sensor Zigbee enregistrées');
        } catch (error) {
            this.error('Erreur capacités Motion Sensor Zigbee:', error);
        }
    }

    async registerMotionSensorListeners() {
        // Listeners Motion Sensor selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.ssIasZone) {
                await this.registerReportListener(1, 'ssIasZone', 'zoneStatus', this.onMotionReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.msTemperatureMeasurement) {
                await this.registerReportListener(1, 'msTemperatureMeasurement', 'measuredValue', this.onTemperatureReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.msRelativeHumidity) {
                await this.registerReportListener(1, 'msRelativeHumidity', 'measuredValue', this.onHumidityReport.bind(this));
            }
            this.log('Listeners Motion Sensor Zigbee configurés');
        } catch (error) {
            this.error('Erreur listeners Motion Sensor Zigbee:', error);
        }
    }

    // Callbacks Motion Sensor selon Homey SDK
    async onMotionReport(value) {
        try {
            const motion = (value & 0x0001) !== 0;
            await this.setCapabilityValue('alarm_motion', motion);
            this.log(`Motion: ${motion}`);
        } catch (error) {
            this.error('Erreur Motion:', error);
        }
    }

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
        this.log('Motion Sensor Zigbee device uninitialized');
    }
}

module.exports = ZigbeeMotionSensor;