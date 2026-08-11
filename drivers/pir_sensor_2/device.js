'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');

const Homey = require('homey');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug, CLUSTER } = require('zigbee-clusters');

class pir_sensor_2 extends TuyaZigbeeDevice {

	async onNodeInit({zclNode}) {
    await super.onNodeInit({ zclNode }).catch(() => {});
    ZclBatteryMonitor.attach(this, zclNode);

		this.printNode();

		// alarm_motion
		zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
			this.onIASZoneStatusChangeNotification(payload);
		}
	
	}

	onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
		this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
		this.safeSetCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this.error);
		this.safeSetCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
	}

	onDeleted(){
	  super.onDeleted();
		this.log("Smart PIR Motion Sensor removed")
	}

}

module.exports = pir_sensor_2;
