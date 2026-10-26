'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');

const { CLUSTER } = require('zigbee-clusters');
const PassiveDpRx = require('../../lib/tuya/PassiveDpRx');
const LateCapability = require('../../lib/helpers/LateCapability');

// P3064: exact TS0601 couples hosted here, DP layouts from zigbee-herdsman-converters tuya.ts
// (Koen Kanters and contributors; facts only, own code):
//   TS0601_smoke_co (_TZE284_6ycgarab, _TZE284_aoah6bv8 = Moes JKD-513COM-Z, _TZE2841000000_6ycgarab):
//     DP1 enum 0 = smoke alarm, DP15 battery %, DP18 enum 0 = carbon monoxide alarm.
//   PA-44Z (_TZE284_qvzsq3s2): DP1 0 = smoke, DP15 battery %.
//   GSKS-ZB (_TZE200_qcasmfan): DP1 0 = smoke, DP4 tamper, DP15 battery %.
// Receive-only: nothing is written to 0xEF00. alarm_co / alarm_tamper are added only after a real report.
const TS0601_SMOKE = {
  _tze284_6ycgarab: 'smoke_co', _tze284_aoah6bv8: 'smoke_co', _tze2841000000_6ycgarab: 'smoke_co',
  _tze284_qvzsq3s2: 'pa44z', _tze200_qcasmfan: 'gsks',
};

function smokeProfileFor(mfr) {
  return TS0601_SMOKE[String(mfr || '').toLowerCase()] || null;
}

/** Map one datapoint to [capability, value] or null for an exact profile. */
function mapSmokeDp(profile, dp, raw) {
  if (!profile) { return null; }
  const n = Number(raw);
  if (!Number.isFinite(n)) { return null; }
  if (dp === 1) { return ['alarm_smoke', n === 0]; }
  if (dp === 15) { return n >= 0 && n <= 100 ? ['measure_battery', n] : null; }
  if (dp === 18 && profile === 'smoke_co') { return ['alarm_co', n === 0]; }
  if (dp === 4 && profile === 'gsks') { return ['alarm_tamper', n !== 0]; }
  return null;
}


class smoke_sensor extends TuyaZigbeeDevice {

	async onNodeInit({zclNode}) {
    ZclBatteryMonitor.attach(this, zclNode);
        
      this.printNode();

      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
			  this.onIASZoneStatusChangeNotification(payload);
		  };

    // P3064: TS0601 smoke / CO couples had no datapoint path in this IAS-based driver.
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName;
    this._ts0601Smoke = smokeProfileFor(mfr);
    if (this._ts0601Smoke) {
      PassiveDpRx.attach(this, (dp, raw) => this._onSmokeDp(dp, raw));
    }
  }

  _onSmokeDp(dp, raw) {
    const hit = mapSmokeDp(this._ts0601Smoke, dp, raw);
    if (!hit) { return; }
    const [cap, value] = hit;
    if (this.hasCapability(cap)) {
      this.safeSetCapabilityValue(cap, value).catch((e) => this.error(e));
    } else {
      LateCapability.ensureAndSet(this, cap, value).catch(() => {});
    }
  }

    onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
      this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
      this.safeSetCapabilityValue('alarm_smoke', zoneStatus.alarm1).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      this.safeSetCapabilityValue('alarm_battery', zoneStatus.battery).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
    }

    onDeleted(){
      super.onDeleted();
		  this.log("Smoke Sensor removed")
	  }

}

module.exports = smoke_sensor;
module.exports.smokeProfileFor = smokeProfileFor;
module.exports.mapSmokeDp = mapSmokeDp;

/**
 * 
 * 
  "ids": {
    "modelId": "TS0205",
    "manufacturerName": "_TYZB01_dsjszp0x"
  },
  "endpoints": {
    "endpointDescriptors": [
      {
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 1026,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [
          0,
          1,
          3,
          1280
        ],
        "outputClusters": [
          3,
          25
        ]
      }
    ],
    "endpoints": {
      "1": {
        "clusters": {
          "basic": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "zclVersion",
                "value": 3
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "appVersion",
                "value": 64
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "name": "manufacturerName",
                "value": "_TYZB01_dsjszp0x"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0205"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "name": "powerSource",
                "value": "battery"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ],
            "commandsGenerated": [],
            "commandsReceived": []
          },
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "name": "batteryVoltage",
                "value": 30
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "name": "batteryPercentageRemaining",
                "value": 200
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ],
            "commandsGenerated": [],
            "commandsReceived": []
          },
          "identify": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 0
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ],
            "commandsGenerated": [
              0
            ],
            "commandsReceived": []
          },
          "iasZone": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "zoneState",
                "value": "notEnrolled"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "zoneType",
                "value": "fireSensor"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "name": "zoneStatus",
                "value": {
                  "type": "Buffer",
                  "data": [
                    0,
                    0
                  ]
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16,
                "name": "iasCIEAddress",
                "value": "00:00:00:00:00:00:00:00"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 17,
                "name": "zoneId",
                "value": 255
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ],
            "commandsGenerated": [
              "zoneStatusChangeNotification",
              1
            ],
            "commandsReceived": [
              "zoneStatusChangeNotification"
            ]
          }
        },
        "bindings": {
          "identify": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 0
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ],
            "commandsGenerated": [
              0
            ],
            "commandsReceived": []
          },
          "ota": {
            "attributes": [],
            "commandsGenerated": [],
            "commandsReceived": []
          }
        }
      }
    }
  }
 */