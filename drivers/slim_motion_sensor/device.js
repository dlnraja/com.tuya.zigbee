'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class SlimMotionSensor extends ZigBeeDevice {

	async onNodeInit({zclNode}) {

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
		this.log("Slim motion sensor removed")
	}

}

module.exports = SlimMotionSensor;
