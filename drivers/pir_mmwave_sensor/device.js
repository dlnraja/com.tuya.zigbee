'use strict';

const { Cluster } = require('zigbee-clusters');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
// const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice'); // Not needed - using ZigBeeDevice

Cluster.addCluster(TuyaSpecificCluster);

const dataTypes = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

const getDataValue = (dpValue) => {
    switch (dpValue.datatype) {
        case dataTypes.raw:
            return dpValue.data;
        case dataTypes.bool:
            return dpValue.data[0] === 1;
        case dataTypes.value:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
        case dataTypes.string:
            let dataString = '';
            for (let i = 0; i < dpValue.data.length; ++i) {
                dataString += String.fromCharCode(dpValue.data[i]);
            }
            return dataString;
        case dataTypes.enum:
            return dpValue.data[0];
        case dataTypes.bitmap:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    }
}

class pir_mmwave_sensor extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {

        this.printNode();

        if (this.isFirstInit()) {
            await this.configureAttributeReporting([
                {
                    endpointId: 1,
                    cluster: CLUSTER.IAS_ZONE,
                    attributeName: 'zoneStatus',
                    minInterval: 5,
                    maxInterval: 3600,
                    minChange: 0,
                }, {
                    endpointId: 1,
                    cluster: CLUSTER.POWER_CONFIGURATION,
                    attributeName: 'batteryPercentageRemaining',
                    minInterval: 60,
                    maxInterval: 21600,
                    minChange: 1,
                }, {
                    endpointId: 1,
                    cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
                    attributeName: 'measuredValue',
                    minInterval: 60,
                    maxInterval: 3600,
                    minChange: 10,
                }
            ]).catch(this.error);
        }

        // alarm_motion handler
        zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
            .on('attr.zoneStatus', this.onZoneStatusAttributeReport.bind(this));

        // measure_battery and alarm_battery handler
        zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
            .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

        // measure_luminance handler
        zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
            .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));

        // Tuya specific cluster handlers
        zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));
        zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));
        zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processResponse(value));

        // Read battery level directly since reporting is "NOT_FOUND" per interview data
        this.log('🔋 Reading battery level directly (interview shows value: 200)...');
        try {
            const batteryData = await zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);
            this.log('🔋 Battery read result:', batteryData);
            
            if (batteryData && batteryData.batteryPercentageRemaining !== undefined) {
                this.log('🔋 Found batteryPercentageRemaining:', batteryData.batteryPercentageRemaining);
                this.onBatteryPercentageRemainingAttributeReport(batteryData.batteryPercentageRemaining);
            }
            
            // Set up periodic battery reading since automatic reporting doesn't work
            this.batteryInterval = setInterval(async () => {
                try {
                    const battery = await zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
                    if (battery && battery.batteryPercentageRemaining !== undefined) {
                        this.onBatteryPercentageRemainingAttributeReport(battery.batteryPercentageRemaining);
                    }
                } catch (error) {
                    this.log('🔋 Periodic battery read failed:', error.message);
                }
            }, 30 * 60 * 1000); // Read every 30 minutes
            
        } catch (error) {
            this.log('🔋 Initial battery read failed:', error.message);
            // Fallback: set battery from interview data
            this.log('🔋 Using fallback battery value from interview data (200 -> 100%)');
            this.onBatteryPercentageRemainingAttributeReport(200);
        }
    }

    // Handle motion status attribute reports
    onZoneStatusAttributeReport(status) {
        this.log("Motion status: ", status.alarm1);
        this.setCapabilityValue('alarm_motion', status.alarm1).catch(this.error);
    }

    // Handle battery status attribute reports
    onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        const batteryLevel = batteryPercentageRemaining / 2; // Convert to percentage
        this.log('🔋 Battery handler called! Raw value:', batteryPercentageRemaining, 'Converted:', batteryLevel, '%');
        this.setCapabilityValue('measure_battery', batteryLevel).catch(this.error);
        this.setCapabilityValue('alarm_battery', batteryLevel < batteryThreshold).catch(this.error);
    }

    // Handle illuminance attribute reports
    onIlluminanceMeasuredAttributeReport(measuredValue) {
        const luxValue = Math.round(Math.pow(10, ((measuredValue - 1) / 10000))); // Convert measured value to lux
        this.log('measure_luminance | Illuminance (lux):', luxValue);
        this.setCapabilityValue('measure_luminance', luxValue).catch(this.error);
    }

    // Process Tuya-specific data points
    async processResponse(data) {
        const dp = data.dp;
        const measuredValue = getDataValue(data);
        this.log('Tuya data received - DP:', dp, 'Value:', measuredValue, 'Full data:', data);

        switch (dp) {
            case 1:
                // Motion detection - can be boolean or number (1/0)
                this.log('Motion detected via Tuya DP1:', measuredValue);
                if (typeof measuredValue === 'boolean') {
                    this.setCapabilityValue('alarm_motion', measuredValue).catch(this.error);
                } else if (typeof measuredValue === 'number') {
                    const motionDetected = measuredValue === 1;
                    this.log('Motion state:', motionDetected ? 'DETECTED' : 'CLEAR');
                    this.setCapabilityValue('alarm_motion', motionDetected).catch(this.error);
                }
                break;

            case 2:
                // Temperature - device shows 12 for ~22°C, needs 10°C offset
                if (typeof measuredValue === 'number') {
                    const temperature = measuredValue + 10.0;
                    this.log('Temperature:', temperature, '°C (raw:', measuredValue, ')');
                    this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
                }
                break;

            case 102:
                // Humidity (confirmed working - saw value 30)
                if (typeof measuredValue === 'number') {
                    this.log('Humidity:', measuredValue, '%RH');
                    this.setCapabilityValue('measure_humidity', measuredValue).catch(this.error);
                }
                break;

            case 106:
                // Illuminance (matches standard cluster, just log)
                if (typeof measuredValue === 'number') {
                    this.log('Illuminance via Tuya DP106:', measuredValue, 'lux');
                    // Standard cluster handles the capability
                }
                break;

            case 107:
                // Sensitivity setting (confirmed - saw value 1)
                this.log('Sensitivity setting:', measuredValue);
                break;

            case 108:
                // Device mode/setting (confirmed - saw value true)
                this.log('Device mode/setting:', measuredValue);
                break;

            case 110:
                // Device setting (confirmed - saw value 100)
                this.log('Device setting (DP110):', measuredValue);
                break;

            default:
                this.log(`Unknown Tuya DP: ${dp} = ${measuredValue}`);
                break;
        }
    }

    // Handle device removal
    onDeleted() {
        this.log('PIR MMWave Sensor removed');
        if (this.batteryInterval) {
            clearInterval(this.batteryInterval);
            this.batteryInterval = null;
        }
    }
}

module.exports = pir_mmwave_sensor;