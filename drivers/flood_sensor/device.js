'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug, CLUSTER } = require('zigbee-clusters');

class floodsensor extends TuyaZigbeeDevice {
		
	async onNodeInit({zclNode}) {
    await super.onNodeInit({ zclNode }).catch(() => {});
    ZclBatteryMonitor.attach(this, zclNode);

		this.printNode();

		// alarm_contact
      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNotification(payload);
      }

  }
  
  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.safeSetCapabilityValue('alarm_water', zoneStatus.alarm1).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
    this.safeSetCapabilityValue('alarm_battery', zoneStatus.battery).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
  }

	onDeleted(){
	  super.onDeleted();
		this.log("Flood Sensor removed")
	}

}

module.exports = floodsensor;
