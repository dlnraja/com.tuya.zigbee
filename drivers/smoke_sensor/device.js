'use strict';

const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

/**
 * P113: migrate bare ZigBeeDevice → TuyaZigbeeDevice for DeviceIO + IAS enroll
 * + L14 safeSetCapabilityValue (was undefined on bare ZigBeeDevice).
 */
class smoke_sensor extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    ZclBatteryMonitor.attach(this, zclNode);
    this.printNode();

    try {
      const ias = zclNode?.endpoints?.[1]?.clusters?.[CLUSTER.IAS_ZONE.NAME];
      if (ias) {
        ias.onZoneStatusChangeNotification = (payload) => {
          this.onIASZoneStatusChangeNotification(payload);
        };
      }
    } catch (err) {
      this.error('IAS Zone listener setup failed:', err);
    }

    if (this.io && typeof this.io.ensureIasEnrolled === 'function') {
      await this.io.ensureIasEnrolled({ force: true }).catch(() => false);
    }
  }

  onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    const set = (cap, val) => {
      if (typeof this.hasCapability === 'function' && !this.hasCapability(cap)) return;
      this.safeSetCapabilityValue(cap, val).catch((e) => this.error(e));
    };
    set('alarm_smoke', !!(zoneStatus && zoneStatus.alarm1));
    set('alarm_battery', !!(zoneStatus && zoneStatus.battery));
  }

  onDeleted() {
    super.onDeleted();
    this.log('Smoke Sensor removed');
  }
}

module.exports = smoke_sensor;
