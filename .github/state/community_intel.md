# Latest Issues and PRs (Including Comments)

## [JohanBendz/com.tuya.zigbee] Issue #1229: Smart Airbox no data
**Author:** eeckelaertyannick | **State:** open | **Created:** 2025-05-31T22:46:34Z | **Updated:** 2026-05-24T05:51:09Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1229

### Body:
Smart air box no data

Hi @JohanBendz just instaled the alrbox for the forst time. This went well but it dos not give any data. Already restart the app ene restarted Homey but this dos not help.

Tuya version: v0.2.73
Homey version: 12.4.5![image]

Log:
f5cfa2b0-aca4-41da-8fde-526f5c3920b7

![Image](https://github.com/user-attachments/assets/fc1caa03-ebf3-42f8-9403-70bb81e9c667)


  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE200_8ygsuhe1"
  },
  "endpoints": {
    "endpointDescriptors": [
      {
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          4,
          5,
          61184
        ],
        "outputClusters": [
          25,
          10
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
                "value": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "appVersion",
                "value": 68,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "name": "stackVersion",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "name": "hwVersion",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "name": "manufacturerName",
                "value": "_TZE200_8ygsuhe1",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0601",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "name": "dateCode",
                "value": "",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "name": "powerSource",
                "value": "mains",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "name": "attributeReportingStatus",
                "value": "PENDING",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65504,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65505,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
      }
    }
  }

### Comments:
**Comment by eeckelaertyannick**:
Any News Johan? Thx. @JohanBendz 

---
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by eeckelaertyannick**:
Hi, thx! Will try it when I am home. Question, could it also work with this device? https://jaga.com/benl/opties/jaga-clock-thermostat-for-recessed-panel-mounting-jrt-100tw/

I use tuya cloud now. But it alsow has a cool funcion. Now I can not switch Cool en heating. End i would prefer to us it locale not with the cloud.

Could you advice?  

Thx!

---
**Comment by eeckelaertyannick**:
Hello, here's some feedback about the Smart Airbox. First of all, I'm incredibly happy that it's finally working! Thanks a lot :). Now for the observations. The first thing I got was a low battery notification. Homey and the app both recognize this device as a battery-powered device. I've already tried some things in the settings, but I can't fully adjust this. I can turn off notifications for emty battery. It's also missing values ​​from two sensors: the VOC and the HCHO. These don't have the correct name and I also dont receive data from them. It's also strange that when it receives calls, the data fluctuates; the photos show this. Screenshots show that the data kept changing. I also don't know if the Air Quality Alert works and how this happens. The app , Universal Tuya ZigBee + Wi-Fi, keeps showing a white screen when you go to settings.

Diagnos. Log: 870c3410-fa5e-449b-a973-c19c0cad14c7

![image](https://github.com/user-attachments/assets/72aab9dc-fc46-4caa-8979-6edeb618d257)

![image](https://github.com/user-attachments/assets/c2ed3eed-08a4-4b68-a8c8-9cf634ed6bbb)

![image](https://github.com/user-attachments/assets/5a4757ae-6c0c-4736-b4ed-5f7d91f083bc)

Interview: 


  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE200_8ygsuhe1"
  },
  "endpoints": {
    "endpointDescriptors": [
      {
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          4,
          5,
          61184
        ],
        "outputClusters": [
          25,
          10
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
                "value": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "appVersion",
                "value": 68,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "name": "stackVersion",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "name": "hwVersion",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "name": "manufacturerName",
                "value": "_TZE200_8ygsuhe1",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0601",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "name": "dateCode",
                "value": "",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "name": "powerSource",
                "value": "mains",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "name": "attributeReportingStatus",
                "value": "PENDING",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65504,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65505,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
      }
    }
  }

---
**Comment by dlnraja**:
Closing: all fingerprints supported in dlnraja fork (_TZE200_8ygsuhe1->air_quality_co2). Install test version.

---
**Comment by eeckelaertyannick**:
I've already installed the test version. v5.11.15

---
**Comment by eeckelaertyannick**:
Hi, 

Thx for the Quick update.
Now i get this. Dont understand the 2 inputs pm10 and pm2,5. The do not do annythg. But formaledehyde came as extra and voc.  VOC change sometime from 1 to 0, when i put Some eau de cologne next to it it gows to 26 Tinq the ppb good... Formaledehyde after testing with pure alchol it react en got 0,01 seems ok.

![image](https://github.com/user-attachments/assets/f746cc56-6a6b-42b1-ab4c-ce53d569537c)

---
**Comment by dlnraja**:
Fixed in dlnraja fork: PM2.5 (DP20) and formaldehyde (DP22) now properly mapped for _TZE200_8ygsuhe1 Smart Airbox. DP21 corrected to VOC (was incorrectly mapped to CO2). Update to the next test version and re-pair: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---
**Comment by eeckelaertyannick**:
![image](https://github.com/user-attachments/assets/e0ff86f1-c0bc-4680-823f-da55acdaf1a0)

Did de update en unpair en repair en the issue stay. Many thx in advance 

---
**Comment by eeckelaertyannick**:
Hi sins laste few. Updates I always see this (air Meter give an erro : ![image](https://github.com/user-attachments/assets/eb54a936-936f-47ed-9193-be0a7465aa55)

---
**Comment by eeckelaertyannick**:
@dlnraja the device data is not updating,  636c7676-76e9-4832-a361-3469cad4ad62

========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #963: Device Request - Aubess Tuya 1-gang ZigBee 3.0 Mini Smart Switch - _TZ3000_fdxihpp7 / TS0001
**Author:** erlandjack | **State:** open | **Created:** 2024-09-18T16:40:14Z | **Updated:** 2026-05-24T05:47:47Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/963

### Body:
### Prerequisites:

- Before requesting a device addition, please ensure there is not already a request for the device among the open issues.
- Make sure your Homey is upgraded to firmware v5 or higher.
- You need a physical example of the device.

### Device Information

- Device Name: `Mini Smart Switch ZigBee 3.0`
- Device Model: `_TZ3000_fdxihpp7 / TS0001`
- Device Description: `1-gang ZigBee Mini Smart Switch Module, 16A`
- Link to device image: 
![1-gang_1](https://github.com/user-attachments/assets/fe4f18ec-4c2d-40f8-a942-1b5294ead7d7)

### Device Interview

```json
{
  "ids": {
    "modelId": "TS0001",
    "manufacturerName": "_TZ3000_fdxihpp7"
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
          6,
          3,
          4,
          5,
          57345,
          2820,
          1794
        ],
        "outputClusters": []
      }
    ],
    "endpoints": {
      "1": {
        "clusters": {
          "basic": {
            "attributes": "UNSUP_GENERAL_COMMAND",
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "onOff": {
            "attributes": "UNSUP_GENERAL_COMMAND",
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "identify": {
            "attributes": "UNSUP_GENERAL_COMMAND",
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "groups": {
            "attributes": "UNSUP_GENERAL_COMMAND",
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "scenes": {
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "electricalMeasurement": {
            "attributes": "UNSUP_GENERAL_COMMAND",
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "metering": {
            "attributes": "UNSUP_GENERAL_COMMAND",
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {}
      }
    }
  }
}
```

### Additional Comments:

> **Note:** Was purchased here: https://www.aliexpress.com/item/1005006379052047.html

### How to interview a device

- Add the device as a generic Zigbee device in Homey
- Navigate to https://developer.athom.com/tools/zigbee.
- Interview the device, the button for this is to the right of the device in the list of Zigbee units.
- Click the copy button/icon to capture the device information.
- Paste the copied information above.

> **Note:** To be able to add more devices to the Tuya Zigbee app, we rely on community members like you to provide interviews of the devices you want to be added. Thank you for your contribution!


### Comments:
**Comment by eeckelaertyannick**:
same here @JohanBendz 

Mini Smart Switch ZigBee 3.0
ZigBee Smart Switch no model nr on it
Tuya Zigbee3.0 Slimme Lichtschakelaar Module 16a Mini Diy Breaker

https://nl.aliexpress.com/item/1005007796242157.html?spm=a2g0o.order_list.order_list_main.10.54a979d2YM5qvq&gatewayAdapt=glo2nld



  "ids": {
    "modelId": "TS0001",
    "manufacturerName": "_TZ3000_skueekg3"
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
          3,
          6280,
          4,
          5,
          6,
          10,
          57344,
          57345,
          4096
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
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "appVersion",
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 32,
                  "minInterval": 0,
                  "maxInterval": 300,
                  "minChange": 0,
                  "status": "SUCCESS"
                }
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
                "id": 0,
                "name": "identifyTime",
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
          "groups": {
            "attributes": [
              {
                "acl": [
                  "readable"
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
          "scenes": {
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
                "id": 1
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 3
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 4
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
                  "readable"
                ],
                "id": 16384
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
                  "writable"
                ],
                "id": 16387
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 32768
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
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 20480
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
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 7
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
          "touchlink": {
            "attributes": [],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {}
      }
    }
  }

---
**Comment by eeckelaertyannick**:
@JohanBendz any News about this device Johan? Thx!

---
**Comment by frostfang**:
Same, keen to see this one working.

---
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by eeckelaertyannick**:
Hi, did not work i delete it but when a add it its go's back as an inknow Zigbee device. 

5bc953c0-202d-495b-8685-24b6a17e45c4


  "ids": {
    "modelId": "TS0001",
    "manufacturerName": "_TZ3000_skueekg3"
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
          3,
          6280,
          4,
          5,
          6,
          10,
          57344,
          57345,
          4096
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
                  "readable",
                  "reportable"
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
            ]
          },
          "identify": {
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "groups": {
            "attributes": [
              {
                "acl": [
                  "readable"
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
          "scenes": {},
          "onOff": {
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 7
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
          "touchlink": {
            "attributes": [],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {}
      }
    }
  }

---
**Comment by dlnraja**:
_TZ3000_skueekg3 / TS0001 has been added to the switch_1gang driver in the dlnraja fork. Update to the next test version and re-pair as 1-Gang Smart Switch: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---
**Comment by eeckelaertyannick**:
Hi, device works now, but i give's a battery device en show power meagurment en this device has not. Alsow show 2 buttons. En in the settings French namens of device's ![image](https://github.com/user-attachments/assets/c8db9b07-2836-4491-802a-c0ceffae81e7)
![image](https://github.com/user-attachments/assets/8b650006-bde7-480d-b583-7e757d838d79)![image](https://github.com/user-attachments/assets/eea46c8f-cd3a-481e-9a75-143e2d2e38a3)
![image](https://github.com/user-attachments/assets/3a9c59dd-c04a-4688-951a-77c7e6b7e849)

---
**Comment by eeckelaertyannick**:
@dlnraja this device dos not work anymore. Could you please fix it? 

171cb953-0760-4f2b-b9b6-868e3d320dfe

========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #1337: BSEED 2 button wallswitch zigbee with nuetral _TZ3000_l9brjwau TS0002
**Author:** pjmpessers | **State:** open | **Created:** 2026-01-17T16:28:15Z | **Updated:** 2026-03-31T17:07:27Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1337

### Body:
It's a 2 channel wallswitch of BSEED with neutral on zigbee.


  "ids": {
    "modelId": "TS0003",
    "manufacturerName": "_TZ3000_qkixdnon"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:22:91:d6:dc:67",
    "networkAddress": 51967,
    "modelId": "TS0003",
    "manufacturerName": "_TZ3000_qkixdnon",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 51967,
        "_reserved": 26,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 256,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          3,
          4,
          5,
          6,
          57344,
          57345,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 51967,
        "_reserved": 16,
        "endpointId": 2,
        "applicationProfileId": 260,
        "applicationDeviceId": 256,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          6,
          57345
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 51967,
        "_reserved": 16,
        "endpointId": 3,
        "applicationProfileId": 260,
        "applicationDeviceId": 256,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          6,
          57345
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 51967,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "identify": {
            "attributes": []
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 16,
                  "minInterval": 60,
                  "maxInterval": 600,
                  "status": "SUCCESS"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 32769,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 32770,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 20480,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
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
                "value": 83
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
                "value": "_TZ3000_qkixdnon"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0003"
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
                "value": "mains"
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
                "id": 65506
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507
              }
            ]
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ]
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          }
        },
        "bindings": {}
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }


  "ids": {
    "modelId": "TS0002",
    "manufacturerName": "_TZ3000_l9brjwau"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:2f:e8:ea:ae:92",
    "networkAddress": 13543,
    "modelId": "TS0002",
    "manufacturerName": "_TZ3000_l9brjwau",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 13543,
        "_reserved": 26,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 256,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          3,
          4,
          5,
          6,
          57344,
          57345,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 13543,
        "_reserved": 16,
        "endpointId": 2,
        "applicationProfileId": 260,
        "applicationDeviceId": 256,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          6,
          57345
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 13543,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "identify": {
            "attributes": []
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 16,
                  "minInterval": 60,
                  "maxInterval": 600,
                  "status": "SUCCESS"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 32769,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 32770,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 20480,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
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
                "value": 83
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
                "value": "_TZ3000_l9brjwau"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0002"
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
                "value": "mains"
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
                "id": 65506
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507
              }
            ]
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ]
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          }
        },
        "bindings": {}
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }


![Image](https://github.com/user-attachments/assets/31e1203c-3914-40e6-873a-cf72135d083a)

### Comments:
**Comment by dlnraja**:
Hi! 👋

The BSEED 2-gang switch _TZ3000_l9brjwau TS0002 is supported in the **dlnraja fork** (com.dlnraja.tuya.zigbee).

Install **Universal Tuya Zigbee** by dlnraja and pair your switch - it will use the **switch_2gang** driver with ZCL-only mode for BSEED devices.

---
**Comment by dlnraja**:
## ✅ Already Supported - BSEED 2-gang

_TZ3000_l9brjwau / TS0002 is supported in **switch_2gang** driver.

### Features:
- ZCL-only mode
- Physical button detection
- Dual gang control

🔗 Install **Universal Tuya Zigbee** v5.5.991

---
**Comment by dlnraja**:
Hi,

The BSEED 2-button switch _TZ3000_l9brjwau / TS0002 is fully supported in the **Universal Tuya Zigbee** app (by dlnraja) on the Homey App Store.

It is in the **switch_2gang** driver with:
- ZCL-only mode support (BSEED devices use pure ZCL, not Tuya DP)
- Physical button detection with flow cards
- LED backlight control (off/normal/inverted)
- Per-endpoint binding for reliable multi-gang control

**To use:**
1. Install **Universal Tuya Zigbee** from the Homey App Store
2. Re-pair — select **2-Gang Smart Switch**

Best regards

---
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** (device Settings > Create diagnostic report) and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by dlnraja**:
<!-- tuya-triage-bot -->
Hi! This device is **already supported** in the [Universal Tuya Zigbee fork](https://github.com/dlnraja/com.tuya.zigbee) v5.11.13 (102 drivers, 29000+ fingerprints).

- `_TZ3000_l9brjwau` -> **wall_switch_2gang_1way** driver
- `_TZ3000_qkixdnon` -> **wall_switch_3gang_1way** driver

**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/

After installing, delete and re-pair your device. If issues persist, share a diagnostic report ID on the [test forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

---
**Comment by dlnraja**:
Closing: all fingerprints supported in dlnraja fork (_TZ3000_l9brjwau->wall_switch_2gang_1way, _TZ3000_qkixdnon->wall_switch_3gang_1way). Install test version.

---
**Comment by dlnraja**:
_TZ3000_l9brjwau / TS0002 is in the wall_switch_2gang_1way driver. Pair as Wall Switch 2-Gang on our fork: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---
**Comment by dlnraja**:
The _TZ3000_l9brjwau / TS0002 BSEED 2-gang switch is supported in the Universal Tuya Zigbee fork under wall_switch_2gang_1way.

Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Remove and re-pair after installing.

---
**Comment by dlnraja**:
The _TZ3000_l9brjwau / TS0002 (BSEED 2-button wall switch) is supported in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) v5.11. Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---
**Comment by pjmpessers**:
Thank you, @dlnraja, but it is still not working.

[BSEED zigbee 2 knoppen met neutraal.txt](https://github.com/user-attachments/files/26380686/BSEED.zigbee.2.knoppen.met.neutraal.txt)

---
**Comment by dlnraja**:
Johan is back . 
You can go back to his project. 

https://community.homey.app/t/app-pro-tuya-zigbee-app/26439

---
**Comment by pjmpessers**:
Thank you Dylan.

========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #1338: BSEED 3 button wall switch with neutral _TZ3000_qkixdnon	TS0003
**Author:** pjmpessers | **State:** open | **Created:** 2026-01-17T17:53:07Z | **Updated:** 2026-03-31T14:12:36Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1338

### Body:
It's a 3 channel wall switch of BSEED zigbee with neutral.
 

 "ids": {
    "modelId": "TS0003",
    "manufacturerName": "_TZ3000_qkixdnon"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:22:91:d6:dc:67",
    "networkAddress": 51967,
    "modelId": "TS0003",
    "manufacturerName": "_TZ3000_qkixdnon",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 51967,
        "_reserved": 26,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 256,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          3,
          4,
          5,
          6,
          57344,
          57345,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 51967,
        "_reserved": 16,
        "endpointId": 2,
        "applicationProfileId": 260,
        "applicationDeviceId": 256,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          6,
          57345
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 51967,
        "_reserved": 16,
        "endpointId": 3,
        "applicationProfileId": 260,
        "applicationDeviceId": 256,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          6,
          57345
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 51967,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "identify": {
            "attributes": []
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 16,
                  "minInterval": 60,
                  "maxInterval": 600,
                  "status": "SUCCESS"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 32769,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 32770,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 20480,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
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
                "value": 83
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
                "value": "_TZ3000_qkixdnon"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0003"
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
                "value": "mains"
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
                "id": 65506
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507
              }
            ]
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ]
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          }
        },
        "bindings": {}
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }

![Image](https://github.com/user-attachments/assets/0ed0e653-5b9d-4ea2-a588-a7c74166414c)

### Comments:
**Comment by dlnraja**:
Hi! 👋

The BSEED 3-gang switch _TZ3000_qkixdnon TS0003 is supported in the **dlnraja fork** (com.dlnraja.tuya.zigbee).

Install **Universal Tuya Zigbee** by dlnraja and pair your switch - it will use the **switch_3gang** driver with ZCL-only mode for BSEED devices.

---
**Comment by dlnraja**:
Hi,

The BSEED 3-button switch _TZ3000_qkixdnon / TS0003 is fully supported in the **Universal Tuya Zigbee** app (by dlnraja) on the Homey App Store.

It is in the **switch_3gang** driver with ZCL-only mode, physical button detection, LED backlight control, and per-endpoint binding.

**To use:**
1. Install **Universal Tuya Zigbee** from the Homey App Store
2. Re-pair — select **3-Gang Smart Switch**

Best regards

---
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** (device Settings > Create diagnostic report) and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by dlnraja**:
<!-- tuya-triage-bot -->
Hi! This device is **already supported** in the [Universal Tuya Zigbee fork](https://github.com/dlnraja/com.tuya.zigbee) v5.11.13 (102 drivers, 29000+ fingerprints).

- `_TZ3000_qkixdnon` -> **wall_switch_3gang_1way** driver

**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/

After installing, delete and re-pair your device. If issues persist, share a diagnostic report ID on the [test forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

---
**Comment by dlnraja**:
Closing: all fingerprints supported in dlnraja fork (_TZ3000_qkixdnon->wall_switch_3gang_1way). Install test version.

---
**Comment by dlnraja**:
_TZ3000_qkixdnon / TS0003 is supported — it's in the wall_switch_3gang_1way driver. Pair as Wall Switch 3-Gang on our fork: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---
**Comment by dlnraja**:
The _TZ3000_qkixdnon / TS0003 BSEED 3-gang switch is supported in the Universal Tuya Zigbee fork under wall_switch_3gang_1way.

Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Remove and re-pair after installing.

---
**Comment by dlnraja**:
The _TZ3000_qkixdnon / TS0003 (BSEED 3-button wall switch) is supported in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) v5.11. Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---
**Comment by pjmpessers**:
Thank you, @dlnraja, but it is still not working.

[BSEED zigbee 3 knoppen met nuetraal.txt](https://github.com/user-attachments/files/26380658/BSEED.zigbee.3.knoppen.met.nuetraal.txt)

========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #869: Device Request - [Fingerbot Plus] - [_TZ3210_j4pdtz9v] / [TS0001]
**Author:** AntondK88 | **State:** open | **Created:** 2024-05-22T17:29:57Z | **Updated:** 2026-03-17T19:58:39Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/869

### Body:
### Device Information

- Device Name: `Fingerbot Plus`
- Device Model: `TS0001`
- Device Description: `Smart button pusher`
- Link to device image: [https://ae01.alicdn.com/kf/S6312345151f74c86bea6bf4cea58e694W.jpg]

### Device Interview

```json
{
    [
  "ids": {
    "modelId": "TS0001",
    "manufacturerName": "_TZ3210_j4pdtz9v"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:75:70:cc:f1:cd",
    "networkAddress": 4554,
    "modelId": "TS0001",
    "manufacturerName": "_TZ3210_j4pdtz9v",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 4554,
        "_reserved": 18,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          61184,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      }
    ],
    "deviceType": "enddevice",
    "receiveWhenIdle": false,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": false,
      "powerSourceMains": false,
      "receiveWhenIdle": false,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 16,
                  "minInterval": 60,
                  "maxInterval": 600,
                  "status": "SUCCESS"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
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
                "value": 82
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
                "value": "_TZ3210_j4pdtz9v"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0001"
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
                "id": 65506
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507
              }
            ]
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ]
          }
        }
      }
    }
  }]
}
```

### Additional Comments:

AliExpress: 
https://nl.aliexpress.com/item/1005005715461824.html?dp=85bfd394d4c86b62be5ddf98c6ac75c2&af=1711154&cv=47843&afref=https%3A%2F%2Finfica.com&mall_affr=pr3&utm_source=admitad&utm_medium=cpa&utm_campaign=1711154&utm_content=47843&dp=85bfd394d4c86b62be5ddf98c6ac75c2&af=1711154&cv=47843&afref=https%3A%2F%2Finfica.com&mall_affr=pr3&utm_source=admitad&utm_medium=cpa&utm_campaign=1711154&utm_content=47843&aff_fcid=c3133567e78542e4b09e8f155714aada-1716398692656-03106-_ePNSNV&aff_fsk=_ePNSNV&aff_platform=portals-tool&sk=_ePNSNV&aff_trace_key=c3133567e78542e4b09e8f155714aada-1716398692656-03106-_ePNSNV&terminal_id=f627bc0a62f74842b20e7624b923b989&afSmartRedirect=y




### Comments:
**Comment by dalobalo**:
Is the device added to the list and working with Homey?

---
**Comment by JohanBendz**:
Support is added to next update. please report how it works @dalobalo @AntondK88 as I don't have it myself.

---
**Comment by JohanBendz**:
Ping @AntondK88 @dalobalo 

---
**Comment by dalobalo**:
Thanks for the update. Still waiting for the device. Should arrive within a week or two. I will let you know how it goes

---
**Comment by dalobalo**:
@JohanBendz So I am able to find and add both devices in homey, but no flows will work with ether of them. Also the battery status is unknown with a question mark. The device works if I press the button on the fingerbot itself. I have eliminated distance as an error source.

edit: 
Link to the unit 
https://a.aliexpress.com/_EzFgCml


---
**Comment by martinj**:
Got the same device and have the same issue (running version v0.2.73). It pairs but i can't trigger the finger and battery status is not showing. 

Anything I can provide or help with to fix this?

---
**Comment by officekeys-nl**:
I am testing it. But it is not working. I have VSC and will download the driver to see if I can alter the code

---
**Comment by officekeys-nl**:
**I needed to remove "finger_bot_mode"  from capabilities in driver.compose.json because of the validation error:** 
App did not validate against level `debug`:
× Error: drivers.fingerbot invalid capability: finger_bot_mode
    at App._validate (C:\Users\kees\AppData\Roaming\npm\node_modules\homey\lib\App.js:132:13)
    at async App.runDocker (C:\Users\kees\AppData\Roaming\npm\node_modules\homey\lib\App.js:254:19)
    at async exports.handler (C:\Users\kees\AppData\Roaming\npm\node_modules\homey\bin\cmds\app\run.js:43:5) 

**After removing the following log was produced:**
2024-11-03T08:22:43.416Z [log] [myZigBeeTest] myZigBeeTest has been initialized
2024-11-03T08:22:43.997Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] ZigBeeDevice has been initialized { firstInit: false, isSubDevice: false }
2024-11-03T08:22:43.998Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] ------------------------------------------
2024-11-03T08:22:43.998Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] Node: 5b812264-966f-4e23-a824-437b0d2aafab
2024-11-03T08:22:43.999Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] - Receive when idle: false
2024-11-03T08:22:43.999Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] - Endpoints: 1 
2024-11-03T08:22:43.999Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] -- Clusters:   
2024-11-03T08:22:43.999Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] --- basic      
2024-11-03T08:22:43.999Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] --- onOff      
2024-11-03T08:22:43.999Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] --- tuya       
2024-11-03T08:22:44.000Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] ------------------------------------------
  zigbee-clusters:cluster ep: 1, cl: basic (0) read attributes [ 4, 0, 1, 5, 7, 65534 ]  +0ms
  zigbee-clusters:cluster ep: 1, cl: basic (0) send frame ZCLStandardHeader {
  frameControl: [],
  data: basic.readAttributes { attributes: [ 4, 0, 1, 5, 7, 65534 ] },
  cmdId: 0,
  trxSequenceNumber: 1
} +1ms
  zigbee-clusters:cluster ep: 1, cl: basic (0) received frame readAttributesStructured.response basic.readAttributesStructured.response {
  attributes: <Buffer 04 00 00 42 10 5f 54 5a 33 32 31 30 5f 6a 34 70 64 74 7a 39 76 00 00 00 20 03 01 00 00 20 48 05 00 00 42 06 54 53 30 30 30 31 07 00 00 30 03 fe ff 00 ... 2 more bytes>
} +556ms
  zigbee-clusters:cluster ep: 1, cl: basic (0) read attributes result {
  attributes: <Buffer 04 00 00 42 10 5f 54 5a 33 32 31 30 5f 6a 34 70 64 74 7a 39 76 00 00 00 20 03 01 00 00 20 48 05 00 00 42 06 54 53 30 30 30 31 07 00 00 30 03 fe ff 00 ... 2 more bytes>
} +1ms
2024-11-03T08:22:44.559Z [err] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] Error: 'onNodeInit()' failed, reason: Error: Invalid Flow Card ID: finger_bot_mode
    at new FlowCard (/node_modules/@athombv/homey-apps-sdk-v3/lib/FlowCard.js:69:13)
    at new FlowCardAction (/node_modules/@athombv/homey-apps-sdk-v3/lib/FlowCardAction.js:20:5)
    at ManagerFlow.getActionCard (/node_modules/@athombv/homey-apps-sdk-v3/manager/flow.js:48:18)
    at FingerBotTuya.onNodeInit (/app/drivers/fingerbot/device.js:54:21)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async /app/node_modules/homey-zigbeedriver/lib/ZigBeeDevice.js:949:11
2024-11-03T08:22:44.559Z [err] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] Error: could not initialize node Error: Invalid Flow Card ID: finger_bot_mode
    at new FlowCard (/node_modules/@athombv/homey-apps-sdk-v3/lib/FlowCard.js:69:13)
    at new FlowCardAction (/node_modules/@athombv/homey-apps-sdk-v3/lib/FlowCardAction.js:20:5)
    at ManagerFlow.getActionCard (/node_modules/@athombv/homey-apps-sdk-v3/manager/flow.js:48:18)
    at FingerBotTuya.onNodeInit (/app/drivers/fingerbot/device.js:54:21)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async /app/node_modules/homey-zigbeedriver/lib/ZigBeeDevice.js:949:11


**After on/off command I get the following log:**
  zigbee-clusters:cluster ep: 1, cl: tuya (61184) send frame ZCLStandardHeader {
  frameControl: [ 'clusterSpecific' ],
  data: tuya.datapoint {
    status: 0,
    transid: 0,
    dp: 1,
    datatype: 1,
    length: 1,
    data: <Buffer 00>
  },
  cmdId: 0,
  trxSequenceNumber: 1
} +2m
  zigbee-clusters:cluster ep: 1, cl: tuya (61184) received frame defaultResponse tuya.defaultResponse { cmdId: 0, status: 'SUCCESS' } +630ms
2024-11-03T08:24:53.906Z [log] [ManagerDrivers] [Driver:fingerbot] [Device:d0d6470f-d455-47eb-b91a-de3b506522b9] Finger Bot on/off set to false


---
**Comment by JohanBendz**:
Ah, sorry about that. I released a driver to catch diagnostic reports for the unit, did not really expect it to work without adjustment.
A new version is on its way.

---
**Comment by slicke**:
The driver can basically be replaced by a touch button (it works as intended with the "unknown zigbee" default driver. Could it be an idea to just remove the driver and put a 1-gang switch driver for it?

---
**Comment by slicke**:
I used the "plug" to make a working driver: https://github.com/JohanBendz/com.tuya.zigbee/pull/1065

---
**Comment by officekeys-nl**:
Yes, that would be a good suggestion if that works. It worked before the device was added. I think I defined it as an unknown device

---
**Comment by slicke**:
> Yes, that would be a good suggestion if that works. It worked before the device was added. I think I defined it as an unknown device

It does 😊I'm running on my PR and it works fine 😊

---
**Comment by ml0renz0**:
I had only one FingerBot and it worked great but started failing when I added a second one: now I can't get none of them to work. I will turn the new one off and see if the first one works back again.

Given this behaviour I started thinking that maybe there was something wrong in the FingerBot's firmware that was fixed in a newer release.

I searched but didn't find documentation on how to do so from Home Assistant

---
**Comment by maesben**:
Same behaviour as described above: pairs, but then cannot be controlled (except the physical button). If necessary, I can provide logs. 
Disabling the Tuya Zigbee app and adding as a generic Zigbee device does allow to trigger the fingerbot. 

---
**Comment by officekeys-nl**:
I created a driver in my local app that works without problems. I am happy to share that driver so it can be added to the Tuya Zigbee app, but I do not know how :(

---
**Comment by pkroeze**:
Same behavior as described above: pairs, but then cannot be controlled (except the physical button) and the battery status is unknown. 

---
**Comment by dalobalo**:
Will there not be any further updates on this device? I have not seen any updates on the app since 12th October.. hope its not the case

---
**Comment by seimnseimn**:
This comment is by no means a "hurry up" or anything similar. Quite the opposite: Thank you Johan for all your effort, it is very much appreciated.

The PR from shaarkys is surely meant well, but does not add any value to the "unsupported" zigbee device option. I assume the most wanted feature for the Fingerbot integration is to have the "click only" option.

I'm adding this comment for others to 👍🏻 for you to see how much this is wanted :-)

Have a nice day

---
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by officekeys-nl**:
HI @dlnraja ,
Thanks for your response. I just tested your driver for this device, but it contains errors :(
When the device is installed with your driver, and I switch het on/on in homey, I get an error: Could not get device by id
I see that "id" is missing from driver.compose.json , but when I add it, the error is not solved. also, when I run the code locally from VSC on docker I get the following error:
[err] [ManagerDrivers] [Driver:fingerbot] Error Initializing Device: Error: Cannot find module '../../lib/tuya/TuyaZigbeeDevice'
Require stack:
- /app/drivers/fingerbot/device.js
- /node_modules/@athombv/homey-apps-sdk-v3/lib/Util.js
- /node_modules/@athombv/homey-apps-sdk-v3/lib/Device.js
- /node_modules/@athombv/homey-apps-sdk-v3/homey.js
- /node_modules/@athombv/homey-apps-sdk-v3/index.js
- /homey-app-runner/lib/App.js
- /homey-app-runner/index.js
    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
    at Function._load (node:internal/modules/cjs/loader:1192:37)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
    at Module.<anonymous> (node:internal/modules/cjs/loader:1463:12)
    at Module.homeyRequire [as require] (/node_modules/@athombv/homey-apps-sdk-v3/index.js:12:19)
    at require (node:internal/modules/helpers:147:16)
    at Object.<anonymous> (/app/drivers/fingerbot/device.js:3:26) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    '/app/drivers/fingerbot/device.js',
    '/node_modules/@athombv/homey-apps-sdk-v3/lib/Util.js',
    '/node_modules/@athombv/homey-apps-sdk-v3/lib/Device.js',
    '/node_modules/@athombv/homey-apps-sdk-v3/homey.js',
    '/node_modules/@athombv/homey-apps-sdk-v3/index.js',
    '/homey-app-runner/lib/App.js',
    '/homey-app-runner/index.js'
  ]
}

---
**Comment by dalobalo**:
Im getting error "Missing Capability Listener: button.push" and "Missing Capability Listener: onoff"
**Reported the issue here:** https://github.com/dlnraja/com.tuya.zigbee/issues

========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #1142: Device Request - Wenzhi Smart Human Presence Sensor & Relay  - _TZE204_clrdrnya / WZ-235-ZB-RL TS0601
**Author:** dmz-86 | **State:** open | **Created:** 2025-01-27T09:08:22Z | **Updated:** 2026-03-05T13:50:07Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1142

### Body:
### Device Information

- Device Name: `Wenzhi Smart Human Presence Sensor & Relay`
- Device Model: `WZ-235-ZB-RL`
- Device Description: `24G Human presence sensor with relay`
- Link to device image: [Device Image](https://www.zigbee2mqtt.io/images/devices/MTG235-ZB-RL.png)


### Device Interview

```json
  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_clrdrnya"
  },
  "endpoints": {
    "ieeeAddress": "4c:97:a1:ff:fe:55:44:db",
    "networkAddress": 28965,
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_clrdrnya",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 28965,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          4,
          5,
          61184
        ],
        "outputClusters": [
          25,
          10
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
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
                "value": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "appVersion",
                "value": 70,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "name": "stackVersion",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "name": "hwVersion",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "name": "manufacturerName",
                "value": "_TZE204_clrdrnya",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0601",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "name": "dateCode",
                "value": "",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "name": "powerSource",
                "value": "mains",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "name": "attributeReportingStatus",
                "value": "PENDING",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65504,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65505,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        }
      }
    }
  }

```

### Additional Comments:

Bought it here: https://nl.aliexpress.com/item/1005005633355282.html (item 6)


### Comments:
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by dmz-86**:
Hi @dlnraja 👋

Thanks for your response.
The device connects, but the reported capabilities are not correct.

The app currently shows:
Motion alarm
Temperature
Humidity
Luminance, twice
Battery status

This device does not support temperature or humidity. Both luminance values are incorrect as well. In addition, this is a 230V powered ceiling built-in mmWave sensor, not a battery device. The battery capability cannot be disabled, so Homey continuously reports battery status changes, low or OK, which is incorrect.

What should actually be exposed:
Motion alarm
Human presence
Distance
Luminance

It looks like the device is paired with the wrong fingerprint or driver profile.
Let me know if you need a diagnostic report ID and/or a Homey Developer Tools interview.

---
**Comment by dlnraja**:
Fixed in dlnraja fork v5.12.0: _TZE204_clrdrnya is now in the RELAY config which removes temp/humidity/battery (mains-powered) and adds relay on/off control. Exposes: motion, relay on/off, distance, luminance. Update and re-pair: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

---
**Comment by dmz-86**:
Nothing changed.

Device: mmWave Human Presence Radar
modelId: TS0601
manufacturerName: _TZE204_clrdrnya
powerSource: mains (not battery-powered)

Current wrong capabilities being mapped:
- measure_battery (should not exist, device is mains powered)
- measure_temperature (wrong DP mapping)  
- measure_humidity (wrong DP mapping)

Expected capabilities:
- alarm_motion (human presence detection)

The device is being matched to the wrong TS0601 definition.
A specific entry for _TZE204_clrdrnya is needed in the driver.

---
**Comment by dlnraja**:
Yes it's related of there is too much variant of _TZE204_clrdrnya

I must manage it more precisely .

I will check it

Could you please do an new interview on
https://tools.developer.homey.app/tools/zigbee

And send me the result

Best regards

Le jeu. 5 mars 2026, 12:09, dmz-86 ***@***.***> a écrit :

> *dmz-86* left a comment (JohanBendz/com.tuya.zigbee#1142)
> <https://github.com/JohanBendz/com.tuya.zigbee/issues/1142#issuecomment-4004277705>
>
> Nothing changed.
>
> Device: mmWave Human Presence Radar
> modelId: TS0601
> manufacturerName: _TZE204_clrdrnya
> powerSource: mains (not battery-powered)
>
> Current wrong capabilities being mapped:
>
>    - measure_battery (should not exist, device is mains powered)
>    - measure_temperature (wrong DP mapping)
>    - measure_humidity (wrong DP mapping)
>
> Expected capabilities:
>
>    - alarm_motion (human presence detection)
>
> The device is being matched to the wrong TS0601 definition.
> A specific entry for _TZE204_clrdrnya is needed in the driver.
>
> —
> Reply to this email directly, view it on GitHub
> <https://github.com/JohanBendz/com.tuya.zigbee/issues/1142#issuecomment-4004277705>,
> or unsubscribe
> <https://github.com/notifications/unsubscribe-auth/ACKLTUTNWO66JWU7GJJTXLT4PFN7LAVCNFSM6AAAAACVRLAFMCVHI2DSMVQWIX3LMV43OSLTON2WKQ3PNVWWK3TUHM2DAMBUGI3TONZQGU>
> .
> You are receiving this because you were mentioned.Message ID:
> ***@***.***>
>


========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #1327: Device Request - [MOES Scene Switch 4 gang] - [MOES] / [_TZ3000_zgyzgdua"]
**Author:** Jesse22homey | **State:** open | **Created:** 2025-12-18T10:53:49Z | **Updated:** 2026-03-02T03:27:01Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1327

### Body:
### Prerequisites:

- Before requesting a device addition, please ensure there is not already a request for the device among the open issues.
- Make sure your Homey is upgraded to firmware v5 or higher.
- You need a physical example of the device.

### Device Information

- Device Name: MOES Scene Switch 4 gang
- Device Model: ESW-0ZAA-EU
- Device Description: 4 gang Zigbee Scene Switch 
- Link to device image: https://nl.aliexpress.com/item/1005006861018499.html?pdp_npi=4%40dis%21EUR%2128.18%2111.89%21%21%21227.62%2196.04%21%402102e09d17655660452983172ed72d%2112000038542609558%21affd%21%21%21&dp=Cj0KCQiA6Y7KBhCkARIsAOxhqtOwtCHRY47Qnyhb9w7CNJuM3aOvo4fw93ilNiQg4B443uOGOUEc01QaAiENEALw_wcB%7C0AAAAA_5Az0y_NnBfxESZ65nF61nsRuqIS%7CCj8KCQiAxonKBhC1ARIuALR2MdZtYTEm-H3rcQrOEVCwD6lutE_rWLa5MiSp1e4XqpnBoBFfV_zuPGN2HhoC-cE%7Cv1&cn=nl_a_2&gad_source=1&aff_fcid=db6b37623a7542409bd3fbe2b297909d-1766048636433-08057-_onKPRpM&aff_fsk=_onKPRpM&aff_platform=api-new-product-query&sk=_onKPRpM&aff_trace_key=db6b37623a7542409bd3fbe2b297909d-1766048636433-08057-_onKPRpM&terminal_id=ba61e51c0b2b475fa58ba7eac62ba1fe&afSmartRedirect=y

### Device Interview

```json
{
    [
  "ids": {
    "modelId": "TS0044",
    "manufacturerName": "_TZ3000_zgyzgdua"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:6d:ba:8b:ef:a7",
    "networkAddress": 56174,
    "modelId": "TS0044",
    "manufacturerName": "_TZ3000_zgyzgdua",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 56174,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          1,
          6,
          57344,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 56174,
        "_reserved": 14,
        "endpointId": 2,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 56174,
        "_reserved": 14,
        "endpointId": 3,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 56174,
        "_reserved": 14,
        "endpointId": 4,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      }
    ],
    "deviceType": "enddevice",
    "receiveWhenIdle": false,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": false,
      "powerSourceMains": false,
      "receiveWhenIdle": false,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "name": "batteryVoltage",
                "value": 29,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "name": "batteryPercentageRemaining",
                "value": 176,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
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
                "value": false,
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 16,
                  "minInterval": 60,
                  "maxInterval": 600,
                  "status": "SUCCESS"
                }
              }
            ]
          },
          "basic": {}
        },
        "bindings": {
          "ota": {},
          "time": {}
        }
      },
      "2": {
        "clusters": {
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
              }
            ]
          },
          "powerConfiguration": {}
        },
        "bindings": {}
      },
      "3": {
        "clusters": {
          "onOff": {},
          "powerConfiguration": {}
        },
        "bindings": {}
      },
      "4": {
        "clusters": {
          "onOff": {},
          "powerConfiguration": {}
        },
        "bindings": {}
      }
    }
  }]
}
```

### Additional Comments:

> **Note:** MOES / Tuya zigbee 4 gang Scene Switch bought on Aliexpress. Model: ESW-0ZAA-EU/ESW-0ZAB-EU/ESW-0ZAC-EU/ESW-0ZAD-EU

### How to interview a device

- Add the device as a generic Zigbee device in Homey
- Navigate to https://developer.athom.com/tools/zigbee.
- Interview the device, the button for this is to the right of the device in the list of Zigbee units.
- Click the copy button/icon to capture the device information.
- Paste the copied information above.

> **Note:** To be able to add more devices to the Tuya Zigbee app, we rely on community members like you to provide interviews of the devices you want to be added. Thank you for your contribution!


### Comments:
**Comment by aznguy**:
Ah, great! I'm in need of this device to be added as well! :)

---
**Comment by NICKNAME94BE**:
Hi @JohanBendz,
​I am experiencing the same issue with the Moes 4-Gang Scene Switch (ZT-SY-EU). It is currently being recognized as a "Generic Zigbee Device" on my Homey Pro.
​To support the request of the OP, I have performed a fresh interview of my device. My manufacturerName (_TZ3000_zgyzgdua) and modelId (TS0044) match the original request.
​Here is my full interview data for verification:

{
  "ids": {
    "modelId": "TS0044",
    "manufacturerName": "_TZ3000_zgyzgdua"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:95:e1:b9:06:68",
    "networkAddress": 46880,
    "modelId": "TS0044",
    "manufacturerName": "_TZ3000_zgyzgdua",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 46880,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [1, 6, 57344, 0],
        "outputClusters": [25, 10]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 46880,
        "_reserved": 14,
        "endpointId": 2,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [6, 1, 6],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 46880,
        "_reserved": 14,
        "endpointId": 3,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [6, 1, 6],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 46880,
        "_reserved": 14,
        "endpointId": 4,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [6, 1, 6],
        "outputClusters": []
      }
    ],
    "deviceType": "enddevice",
    "receiveWhenIdle": false,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": false,
      "powerSourceMains": false,
      "receiveWhenIdle": false,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "powerConfiguration": {
            "attributes": [
              { "acl": ["readable", "reportable"], "id": 0 },
              { "acl": ["readable", "reportable"], "id": 32, "name": "batteryVoltage", "value": 30 },
              { "acl": ["readable", "reportable"], "id": 33, "name": "batteryPercentageRemaining", "value": 200 }
            ]
          },
          "onOff": {
            "attributes": [
              { "acl": ["readable", "reportable"], "id": 0, "name": "onOff", "value": false }
            ]
          },
          "basic": {
            "attributes": [
              { "id": 4, "name": "manufacturerName", "value": "_TZ3000_zgyzgdua" },
              { "id": 5, "name": "modelId", "value": "TS0044" }
            ]
          }
        }
      },
      "2": { "clusters": { "onOff": {}, "powerConfiguration": {} } },
      "3": { "clusters": { "onOff": {}, "powerConfiguration": {} } },
      "4": { "clusters": { "onOff": {}, "powerConfiguration": {} } }
    }
  }
}


I hope this helps in adding the support for this specific fingerprint soon. Thank you for your effort!

---
**Comment by Kokosnootmelk**:
Waiting for this specific model too! Its still added as a unknown Zigbee device. If you need another fresh interview, let me know!

---
**Comment by dlnraja**:
✅ **Already Supported**

The MOES Scene Switch 4 gang (_TZ3000_zgyzgdua) is already in utton_wireless_4 and scene_switch_4 drivers.

**To use:**
1. Update to latest version
2. Remove device if paired as unknown
3. Re-pair as **4-Button Wireless Controller** or **Scene Switch (4-button)**

---
**Comment by dlnraja**:
✅ **Already Supported in dlnraja fork**

The MOES Scene Switch 4 gang (\_TZ3000_zgyzgdua\) is in \utton_wireless_4\ and \scene_switch_4\ drivers.

**To use:**
1. Install Universal Tuya Zigbee app (dlnraja fork)
2. Re-pair as **4-Button Wireless Controller**

---
**Comment by Kokosnootmelk**:
> ✅ **Already Supported in dlnraja fork**
> 
> The MOES Scene Switch 4 gang (_TZ3000_zgyzgdua) is in \�utton_wireless_4\ and \scene_switch_4\ drivers.
> 
> **To use:**
> 
> 1. Install Universal Tuya Zigbee app (dlnraja fork)
> 2. Re-pair as **4-Button Wireless Controller**

Thanks for the reply! Tried it, but sadly sS
till doesnt work at the Universal app. It is supported, it will add the device. It shows the four buttons in-app. But pressing buttons on the actual device won't trigger anything. Pressing buttons in the virtual Homey device will trigger the flows tho.

---
**Comment by NICKNAME94BE**:
I have the same problem. Device is added as an unknown zigbee switch. Unfortunately, pushing buttons does not work. 

---
**Comment by dlnraja**:
Hi @Kokosnootmelk and @nickpatteeuw!

I'm investigating the MOES _TZ3000_zgyzgdua physical button issue. The dlnraja fork (v5.5.933) has cluster 0xE000 handling for this device.

**@nickpatteeuw** - You said it shows as 'unknown zigbee switch' - that's the problem! It needs to pair as **button_wireless_4**.

**Fix:**
1. Delete the device from Homey
2. Install **com.dlnraja.tuya.zigbee** (Universal Tuya Zigbee by dlnraja)
3. Put device in pairing mode
4. Select '4-Button Wireless Controller' when pairing

**@Kokosnootmelk** - If already paired as button_wireless_4, please send a Diagnostic Report after pressing buttons so I can check the logs for [BUTTON4-E000] entries.

The device uses cluster 57344 (0xE000) which requires special handling. Let me know if re-pairing with the correct driver helps!

---
**Comment by Kokosnootmelk**:
Thanks for the fast reply! I tried re-pairing (even before your comment, haha) but it now only gives a general error: 
64fb1ddc-f74c-42ea-9638-e55df33b2473

![Image](https://github.com/user-attachments/assets/5b6a3a26-5754-4c79-be5e-c9e0042faa25)
_"Something went wrong when adding the device, please try again"_

Tried for now:
-Rebooting Homey Pro, and adding device (error)
-Rebooting App, and adding device (error)
-Uninstall App, and adding device (unknown)
-Re-install app, and adding device (error)
-PTP for 15 mins
-Shut all other Tuya Zigbee apps off, except this one

Shouldn't tried repairing it, haha

---
**Comment by NICKNAME94BE**:
​I have successfully paired my Tuya device using the Universal Tuya Zigbee app. The device is correctly recognized and identified by the app. However, physical button presses do not trigger any flows in Homey.
​Am I missing a specific step during pairing, or is there something else I might be doing wrong?

---
**Comment by Kokosnootmelk**:

> ​I have successfully paired my Tuya device using the Universal Tuya Zigbee app. The device is correctly recognized and identified by the app. However, physical button presses do not trigger any flows in Homey.​Am I missing a specific step during pairing, or is there something else I might be doing wrong?

Maybe you can do this?
_If already paired as button_wireless_4, please send a Diagnostic Report after pressing buttons so [the dev] can check the logs for [BUTTON4-E000] entries._

---
**Comment by dlnraja**:
## ✅ Already Supported in dlnraja Fork v5.5.991

The **MOES Scene Switch 4 gang** (_TZ3000_zgyzgdua / TS0044) is already fully supported!

### Driver: utton_wireless_4
- **Cluster 0xE000** detection implemented
- **Physical button detection** for all 4 buttons
- Flow triggers: single, double, long press

### How to use:
1. Install **Universal Tuya Zigbee** app (dlnraja fork)
2. Pair device normally
3. Use flow triggers for button events

🔗 [App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/)

---
**Comment by NICKNAME94BE**:
@dlnraja 
I installed your app via a detour. When I click the link [above "App Store"](https://homey.app/a/com.dlnraja.tuya.zigbee/), I get an error message. I installed [this app](https://homey.app/fr-fr/app/com.dlnraja.tuya.zigbee/Universal-Tuya-Zigbee/test/?showInstallDialogAfterOnUser=true) I can add the device and create a flow on, for example, button 1, but nothing happens.


<img width="1102" height="340" alt="Image" src="https://github.com/user-attachments/assets/2422f7fb-6484-436a-9c00-4dcab6f96192" />

When I click the button via the app (so not physically), it works. When I click the button physically, nothing happens.

<img width="206" height="217" alt="Image" src="https://github.com/user-attachments/assets/b2ddb9d1-c62d-4bbe-ab45-769e8f70ff89" />

---
**Comment by Kokosnootmelk**:
FYI: 

Tried for now:
-Rebooting Homey Pro, and adding device (error)
-Rebooting App, and adding device (error)
-Uninstall App, and adding device (unknown)
-Re-install app, and adding device (error)
-PTP for 15 mins
-Shut all other Tuya Zigbee apps off, except this one

-Today I resetted and renewed the whole Zigbee network, but even that didn't work sadly. 

https://github.com/user-attachments/assets/9aa62efc-6cb2-4b4d-b2df-0992972efb8e

Diagnostic:
_37d36578-40a0-4ee7-9f6c-d4e2b3ae6e6e_

---
**Comment by dlnraja**:
Hi,

The MOES 4-gang scene switch _TZ3000_zgyzgdua is already supported in the **Universal Tuya Zigbee** app (by dlnraja) on the Homey App Store.

It is in both the **button_wireless_4** and **scene_switch_4** drivers with full support for multi-button press detection and flow card triggers.

**To use:**
1. Install **Universal Tuya Zigbee** from the Homey App Store
2. Re-pair — select **Wireless Button (4 gang)** or **Scene Switch (4 gang)**

Best regards

---
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** (device Settings > Create diagnostic report) and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by NICKNAME94BE**:
After this week's update, I finally managed to connect the switch with flows. Thanks for the explanations and updates! 

---
**Comment by dlnraja**:
<!-- tuya-triage-bot -->
Hi! This device is **already supported** in the [Universal Tuya Zigbee fork](https://github.com/dlnraja/com.tuya.zigbee) v5.11.13 (102 drivers, 29000+ fingerprints).

- `_TZ3000_zgyzgdua` -> **button_wireless_4** driver

**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/

After installing, delete and re-pair your device. If issues persist, share a diagnostic report ID on the [test forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

---
**Comment by dlnraja**:
Closing: all fingerprints supported in dlnraja fork (_TZ3000_zgyzgdua->button_wireless_4). Install test version.

---
**Comment by Kokosnootmelk**:
FYI, since the last update I get a 'timeout' error instead of the 'something went wrong' errors like the last times. 

5e4fae16-bae2-4858-8cf9-7537ecefea50

---
**Comment by Kokosnootmelk**:
Can't add a Dev Device Interview unfortunately, since it won't add the device to homey.

![Image](https://github.com/user-attachments/assets/c016edc4-3700-44b9-959b-ea2f5cd4fa9c)

---
**Comment by dlnraja**:
On the screen capture the length of the size of the manufacturer name is
truncatunated .



Le dim. 22 févr. 2026, 13:19, Kokosnootmelk ***@***.***> a
écrit :

> *Kokosnootmelk* left a comment (JohanBendz/com.tuya.zigbee#1327)
> <https://github.com/JohanBendz/com.tuya.zigbee/issues/1327#issuecomment-3940836597>
>
> Can't add a Dev Device Interview unfortunately, since it won't add the
> device to homey.
>
> Screenshot_20260222_131816_Chrome.jpg (view on web)
> <https://github.com/user-attachments/assets/c016edc4-3700-44b9-959b-ea2f5cd4fa9c>
>
> —
> Reply to this email directly, view it on GitHub
> <https://github.com/JohanBendz/com.tuya.zigbee/issues/1327#issuecomment-3940836597>,
> or unsubscribe
> <https://github.com/notifications/unsubscribe-auth/ACKLTUR2CXVLK2TV7VIHVXT4NGNE7AVCNFSM6AAAAACPNJTKCKVHI2DSMVQWIX3LMV43OSLTON2WKQ3PNVWWK3TUHMZTSNBQHAZTMNJZG4>
> .
> You are receiving this because you were mentioned.Message ID:
> ***@***.***>
>


---
**Comment by dlnraja**:
The _TZ3000_zgyzgdua / TS0044 (MOES Scene Switch 4 gang) is supported in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) v5.11 — scene_switch_4 driver. Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #1322: Device Request - [WenzhiIoT Smart Motion Sensor 24GHz mmWave] - [_TZE204_gkfbdvyx] / [TS0601]
**Author:** aanon4 | **State:** open | **Created:** 2025-12-06T00:07:46Z | **Updated:** 2026-03-02T03:25:46Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1322

### Body:
### Prerequisites:

- Before requesting a device addition, please ensure there is not already a request for the device among the open issues.
- Make sure your Homey is upgraded to firmware v5 or higher.
- You need a physical example of the device.

### Device Information

- Device Name: _TZE204_gkfbdvyx
- Device Model: TS0601
- Device Description: radar presence sensor
- Link to device image: https://m.media-amazon.com/images/I/11o9Fl2rOxL._AC_.jpg


### Device Interview

```json
{
  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_gkfbdvyx"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:1e:3c:89:63:c9",
    "networkAddress": 59231,
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_gkfbdvyx",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 59231,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          61184,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 59231,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
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
                "value": 74
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
                "value": "_TZE204_gkfbdvyx"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0601"
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
                "value": "mains"
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
                "id": 65506
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507
              }
            ]
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ]
          }
        }
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }
}
```

### Additional Comments:

> **Note:** Provide any other relevant information or requests related to the device. Link to where you bought the device can be of help

### How to interview a device

- Add the device as a generic Zigbee device in Homey
- Navigate to https://developer.athom.com/tools/zigbee.
- Interview the device, the button for this is to the right of the device in the list of Zigbee units.
- Click the copy button/icon to capture the device information.
- Paste the copied information above.

> **Note:** To be able to add more devices to the Tuya Zigbee app, we rely on community members like you to provide interviews of the devices you want to be added. Thank you for your contribution!


### Comments:
**Comment by dlnraja**:
For faster support, try the dlnraja fork which has 83 drivers and 2400+ manufacturer IDs: https://homey.app/fr-fr/app/com.dlnraja.tuya.zigbee/Universal-Tuya-Zigbee/test/

---
**Comment by aanon4**:
@dlnraja I did try it - it thinks this device is some sort of temperature sensor. It is not.

---
**Comment by dlnraja**:
✅ **Already Supported**

The WenzhiIoT Smart Motion Sensor 24GHz mmWave (_TZE204_gkfbdvyx / TS0601) is already in presence_sensor_radar driver.

**To use:**
1. Update to latest version
2. Remove device if paired as unknown
3. Re-pair as **Presence Sensor Radar**

---
**Comment by dlnraja**:
✅ **Already Supported in dlnraja fork**

The WenzhiIoT 24GHz mmWave (\_TZE204_gkfbdvyx\ / \TS0601\) is in \presence_sensor_radar\ driver.

**To use:**
1. Install Universal Tuya Zigbee app (dlnraja fork)
2. Re-pair as **Presence Sensor Radar**

---
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** (device Settings > Create diagnostic report) and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by dlnraja**:
<!-- tuya-triage-bot -->
Hi! This device is **already supported** in the [Universal Tuya Zigbee fork](https://github.com/dlnraja/com.tuya.zigbee) v5.11.13 (102 drivers, 29000+ fingerprints).

- `_TZE204_gkfbdvyx` -> **presence_sensor_radar** driver

**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/

After installing, delete and re-pair your device. If issues persist, share a diagnostic report ID on the [test forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

---
**Comment by dlnraja**:
Closing: all fingerprints supported in dlnraja fork (_TZE204_gkfbdvyx->presence_sensor_radar). Install test version.

---
**Comment by dlnraja**:
The _TZE204_gkfbdvyx / TS0601 (WenzhiIoT 24GHz mmWave sensor) is supported in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) v5.11 — presence_sensor_radar driver. Install: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #1345: Device Request - AVATTO Smart thermostat WT198 - _TZE284_xnbkhhdr / TS0601
**Author:** Nono-3ric | **State:** open | **Created:** 2026-01-27T15:07:16Z | **Updated:** 2026-03-02T03:22:55Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/1345

### Body:
### Prerequisites:

- Before requesting a device addition, please ensure there is not already a request for the device among the open issues.
- Make sure your Homey is upgraded to firmware v5 or higher.
- You need a physical example of the device.

### Device Information

- Device Name: `AVATTO Smart thermostat WT198 `
- Device Model: `TS0601`
- Device Description: `AVATTO Tuya WiFi/ZigBee Smart Thermostat Low Power Battery Temperature Controller `
- Link to device image: https://ae-pic-a1.aliexpress-media.com/kf/S2a886ab073c04f10a0e87e975f66b4fb9.jpg_960x960q75.jpg_.avif

### Device Interview

```json
{
 
  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE284_xnbkhhdr"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:0a:35:20:09:bb",
    "networkAddress": 362,
    "modelId": "TS0601",
    "manufacturerName": "_TZE284_xnbkhhdr",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 362,
        "_reserved": 22,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          61184,
          0,
          60672
        ],
        "outputClusters": [
          25,
          10
        ]
      }
    ],
    "deviceType": "enddevice",
    "receiveWhenIdle": false,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": false,
      "powerSourceMains": false,
      "receiveWhenIdle": false,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
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
                "value": 77
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
                "value": "_TZE284_xnbkhhdr"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0601"
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
                "id": 65506
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65487
              }
            ]
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ]
          }
        }
      }
    }
  }
}
```

### Additional Comments:

> **Note:** Provide any other relevant information or requests related to the device. Link to where you bought the device can be of help

### How to interview a device

- Add the device as a generic Zigbee device in Homey
- Navigate to https://developer.athom.com/tools/zigbee.
- Interview the device, the button for this is to the right of the device in the list of Zigbee units.
- Click the copy button/icon to capture the device information.
- Paste the copied information above.

> **Note:** To be able to add more devices to the Tuya Zigbee app, we rely on community members like you to provide interviews of the devices you want to be added. Thank you for your contribution!
[

<img width="224" height="232" alt="Image" src="https://github.com/user-attachments/assets/94696289-1b00-44c3-916c-757541884b9d" />

](url)

### Comments:
**Comment by dlnraja**:
Hi! 👋

**Good news!** The AVATTO thermostat _TZE284_xnbkhhdr TS0601 is already supported in the **dlnraja fork** (com.dlnraja.tuya.zigbee).

## To use it:
1. Install **Universal Tuya Zigbee** by dlnraja from the Homey App Store
2. Pair your thermostat - it should be detected by the **thermostat_tuya_dp** or **climate_sensor** driver

The dlnraja fork has extensive TS0601 thermostat support with automatic DP mapping detection.

If you encounter any issues after pairing, please send a diagnostic report and I'll help configure the correct DP mappings for your specific model.

---
**Comment by dlnraja**:
## ✅ TRV Support in dlnraja Fork v5.5.991

The **AVATTO WT198** (_TZE284_xnbkhhdr / TS0601) should work with the adiator_valve driver.

### Supported Features:
- Target temperature control
- Current temperature reading
- Thermostat modes (off/heat/auto)
- Valve position
- Battery alarm

### DP Mappings (TZE284 TRVs):
- DP2/DP4 = Target temperature (÷10)
- DP3/DP5 = Current temperature (÷10)
- DP35 = Battery alarm

### To verify:
1. Install **Universal Tuya Zigbee** app
2. Pair device
3. Share diagnostic report if issues

🔗 [Homey App Store](https://homey.app/a/com.dlnraja.tuya.zigbee/)

---
**Comment by Nono-3ric**:
Hi, thanks for the detailed explanation 👍

I installed the Universal Tuya Zigbee app by dlnraja and tried pairing the device.
Unfortunately, I couldn’t find the radiator_valve driver during pairing.

I tried pairing it as:
- Temperature & Humidity sensor
- LCD Temperature & Humidity sensor
- Valve Controller

In all cases, Homey detects it as an unknown Zigbee device.

I have created a Homey diagnostics report as requested.
Diagnostics report code: C3A8B46C

Let me know if you need me to re-pair the device in a specific way (reset method, distance, etc.).
Happy to test DP mappings or provide additional info.

---
**Comment by Nono-3ric**:
Hi @dlnraja,

I'm trying to add support for the Avatto WT198 (Manufacturer ID: _TZE284_xnbkhhdr).

What I've done:

Added the device to app.json with cluster 61184 (0xEF00).

Implemented registerCapabilityListener for target_temperature.

Tested multiple Data Points (DP 2, 16, 102, 103) and command types (0 and 1).

The issue: Although the device pairs with Homey Pro 2023, the interview remains incomplete ("Sleepy mode" in Dev Tools). Commands sent to cluster 61184 are logged as "sent" by Homey but the thermostat display never updates. Even on USB power, the device doesn't seem to report back manual changes to Homey.

Is there a specific Tuya "handshake" or a hidden Endpoint for this newer xnbkhhdr firmware?

Thanks for your help!

---
**Comment by dlnraja**:
The _TZE284_xnbkhhdr is indeed a bit tricky. Based on recent implementation logs (notably from Zigbee2MQTT), here are a few things that should solve your issues:
1. The "Sleepy Mode" & Interview Issue
The incomplete interview is common for this battery-powered model.
The Fix: You must keep the device "awake" during the entire pairing and interview process. To do this, keep tapping the screen or pressing a physical button every 1-2 seconds until the Homey Dev Tools show a complete status.
Power note: Even on USB power, these devices often keep their "End Device" (sleepy) behavior if they were paired while on batteries. Try re-pairing it while it's already connected to USB.
2. The "Handshake" (Magic Packet)
Tuya devices on cluster 0xEF00 often require a "Magic Packet" to start reporting and accepting data.
In your driver, try to send a Read Attributes command to the Basic Cluster (0x0000) for the Manufacturer Name or ZCL Version right after pairing. This often "unlocks" the MCU communication.
Also, ensure you are using Endpoint 1 for both in/out clusters.
3. Correct DP Mapping for WT198
Double-check your DP (Data Points) mapping. For this specific firmware version, the confirmed DPs are usually:
DP 1: Thermostat On/Off (Boolean)
DP 16: Target Temperature (Value, usually factor 10, e.g., 220 = 22.0°C)
DP 24: Current Temperature (Value, factor 10)
DP 2: Mode (0: Manual, 1: Auto, 2: Holiday)
4. Time Sync (Command 0x24)
Many newer Avatto thermostats ignore commands if they haven't received a time synchronization command first. If Homey doesn't send the commandMcuSyncTime (0x24) on the Tuya cluster, the device might log "sent" but never execute.
Suggested Next Step: Try to implement a simple this.readAttributes(0x0000, ['manufacturerName']) in your onMeshInit() to see if it wakes up the reporting."

---
**Comment by Nono-3ric**:
Hi dlnraja,

Following your previous advice on the Avatto WT198 (_TZE284_xnbkhhdr), I've made some progress but I'm hitting a wall with the Homey Pro 2023 (SDKv3).

What works:

I managed to get a successful Handshake by forcing a readAttributes on the basic cluster during a manual wake-up of the device. The device responds correctly with its manufacturer name.

The Problem:

The Interview is incomplete (stuck at 45% or 72%). Because of this, the Homey SDK "locks" the communication objects.

Every attempt to use this.zclNode.endpoints[1].clusters[0xEF00].command() or even low-level sendFrame() fails with expected_frame_buffer or is not a function. It seems the Homey Zigbee Stack refuses to route packets to a cluster that hasn't been officially "interviewed".

What we've tried:

Building raw ZCL frames manually (Header 0x11 + Payload).

Sending "Magic Packets" to the Basic cluster to keep it awake.

Forcing DP 16 and DP 2 via zclNode.

Question: Do you have a specific "Initialisation sequence" for Tuya MCU devices that bypasses a failed interview on Homey? Or is there a specific Data Point or Magic Packet (maybe Time Sync 0x24) that must be sent using a very specific frame format to get the device to "unlock" its reporting?

Any code snippet for Homey's ZigBeeDevice would be life-saving!

Thanks for your amazing work on this.

---
**Comment by dlnraja**:
async onMeshInit() {
  await super.onMeshInit(); // Initialise la base Zigbee

  // FORCE : Envoi du paquet de temps Tuya pour débloquer le MCU
  // Même si l'interview est incomplète, on tente d'écrire sur le cluster
  try {
    const endpoint = this.getClusterEndpoint(0xEF00) || 1;
    this.log('Sending Force-Time-Sync to unlock MCU...');

    // Le timestamp Tuya attend les secondes depuis Jan 1 2000 ou UTC
standard
    const epoch = Math.floor(Date.now() / 1000);
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(epoch, 0);

    await
this.zclNode.endpoints[endpoint].clusters[0xEF00].command('commandMcuSyncTime',
{
      payload: buffer,
    });
  } catch (err) {
    this.error('Could not send Time Sync, trying raw frame...', err);
    // Fallback frame brute si l'objet cluster n'est pas encore instancié
par Homey
    this.zclNode.endpoints[1].sendFrame(0xEF00, 0x11, 0x24,
Buffer.from([0x00, 0x01, 0x02, 0x03]));
  }
}



Can it help you ?

I will might  check this night after working .


The app can send data by frame :)
You can look at

Le mar. 3 févr. 2026, 14:09, Nono-3ric ***@***.***> a écrit :

> *Nono-3ric* left a comment (JohanBendz/com.tuya.zigbee#1345)
> <https://github.com/JohanBendz/com.tuya.zigbee/issues/1345#issuecomment-3841222337>
>
> Hi dlnraja,
>
> Following your previous advice on the Avatto WT198 (_TZE284_xnbkhhdr),
> I've made some progress but I'm hitting a wall with the Homey Pro 2023
> (SDKv3).
>
> What works:
>
> I managed to get a successful Handshake by forcing a readAttributes on the
> basic cluster during a manual wake-up of the device. The device responds
> correctly with its manufacturer name.
>
> The Problem:
>
> The Interview is incomplete (stuck at 45% or 72%). Because of this, the
> Homey SDK "locks" the communication objects.
>
> Every attempt to use this.zclNode.endpoints[1].clusters[0xEF00].command()
> or even low-level sendFrame() fails with expected_frame_buffer or is not a
> function. It seems the Homey Zigbee Stack refuses to route packets to a
> cluster that hasn't been officially "interviewed".
>
> What we've tried:
>
> Building raw ZCL frames manually (Header 0x11 + Payload).
>
> Sending "Magic Packets" to the Basic cluster to keep it awake.
>
> Forcing DP 16 and DP 2 via zclNode.
>
> Question: Do you have a specific "Initialisation sequence" for Tuya MCU
> devices that bypasses a failed interview on Homey? Or is there a specific
> Data Point or Magic Packet (maybe Time Sync 0x24) that must be sent using a
> very specific frame format to get the device to "unlock" its reporting?
>
> Any code snippet for Homey's ZigBeeDevice would be life-saving!
>
> Thanks for your amazing work on this.
>
> —
> Reply to this email directly, view it on GitHub
> <https://github.com/JohanBendz/com.tuya.zigbee/issues/1345#issuecomment-3841222337>,
> or unsubscribe
> <https://github.com/notifications/unsubscribe-auth/ACKLTUUEBI6XM6PJ72WTOYD4KCMY5AVCNFSM6AAAAACTBUAGZOVHI2DSMVQWIX3LMV43OSLTON2WKQ3PNVWWK3TUHMZTQNBRGIZDEMZTG4>
> .
> You are receiving this because you were mentioned.Message ID:
> ***@***.***>
>


---
**Comment by dlnraja**:
Hi,

The AVATTO WT198 thermostat _TZE284_xnbkhhdr / TS0601 is already supported in the **Universal Tuya Zigbee** app (by dlnraja) on the Homey App Store.

It is in the **thermostat_tuya_dp** driver with full Tuya DP protocol support for:
- Target temperature (DP2)
- Current temperature (DP3)
- System mode (DP1/DP4)
- Battery level

**To use:**
1. Install **Universal Tuya Zigbee** from the Homey App Store
2. Remove device if paired as unknown
3. Re-pair — select **Thermostat (Tuya DP)**

Best regards

---
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** (device Settings > Create diagnostic report) and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by dlnraja**:
<!-- tuya-triage-bot -->
Hi! This device is **already supported** in the [Universal Tuya Zigbee fork](https://github.com/dlnraja/com.tuya.zigbee) v5.11.13 (102 drivers, 29000+ fingerprints).

- `_TZE284_xnbkhhdr` -> **thermostat_tuya_dp** driver

**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/

After installing, delete and re-pair your device. If issues persist, share a diagnostic report ID on the [test forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

---
**Comment by dlnraja**:
Closing: all fingerprints supported in dlnraja fork (_TZE284_xnbkhhdr->thermostat_tuya_dp). Install test version.

---
**Comment by dlnraja**:
Hi, _TZE284_xnbkhhdr is already supported in our fork's thermostat_tuya_dp driver. The AVATTO WT198 should pair as a Tuya DP thermostat with target temperature, current temperature, and mode control. If you're using the original JohanBendz app, try our fork instead: https://homey.app/a/com.dlnraja.tuya.zigbee/test/ — remove the device first, install our app, then re-pair. Let me know if something doesn't work after that.

---
**Comment by dlnraja**:
Hey — this fingerprint (_TZE284_xnbkhhdr / TS0601) is already supported in the Universal Tuya Zigbee fork under the 	hermostat_tuya_dp driver.

You can install the test version here: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

After installing, remove the device and re-pair it so it picks up the correct driver. Let me know if it works.

---
**Comment by dlnraja**:
This thermostat (_TZE284_xnbkhhdr / TS0601) is already supported in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) v5.11 — mapped to the 	hermostat_tuya_dp driver.

Install the test version: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
After installing, remove and re-pair.

========================================================================

## [JohanBendz/com.tuya.zigbee] Issue #456: Device Request - 2 Channel Intelligent Energy Meter - _TZE204_81yrt3lo / TS0601
**Author:** martinl88 | **State:** open | **Created:** 2023-10-02T17:27:00Z | **Updated:** 2026-02-22T16:16:39Z
**URL:** https://github.com/JohanBendz/com.tuya.zigbee/issues/456

### Body:
Device Name: 2 Channel Intelligent Energy Meter
Device Model: _TZE204_81yrt3lo / TS0601
Device Description: Device for measuring energy consumption.
Link to device image: [Provide the URL to an image/photo of the device]

Device Interview:

  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_81yrt3lo"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:77:8d:7c:2e:a1",
    "networkAddress": 49527,
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_81yrt3lo",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 49527,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          61184,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 49527,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
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
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
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
                "value": 74
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
                "value": "_TZE204_81yrt3lo"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0601"
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
                "value": "mains"
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
                "id": 65506
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507
              }
            ]
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ]
          }
        }
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }


Additional Comments:
https://vi.aliexpress.com/item/1005005883760914.html


### Comments:
**Comment by dlnraja**:
Hi! 👋

This device is **already supported** in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) (Universal Tuya Zigbee fork) — **v5.11.14** with 138 drivers and 5,579+ fingerprints.

**Install the latest test version:**
https://homey.app/a/com.dlnraja.tuya.zigbee/test/

**Community forum for support:**
https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352

After installing, delete and re-pair your device. If it still doesn't work, please share a **diagnostic report ID** and a **Homey Developer Tools interview** (https://tools.developer.homey.app).

---
**Comment by martinl88**:
@dlnraja, thanks for the suggestion. When using your app, my device is detected as an energy sensor but with only one channel (should be 2). Also all the readings are showing zero.

========================================================================

## [dlnraja/com.tuya.zigbee] Issue #363: Bug: Issue in post #328 ist not fixed, please reopen the issue
**Author:** DaPicardos | **State:** open | **Created:** 2026-06-03T14:06:54Z | **Updated:** 2026-06-03T14:08:24Z
**URL:** https://github.com/dlnraja/com.tuya.zigbee/issues/363

### Body:
**Hi @dlnraja,**

Thanks for the quick update in version **v1.8.81**! 

However, I just tested it, and even with the changes from #360, the two underlying bugs from my original report **#328** are unfortunately still not resolved:

1. **Battery still at 1%:** The driver is still not mapping **DP104** correctly, or it's missing the translation. Please ensure the driver listens to DP104 for the battery and maps the binary raw value `1` to `100%`.
2. **Sensitivity (DP9):** Changing the sensitivity in the Homey settings still doesn't work because the `onSettings()` function is empty. Could you please make this functional for DP9 with options for **low, middle, and high**?

Could you please reopen this ticket (#328) so we can track and fix these remaining two data points here? 

Thank you so much for your amazing support!

### Comments:
None.

========================================================================

## [dlnraja/com.tuya.zigbee] Issue #362: Johan SDK3 Sync — 82 FPs added, 0 DP gaps
**Author:** github-actions[bot] | **State:** open | **Created:** 2026-06-03T06:43:12Z | **Updated:** 2026-06-03T06:43:13Z
**URL:** https://github.com/dlnraja/com.tuya.zigbee/pull/362

### Body:
## Automated Johan SDK3 Sync

### Fingerprints
- **Added**: 82 new FPs auto-matched to existing drivers
- **DP gaps**: 0 drivers with missing Tuya DP mappings
- **New Johan drivers**: 0 (not in our codebase)

### Auto-Scaffold
- **Scaffolded**: 0 new drivers created
- **FPs added**: 0 uncovered FPs added to existing drivers
- **Conflicts**: 74 cross-class PID conflicts

### Conflict Audit
- **High severity**: 74 cross-class PID conflicts
- **MFR conflicts**: 3513 real risk duplicates
- **Split suggestions**: 74

### Report
See `.github/state/johan-sdk3-sync.json`, `driver-scaffold-report.json`, `driver-conflict-audit.json`

### Review checklist
- [ ] Verify new FPs are in the correct drivers
- [ ] Review scaffolded drivers (need device.js DP mappings)
- [ ] Check DP gaps — may need manual device.js edits
- [ ] Review conflict audit — split drivers if needed
- [ ] Validate with `npx homey app validate`

### Comments:
None.

========================================================================

## [dlnraja/com.tuya.zigbee] Issue #359: [Auto] 86 new fingerprints from community (2026-06)
**Author:** github-actions[bot] | **State:** open | **Created:** 2026-06-01T15:37:38Z | **Updated:** 2026-06-01T15:37:38Z
**URL:** https://github.com/dlnraja/com.tuya.zigbee/issues/359

### Body:
## 🌐 Monthly Community Sync Found 86 New Fingerprints

| Manufacturer ID | Product ID | Device Type | Source | Vendor | Capabilities |
|---|---|---|---|---|---|
| `_TYZB01_qezuin6k` | TS110F,TS110E,TS0052 | dimmer_1_gang | Johan | - | onoff, dim |
| `_TYZB01_v8gtiaed` | TS110F,TS110E,TS1101 | dimmer_2_gang | Johan | - | onoff, dim |
| `TUYATEC-g3gl6cgy` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-Bfq2i2Sy` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-abkehqus` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-sb6t7ett` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-rkqiqvcs` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-crr8qb0p` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-kbqf60nt` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-r9hgssol` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-trhrga6p` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-ip9ganvw` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `_TYZB01_xph99wvr` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-7qunn4gq` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `TUYATEC-0l6xaqmi` | RH3001,TS0203,DoorWindow-Sensor-ZB3.0,MCT-340 E | doorwindowsensor_2 | Johan | - | alarm_contact, alarm_tamper, alarm_battery |
| `Immax` | RH3001,TS0203,DoorWindow-Sensor-ZB3.0,MCT-340 E | doorwindowsensor_2 | Johan | - | alarm_contact, alarm_tamper, alarm_battery |
| `Visonic` | RH3001,TS0203,DoorWindow-Sensor-ZB3.0,MCT-340 E | doorwindowsensor_2 | Johan | - | alarm_contact, alarm_tamper, alarm_battery |
| `_TYZB01_hlla45kx` | TS011F | double_power_point_2 | Johan | - | onoff, measure_power, meter_power |
| `TUYATEC-3tipnsrx` | RH3001,TS0207 | flood_sensor | Johan | - | alarm_water, alarm_battery |
| `_TYZB01_ftdkanlj` | TS0201,TS0222 | lcdtemphumidluxsensor | Johan | - | measure_luminance, measure_temperature, measure_humidity |
| `_TYZB01_kvwjujy9` | TS0201,TS0222 | lcdtemphumidluxsensor | Johan | - | measure_luminance, measure_temperature, measure_humidity |
| `_TYZB01_a476raq2` | TS0201,TY0201 | lcdtemphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `_TYZB01_hjsgdkfl` | TS0201,TY0201 | lcdtemphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `_TYZB01_iuepbmpv` | TS0201,TY0201 | lcdtemphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `_TYZB01_cbiezpds` | SM0201 | lcdtemphumidsensor_2 | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-bd5faf9p` | RH3040 | motion_sensor | Johan | - | alarm_motion, measure_battery |
| `TUYATEC-zw6hxafz` | RH3040 | motion_sensor | Johan | - | alarm_motion, measure_battery |
| `_TYZB01_jytabjkb` | TS0202 | pir_sensor_2 | Johan | - | alarm_motion, alarm_battery |
| `_TYZB01_dl7cejts` | TS0202 | pir_sensor_2 | Johan | - | alarm_motion, alarm_battery |
| `_TYZB01_dr6sduka` | TS0202 | pir_sensor_2 | Johan | - | alarm_motion, alarm_battery |
| `_TYZB01_geepvxsy` | TS0202 | pir_sensor_2 | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-lha8pbwd` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-zn9wyqtr` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-53o41joc` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-deetibst` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-dgtxmihe` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-b5g40alm` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-dxnohkpd` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `eWeLight` | TS0505A,TS0505B,ZB-CL01 | rgb_bulb_E27 | Johan | - | - |
| `_TYST11_d0yu2xgi` | TS0601 | sirentemphumidsensor | Johan | - | onoff, measure_temperature, measure_humidity |
| `_TYZB01_qm6djpta` | TS0215A | smart_remote_4_buttons | Johan | - | - |
| `_TYZB01_phjeraqq` | TS0001 | smart_switch | Johan | - | onoff |
| `_TYZB01_iuepbmpv` | TS0121,TSO121,TS011F | smartplug | Johan | - | onoff, measure_power, meter_power |
| `_TYZB01_dsjszp0x` | TS0205 | smoke_sensor | Johan | - | alarm_smoke, alarm_battery |
| `_TYZB01_wqcac7lo` | TS0205 | smoke_sensor | Johan | - | alarm_smoke, alarm_battery |
| `_TYZB01_vkwryfdr` | TS0115 | socket_power_strip_four | Johan | - | onoff |
| `_TYZB01_ncutbjdi` | TS0003,TS011F,TS0011,TS000F,TS0001 | switch_1_gang | Johan | - | onoff |
| `_TYZB01_aneiicmq` | TS0003,TS011F,TS0011,TS000F,TS0001 | switch_1_gang | Johan | - | onoff |
| `_TYZB01_zsl6z0pw` | TS0003,TS0012,TS011F,TS0002,TS0013 | switch_2_gang | Johan | - | onoff |
| `_TYZB01_digziiav` | TS0003,TS0012,TS011F,TS0002,TS0013 | switch_2_gang | Johan | - | onoff |
| `TUYATEC-g3gl6cgy` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-Bfq2i2Sy` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-abkehqus` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-yg5dcbfu` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-prhs1rsd` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-gqhxixyk` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-vmgh3fxd` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-ojmxeikg` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-ojmxeikq` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-1g3tawnp` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-v3uxbuxy` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-riuj5xzs` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-1uxx9cci` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-HaoiuWzy` | RH3052,TS0201 | temphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-qun7vq14` | RH3052,TS0201 | temphumidsensor2 | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `_TYZB01_ymcdbl3u` | TS0111,TS0001,TS011F | valvecontroller | Johan | - | onoff |
| `_TYZB01_4tlksk8a` | TS0111,TS0001,TS011F | valvecontroller | Johan | - | onoff |
| `_TYZB02_keyjqthh` | TS0041 | wall_remote_1_gang | Johan | - | - |
| `_TYZB02_keyjhapk` | TS0042 | wall_remote_2_gang | Johan | - | - |
| `_TYZB02_key8kk7r` | TS0043 | wall_remote_3_gang | Johan | - | - |
| `_TYZB01_xfpdrwvc` | TS0001,TS0011 | wall_switch_1_gang | Johan | - | onoff |
| `_TYZB01_qeqvmvti` | TS0001,TS0011 | wall_switch_1_gang | Johan | - | onoff |
| `_TYZB01_seqwasot` | TS0001,TS0011 | wall_switch_1_gang | Johan | - | onoff |
| `_TYZB01_mtlhqn48` | TS0002,TS0012,TS0042 | wall_switch_2_gang | Johan | - | onoff |
| `_TYZB01_6sadkhcy` | TS0002,TS0012,TS0042 | wall_switch_2_gang | Johan | - | onoff |
| `TUYATEC-O6SNCwd6` | TS0002,TS0012,TS0042 | wall_switch_2_gang | Johan | - | onoff |
| `_TYZB01_vzrytttn` | TS0002,TS0012,TS0042 | wall_switch_2_gang | Johan | - | onoff |
| `_TYZB01_2athzhfr` | TS0002,TS0012,TS0042 | wall_switch_2_gang | Johan | - | onoff |
| `_TYZB01_6g8b7at8` | TS0002,TS0012,TS0042 | wall_switch_2_gang | Johan | - | onoff |
| `TUYATEC-nzrrvgco` | TS0002,TS0012,TS0042 | wall_switch_2_gang | Johan | - | onoff |

*...and 6 more*

### Sources
- Zigbee2MQTT tuya.ts (mfr+pid+vendor+description)
- JohanBendz/com.tuya.zigbee (mfr+pid+class+caps+battery)
- GitHub Issues/PRs
- Community Sources

### Statistics
- Total new: 86
- With productId: 86
- With vendor: 0
- Battery devices: 59

*Auto-generated by monthly community sync v5.12.1*

### Comments:
None.

========================================================================

## [dlnraja/com.tuya.zigbee] Issue #358: [Auto] 69 new fingerprints from community (2026-06)
**Author:** github-actions[bot] | **State:** open | **Created:** 2026-06-01T05:42:24Z | **Updated:** 2026-06-01T11:23:48Z
**URL:** https://github.com/dlnraja/com.tuya.zigbee/issues/358

### Body:
## 🌐 Monthly Community Sync Found 69 New Fingerprints

| Manufacturer ID | Product ID | Device Type | Source | Vendor | Capabilities |
|---|---|---|---|---|---|
| `_TZE200_5zbp6j0u` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_bjzrowv2` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_nkoabg8w` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_xuzcvlku` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_4vobcgd3` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_nogaemzt` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_r0jdjrvi` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_pk0sfzvr` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_fdtjuw7u` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_zpzndjez` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_rddyvrci` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_nueqqe6k` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_xaabybja` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_rmymn92d` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_3i3exuay` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_hsgrhjpf` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE204_1fuxihti` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_axgvo9jh` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZE200_yia0p3tr` | TS0601 | curtain_motor | Johan | - | windowcoverings_set |
| `_TZ3000_6jeesvrt` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `_TZ3000_au1rjicn` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `_TZ3000_9eeavbk5` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `_TZ3000_1bwpjvlz` | RH3001,TS0203,SNZB-04 | doorwindowsensor | Johan | - | alarm_contact, alarm_battery |
| `_TZ3000_7tbsruql` | RH3001,TS0203,DoorWindow-Sensor-ZB3.0,MCT-340 E | doorwindowsensor_2 | Johan | - | alarm_contact, alarm_tamper, alarm_battery |
| `_TZ3210_huzkzqyk` | TS0201,TS0222 | lcdtemphumidluxsensor | Johan | - | measure_luminance, measure_temperature, measure_humidity |
| `_TYZB01_iuepbmpv` | TS0201,TY0201 | lcdtemphumidsensor | Johan | - | measure_temperature, measure_humidity, measure_battery |
| `TUYATEC-bd5faf9p` | RH3040 | motion_sensor | Johan | - | alarm_motion, measure_battery |
| `TUYATEC-zw6hxafz` | RH3040 | motion_sensor | Johan | - | alarm_motion, measure_battery |
| `TUYATEC-53o41joc` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-deetibst` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-dgtxmihe` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `TUYATEC-b5g40alm` | RH3040 | pirsensor | Johan | - | alarm_motion, alarm_battery |
| `_TZ1800_ejwkn2h2` | TY0203,TS0203 | smart_door_window_sensor | Johan | - | measure_battery, alarm_contact, alarm_battery |
| `_TYZB01_iuepbmpv` | TS0121,TSO121,TS011F | smartplug | Johan | - | onoff, measure_power, meter_power |
| `_TYZB01_vkwryfdr` | TS0115 | socket_power_strip_four | Johan | - | onoff |
| `_TZ3000_0ht8dnxj` | TS004F | wall_remote_4_gang_2 | Johan | - | - |
| `_TZE200_go3tvswy` | - | - | Z2M | - | - |
| `_TZ3000_0ht8dnxj` | - | - | Z2M | - | - |
| `_TZE200_5zbp6j0u` | - | - | Z2M | - | - |
| `_TZE200_nkoabg8w` | - | - | Z2M | - | - |
| `_TZE200_xuzcvlku` | - | - | Z2M | - | - |
| `_TZE200_4vobcgd3` | - | - | Z2M | - | - |
| `_TZE200_nogaemzt` | - | - | Z2M | - | - |
| `_TZE200_r0jdjrvi` | - | - | Z2M | - | - |
| `_TZE200_pk0sfzvr` | - | - | Z2M | - | - |
| `_TZE200_fdtjuw7u` | - | - | Z2M | - | - |
| `_TZE200_zpzndjez` | - | - | Z2M | - | - |
| `_TZE200_rddyvrci` | - | - | Z2M | - | - |
| `_TZE200_nueqqe6k` | - | - | Z2M | - | - |
| `_TZE200_xaabybja` | - | - | Z2M | - | - |
| `_TZE200_rmymn92d` | - | - | Z2M | - | - |
| `_TZE200_3i3exuay` | - | - | Z2M | - | - |
| `_TZE200_ol5jlkkr` | - | - | Z2M | - | - |
| `_TZE200_zxxfv8wi` | - | - | Z2M | - | - |
| `_TZE204_1fuxihti` | - | - | Z2M | - | - |
| `_TZE204_57hjqelq` | - | - | Z2M | - | - |
| `_TZE204_vvvtcehj` | - | - | Z2M | - | - |
| `_TZE200_fctwhugx` | - | - | Z2M | - | - |
| `_TZE200_hsgrhjpf` | - | - | Z2M | - | - |
| `_TZE200_5sbebbzs` | - | - | Z2M | - | - |
| `_TZE200_nv6nxo0c` | - | - | Z2M | - | - |
| `_TZE200_bjzrowv2` | - | - | Z2M | - | - |
| `_TZE204_bjzrowv2` | - | - | Z2M | - | - |
| `_TZE200_axgvo9jh` | - | - | Z2M | - | - |
| `_TZE200_yia0p3tr` | - | - | Z2M | - | - |
| `_TZE204_yrugsphv` | - | - | Z2M | - | - |
| `_TZE204_lh3arisb` | - | - | Z2M | - | - |
| `_TZE204_zuq5xxib` | - | - | Z2M | - | - |
| `_TZE200_byzdayie` | - | - | Z2M | - | - |

### Sources
- Zigbee2MQTT tuya.ts (mfr+pid+vendor+description)
- JohanBendz/com.tuya.zigbee (mfr+pid+class+caps+battery)
- GitHub Issues/PRs
- Community Sources

### Statistics
- Total new: 69
- With productId: 36
- With vendor: 0
- Battery devices: 15

*Auto-generated by monthly community sync v5.12.1*

### Comments:
**Comment by dlnraja**:
<!-- tuya-issue-manager -->
Hey there! Thanks for the update on the new fingerprints. I see that there are quite a few curtain motors listed, which is great for expanding compatibility. If you’re experiencing any issues with these devices, please let me know! 

If you’re having trouble with multi-gang bindings or capabilities, I recommend completely deleting the device from your Homey, re-pairing it, and then recreating any flow cards you might have set up. This helps ensure everything is fresh and working smoothly since Homey caches capabilities during pairing.

If you notice any missing sensor readings, like for fertilizer or VOC, please share your app logs showing the DP numbers. I’ll check them out and see what’s going on. Keep me posted!

========================================================================

## [dlnraja/com.tuya.zigbee] Issue #333: Smart Button (round). Added but not working
**Author:** Lalla80111 | **State:** open | **Created:** 2026-05-24T10:29:07Z | **Updated:** 2026-06-01T11:23:09Z
**URL:** https://github.com/dlnraja/com.tuya.zigbee/issues/333

### Body:
## 📱 Basic Information

**Brand & Model**: Smart Button Scene Switch
**Purchase Link**:  AliExpress
**Power Source**: [ x] Battery CR2032
**Current Status**:  [ x] Pairs but missing features / [x ] Not working at all

The device is added as 1-buttons wireless, but battery is not showing and all buttons-related cards are missing so I'm not able to make flows.

<img width="397" height="1051" alt="Image" src="https://github.com/user-attachments/assets/fe8ac032-3af3-4806-b129-2db9427b25b3" />
<img width="400" height="933" alt="Image" src="https://github.com/user-attachments/assets/dcf04d54-fca4-404e-a8d4-2bec792f7575" />

---


  "ids": {
    "modelId": "TS0041",
    "manufacturerName": "_TZ3000_b4awzgct"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:b4:65:41:82:8b",
    "networkAddress": 35975,
    "modelId": "TS0041",
    "manufacturerName": "_TZ3000_b4awzgct",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 35975,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          1,
          6,
          57344,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 35975,
        "_reserved": 14,
        "endpointId": 2,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 35975,
        "_reserved": 14,
        "endpointId": 3,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 35975,
        "_reserved": 14,
        "endpointId": 4,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      }
    ],
    "deviceType": "enddevice",
    "receiveWhenIdle": false,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": false,
      "powerSourceMains": false,
      "receiveWhenIdle": false,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "dataTypeId": 32,
                "name": "batteryVoltage",
                "value": 30,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 200,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 16,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "basic": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 32,
                "name": "zclVersion",
                "value": 3
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "name": "appVersion",
                "value": 68
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "dataTypeId": 32,
                "name": "stackVersion",
                "value": 0
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "dataTypeId": 32,
                "name": "hwVersion",
                "value": 1
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "dataTypeId": 66,
                "name": "manufacturerName",
                "value": "_TZ3000_b4awzgct"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "dataTypeId": 66,
                "name": "modelId",
                "value": "TS0041"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "dataTypeId": 66,
                "name": "dateCode",
                "value": ""
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "dataTypeId": 48,
                "name": "powerSource",
                "value": "battery"
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 2
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "dataTypeId": 48,
                "name": "attributeReportingStatus",
                "value": "PENDING"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507,
                "dataTypeId": 72
              }
            ]
          }
        },
        "bindings": {
          "ota": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 0,
                "dataTypeId": 240,
                "name": "upgradeServerID",
                "value": "ff:ff:ff:ff:ff:ff:ff:ff"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 1,
                "dataTypeId": 35,
                "name": "fileOffset",
                "value": 4294967295
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2,
                "dataTypeId": 35,
                "name": "currentFileVersion",
                "value": 68
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 3,
                "dataTypeId": 33,
                "name": "currentZigBeeStackVersion",
                "value": 2
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 4,
                "dataTypeId": 35,
                "name": "downloadedFileVersion",
                "value": 4294967295
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 5,
                "dataTypeId": 33,
                "name": "downloadedZigBeeStackVersion",
                "value": 65535
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 6,
                "dataTypeId": 48,
                "name": "imageUpgradeStatus",
                "value": "normal"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 7,
                "dataTypeId": 33,
                "name": "manufacturerID",
                "value": 4417
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 8,
                "dataTypeId": 33,
                "name": "imageTypeID",
                "value": 65535
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 9,
                "dataTypeId": 33,
                "name": "minimumBlockPeriod",
                "value": 0
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 3
              }
            ]
          },
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1
              }
            ]
          }
        }
      },
      "2": {
        "clusters": {
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 16,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "dataTypeId": 32,
                "name": "batteryVoltage",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          }
        },
        "bindings": {}
      },
      "3": {
        "clusters": {
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 16,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "dataTypeId": 32,
                "name": "batteryVoltage",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          }
        },
        "bindings": {}
      },
      "4": {
        "clusters": {
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 16,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "dataTypeId": 32,
                "name": "batteryVoltage",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          }
        },
        "bindings": {}
      }
    }
  }



---




### Comments:
**Comment by dlnraja**:
<!-- tuya-issue-manager -->
Hey @Lalla80111,

Thanks for the detailed report! It looks like your Smart Button (TS0041) isn't fully recognized, which is why you're missing the battery status and button-related flow cards. 

To resolve this, please completely delete the device from Homey, re-pair it, and then recreate your flow cards. Homey caches capabilities at pairing, so this step is crucial for getting everything working properly.

If you're still having issues after that, let me know, and we can dig deeper. Also, if you notice any missing sensor readings, please share the app logs showing the DP numbers.

I'll keep an eye out for your update!

---
**Comment by dlnraja**:
<!-- diag-resolver -->
### Auto-resolved by Diagnostic Resolver

All fingerprints in this issue found in **Tuya Unified Zigbee v8.1.7**:
- `_TZ3000_b4awzgct` -> **button_wireless_1**

**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Remove and re-pair your device after installing.

**Troubleshooting:** https://github.com/dlnraja/com.tuya.zigbee/wiki/Troubleshooting

> **Detected protocols:** unknown


---
**Comment by dlnraja**:
<!-- diag-resolver -->
### Auto-resolved by Diagnostic Resolver

All fingerprints in this issue found in **Tuya Unified Zigbee v8.1.13**:
- `_TZ3000_b4awzgct` -> **button_wireless_1**

**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Remove and re-pair your device after installing.

**Troubleshooting:** https://github.com/dlnraja/com.tuya.zigbee/wiki/Troubleshooting

> **Detected protocols:** unknown


---
**Comment by dlnraja**:
Hi @Lalla80111,

---
**Comment by Lalla80111**:
Thanx, I'll test within the next day and come back to you. Test version is still in 8.1.6

---
**Comment by Lalla80111**:
Hi again, tested in v8.5.28 but still not working, The only change was a new button tab showing button 1.
Battery and the flow cards (other than battery) is missing.

<img width="413" height="998" alt="Image" src="https://github.com/user-attachments/assets/916e6159-12a6-46fc-9770-54035bb0614b" />

I am not allowed to generate a app log as the app is running in "Development" mode

---
**Comment by dlnraja**:
Hi @Lalla80111,

Thank you for testing! The Smart Button issue (missing battery flow cards after v8.1.6 → v8.1.12 update) is due to a capability set change in the unified driver.

**Fix**: A full re-pair is required when the capability set changes:
1. Remove the device from Homey
2. Install the latest test version (v8.1.12+) from the community app store
3. Re-add the button — battery + all flow cards should appear

If the issue persists after re-pairing on v8.1.12, please share a diagnostic report (Settings → Apps → Tuya Unified Zigbee → Diagnostics).

*Auto-response — Tuya Unified Zigbee v8.1.12*

---
**Comment by dlnraja**:
🔍 **Statut investigation:** 🔍 Investigation Smart Button: Plusieurs FPs ont été ajoutées depuis Johan PR#1253. Test disponible: [Test App](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) — Merci d'indiquer votre fingerprint exacte (visible dans Homey > Zigbee > votre appareil).

---
*Fingerprint(s) concernée(s): Smart Button*
*Driver ciblé: smart_button_switch*

En cas de problème persistant, veuillez partager:
- La fingerprint exacte de votre appareil
- La version de Homey
- Les logs d'erreur si disponibles

---
**Comment by Lalla80111**:
Will the test version be updated to new version soon? Still at 8.1.6. Yes I did a complete delete and re-pair but I'll test as soon as new version available 🙂

---
**Comment by dlnraja**:
## 📱 Smart Button TS0041 — v8.1.35

@Lalla80111 La version test **v8.1.35** est disponible ! Plus à v8.1.6 — complètement mis à jour.

👉 **[Installer v8.1.35 maintenant](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)**

Après installation, supprimer et re-appairer le bouton. Flow cards hold/release corrigées. ✅

---
**Comment by github-actions[bot]**:
<!-- tuya-triage-bot -->
I see these fingerprints are mapped in the Tuya Unified Zigbee app(https://github.com/dlnraja/com.tuya.zigbee) v8.1.53: `_TZ3000_b4awzgct+TS0041` → **button_wireless_1**, `_TZ3000_+TS0041` → **button_wireless**, `vision` → **generic_tuya**, `TS0041+TS0041` → **button_wireless**.

Grab it here: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

Remove and re-pair after installing. If something's off, drop a diagnostic report ID on the [forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

---
**Comment by Lalla80111**:
Installed from the link now and it's still 8.1.6 and app crashing. It's not been updated there the last week.

---
**Comment by dlnraja**:
Hey @Lalla80111, thanks for reporting! Your device fingerprint is supported by the `button_wireless_1` driver. The issue might be due to a recent change in the pairing process for TS0041 devices.

Could you please try these steps:
1. Update the app to the latest test version: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
2. Remove and re-pair the device
3. If the issue persists, please share a diagnostic report from tools.developer.homey.app/tools/zigbee

For the battery issue, we're aware of a problem with TS0041 devices and are working on a fix. The button functionality should work normally though.

The multiple endpoints in your device interview suggest it's a 4-button device, but the driver should handle this automatically. If you're only seeing one button, that's likely the current issue we're addressing.

---
**Comment by Lalla80111**:
Now I got updated to latest 8.1.59. But still the flow and battery issue. I put the diagnostic report and interview here.
All things done like reinstalled app, remove/re-pair device.


<img width="364" height="834" alt="Image" src="https://github.com/user-attachments/assets/20b1332d-21e1-41b8-a0f7-62155f6fe5fe" />

Interview:


  "ids": {
    "modelId": "TS0041",
    "manufacturerName": "_TZ3000_b4awzgct"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:b4:65:41:82:8b",
    "networkAddress": 35975,
    "modelId": "TS0041",
    "manufacturerName": "_TZ3000_b4awzgct",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 35975,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          1,
          6,
          57344,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 35975,
        "_reserved": 14,
        "endpointId": 2,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 35975,
        "_reserved": 14,
        "endpointId": 3,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 35975,
        "_reserved": 14,
        "endpointId": 4,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          6,
          1,
          6
        ],
        "outputClusters": []
      }
    ],
    "deviceType": "enddevice",
    "receiveWhenIdle": false,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": false,
      "powerSourceMains": false,
      "receiveWhenIdle": false,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "dataTypeId": 32,
                "name": "batteryVoltage",
                "value": 30,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 200,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 16,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "basic": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 32,
                "name": "zclVersion",
                "value": 3
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "name": "appVersion",
                "value": 68
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "dataTypeId": 32,
                "name": "stackVersion",
                "value": 0
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "dataTypeId": 32,
                "name": "hwVersion",
                "value": 1
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "dataTypeId": 66,
                "name": "manufacturerName",
                "value": "_TZ3000_b4awzgct"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "dataTypeId": 66,
                "name": "modelId",
                "value": "TS0041"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "dataTypeId": 66,
                "name": "dateCode",
                "value": ""
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "dataTypeId": 48,
                "name": "powerSource",
                "value": "battery"
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 2
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "dataTypeId": 48,
                "name": "attributeReportingStatus",
                "value": "PENDING"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507,
                "dataTypeId": 72
              }
            ]
          }
        },
        "bindings": {
          "ota": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 0,
                "dataTypeId": 240,
                "name": "upgradeServerID",
                "value": "ff:ff:ff:ff:ff:ff:ff:ff"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 1,
                "dataTypeId": 35,
                "name": "fileOffset",
                "value": 4294967295
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2,
                "dataTypeId": 35,
                "name": "currentFileVersion",
                "value": 68
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 3,
                "dataTypeId": 33,
                "name": "currentZigBeeStackVersion",
                "value": 2
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 4,
                "dataTypeId": 35,
                "name": "downloadedFileVersion",
                "value": 4294967295
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 5,
                "dataTypeId": 33,
                "name": "downloadedZigBeeStackVersion",
                "value": 65535
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 6,
                "dataTypeId": 48,
                "name": "imageUpgradeStatus",
                "value": "normal"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 7,
                "dataTypeId": 33,
                "name": "manufacturerID",
                "value": 4417
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 8,
                "dataTypeId": 33,
                "name": "imageTypeID",
                "value": 65535
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 9,
                "dataTypeId": 33,
                "name": "minimumBlockPeriod",
                "value": 0
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 3
              }
            ]
          },
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1
              }
            ]
          }
        }
      },
      "2": {
        "clusters": {
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 16,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "dataTypeId": 32,
                "name": "batteryVoltage",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          }
        },
        "bindings": {}
      },
      "3": {
        "clusters": {
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 16,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "powerConfiguration": {}
        },
        "bindings": {}
      },
      "4": {
        "clusters": {
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 16,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "powerConfiguration": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "dataTypeId": 32,
                "name": "batteryVoltage",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          }
        },
        "bindings": {}
      }
    }
  }



Diagnostics report:
79326369-25ef-4133-af4c-9741cfd7d6e6



========================================================================

## [dlnraja/com.tuya.zigbee] Issue #329: CT Clamp Power Meter
**Author:** speerke | **State:** open | **Created:** 2026-05-19T19:34:17Z | **Updated:** 2026-06-01T11:22:57Z
**URL:** https://github.com/dlnraja/com.tuya.zigbee/issues/329

### Body:
## Basic Info
- **Brand**:  Manufacturer: Dongguan Pinjia Technology CO.,LTD
- **Model** (printed on label): PJ-1203A 
- **Manufacturer Name** (from Homey dev tools): _TZE28C1000000_81yrt3lo
- **Model ID** (e.g., TS0601, TS0011, TS011F): TS0601
- **Purchase Link** (Amazon/AliExpress): AliExpress https://a.aliexpress.com/_EJEyjXc

## Evidence
### Required
- [x] Photos attached (device label + device itself)
- [x] Zigbee interview / cluster list (copy/paste below)
- [ ] Pairing logs attached

### Optional but Helpful

- **For TS0601 devices**: DP list with values (see logs during operation)

### Zigbee Interview
```
Paste your Zigbee interview output here

  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE28C1000000_81yrt3lo"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:28:85:f5:ae:d5",
    "networkAddress": 14778,
    "modelId": "TS0601",
    "manufacturerName": "_TZE28C1000000_81yrt3lo",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 14778,
        "_reserved": 28,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          57344,
          60160,
          60672,
          4,
          5,
          3,
          61184
        ],
        "outputClusters": [
          10,
          25
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 14778,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
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
                "dataTypeId": 32,
                "name": "zclVersion"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "name": "appVersion"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "dataTypeId": 32,
                "name": "stackVersion"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "dataTypeId": 32,
                "name": "hwVersion"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "dataTypeId": 66,
                "name": "manufacturerName"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "dataTypeId": 66,
                "name": "modelId"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "dataTypeId": 66,
                "name": "dateCode"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "dataTypeId": 48,
                "name": "powerSource"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65472,
                "dataTypeId": 66
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65487,
                "dataTypeId": 33
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "dataTypeId": 48,
                "name": "attributeReportingStatus"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65504,
                "dataTypeId": 72
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65505,
                "dataTypeId": 72
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507,
                "dataTypeId": 66
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "groups": {
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
                "id": 0,
                "dataTypeId": 32,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "dataTypeId": 16,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "dataTypeId": 24,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                  "writable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "name": "identifyTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "ota": {}
        }
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }

```

## Expected Behavior
**What capabilities do you expect?**
- [ ] On/Off
- [ ] Dimming
- [ ] Temperature measurement
- [ ] Humidity measurement
- [ ] Contact sensor
- [ ] Motion sensor
- [ ] Cover position (curtain/blind)
- [ ] Thermostat controls
- [x] Energy metering
- [ ] Other: _________________

**Describe the device's function**:
Like other CT Clamp Power Meters


## Additional Context
Any other information that might help (device quirks, special modes, pairing issues, etc.):
Don't no how to get DP of pairinglogs

Thank you in advance
---

### ⚡ Quick Tips
- **Photos**: Make sure the label is clearly visible
- **Logs**: Enable logs in Homey app settings before pairing
- **Reset**: Most devices require 3-5 seconds press to reset (LED blinks)
- **Distance**: Pair within 1 meter of Homey for best results

<img width="1080" height="1920" alt="Image" src="https://github.com/user-attachments/assets/1980fd3d-5531-4cbb-b79f-9a4c7326bfcb" />

### Comments:
**Comment by macmonty**:
I opened and issue but it's closed [Tuya PJ-1203A Incorrect measurement values](https://github.com/dlnraja/com.tuya.zigbee/issues/323#top)
#323
@macmonty
Description
[macmonty](https://github.com/macmonty)
opened [last week](https://github.com/dlnraja/com.tuya.zigbee/issues/323#issue-4455043892)
Basic Info
Tuya
PJ-1203A
_TZE204_81yrt3l
TS0601
https://es.aliexpress.com/item/1005007427346306.html
Evidence
Required
In Homey reports this wrong values
Image - - In Zigbee2MQTT reports this correct values Image
Optional but Helpful
https://www.zigbee2mqtt.io/devices/PJ-1203A.html
Home Assistant link (if device is supported there):
For TS0601 devices: DP list with values (see logs during operation)
Zigbee Interview

  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_81yrt3lo"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:d6:ab:fd:29:ab",
    "networkAddress": 42449,
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_81yrt3lo",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 42449,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          61184,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 42449,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "groups": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 24,
                "name": "nameSupport",
                "value": {
                  "type": "Buffer",
                  "data": [
                    0
                  ]
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "scenes": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 32,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "dataTypeId": 16,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "dataTypeId": 24,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "basic": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 32,
                "name": "zclVersion",
                "value": 3
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "name": "appVersion",
                "value": 74
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "dataTypeId": 32,
                "name": "stackVersion",
                "value": 0
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "dataTypeId": 32,
                "name": "hwVersion",
                "value": 1
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "dataTypeId": 66,
                "name": "manufacturerName",
                "value": "_TZE204_81yrt3lo"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "dataTypeId": 66,
                "name": "modelId",
                "value": "TS0601"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "dataTypeId": 66,
                "name": "dateCode",
                "value": ""
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "dataTypeId": 48,
                "name": "powerSource",
                "value": "mains"
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 2
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "dataTypeId": 48,
                "name": "attributeReportingStatus",
                "value": "PENDING"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507,
                "dataTypeId": 72
              }
            ]
          }
        },
        "bindings": {
          "ota": {},
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1
              }
            ]
          }
        }
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }

Expected Behavior
What capabilities do you expect?


On/Off

Dimming

Temperature measurement

Humidity measurement

Contact sensor

Motion sensor

Cover position (curtain/blind)

Thermostat controls
[X ] Energy metering

Other: _________________
Describe the device's function:
The device send no values,

How can I send you the data you're requesting? I'm new to the platform.

could you grab app logs showing the raw DP numbers being reported? That'll confirm which DPs map to which measurements. You can enable debug logging in the app settings, then trigger a reading update.

Additional Context
Image
{
  "networkAddress": 42449,
  "ieeeAddress": "a4:c1:38:d6:ab:fd:29:ab",
  "lastSeen": 1778858219458,
  "stats": {
    "tx": 503,
    "txSuccess": 501,
    "txError": 2,
    "rx": 180957
  },
  "modelId": "TS0601",
  "manufacturerName": "_TZE204_81yrt3lo",
  "endpointDescriptors": [
    {
      "status": "SUCCESS",
      "nwkAddrOfInterest": 42449,
      "_reserved": 20,
      "endpointId": 1,
      "applicationProfileId": 260,
      "applicationDeviceId": 81,
      "applicationDeviceVersion": 0,
      "_reserved1": 1,
      "inputClusters": [
        4,
        5,
        61184,
        0
      ],
      "outputClusters": [
        25,
        10
      ]
    },
    {
      "status": "SUCCESS",
      "nwkAddrOfInterest": 42449,
      "_reserved": 10,
      "endpointId": 242,
      "applicationProfileId": 41440,
      "applicationDeviceId": 97,
      "applicationDeviceVersion": 0,
      "_reserved1": 0,
      "inputClusters": [],
      "outputClusters": [
        33
      ]
    }
  ],
  "deviceType": "router",
  "receiveWhenIdle": true,
  "capabilities": {
    "alternatePANCoordinator": false,
    "deviceType": true,
    "powerSourceMains": true,
    "receiveWhenIdle": true,
    "security": false,
    "allocateAddress": true
  },
  "name": "CT Clamp Power Meter",
  "ieeeAddr": "a4:c1:38:d6:ab:fd:29:ab",
  "nwkAddr": 42449,
  "type": "router"
}

⚡ Quick Tips
Photos: Make sure the label is clearly visible
Logs: Enable logs in Homey app settings before pairing
Reset: Most devices require 3-5 seconds press to reset (LED blinks)
Distance: Pair within 1 meter of Homey for best results
Activity

[macmonty](https://github.com/macmonty)
added 
[device-request](https://github.com/dlnraja/com.tuya.zigbee/issues?q=state%3Aopen%20label%3A%22device-request%22)
 [last week](https://github.com/dlnraja/com.tuya.zigbee/issues/323#event-25581796054)
dlnraja
dlnraja commented 5 days ago
[dlnraja](https://github.com/dlnraja)
[5 days ago](https://github.com/dlnraja/com.tuya.zigbee/issues/323#issuecomment-4478340615)
Owner
I've analyzed this issue for v7.5.43. The PJ-1203A (TZE204_81yrt3lo / TZE284_81yrt3lo) bidirectional CT clamp meter uses its own _handleDP() method (not dpMappings with UnifiedSensorBase), so the classic double-division bug does NOT apply here.


[dlnraja](https://github.com/dlnraja)
added 2 commits that reference this issue [5 days ago](https://github.com/dlnraja/com.tuya.zigbee/issues/323#event-25661604279)
https://github.com/dlnraja/com.tuya.zigbee/commit/8bfde4e13b85ac8099fc58f15c014391dcd4c79ahttps://github.com/dlnraja/com.tuya.zigbee/issues/170, https://github.com/dlnraja/com.tuya.zigbee/issues/322, https://github.com/dlnraja/com.tuya.zigbee/issues/325, https://github.com/dlnraja/com.tuya.zigbee/issues/326 and partial fix for https://github.com/dlnraja/com.tuya.zigbee/issues/323

[8bfde4e](https://github.com/dlnraja/com.tuya.zigbee/commit/8bfde4e13b85ac8099fc58f15c014391dcd4c79a)
https://github.com/dlnraja/com.tuya.zigbee/commit/1ed015042c167fd301894519e377f4b0ef609dabhttps://github.com/dlnraja/com.tuya.zigbee/issues/170, https://github.com/dlnraja/com.tuya.zigbee/issues/322, https://github.com/dlnraja/com.tuya.zigbee/issues/325, https://github.com/dlnraja/com.tuya.zigbee/issues/326 and partial fix for https://github.com/dlnraja/com.tuya.zigbee/issues/323

[1ed0150](https://github.com/dlnraja/com.tuya.zigbee/commit/1ed015042c167fd301894519e377f4b0ef609dab)
macmonty
macmonty commented 4 days ago
[macmonty](https://github.com/macmonty)
[4 days ago](https://github.com/dlnraja/com.tuya.zigbee/issues/323#issuecomment-4485737197)
Author
The device has changed, I've removed it from Homey and added it again

Image Image
 IMG_2794.mov 
Readded to Zigbee2MQTT reports this states

{
    "ac_frequency": 48.99,
    "current_a": 0.926,
    "current_b": 0.718,
    "energy_a": 0,
    "energy_b": 149.62,
    "energy_flow_a": "producing",
    "energy_flow_b": "consuming",
    "energy_produced_a": 2948.58,
    "energy_produced_b": 637.04,
    "linkquality": 40,
    "power_a": 130.8,
    "power_ab": -122.5,
    "power_b": 8.3,
    "power_factor_a": 59,
    "power_factor_b": 4,
    "timestamp_a": "2026-05-19T08:20:31.232Z",
    "timestamp_b": "2026-05-19T08:20:31.588Z",
    "update_frequency": 10,
    "voltage": 237.8
}
And this is the definition

{
    "description": "Bidirectional energy meter with 80A current clamp",
    "exposes": [
        {
            "access": 1,
            "description": "Measured electrical AC frequency",
            "label": "AC frequency",
            "name": "ac_frequency",
            "property": "ac_frequency",
            "type": "numeric",
            "unit": "Hz"
        },
        {
            "access": 1,
            "description": "Measured electrical potential value",
            "label": "Voltage",
            "name": "voltage",
            "property": "voltage",
            "type": "numeric",
            "unit": "V"
        },
        {
            "access": 1,
            "description": "Instantaneous measured power (phase A)",
            "label": "Power a",
            "name": "power_a",
            "property": "power_a",
            "type": "numeric",
            "unit": "W"
        },
        {
            "access": 1,
            "description": "Instantaneous measured power (phase B)",
            "label": "Power b",
            "name": "power_b",
            "property": "power_b",
            "type": "numeric",
            "unit": "W"
        },
        {
            "access": 1,
            "description": "Instantaneous measured power (phase AB)",
            "label": "Power ab",
            "name": "power_ab",
            "property": "power_ab",
            "type": "numeric",
            "unit": "W"
        },
        {
            "access": 1,
            "description": "Instantaneous measured electrical current (phase A)",
            "label": "Current a",
            "name": "current_a",
            "property": "current_a",
            "type": "numeric",
            "unit": "A"
        },
        {
            "access": 1,
            "description": "Instantaneous measured electrical current (phase B)",
            "label": "Current b",
            "name": "current_b",
            "property": "current_b",
            "type": "numeric",
            "unit": "A"
        },
        {
            "access": 1,
            "description": "Instantaneous measured power factor (phase A)",
            "label": "Power factor a",
            "name": "power_factor_a",
            "property": "power_factor_a",
            "type": "numeric",
            "unit": "%"
        },
        {
            "access": 1,
            "description": "Instantaneous measured power factor (phase B)",
            "label": "Power factor b",
            "name": "power_factor_b",
            "property": "power_factor_b",
            "type": "numeric",
            "unit": "%"
        },
        {
            "access": 1,
            "description": "Direction of energy (phase A)",
            "label": "Energy flow a",
            "name": "energy_flow_a",
            "property": "energy_flow_a",
            "type": "enum",
            "values": [
                "consuming",
                "producing",
                "sign"
            ]
        },
        {
            "access": 1,
            "description": "Direction of energy (phase B)",
            "label": "Energy flow b",
            "name": "energy_flow_b",
            "property": "energy_flow_b",
            "type": "enum",
            "values": [
                "consuming",
                "producing",
                "sign"
            ]
        },
        {
            "access": 1,
            "description": "Sum of consumed energy (phase A)",
            "label": "Energy a",
            "name": "energy_a",
            "property": "energy_a",
            "type": "numeric",
            "unit": "kWh"
        },
        {
            "access": 1,
            "description": "Sum of consumed energy (phase B)",
            "label": "Energy b",
            "name": "energy_b",
            "property": "energy_b",
            "type": "numeric",
            "unit": "kWh"
        },
        {
            "access": 1,
            "description": "Sum of produced energy (phase A)",
            "label": "Energy produced a",
            "name": "energy_produced_a",
            "property": "energy_produced_a",
            "type": "numeric",
            "unit": "kWh"
        },
        {
            "access": 1,
            "description": "Sum of produced energy (phase B)",
            "label": "Energy produced b",
            "name": "energy_produced_b",
            "property": "energy_produced_b",
            "type": "numeric",
            "unit": "kWh"
        },
        {
            "access": 3,
            "description": "Update frequency",
            "label": "Update frequency",
            "name": "update_frequency",
            "presets": [
                {
                    "description": "Default value",
                    "name": "default",
                    "value": 10
                }
            ],
            "property": "update_frequency",
            "type": "numeric",
            "unit": "s",
            "value_max": 60,
            "value_min": 3
        },
        {
            "access": 1,
            "description": "Timestamp at power measure (phase a)",
            "label": "Timestamp a",
            "name": "timestamp_a",
            "property": "timestamp_a",
            "type": "text"
        },
        {
            "access": 1,
            "description": "Timestamp at power measure (phase b)",
            "label": "Timestamp b",
            "name": "timestamp_b",
            "property": "timestamp_b",
            "type": "text"
        },
        {
            "access": 1,
            "category": "diagnostic",
            "description": "Link quality (signal strength)",
            "label": "Linkquality",
            "name": "linkquality",
            "property": "linkquality",
            "type": "numeric",
            "unit": "lqi",
            "value_max": 255,
            "value_min": 0
        }
    ],
    "model": "PJ-1203A",
    "options": [
        {
            "access": 2,
            "description": "Delay channel A publication until the next energy flow update (default false).",
            "label": "Late energy flow a",
            "name": "late_energy_flow_a",
            "property": "late_energy_flow_a",
            "type": "binary",
            "value_off": false,
            "value_on": true
        },
        {
            "access": 2,
            "description": "Delay channel B publication until the next energy flow update (default false).",
            "label": "Late energy flow b",
            "name": "late_energy_flow_b",
            "property": "late_energy_flow_b",
            "type": "binary",
            "value_off": false,
            "value_on": true
        },
        {
            "access": 2,
            "description": "Report energy flow direction for channel A using signed power (default false).",
            "label": "Signed power a",
            "name": "signed_power_a",
            "property": "signed_power_a",
            "type": "binary",
            "value_off": false,
            "value_on": true
        },
        {
            "access": 2,
            "description": "Report energy flow direction for channel B using signed power (default false).",
            "label": "Signed power b",
            "name": "signed_power_b",
            "property": "signed_power_b",
            "type": "binary",
            "value_off": false,
            "value_on": true
        },
        {
            "access": 2,
            "description": "Report energy flow direction inverted for channel A.",
            "label": "Invert energy flow a",
            "name": "invert_energy_flow_a",
            "property": "invert_energy_flow_a",
            "type": "binary",
            "value_off": false,
            "value_on": true
        },
        {
            "access": 2,
            "description": "Report energy flow direction inverted for channel B.",
            "label": "Invert energy flow b",
            "name": "invert_energy_flow_b",
            "property": "invert_energy_flow_b",
            "type": "binary",
            "value_off": false,
            "value_on": true
        },
        {
            "access": 2,
            "description": "If true then single-zero power or current values will be disgarded. The default is false.",
            "label": "Single zero remove",
            "name": "single_zero_remove",
            "property": "single_zero_remove",
            "type": "binary",
            "value_off": false,
            "value_on": true
        },
        {
            "access": 2,
            "description": "Calibrates the ac_frequency value (absolute offset), takes into effect on next report of device.",
            "label": "Ac frequency calibration",
            "name": "ac_frequency_calibration",
            "property": "ac_frequency_calibration",
            "type": "numeric",
            "value_step": 0.1
        },
        {
            "access": 2,
            "description": "Number of digits after decimal point for ac_frequency, takes into effect on next report of device. This option can only decrease the precision, not increase it.",
            "label": "Ac frequency precision",
            "name": "ac_frequency_precision",
            "property": "ac_frequency_precision",
            "type": "numeric",
            "value_max": 3,
            "value_min": 0
        },
        {
            "access": 2,
            "description": "Calibrates the voltage value (percentual offset), takes into effect on next report of device.",
            "label": "Voltage calibration",
            "name": "voltage_calibration",
            "property": "voltage_calibration",
            "type": "numeric",
            "value_step": 0.1
        },
        {
            "access": 2,
            "description": "Number of digits after decimal point for voltage, takes into effect on next report of device. This option can only decrease the precision, not increase it.",
            "label": "Voltage precision",
            "name": "voltage_precision",
            "property": "voltage_precision",
            "type": "numeric",
            "value_max": 3,
            "value_min": 0
        }
    ],
    "source": "native",
    "supports_ota": false,
    "vendor": "Tuya",
    "version": "0.0.0"
}

Every so often, the Total Power value changes on its own from the value you see in the image to 13xxW, see attached video

If you need a log file, let me know how I can get it and I'll send it to you.
Thank you very much for your work.

[dlnraja](https://github.com/dlnraja)
dlnraja commented [yesterday](https://github.com/dlnraja/com.tuya.zigbee/issues/323#issuecomment-4519011137)
dlnraja
yesterday
Owner
This issue is resolved in v8.1.5. The PJ-1203A power clamp meter was missing capability handlers for DP110 (Power Factor A), DP111 (AC Frequency), DP114 (Current B), and DP121 (Power Factor B). These DPs were being received but only logged to console — the capability values were never set.

dlnraja
[dlnraja](https://github.com/dlnraja) commented [7 hours ago](https://github.com/dlnraja/com.tuya.zigbee/issues/323#issuecomment-4523883175)
dlnraja
7 hours ago
Owner
Bug fix merged via Phoenix Sovereign v8.1.0 Phase 2 (commit https://github.com/dlnraja/com.tuya.zigbee/commit/fc49e86d4f36b317e05b07333d8ed2759238cd3e).

---
**Comment by macmonty**:
Issue closed without resolving the problem, i can't reopen the issue, in v8.1.5 is detected it as Presence Radar sensor
https://github.com/dlnraja/com.tuya.zigbee/issues/323

<img width="1066" height="84" alt="Image" src="https://github.com/user-attachments/assets/d49ac9db-8ecd-4c5e-9752-1330fd1de3eb" />

<img width="823" height="540" alt="Image" src="https://github.com/user-attachments/assets/f3181d15-5776-4180-ba6c-6d88d9cee155" />

---
**Comment by github-actions[bot]**:
<!-- tuya-triage-bot -->
I see these fingerprints are mapped in the Tuya Unified Zigbee app(https://github.com/dlnraja/com.tuya.zigbee) v8.1.5: `_TZE+TS0601` → **universal_fallback**, `router` → **diy_custom_zigbee**, `vision+TS0601` → **generic_tuya**, `_TZE28C1000000_81yrt3lo+TS0601` → **power_clamp_meter**.

Grab it here: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

Remove and re-pair after installing. If something's off, drop a diagnostic report ID on the [forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

---
**Comment by dlnraja**:
<!-- tuya-issue-manager -->
Hey @speerke,

Thanks for the detailed report! I see that the CT Clamp Power Meter (PJ-1203A) isn't functioning as expected. From the Zigbee interview, it looks like the device is recognized, but the fingerprint isn't matching any supported drivers, which might be causing the issue.

To dig deeper, could you please provide the pairing logs? They’ll help me understand how the device is being recognized during the pairing process. Also, if you can, share the DP list with values while the device is operating. This info is crucial for troubleshooting.

As for the capabilities, since this device uses a mixed energy type, we should ensure that the adaptive UnifiedBatteryHandler is properly managing it. 

Once I have the logs, I’ll check into this further. If we find that the capabilities are still not working correctly, I might need you to delete the device, re-pair it, and recreate any flow cards, as Homey caches capabilities at pairing.

Looking forward to your response!

---
**Comment by macmonty**:
Imposible to generate report the app from v8.1.6 to v8.1.11 crash at startup, i dont have a button to generate report

<img width="451" height="575" alt="Image" src="https://github.com/user-attachments/assets/b2ca8ad8-aa4b-4c12-9c3b-cb6104e7577a" />

---
**Comment by dlnraja**:
Hi @speerke, @macmonty,

---
**Comment by speerke**:
Hee @dlnraja,

First of all, thank you for your energy and time.
It seems that the clamp meter is working, version v8.1.5. The frequency is just 10x too high. I will update the app later today.
Unfortunately, I do not know how to retrieve a DP list or Pairing log.
Adjusting the ratio in advanced settings is also great, as the clamp was deviating slightly.
Measurement Phase 3 also seems to be too much.

<img width="244" height="667" alt="Image" src="https://github.com/user-attachments/assets/f15badba-3b89-4f7c-8424-efbecc6397d6" />


  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE28C1000000_81yrt3lo"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:28:85:f5:ae:d5",
    "networkAddress": 18843,
    "modelId": "TS0601",
    "manufacturerName": "_TZE28C1000000_81yrt3lo",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 18843,
        "_reserved": 28,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          57344,
          60160,
          60672,
          4,
          5,
          3,
          61184
        ],
        "outputClusters": [
          10,
          25
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 18843,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
      "security": false,
      "allocateAddress": true
    },
    "extendedEndpointDescriptors": {
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
                "dataTypeId": 32,
                "name": "zclVersion"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "name": "appVersion"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "dataTypeId": 32,
                "name": "stackVersion"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "dataTypeId": 32,
                "name": "hwVersion"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "dataTypeId": 66,
                "name": "manufacturerName"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "dataTypeId": 66,
                "name": "modelId"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "dataTypeId": 66,
                "name": "dateCode"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 7,
                "dataTypeId": 48,
                "name": "powerSource"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65472,
                "dataTypeId": 66
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65487,
                "dataTypeId": 33
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "dataTypeId": 48,
                "name": "attributeReportingStatus"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65504,
                "dataTypeId": 72
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65505,
                "dataTypeId": 72
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65506,
                "dataTypeId": 32
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65507,
                "dataTypeId": 66
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
                "dataTypeId": 24,
                "name": "nameSupport",
                "value": {
                  "type": "Buffer",
                  "data": [
                    0
                  ]
                },
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                "id": 0,
                "dataTypeId": 32,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 2,
                "dataTypeId": 33,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3,
                "dataTypeId": 16,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4,
                "dataTypeId": 24,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 2,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
                  "writable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "name": "identifyTime",
                "value": 0,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {
          "time": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 1
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "ota": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 0,
                "dataTypeId": 240,
                "name": "upgradeServerID",
                "value": "ff:ff:ff:ff:ff:ff:ff:ff"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 1,
                "dataTypeId": 35,
                "name": "fileOffset",
                "value": 4294967295
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2,
                "dataTypeId": 35,
                "name": "currentFileVersion",
                "value": 99
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 3,
                "dataTypeId": 33,
                "name": "currentZigBeeStackVersion",
                "value": 2
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 4,
                "dataTypeId": 35,
                "name": "downloadedFileVersion",
                "value": 4294967295
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 5,
                "dataTypeId": 33,
                "name": "downloadedZigBeeStackVersion",
                "value": 65535
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 6,
                "dataTypeId": 48,
                "name": "imageUpgradeStatus",
                "value": "normal"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 7,
                "dataTypeId": 33,
                "name": "manufacturerID",
                "value": 4417
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 8,
                "dataTypeId": 33,
                "name": "imageTypeID",
                "value": 65535
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 9,
                "dataTypeId": 33,
                "name": "minimumBlockPeriod",
                "value": 0
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
                "name": "clusterRevision",
                "value": 3
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        }
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }



---
**Comment by dlnraja**:
Hi @speerke,

---
**Comment by macmonty**:
Hy @dlnraja here is a log from runnning app and adding the clamp like radar sensor, with app

<img width="460" height="681" alt="Image" src="https://github.com/user-attachments/assets/9395045f-16be-4d64-9837-7684f143fac8" />

[Clamp PJ-1203A.log](https://github.com/user-attachments/files/28334904/Clamp.PJ-1203A.log)

Thanks for your hard work

---
**Comment by dlnraja**:
Hi @speerke and @macmonty,

Thank you for the detailed logs! The CT clamp being detected as a radar sensor is a fingerprint collision — both share the same Zigbee cluster profile.

**Status**: The `_TZE200_...` CT clamp fingerprint disambiguation is scheduled for v8.1.13.

In the meantime:
- Use the test channel version (v8.1.12)
- When adding the device, if prompted to choose, select the **Energy Meter / Power Meter** option
- The log provided has been captured for fingerprint improvement

*Auto-response — Tuya Unified Zigbee v8.1.12*

---
**Comment by dlnraja**:
🔍 **Statut investigation:** Investigation CT Clamp Power Meter: Appareil analysé. Merci d'indiquer le modèle exact et la fingerprint (_TZE200_xxx). [Test App](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)

---
*Fingerprint(s) concernée(s): CT Clamp*
*Driver ciblé: power_meter*

En cas de problème persistant, veuillez partager:
- La fingerprint exacte de votre appareil
- La version de Homey
- Les logs d'erreur si disponibles

---
**Comment by macmonty**:
> Hi [@speerke](https://github.com/speerke) and [@macmonty](https://github.com/macmonty),
> 
> Thank you for the detailed logs! The CT clamp being detected as a radar sensor is a fingerprint collision — both share the same Zigbee cluster profile.
> 
> **Status**: The `_TZE200_...` CT clamp fingerprint disambiguation is scheduled for v8.1.13.
> 
> In the meantime:
> 
> * Use the test channel version (v8.1.12)
> * When adding the device, if prompted to choose, select the **Energy Meter / Power Meter** option
> * The log provided has been captured for fingerprint improvement
> 
> _Auto-response — Tuya Unified Zigbee v8.1.12_

No luck, same situation detected as presence radas, log attached

[Clamp PJ-1203A.log](https://github.com/user-attachments/files/28420394/Clamp.PJ-1203A.log)

---
**Comment by dlnraja**:
## 🔌 CT Clamp _TZE28C1000000_81yrt3lo — v8.1.35

@speerke @macmonty Fingerprint ajoutée dans power_clamp_meter — plus de confusion avec le driver radar !

👉 [Version test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)

Désinstaller l'app, installer test, re-appairer le CT clamp. Il devrait apparaître comme Power Meter. 🙏

---
**Comment by macmonty**:
Same situation, remove device and app, reinstall to v8.1.35, add the device to homey selecting CT Clamp Power Meter, and no luck, detected as Presense radar, see attatched log

[Clamp PJ-1203A.log](https://github.com/user-attachments/files/28438583/Clamp.PJ-1203A.log)

========================================================================

## [dlnraja/com.tuya.zigbee] Issue #340: [soil_sensor] Bug: ZG-303Z
**Author:** haadeess | **State:** open | **Created:** 2026-05-25T12:45:37Z | **Updated:** 2026-06-01T11:22:52Z
**URL:** https://github.com/dlnraja/com.tuya.zigbee/issues/340

### Body:
Generic Device

8b39f617-0f07-4adb-9df2-32aa4f162160

### Comments:
**Comment by dlnraja**:
Hi @haadeess,

---
**Comment by dlnraja**:
🔍 **Statut investigation:** Investigation: Le capteur ZG-303Z est en cours d'analyse. Le driver soil_sensor a été mis à jour avec les derniers endpoints. Merci de tester la version beta: [Test App](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)

---
*Fingerprint(s) concernée(s): ZG-303Z*
*Driver ciblé: soil_sensor*

En cas de problème persistant, veuillez partager:
- La fingerprint exacte de votre appareil
- La version de Homey
- Les logs d'erreur si disponibles

---
**Comment by dlnraja**:
## 🔍 Soil Sensor ZG-303Z — v8.1.35

Le driver soil_sensor a été mis à jour avec les DPs corrects pour ZG-303Z.

👉 [Version test v8.1.35](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)

Désinstaller et réinstaller l'app, puis re-appairer. Confirmez si résolu ! ✅

---
**Comment by haadeess**:
I'll test it as soon as the new version is updateable :)

<img width="1777" height="1042" alt="Image" src="https://github.com/user-attachments/assets/c00cb5b6-74a9-452a-915d-d3d2a8e952df" />

========================================================================

## [dlnraja/com.tuya.zigbee] Issue #337: [motion_sensor_2] Bug: _TZE200_3towulqd
**Author:** haadeess | **State:** open | **Created:** 2026-05-25T07:08:07Z | **Updated:** 2026-06-01T11:22:50Z
**URL:** https://github.com/dlnraja/com.tuya.zigbee/issues/337

### Body:
Connected with Johns "Tuya Cloud" App.
it has much delay.
Is is possible to fix this with your app?


  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE200_3towulqd"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:a8:c2:de:2b:a5",
    "networkAddress": 15687,
    "modelId": "TS0601",
    "manufacturerName": "_TZE200_3towulqd",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 15687,
        "_reserved": 18,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 1026,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          3,
          1280,
          1,
          1024
        ],
        "outputClusters": []
      }
    ],
    "deviceType": "enddevice",
    "receiveWhenIdle": false,
    "swBuildId": "0122052017",
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": false,
      "powerSourceMains": false,
      "receiveWhenIdle": false,
      "security": false,
      "allocateAddress": true
    },
    "iasZoneEnrollment": {
      "1": {
        "iasCieAddress": "b0:c7:de:ff:fe:5b:83:a3",
        "enrolled": true,
        "enrollAttempts": 0
      }
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "basic": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 0,
                "dataTypeId": 32,
                "name": "zclVersion"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 1,
                "dataTypeId": 32,
                "name": "appVersion"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2,
                "dataTypeId": 32,
                "name": "stackVersion"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 3,
                "dataTypeId": 32,
                "name": "hwVersion"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 4,
                "dataTypeId": 66,
                "name": "manufacturerName"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 5,
                "dataTypeId": 66,
                "name": "modelId"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 7,
                "dataTypeId": 48,
                "name": "powerSource"
              },
              {
                "acl": [
                  "readable",
                  "writable"
                ],
                "id": 18,
                "dataTypeId": 16,
                "name": "deviceEnabled"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 16384,
                "dataTypeId": 66,
                "name": "swBuildId"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
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
                "id": 0,
                "dataTypeId": 33,
                "name": "identifyTime",
                "value": 0
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
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
                "dataTypeId": 48,
                "name": "zoneState",
                "value": "notEnrolled"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 1,
                "dataTypeId": 49,
                "name": "zoneType",
                "value": "motionSensor"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2,
                "dataTypeId": 25,
                "name": "zoneStatus",
                "value": {
                  "type": "Buffer",
                  "data": [
                    1,
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
                "dataTypeId": 240,
                "name": "iasCIEAddress",
                "value": "b0:c7:de:ff:fe:5b:83:a3"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 17,
                "dataTypeId": 32,
                "name": "zoneId",
                "value": 0
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
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
                  "readable",
                  "reportable"
                ],
                "id": 32,
                "dataTypeId": 32,
                "name": "batteryVoltage",
                "value": 30,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 33,
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 200,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
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
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "name": "measuredValue",
                "value": 31014,
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 33,
                  "minInterval": 60,
                  "maxInterval": 3600,
                  "minChange": 10,
                  "status": "SUCCESS"
                }
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 1,
                "dataTypeId": 33,
                "name": "minMeasuredValue",
                "value": 0
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2,
                "dataTypeId": 33,
                "name": "maxMeasuredValue",
                "value": 4000
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "dataTypeId": 33,
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
  }


### Comments:
**Comment by github-actions[bot]**:
## Fingerprint Cross-Reference

| Manufacturer | Driver Match |
|---|---|

| _TZE200_3towulqd | generic_diy, motion_sensor_2 |

---
*Auto-generated by crossref workflow*

---
**Comment by dlnraja**:
<!-- diag-resolver -->
### Auto-resolved by Diagnostic Resolver

All fingerprints in this issue found in **Tuya Unified Zigbee v8.1.13**:
- `_TZE200_3towulqd` -> **generic_diy, motion_sensor_2**

**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
Remove and re-pair your device after installing.


> **Protocol:** Hybrid device (IAS Zone + Tuya DP). Magic packet timing and enrollment crucial.
> Note: Some fingerprints map to multiple drivers — the correct driver is determined by the **productId** (e.g. TS0001, TS0002).

> **Delay fix (v8.1.13+):** Devices now send dataQuery immediately on init. Update and re-pair to fix.

**Troubleshooting:** https://github.com/dlnraja/com.tuya.zigbee/wiki/Troubleshooting

> **Detected protocols:** hybrid


---
**Comment by dlnraja**:
🔍 **Statut investigation:** Update: La fingerprint _TZE200_3towulqd est vérifiée. Test disponible: [Test App](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)

---
*Fingerprint(s) concernée(s): _TZE200_3towulqd*
*Driver ciblé: motion_sensor_2*

En cas de problème persistant, veuillez partager:
- La fingerprint exacte de votre appareil
- La version de Homey
- Les logs d'erreur si disponibles

---
**Comment by dlnraja**:
## ✅ Motion Sensor _TZE200_3towulqd — v8.1.35

**Le délai Tuya Cloud est inhérent au cloud** (~10-30s). Notre app utilise **Zigbee direct local** (<1s).

👉 [Version test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/)

Re-appairer directement via Zigbee (sans cloud Tuya) pour bénéficier du mode local instantané.

---
**Comment by github-actions[bot]**:
<!-- tuya-triage-bot -->
I see these fingerprints are mapped in the Tuya Unified Zigbee app(https://github.com/dlnraja/com.tuya.zigbee) v8.1.53: `_TZE200_3towulqd+TS0601` → **motion_sensor_2**, `_TZE+TS0601` → **universal_zigbee**, `_TZE200_+TS0601` → **dimmer_1_gang**, `vision+TS0601` → **generic_tuya**, `lumi+TS0601` → **device_generic_tuya_universal**.

Grab it here: https://homey.app/a/com.dlnraja.tuya.zigbee/test/

Remove and re-pair after installing. If something's off, drop a diagnostic report ID on the [forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

========================================================================

