'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class doorwindowsensor extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.printNode();

		// alarm_contact
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
      this.onIASZoneStatusChangeNotification(payload);
    }

  }
  
  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('Door/Windows Sensor IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.safeSetCapabilityValue('alarm_contact', zoneStatus.alarm1).catch(this.error);
    this.safeSetCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
  }

	onDeleted(){
	  super.onDeleted();
		this.log("Door/Window Sensor removed")
	}

}

module.exports = doorwindowsensor;