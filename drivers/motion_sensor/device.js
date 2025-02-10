'use strict';

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

const BATTERY_UPDATE_INTERVAL = 1000 * 60 * 30; // 30 minutes

class motion_sensor extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        this.printNode();
        
        // Check if this is a TS0202 device
        this.isTS0202 = this.productId === 'TS0202';
        
        // Only initialize timing logic for TS0202
        if (this.isTS0202) {
            this._humanStatusTimer = null;
            this._noOneCheckTimer = null;
            this._currentState = 'no_one_state';
        }
        
        // Set up battery monitoring
        this._powerConfiguration = zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME];
        
        // Set up IAS Zone
        const iasZone = zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME];
        
        // Set IAS CIE address for all devices
        await iasZone.writeAttributes({
            iasCIEAddress: this.homey.zigbee.controller.getCoordinatorIEEEAddress()
        }).catch(this.error);
        
        // Bind handler for zone status changes
        iasZone.onZoneStatusChangeNotification = this.onZoneStatusChanged.bind(this);
        
        // Set up battery updates
        this._syncBattery = Util.throttle(
            this._updateBattery.bind(this),
            BATTERY_UPDATE_INTERVAL
        );

        if (this.isFirstInit()) {
            this._updateBattery();
            
            // Trigger enrollment if needed
            await iasZone.enrollResponse({
                enrollResponseCode: 0,
                zoneId: 255
            }).catch(this.error);
        }
    }

    onZoneStatusChanged({zoneStatus, extendedStatus, zoneId, delay,}) {
        this.log('onZoneStatusChanged received:', zoneStatus, extendedStatus, zoneId, delay);
        
        const motionDetected = zoneStatus.alarm1;
        
        if (this.isTS0202) {
            // Use timing logic for TS0202
            this._handleMotionState(motionDetected);
        } else {
            // Direct state setting for other devices
            this.setCapabilityValue('alarm_motion', motionDetected).catch(this.error);
        }
        
        // Update battery on motion events
        this._syncBattery();
    }

    _handleMotionState(motionDetected) {
        // Only for TS0202 devices
        if (!this.isTS0202) return;

        // Clear any existing no-one check timer
        if (this._noOneCheckTimer) {
            clearTimeout(this._noOneCheckTimer);
            this._noOneCheckTimer = null;
        }

        if (motionDetected) {
            if (this._currentState === 'no_one_state') {
                // First detection - start the 30-second timer
                this._currentState = 'human_status';
                this.setCapabilityValue('alarm_motion', true).catch(this.error);
                this._startHumanStatusTimer();
            } else if (this._currentState === 'human_status') {
                // Motion still detected - restart the 30-second timer
                this._startHumanStatusTimer();
            }
        } else {
            // Start 10-second timer to check if nobody is present
            this._noOneCheckTimer = setTimeout(() => {
                this._currentState = 'no_one_state';
                this.setCapabilityValue('alarm_motion', false).catch(this.error);
                this.log('No motion for 10 seconds - returning to no one state');
            }, 10000); // 10 seconds
        }
    }

    _startHumanStatusTimer() {
        // Only for TS0202 devices
        if (!this.isTS0202) return;

        // Clear any existing timer
        if (this._humanStatusTimer) {
            clearTimeout(this._humanStatusTimer);
        }

        // Set new 30-second timer
        this._humanStatusTimer = setTimeout(() => {
            this._humanStatusTimer = null;
        }, 30000); // 30 seconds
    }

    async _updateBattery() {
        const attrs = await this._powerConfiguration.readAttributes(
            ["batteryPercentageRemaining"]
        ).catch(this.error);
        if (attrs) {
            const percent = attrs.batteryPercentageRemaining;
            this.log('Set measure_battery: ', percent / 2);
            this.setCapabilityValue('measure_battery', percent / 2).catch(this.error);
        }
    }

    onDeleted() {
        // Clear any existing timers
        if (this.isTS0202) {
            if (this._humanStatusTimer) clearTimeout(this._humanStatusTimer);
            if (this._noOneCheckTimer) clearTimeout(this._noOneCheckTimer);
        }
        this.log("Motion Sensor removed");
    }
}

module.exports = motion_sensor;


/* "ids": {
    "modelId": "RH3040",
    "manufacturerName": "TUYATEC-bd5faf9p"
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
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "zclVersion",
                "value": 1
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "appVersion",
                "value": 72
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "name": "stackVersion",
                "value": 0
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "name": "hwVersion",
                "value": 1
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "name": "manufacturerName",
                "value": "TUYATEC-bd5faf9p"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "RH3040"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "name": "dateCode",
                "value": "20180512"
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
            "commandsReceived": [
              "factoryReset"
            ]
          },
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0
              },
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
            "commandsReceived": [
              0,
              1
            ]
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
                "value": "motionSensor"
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 2,
                "name": "zoneStatus"
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
        "bindings": {}
      }
    }
  } */
