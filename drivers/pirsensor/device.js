'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');

const Homey = require('homey');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug, CLUSTER } = require('zigbee-clusters');

class pirsensor extends TuyaZigbeeDevice {

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
		this.safeSetCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
		this.safeSetCapabilityValue('alarm_battery', zoneStatus.battery).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
	}

	onDeleted(){
	  super.onDeleted();
		this.log("pirsensor removed")
	}

}

module.exports = pirsensor;
return module.exports;
});
