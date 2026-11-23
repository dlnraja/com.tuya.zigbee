'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');

const Homey = require('homey');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug } = require('zigbee-clusters');

class pirsensor extends TuyaZigbeeDevice {

	async onNodeInit({zclNode}) {
    await super.onNodeInit({ zclNode }).catch(() => {});
    ZclBatteryMonitor.attach(this, zclNode);

		this.printNode();

		// alarm_motion
		// P3397: parallel RX (IAS notification + attr 0x0002 report + occupancy 0x0406),
		// guarded when endpoint 1 has no iasZone (the old direct assignment threw and
		// left every capability dead). Works on existing pairings, no re-pair.
		require('../../lib/zigbee/ZoneStatusRx').attachMotionRx(this, zclNode, {
			onStatus: (motion, bits, source) => {
				if (source === 'ias-notify') {
					this.log('IASZoneStatusChangeNotification received:', bits && bits.value);
				}
			},
		});
	
	}

	onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
		this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
		const bits = require('../../lib/zigbee/ZoneStatusRx').zoneStatusBits(zoneStatus);
		if (!bits) {
			return;
		}
		this.safeSetCapabilityValue('alarm_motion', bits.alarm1 || bits.alarm2).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
		this.safeSetCapabilityValue('alarm_battery', bits.battery).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
	}

	onDeleted(){
	  super.onDeleted();
		this.log("pirsensor removed")
	}

}

module.exports = pirsensor;
return module.exports;
});
