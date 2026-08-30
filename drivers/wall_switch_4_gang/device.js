'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { CLUSTER } = require('zigbee-clusters');

class wall_switch_4_gang extends UnifiedSwitchBase {

    get mainsPowered() { return true; }

    get gangCount() { return 4; }

    async onNodeInit({zclNode}) {

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);
        this._gangNumber = subDeviceId === 'secondSwitch' ? 2
          : subDeviceId === 'thirdSwitch' ? 3
          : subDeviceId === 'fourthSwitch' ? 4
          : 1;
        this._isSubDevice = Boolean(subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: this._gangNumber,
        });

        try {
          const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);     
          this.log("Indicator Mode supported by device");
          await this.setSettings({
            indicator_mode: String(indicatorMode?.indicatorMode ?? indicatorMode)
          });
        } catch (error) {
        this.log("This device does not support Indicator Mode", error);
        }

        if (!this.isSubDevice()) {
          await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
          .catch(err => {
              this.error('Error when reading device attributes ', err);
          });

          // v10.6.2 FIX: listeners for the declared button.1..4 maintenance buttons.
          // This driver overrides onNodeInit() without calling super, so
          // UnifiedSwitchBase._registerButtonCapabilityListeners() never ran and
          // pressing a button in the app UI logged "Missing Capability Listener:
          // Button N" (diag Gmail 16/07/2026). Pressing button.N toggles endpoint N.
          for (let gang = 1; gang <= 4; gang++) {
            const cap = `button.${gang}`;
            if (!this.hasCapability(cap)) {continue;}
            this.registerCapabilityListener(cap, async () => {
              this.log(`[WALL-4G] ${cap} pressed (UI) — toggling endpoint ${gang}`);
              const onOffCluster = zclNode.endpoints[gang]?.clusters?.onOff;
              if (onOffCluster && typeof onOffCluster.toggle === 'function') {
                await onOffCluster.toggle();
              }
              return true;
            });
          }
        }

        // WHY(P2332): onNodeInit skips super — PhysicalButtonMixin never armed;
        // compose has physical_gangN_* but RX never fired (same class of bug as
        // wall_switch_4gang_1way forum #2099 / v10.6.1).
        if (typeof this.initPhysicalButtonDetection === 'function') {
          await this.initPhysicalButtonDetection(zclNode);
        }

    }

/*     onSettings(oldSettingsObj, newSettingsObj, changedKeysArr, callback) {
        if (newSettingsObj.deviceClass === 'light') {
            this.log("New setting is Light Device Class");
            this.setClass('light');
        } else {
            this.setClass('socket');
            this.log("New setting is Socket Device Class");
        }
    } */

    onDeleted(){
      super.onDeleted();
      const { subDeviceId } = (typeof this.getData === 'function' && this.getData()) || {};
      this.log('4 Gang Wall Switch, channel ', subDeviceId, ' removed');
	}

  async onSettings({oldSettings, newSettings, changedKeys}) {
    let parsedValue = 0;
    if (changedKeys.includes('indicator_mode')) {
      parsedValue = parseInt(newSettings.indicator_mode);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
    }
  }

}

module.exports = wall_switch_4_gang;


/* "ids": {
  "modelId": "TS0014",
  "manufacturerName": "_TZ3000_r0pmi2p3"
},
"endpoints": {
  "endpointDescriptors": [
    {
      "endpointId": 1,
      "applicationProfileId": 260,
      "applicationDeviceId": 256,
      "applicationDeviceVersion": 0,
      "_reserved1": 1,
      "inputClusters": [
        0,
        4,
        5,
        6
      ],
      "outputClusters": [
        25,
        10
      ]
    },
    {
      "endpointId": 2,
      "applicationProfileId": 260,
      "applicationDeviceId": 256,
      "applicationDeviceVersion": 0,
      "_reserved1": 1,
      "inputClusters": [
        4,
        5,
        6
      ],
      "outputClusters": []
    },
    {
      "endpointId": 3,
      "applicationProfileId": 260,
      "applicationDeviceId": 256,
      "applicationDeviceVersion": 0,
      "_reserved1": 1,
      "inputClusters": [
        4,
        5,
        6
      ],
      "outputClusters": []
    },
    {
      "endpointId": 4,
      "applicationProfileId": 260,
      "applicationDeviceId": 256,
      "applicationDeviceVersion": 0,
      "_reserved1": 1,
      "inputClusters": [
        4,
        5,
        6
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
              "value": 3
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 1,
              "name": "appVersion",
              "value": 66
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
              "value": "_TZ3000_r0pmi2p3"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 5,
              "name": "modelId",
              "value": "TS0014"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 6,
              "name": "dateCode",
              "value": ""
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
                "writable",
                "reportable"
              ],
              "id": 65502
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65534,
              "name": "attributeReportingStatus",
              "value": "PENDING"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65504
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65505
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65506
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65507
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "groups": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "nameSupport",
              "value": {
                "type": "Buffer",
                "data": [
                  0
                ]
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "scenes": {
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
              "id": 1
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 3
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 4
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "onOff": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "onOff",
              "value": false
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16385,
              "name": "onTime",
              "value": 0
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16386,
              "name": "offWaitTime",
              "value": 0
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 32769
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 32770
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        }
      },
      "bindings": {
        "ota": {
          "attributes": [],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "time": {
          "attributes": [],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        }
      }
    },
    "2": {
      "clusters": {
        "groups": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "nameSupport",
              "value": {
                "type": "Buffer",
                "data": [
                  0
                ]
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "scenes": {
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
              "id": 1
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 3
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 4
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "onOff": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "onOff",
              "value": false
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16385,
              "name": "onTime",
              "value": 0
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16386,
              "name": "offWaitTime",
              "value": 0
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 32769
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 32770
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        }
      },
      "bindings": {}
    },
    "3": {
      "clusters": {
        "groups": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "nameSupport",
              "value": {
                "type": "Buffer",
                "data": [
                  0
                ]
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "scenes": {
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
              "id": 1
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 3
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 4
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "onOff": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "onOff",
              "value": false
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16385,
              "name": "onTime",
              "value": 0
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16386,
              "name": "offWaitTime",
              "value": 0
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 32769
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 32770
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        }
      },
      "bindings": {}
    },
    "4": {
      "clusters": {
        "groups": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "nameSupport",
              "value": {
                "type": "Buffer",
                "data": [
                  0
                ]
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "scenes": {
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
              "id": 1
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 3
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 4
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            }
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "onOff": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "onOff",
              "value": false
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16385,
              "name": "onTime",
              "value": 0
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16386,
              "name": "offWaitTime",
              "value": 0
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 32769
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 32770
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