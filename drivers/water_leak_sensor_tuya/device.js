'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const IASZoneManager = require('../../lib/managers/IASZoneManager');
const {
  safeSetTimeout,
  safeClearTimeout,
  safeSetInterval,
  safeClearInterval,
} = require('../../lib/utils/safe-timers');
const { tuyaDpToPercent } = require('../../lib/battery/BatteryMasterEngine');

Cluster.addCluster(TuyaSpecificCluster);

class TuyaWaterLeakSensor extends TuyaSpecificClusterDevice {

    async onNodeInit({ zclNode }) {

        // v5.5.900: store zclNode (IASZoneManager reads device.zclNode)
        this.zclNode = zclNode;
        this._receivedDpData = false;

        this.printNode();

        // Listen for water leaks
        this.log('Setting up listeners for endpoint 1, tuya cluster...');
        zclNode.endpoints[1].clusters.tuya.on('response', this.onReport.bind(this));
        zclNode.endpoints[1].clusters.tuya.on('reporting', this.onReport.bind(this));
        this.log('Listeners has been set up.');

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

        // v5.5.900: IAS Zone support (forum: HOBEIAN ZG-222Z / TS0207 pairs but no data).
        // Canonical sacred couple `_TZ3000_k4ej3ww2` + `TS0207` lives on `water_leak_sensor`
        // (IAS). This driver keeps IAS enrollment as a no-op-safe fallback for any
        // TS0601/EF00 water devices that also expose ssIasZone.
        // enrollIASZone() is a no-op (with a log) when the device has no IAS
        // cluster, so it is safe to run for both families.
        try {
            this._iasManager = new IASZoneManager(this);
            this._iasEnrolled = await this._iasManager.enrollIASZone();
            this.log(`[WATER-TUYA] IAS enrollment: ${this._iasEnrolled ? 'OK' : 'not applicable (no IAS cluster)'}`);

            // Force an initial zoneStatus read so sleepy IAS sensors get a state
            const iasZone = zclNode.endpoints[1].clusters.iasZone ||
                            zclNode.endpoints[1].clusters.ssIasZone;
            if (iasZone?.readAttributes) {
                const attrs = await iasZone.readAttributes(['zoneStatus', 'zoneState']).catch(() => null);
                if (attrs?.zoneStatus !== undefined) {
                    const zs = typeof attrs.zoneStatus === 'number'
                        ? attrs.zoneStatus
                        : (attrs.zoneStatus?.alarm1 || attrs.zoneStatus?.alarm2 ? 1 : 0);
                    this._receivedDpData = true; // any data path alive
                    await this.safeSetCapabilityValue('alarm_water', Boolean(zs & 0x03)).catch(() => {});
                    this.log(`[WATER-TUYA] Initial IAS zoneStatus=${zs} → alarm_water=${Boolean(zs & 0x03)}`);
                }
            }
        } catch (err) {
            this.log(`[WATER-TUYA] ⚠️ IAS setup error (non-critical): ${err.message}`);
        }

        // v5.5.900: Verbose fallback — if after 5 minutes neither a Tuya DP
        // report nor any IAS data arrived, log a detailed diagnostic so the
        // next user report reveals the actual data path (no guessing).
        this._noDataTimer = safeSetTimeout(this, () => {
            if (this._receivedDpData) {return;}
            const alarmValue = this.getCapabilityValue('alarm_water');
            if (alarmValue !== null && alarmValue !== undefined) {return;}
            const ep = this.zclNode?.endpoints?.[1];
            const clusterIds = ep ? Object.keys(ep.clusters || {}) : [];
            this.log('╔══════════════════════════════════════════════════════════════╗');
            this.log('║ [WATER-TUYA] ⚠️ NO DATA after 5 min — verbose diagnostic    ║');
            this.log('╚══════════════════════════════════════════════════════════════╝');
            this.log(`[WATER-TUYA] mfr=${this.getSetting?.('zb_manufacturer_name') || 'unknown'} iasEnrolled=${this._iasEnrolled} clusters=${JSON.stringify(clusterIds)}`);
            this.log('[WATER-TUYA] Please send this diagnostic: the device neither sent Tuya DP reports nor IAS zone updates.');
        }, 5 * 60 * 1000);

        // Periodically read battery status every hour (safe-timers: skip if destroyed)
        this.batteryInterval = safeSetInterval(this, async () => {
            try {
                await zclNode.endpoints[1].clusters.tuya.read({ dp: 14 });
                await zclNode.endpoints[1].clusters.tuya.read({ dp: 15 });
            } catch (err) {
                this.error('Error when reading battery status', err);
            }
        }, 3600000);

    }

    // Handle datapoint events
    onReport(data) {
        this.log('Received a response or report:', data);
        if (this._destroyed) {return;}
        this._receivedDpData = true;

        if (data.dp === 15) {
            // DP15 battery percent — normalize 0-50 / 0-100 / 0-200 (ZCL-style) scales
            const raw = Buffer.isBuffer(data.data)
              ? (data.data.length >= 4 ? data.data.readUInt32BE(0) : data.data.readUIntBE(0, data.data.length))
              : data.data;
            const mfr = this.getSetting?.('zb_manufacturer_name')
              || this.getData?.()?.manufacturerName
              || '';
            // Tuya DP15 uses ZCL-like 0–200; 200 means full, not a dead sentinel
            const pct = tuyaDpToPercent(15, raw, {
              manufacturer: mfr,
              treat200AsSentinel: false,
            });
            if (pct != null) {
              this.safeSetCapabilityValue('measure_battery', pct).catch(() => {});
            }
        } else if (data.dp === 14) {
            this.safeSetCapabilityValue('alarm_battery', data.data.readUInt8(0) !== 0).catch(() => {});
        }

        if (data.dp === 101) {
            if (this._destroyed) {return;}
            this.safeSetCapabilityValue('alarm_water', data.data.readUInt8(0) === 1).catch(() => {});
        }
    }
    
    onDeleted() {
      this._destroyed = true;
      if (this._noDataTimer) {
        safeClearTimeout(this, this._noDataTimer);
        this._noDataTimer = null;
      }
      if (this.batteryInterval) {
        safeClearInterval(this, this.batteryInterval);
        this.batteryInterval = null;
      }
      super.onDeleted();
      this.log('Water Leak Sensor removed');
    }

    onUninit() {
      if (this.batteryInterval) {
        safeClearInterval(this, this.batteryInterval);
        this.batteryInterval = null;
      }
      if (this._noDataTimer) {
        safeClearTimeout(this, this._noDataTimer);
        this._noDataTimer = null;
      }
    }

}

module.exports = TuyaWaterLeakSensor;

