'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');

const Homey = require('homey');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug, CLUSTER } = require('zigbee-clusters');

class temphumidsensor2 extends TuyaZigbeeDevice {

	async onNodeInit({zclNode}) {
    await super.onNodeInit({ zclNode }).catch(() => {});
    ZclBatteryMonitor.attach(this, zclNode);

/*     debug(true);
    this.enableDebug(); */

		this.printNode();

		// measure_temperature
		zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
		.on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));
  
		// measure_humidity
		zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
		.on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));
}

	onTemperatureMeasuredAttributeReport(measuredValue) {
		const temperatureOffset = this.getSetting('temperature_offset') || 0;
		const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
		this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
		this.safeSetCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
	}

	onRelativeHumidityMeasuredAttributeReport(measuredValue) {
		const humidityOffset = this.getSetting('humidity_offset') || 0;
		const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
		this.log('measure_humidity | relativeHumidity - measuredValue (humidity):', parsedValue, '+ humidity offset', humidityOffset);
		this.safeSetCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
	}

	onDeleted(){
	  super.onDeleted();
	this.log("temphumidsensor removed")
	}

}

module.exports = temphumidsensor2;
