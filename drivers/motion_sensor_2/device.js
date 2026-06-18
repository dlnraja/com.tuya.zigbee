'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/clusters/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

class motion_sensor_2 extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.printNode();

    // ---- IAS Zone Enrollment (Fix #337: _TZE200_3towulqd stays "notEnrolled") ----
    try {
      const iasCluster = zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME];
      // Write CIE address to enroll the IAS zone
      await iasCluster.writeAttributes({
        iasCIEAddress: this.homey ? this.homey.zigbee.getHubAddress() : '00:00:00:00:00:00:00:00'
      }).catch(err => {
        this.log('IAS CIE write fallback (non-critical):', err.message);
      });
    } catch (err) {
      this.log('IAS Zone enrollment attempt (non-critical):', err.message);
    }

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.IAS_ZONE,
          attributeName: 'zoneStatus',
          minInterval: 5,
          maxInterval: 3600,
          minChange: 0,
        }, {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60,
          maxInterval: 21600,
          minChange: 1,
        }, {
          endpointId: 1,
          cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 10,
        }
      ]).catch(this.error);
    }

    // alarm_motion handler (IAS Zone)
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
      .onZoneStatusChangeNotification = payload => {
        this.onZoneStatusChangeNotification(payload);
      };

    // measure_illuminance handler
    zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));

    // Tuya specific cluster handler (optional — _TZE200_3towulqd is ZCL-only)
    if (zclNode.endpoints[1].clusters.tuya) {
      zclNode.endpoints[1].clusters.tuya.on('reporting', value => this.processResponse(value));
    }
  }

  // Handle motion status alarms
  async onZoneStatusChangeNotification({ zoneStatus }) {
    this.log('Motion status:', zoneStatus.alarm1);
    await this.safeSetCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this.error);
  }

  // Handle illuminance attribute reports
  async onIlluminanceMeasuredAttributeReport(measuredValue) {
    const luxValue = Math.round(Math.pow(10, (measuredValue - 1) / 10000));
    this.log('measure_luminance | Illuminance (lux):', luxValue);
    await this.safeSetCapabilityValue('measure_luminance', luxValue).catch(this.error);
  }

  // Process Tuya-specific data (if any)
  processResponse(data) {
    this.log('Tuya-specific cluster data:', data);
  }

  // Handle device removal with cleanup
  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('Motion Sensor removed');
    try {
      await super.onDeleted();
    } catch (err) {
      // Ignore — parent may not have onDeleted
    }
  }

}

module.exports = motion_sensor_2;


/* "ids": {
	"modelId": "TS0601",
	"manufacturerName": "_TZE200_3towulqd"
  },
  "endpoints": {
	"endpointDescriptors": [
	  {
		"endpointId": 1,
		"applicationProfileId": 260,
		"applicationDeviceId": 1026,
		"applicationDeviceVersion": 0,
		"_reserved1": 1,
		"inputClusters": [
		  0,
		  3,
		  1280,
		  57346,
		  61184,
		  60928,
		  57344,
		  1,
		  1024
		],
		"outputClusters": []
	  }
	],
	"endpoints": {
	  "1": {
		"clusters": {
		  "basic": {
			"attributes": [
			  {
				"acl": [
				  "readable"
				],
				"id": 0,
				"name": "zclVersion"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 1,
				"name": "appVersion"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 2,
				"name": "stackVersion"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 3,
				"name": "hwVersion"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 4,
				"name": "manufacturerName"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 5,
				"name": "modelId"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 7,
				"name": "powerSource"
			  },
			  {
				"acl": [
				  "readable",
				  "writable"
				],
				"id": 18,
				"name": "deviceEnabled"
			  },
			  {
				"acl": [
				"readable"
				],
				"id": 16384,
				"name": "swBuildId"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 65533,
				"name": "clusterRevision"
			  }
			],
			"commandsGenerated": "UNSUP_GENERAL_COMMAND",
			"commandsReceived": "UNSUP_GENERAL_COMMAND"
		  },
		  "identify": {
			"attributes": [
			  {
				"acl": [
				  "readable",
				  "writable"
				],
				"id": 0
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 65533,
				"name": "clusterRevision",
				"value": 1
			  }
			],
			"commandsGenerated": "UNSUP_GENERAL_COMMAND",
			"commandsReceived": "UNSUP_GENERAL_COMMAND"
		  },
		  "iasZone": {
			"attributes": [
			  {
				"acl": [
				  "readable"
				],
				"id": 0,
				"name": "zoneState",
				"value": "notEnrolled"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 1,
				"name": "zoneType",
				"value": "motionSensor"
			  },
			  {
				"acl": [
				  "readable"
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
				  "writable"
				],
				"id": 16,
				"name": "iasCIEAddress",
				"value": "00:12:4b:00:04:f8:9c:84"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 17,
				"name": "zoneId",
				"value": 0
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 65533,
				"name": "clusterRevision",
				"value": 1
			  }
			],
			"commandsGenerated": "UNSUP_GENERAL_COMMAND",
			"commandsReceived": "UNSUP_GENERAL_COMMAND"
		  },
		  "powerConfiguration": {
		  "attributes": [
			{
			  "acl": [
				"readable"
			  ],
			  "id": 0
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 32,
			  "name": "batteryVoltage",
			  "value": 33
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 33,
			  "name": "batteryPercentageRemaining",
			  "value": 200
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 65533,
			  "name": "clusterRevision",
			  "value": 1
			}
		  ],
		  "commandsGenerated": "UNSUP_GENERAL_COMMAND",
		  "commandsReceived": "UNSUP_GENERAL_COMMAND"
		},
		"illuminanceMeasurement": {
		  "attributes": [
			{
			  "acl": [
				"readable"
			  ],
			  "id": 0,
			  "name": "measuredValue",
			  "value": 1000
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 1,
			  "name": "minMeasuredValue",
			  "value": 0
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 2,
			  "name": "maxMeasuredValue",
			  "value": 4000
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 65533,
			  "name": "clusterRevision",
			  "value": 1
			}
		  ],
		  "commandsGenerated": "UNSUP_GENERAL_COMMAND",
		  "commandsReceived": "UNSUP_GENERAL_COMMAND"
		}
	  },
	  "bindings": {}
	}
  }
} */
