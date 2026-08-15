'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const IASZoneManager = require('../../lib/managers/IASZoneManager');
const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');

Cluster.addCluster(TuyaSpecificCluster);

class TuyaWaterLeakSensor extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    // BOTH (Peter water silent): store zclNode for IASZoneManager
    this.zclNode = zclNode;
    this._receivedDpData = false;

    this.printNode();

    this.log('Setting up listeners for endpoint 1, tuya cluster...');
    zclNode.endpoints[1].clusters.tuya.on('response', this.onReport.bind(this));
    zclNode.endpoints[1].clusters.tuya.on('reporting', this.onReport.bind(this));
    this.log('Listeners has been set up.');

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
      .catch((err) => {
        this.error('Error when reading device attributes ', err);
      });

    // BOTH: IAS path for TS0207 / HOBEIAN — EF00-only left sensors silent
    try {
      this._iasManager = new IASZoneManager(this);
      this._iasEnrolled = await this._iasManager.enrollIASZone();
      this.log(`[WATER-TUYA] IAS enrollment: ${this._iasEnrolled ? 'OK' : 'not applicable (no IAS cluster)'}`);

      const iasZone = zclNode.endpoints[1].clusters.iasZone
        || zclNode.endpoints[1].clusters.ssIasZone;
      if (iasZone?.readAttributes) {
        const attrs = await iasZone.readAttributes(['zoneStatus', 'zoneState']).catch(() => null);
        if (attrs?.zoneStatus !== undefined) {
          const zs = typeof attrs.zoneStatus === 'number'
            ? attrs.zoneStatus
            : (attrs.zoneStatus?.alarm1 || attrs.zoneStatus?.alarm2 ? 1 : 0);
          this._receivedDpData = true;
          await this.safeSetCapabilityValue('alarm_water', Boolean(zs & 0x03)).catch(() => {});
          this.log(`[WATER-TUYA] Initial IAS zoneStatus=${zs} → alarm_water=${Boolean(zs & 0x03)}`);
        }
      }
    } catch (err) {
      this.log(`[WATER-TUYA] ⚠️ IAS setup error (non-critical): ${err.message}`);
    }

    this._noDataTimer = safeSetTimeout(this, () => {
      if (this._receivedDpData) {return;}
      const alarmValue = this.getCapabilityValue('alarm_water');
      if (alarmValue !== null && alarmValue !== undefined) {return;}
      const ep = this.zclNode?.endpoints?.[1];
      const clusterIds = ep ? Object.keys(ep.clusters || {}) : [];
      this.log('[WATER-TUYA] ⚠️ NO DATA after 5 min — verbose diagnostic');
      this.log(`[WATER-TUYA] mfr=${this.getSetting?.('zb_manufacturer_name') || 'unknown'} iasEnrolled=${this._iasEnrolled} clusters=${JSON.stringify(clusterIds)}`);
    }, 5 * 60 * 1000);

    // Battery poll — guard destroyed / missing homey
    const timerApi = (this.homey && typeof this.homey.setInterval === 'function') ? this.homey : globalThis;
    this.batteryInterval = timerApi.setInterval(async () => {
      if (this._destroyed) {return;}
      try {
        await zclNode.endpoints[1].clusters.tuya.read({ dp: 14 });
        await zclNode.endpoints[1].clusters.tuya.read({ dp: 15 });
      } catch (err) {
        this.error('Error when reading battery status', err);
      }
    }, 3600000);
  }

  onReport(data) {
    this.log('Received a response or report:', data);
    if (this._destroyed) {return;}
    this._receivedDpData = true;

    if (data.dp === 15) {
      this.safeSetCapabilityValue('measure_battery', data.data.readUInt32BE(0)).catch(() => {});
    } else if (data.dp === 14) {
      this.safeSetCapabilityValue('alarm_battery', data.data.readUInt8(0) !== 0).catch(() => {});
    }

    if (data.dp === 101) {
      this.log('Received a response or report for dp 101, updating capability...');
      if (this._destroyed) {return;}
      this.safeSetCapabilityValue('alarm_water', data.data.readUInt8(0) === 1).catch(() => {});
      this.log('Capability has been updated.');
    }
  }

  onDeleted() {
    this._destroyed = true;
    if (this._noDataTimer) {
      safeClearTimeout(this, this._noDataTimer);
      this._noDataTimer = null;
    }
    super.onDeleted();
    this.log('Water Leak Sensor removed');
  }

  onUninit() {
    if (this.batteryInterval) {
      try {
        if (this.homey && typeof this.homey.clearInterval === 'function') {
          this.homey.clearInterval(this.batteryInterval);
        } else {
          clearInterval(this.batteryInterval);
        }
      } catch (_e) { /* destroyed */ }
      this.batteryInterval = null;
    }
    if (this._noDataTimer) {
      safeClearTimeout(this, this._noDataTimer);
      this._noDataTimer = null;
    }
  }

}

module.exports = TuyaWaterLeakSensor;
