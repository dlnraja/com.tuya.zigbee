'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class temphumidsensor3 extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

		this.printNode();

		if (this.isFirstInit()){
			await this.configureAttributeReporting([
				{
					endpointId: 1,
					cluster: CLUSTER.POWER_CONFIGURATION,
					attributeName: 'batteryPercentageRemaining',
                    minInterval: 60, // Minimum interval (1 minute)
                    maxInterval: 21600, // Maximum interval (6 hours)
                    minChange: 1, // Report changes greater than 1%
				}
			]);
		}

		// measure_temperature
		zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
		.on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));

		// measure_humidity
		zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
		.on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));

		// measure_battery // alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
		.on('attr.batteryPercentageRemaining', this.handleBatteryPercentageReport.bind(this));

	}

	onTemperatureMeasuredAttributeReport(measuredValue) {
		const temperatureOffset = this.getSetting('temperature_offset') || 0;
		const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
		this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
		this.safeSetCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(() => {});
	}

	onRelativeHumidityMeasuredAttributeReport(measuredValue) {
		const humidityOffset = this.getSetting('humidity_offset') || 0;
		const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
		this.log('measure_humidity | relativeHumidity - measuredValue (humidity):', parsedValue, '+ humidity offset', humidityOffset);
		this.safeSetCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(() => {});
	}

	handleBatteryPercentageReport(batteryPercentageRemaining) {
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;
		this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
		this.safeSetCapabilityValue('measure_battery', batteryPercentageRemaining/2).catch(() => {});
		this.safeSetCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false).catch(() => {})
	}

	onDeleted(){
	  super.onDeleted();
	this.log("temphumidsensor3 removed")
	}

}

module.exports = temphumidsensor3;
