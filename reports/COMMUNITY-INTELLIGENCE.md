# Community Intelligence Report
*Generated: 2026-04-07T14:58:42.454Z*

## Open Issues (5)

### [#200] Temperature and Humidity LCD sensor
*Author: tencoo | Created: 2026-04-06T19:37:39Z*

**Body:**
## Basic Info
- **Brand**:  Generic / TNCE?
- **Model** (printed on label): No visible lables.
- **Manufacturer Name** (from Homey dev tools): _TZ3210_ncw88jfq
- **Model ID** (e.g., TS0601, TS0011, TS011F): TS0201
- **Purchase Link** (Amazon/AliExpress): https://www.amazon.com.au/Temperature-Humidity-Thermometer-Hygrometer-Compatible/dp/B0CJV7R1HG?th=1

## Evidence
### Required
- [x ] Photos attached (device label + device itself)
- [x] Zigbee interview / cluster list (copy/paste below)
- [ ] Pairing logs attached

### Optional but Helpful
- **Zigbee2MQTT link** (if device is supported there):  **https://www.zigbee2mqtt.io/devices/TNCE_CLIMATE.html**
- **Home Assistant link** (if device is supported there): 
- **For TS0601 devices**: DP list with values (see logs during operation)

### Zigbee Interview
```

  "ids": {
    "modelId": "TS0201",
    "manufacturerName": "_TZ3210_ncw88jfq"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:44:27:3f:bd:d2",
    "networkAddress": 16361,
    "modelId": "TS0201",
    "manufacturerName": "_TZ3210_ncw88jfq",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 16361,
        "_reserved": 22,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 770,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          1,
          1026,
          1029,
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
                "dataTypeId": 32,
                "name": "batteryPercentageRemaining",
                "value": 156,
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
          "temperatureMeasurement": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 41,
                "name": "measuredValue",
                "value": 2480,
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 41,
                  "minInterval": 60,
                  "maxInterval": 1800,
                  "minChange": 50,
                  "status": "SUCCESS"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 41,
                "name": "minMeasuredValue",
                "value": 2350,
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
                "dataTypeId": 41,
                "name": "maxMeasuredValue",
                "value": 2740,
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
          "relativeHumidity": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "dataTypeId": 33,
                "name": "measuredValue",
                "value": 156,
                "reportingConfiguration": {
                  "direction": "reported",
                  "attributeDataType": 33,
                  "minInterval": 60,
                  "maxInterval": 1800,
                  "minChange": 50,
                  "status": "SUCCESS"
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "dataTypeId": 33,
                "name": "minMeasuredValue",
                "value": 156,
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
                "name": "maxMeasuredValue",
                "value": 5330,
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
                "value": 131
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
                "value": "_TZ3210_ncw88jfq"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "dataTypeId": 66,
                "name": "modelId",
                "value": "TS0201"
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
      }
    }
  }

```

## Expected Behavior
**What capabilities do you expect?**
- [ ] On/Off
- [ ] Dimming
- [X] Temperature measurement
- [X] Humidity measurement
- [ ] Contact sensor
- [ ] Motion sensor
- [ ] Cover position (curtain/blind)
- [ ] Thermostat controls
- [ ] Energy metering
- [X] Other: Battery status

**Describe the device's function**:
Temperature and humidity sensor with LCD display.

## Additional Context
Any other information that might help (device quirks, special modes, pairing issues, etc.):

![Image](https://github.com/user-attachments/assets/28ba6505-808d-4783-b5ef-2e8cc9a6a442)
![Image](https://github.com/user-attachments/assets/d2acb69c-a05a-4e6e-a417-c93e58ea6137)
---

### ⚡ Quick Tips
- **Photos**: Make sure the label is clearly visible
- **Logs**: Enable logs in Homey app settings before pairing
- **Reset**: Most devices require 3-5 seconds press to reset (LED blinks)
- **Distance**: Pair within 1 meter of Homey for best results


**Comments (3):**
> **github-actions:** <!-- tuya-triage-bot -->
> Hey! I've peeked into the fingerprints shared here. Here's what I found:
> 
> ### ✅ Driver Status
> Already supported in v5.12.3:
> 
> - `_TZ3210_ncw88jfq` → **climate_sensor**, **gas_detector**
> - `TS0601` → **unknown**
> - `TS0011` → **unknown**
> - `TS011F` → **unknown**
> - `TS0201` → **unknown**
> 
> **Tip:** For climate sensors, remember you can adjust the **Temperature/Humidity Offset** in Device Settings if the readings are slightly off.
> 
> 🚀 **Testing:** Install the [test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/), **remove and re-pair** the device. If it still shows as unknown, send me a diagnostic report ID.
> 
> ---
> [Test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · [Forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352) · [Developer Tools](https://tools.developer.homey.app)

> **tencoo:** Hi, tried to remove and re-pair the devices, but not recognized. Diag ID: d341343d-f85f-4f0c-9b06-5a3bc9cee9eb.
> I do however see a mention of version v5.12.3, but the link leads me to the test version v5.11.206 and thats the version i have installed. How do i get the newer test version?
> 
> Edit: Never mind, i saw the forum post about publishing issues, I will wait.
> 
> Thanks for your great effort in the community!
> 
> Regards
> Fredrik
> 
> 

> **dlnraja:** <!-- tuya-issue-manager -->
> Hey @tencoo, thanks for the detailed report! I see that your TS0201 isn't functioning as expected. Since this device is showing up with a new fingerprint, it might not be fully supported yet.
> 
> To dig deeper, could you please provide the pairing logs? They’ll help me identify any missing DPs or capabilities. Also, if you're experiencing issues with missing readings, sharing the app logs with the DP numbers would be super helpful.
> 
> As a heads up, if we find that the device needs a fix related to multi-gang bindings or capabilities, you’ll need to completely delete the device, re-pair it, and recreate any flow cards, since Homey caches capabilities at pairing.
> 
> I’ll check the Zigbee interview you provided and see what we can do. Looking forward to your logs!

---

### [#198] SNZB-01M still detected as unknown Zigbee device
*Author: clementloridan | Created: 2026-04-06T11:44:09Z*

**Body:**
## 📱 Basic Information

**Brand & Model**:  Sonoff SNZB-01M
**Purchase Link**: N/A
**Power Source**: [ X] Battery / [ ] Mains
**Current Status**: [ ] Not pairing / [ X] Pairs but missing features / [ ] Not working at all

---

## 🔍 Zigbee Fingerprint (MANDATORY)

Please provide this information from Homey Developer Tools:

**Manufacturer Name**: `SONOFF`  
**Model ID**: `SNZB-01M`  
**Endpoints**: `[Please see note below`  
**Clusters**: `Please see note below`

**Screenshot or fingerprint data**:

<img width="1848" height="2649" alt="Image" src="https://github.com/user-attachments/assets/094276d5-671c-4d6f-ada5-f7a5fc40ebb2" />

Important note: This does not match the usual Tuya-style fingerprint format expected by this template (e.g. Manufacturer `_TZxxxxxx` and Model `TSxxxx`).

---

## 📊 TS0601 Data Points (if applicable)

Not applicable.

This device does not appear to expose itself as a TS0601 device in Homey Developer Tools.

---

## 🔗 References

**Zigbee2MQTT**: N/A  
**Home Assistant/ZHA**: N/A
**Other documentation**:
- Homey app test version used: Universal Tuya Zigbee test v5.12.2
- Reference discussed in repository: drivers/button_wireless_4/driver.compose.json

---

## ✨ Expected Capabilities

What features should work? Check all that apply:

- [ ] On/Off
- [ ] Brightness/Dim
- [ ] Temperature
- [ ] Humidity
- [ ] Motion detection
- [ ] Contact sensor
- [ X] Battery level
- [ ] Energy monitoring (power, current, voltage)
- [ X] Other: button actions (single press / double press / long press / release if supported)

---

## 📝 Additional Notes

N/A


**Comments (5):**
> **github-actions:** <!-- tuya-triage-bot -->
> Hey! I've peeked into the fingerprints shared here. Here's what I found:
> 
> ### ✅ Driver Status
> Already supported in v5.12.1:
> 
> - `SONOFF` → **bulb_rgbw**, **button_wireless_1**, **button_wireless_4**, **plug_energy_monitor**
> - `TS0601` → **unknown**
> 
> **Tip:** For climate sensors, remember you can adjust the **Temperature/Humidity Offset** in Device Settings if the readings are slightly off.
> 
> 🚀 **Testing:** Install the [test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/), **remove and re-pair** the device. If it still shows as unknown, send me a diagnostic report ID.
> 
> ---
> [Test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · [Forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352) · [Developer Tools](https://tools.developer.homey.app)

> **dlnraja:** <!-- tuya-issue-manager -->
> Hey @clementloridan, thanks for the detailed report! It looks like the SNZB-01M is being detected as an unknown device, even though the fingerprint seems supported by the `button_wireless_4` driver.
> 
> To troubleshoot this, I recommend completely deleting the device from Homey, then re-pairing it. This step is crucial because Homey caches capabilities at pairing, and we want to ensure it recognizes the device correctly. After re-pairing, you'll also need to recreate any flow cards associated with it.
> 
> If you're still having issues after that, please check the app logs for any DP numbers related to the device. That info can help us dig deeper into what's going on. I'll keep an eye on this and let you know if I find anything else!

> **clementloridan:** @dlnraja I'm really new on this.
> Can you guide me?
> This will really help and I will now for next time.
> 
> Should i switch off and on Homey?
> 
> Right now I have this:
> ![image](https://github.com/user-attachments/assets/cdcf1f8a-d5ed-4e66-a558-ebb114428160)

> **dlnraja:** There is an official app for son off, have you tried yet 
> 
> 
> On utilmate app settings there an diag button click it and write some text and click on send !![Screenshot_20260406_163132.jpg](https://github.com/user-attachments/assets/bc390c0e-785f-4288-b1dc-5c1d05a78e07)
> 
> ![Screenshot_20260406_163134.jpg](https://github.com/user-attachments/assets/0867885c-6eef-45fa-90ec-9839d4f3fc9b)
> 
> ![Screenshot_20260406_163139.jpg](https://github.com/user-attachments/assets/cb5570f3-e2fd-4a61-bc28-1b1b24ad5de7)
> 
> 

> **clementloridan:** Official Sonoff Homey App doesn't work.
> 
> This is diag ID: 40491ffe-f6d6-47cb-a304-2914813699c2

---

### [#194] [plug_energy_monitor CK-BL702-SWP-01(7020)] Bug: follow-up from #188
*Author: john1v | Created: 2026-04-05T12:17:58Z*

**Body:**
This is a follow-up for #188 .
Manufacturer is eWeLink, Product ID = CK-BL702-SWP-01(7020)

It seems the Product ID is added since ## [5.5.748] - 2026-01-22
- Consolidated versions 5.5.740-5.5.747 changes into 5.5.748

But after repairing with latest app version 5.11.192, the device is still unknown.

Perhaps because the manufacturer eWeLink is not in the list? 
https://github.com/dlnraja/com.tuya.zigbee/blob/722cb3c6f8c018920f9d2d23999836b087a149d2/drivers/plug_energy_monitor/driver.compose.json#L204



**Comments (6):**
> **dlnraja:** <!-- tuya-issue-manager -->
> Hey @john1v,
> 
> Thanks for the follow-up! I see that the CK-BL702-SWP-01(7020) is still showing as unknown after the update. It looks like the manufacturer eWeLink isn't currently supported in the app, which could definitely be the issue.
> 
> To help troubleshoot this, I recommend completely deleting the device from Homey, then re-pairing it with the latest app version (5.11.197). After that, you'll need to recreate any flow cards associated with this device, as Homey caches capabilities during pairing.
> 
> If it still doesn't work after that, could you please share the app logs showing the DP numbers? That'll help me investigate further.
> 
> Let me know how it goes!

> **john1v:** After updating and repairing, the plus is still unknown.
> How to "could you please share the app logs showing the DP numbers? "
> Is that from The Homey app? or the Unversal Tuya app? 
> What means 'DP'?
> Thanks.

> **dlnraja:** I have added support for manufacturer \^[WeLink\ and \SONOFF\ in the \plug_energy_monitor\ driver! Please wait for the next test update (v5.11.207+) to install, then remove and re-pair your plug to pick up the fix. Thanks for the report!

> **dlnraja:** Support has been integrated in v5.12.0. Closing this as resolved.

> **john1v:** I am sorry to say that the issue is not resolved for energy plug EweLink  CK-BL702-SWP-01(7020) .
> When scrolling through 
> https://github.com/dlnraja/com.tuya.zigbee/blob/bc3968839f655c74b2b9d8202f85c6ada6790f95/drivers/plug_energy_monitor/driver.compose.json#L27
> I see that  not 'eWeLink' is added, but 'EWELINK'. In my oponion, both Product ID and ManufacturerName are case-sensitive.
> 
> I think I t would be  a good idea to sort and de-duplicate both alfabetically (in all drivers), and check if the case-sensitivity is a problem.  For example,  "_tz3000_amdymr71", is mentioned twice in row 364, 365. 
>  
> Also, it seems to me that ManufacturerName and ProductID are reversed in all drivers, when comparing to the labels in the Homey Device advanced settings.
> 
> 

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @john1v posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

---

### [#170] Bug: TS0003 (_TZ3000_v4l4b0lp) - Sub-capability Flow cards (Gang 1/2/3) are completely unlinked
*Author: Ssssneak | Created: 2026-03-25T05:59:57Z*

**Body:**
### What Feature / Enhancement?

**Describe the bug:**
The 3-gang switch TS0003 (_TZ3000_v4l4b0lp) pairs successfully and shows 4 buttons (3 gangs + identify). 
Toggling Gang 1, 2, and 3 from the Homey App UI works perfectly. 

However, Flow cards and state reporting for the specific gangs are broken:
1. The generic "Turn on/off" Flow card works (it toggles endpoint 1).
2. The specific Flow cards "Turn on Gang 1", "Turn on Gang 2", and "Turn on Gang 3" DO NOT work at all.
3. Flow Triggers (WHEN "Gang 1/2/3 turned on") do not register when pressing the physical buttons on the wall. 

It appears that the main `onoff` capability is bound correctly, but the sub-capabilities (`onoff.1`, `onoff.2`, `onoff.3`) are not correctly linked to the Flow action listeners or the incoming Zigbee attribute reports.

**To Reproduce:**
1. Pair _TZ3000_v4l4b0lp.
2. Trigger "Turn on" (generic) via Flow -> Works (EP 1 turns on).
3. Trigger "Turn on Gang 1", "Gang 2", or "Gang 3" via Flow -> Fails (nothing happens).
4. Press physical buttons -> State does not update in Homey, Flow triggers fail.

**Expected behavior:**
Specific Flow cards for Gang 1, 2, and 3 should trigger their respective endpoints. Physical button presses should report state back to the sub-capabilities.

### Why is this useful?

Without working Flow cards for the individual gangs, it is impossible to use this 3-gang switch in any Homey automations (Flows). The device can currently only be controlled manually via the app UI, which completely defeats the purpose of a smart home hub. Fixing this mapping issue will restore core automation capabilities for this specific hardware revision, making the device actually usable in Homey.

### How would it work? (optional idea)

_No response_

### Category

Driver improvement

### Examples / References

_No response_

### Checklist

- [x] I have searched existing issues (no duplicate)
- [x] This feature is relevant to local Zigbee control

**Comments (39):**
> **github-actions:** <!-- tuya-triage-bot -->
> These are already supported in v5.11.138:
> 
> - `_TZ3000_v4l4b0lp` → **switch_3gang**
> - `TS0003` → **unknown**
> 
> All fingerprints are already supported — install the [test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/), remove the device, and re-pair it.
> 
> [Test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · [Forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352) · [Developer Tools](https://tools.developer.homey.app)

> **Ssssneak:** Hi, thanks for the update! 
> I installed v5.11.138 and re-paired the device. I have a precise bug report regarding the Flow cards for this specific fingerprint (_TZ3000_v4l4b0lp).
> 
> 1. App UI Control: Works perfectly for all 3 gangs.
> 2. Flow Triggers (WHEN "Physical gang 1/2/3 ON"): Work perfectly! The bindings are correct and Homey registers physical wall presses.
> 3. Flow Actions (THEN "Turn on/off gang 1/2/3"): COMPLETELY BROKEN. The cards execute in the Flow, but the switch does not react. 
> 
> The issue is strictly isolated to the Action Listeners for the sub-capabilities (`onoff.1`, `onoff.2`, `onoff.3`). The generic "Turn on" card works (triggers EP 1), but the gang-specific Action cards send no commands to the device. Could you please fix the Flow Action mappings?
> 

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @Ssssneak posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

> **dlnraja:** <!-- tuya-issue-manager -->
> Hey @Ssssneak,
> 
> Thanks for reporting this! I see the issue with the TS0003 (_TZ3000_v4l4b0lp) and the Flow cards for the individual gangs not working. It looks like the main `onoff` capability is linked correctly, but the sub-capabilities for Gang 1, 2, and 3 are indeed not responding as they should.
> 
> I'll dig into the code to fix the mapping for those Flow cards so they can trigger the correct endpoints. This should help restore the automation capabilities you need for your smart home setup.
> 
> In the meantime, if you have any app logs showing the DP numbers when you try to use the Flow cards, that would be super helpful for troubleshooting. Just share those here when you can!
> 
> Thanks for your patience, and I’ll keep you updated on the progress!

> **dlnraja:** <!-- diag-resolver -->
> ### Auto-resolved by Diagnostic Resolver
> 
> All fingerprints in this issue are already supported in **Universal Tuya Zigbee v5.11.138**:
> - `_TZ3000_v4l4b0lp` -> **switch_3gang**
> 
> **Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
> Remove and re-pair your device after installing.
> 
> **Troubleshooting:** https://github.com/dlnraja/com.tuya.zigbee/wiki/Troubleshooting
> 
> > **Detected protocols:** unknown
> 

> **Ssssneak:** @dlnraja - Please reopen this issue. The bot auto-closed it by mistake. 
> 
> This is NOT a "device not supported" request. The device pairs correctly. 
> This is a BUG REPORT regarding broken code for the Action Listeners. 
> 
> The Flow Action cards for specific gangs ("Turn on gang 1/2/3") DO NOT WORK at all. Only the triggers work. Please review the action mappings for onoff.1, onoff.2, and onoff.3 for this fingerprint, as the device is currently useless in automations.

> **dlnraja:** Il fixing the bot, it's a mistake 
> 
> Sorry I will check asap manually 
> 
> Best regards. 
> 

> **Ssssneak:** Hi again, 
> 
> Please use this new Diagnostics Report ID instead (the previous one had an error). 
> I triggered the broken Flow cards ("Turn on gang 2" and "Turn off gang 2") again to generate fresh logs.
> 
> The correct Report ID is: 81ad938d-6d24-409b-b336-34e0aa655721
> 
> Let me know if you can extract the required DP numbers from this one. Thanks!
> 

> **dlnraja:** You can do an homey device ZigBee interview also to know witch dp corespond
> to your device on and paste it :
> 
> https://tools.developer.homey.app/tools/zigbee
> 
> 
> 
> 
> 
> Le sam. 28 mars 2026, 21:21, Ssssneak ***@***.***> a écrit :
> 
> > *Ssssneak* left a comment (dlnraja/com.tuya.zigbee#170)
> > <https://github.com/dlnraja/com.tuya.zigbee/issues/170#issuecomment-4148747701>
> >
> > Hi again,
> >
> > Please use this new Diagnostics Report ID instead (the previous one had an
> > error).
> > I triggered the broken Flow cards ("Turn on gang 2" and "Turn off gang 2")
> > again to generate fresh logs.
> >
> > The correct Report ID is: 81ad938d-6d24-409b-b336-34e0aa655721
> >
> > Let me know if you can extract the required DP numbers from this one.
> > Thanks!
> >
> > —
> > Reply to this email directly, view it on GitHub
> > <https://github.com/dlnraja/com.tuya.zigbee/issues/170?email_source=notifications&email_token=ACKLTUWCWA2C6NXNBO5AZQD4TAX3BA5CNFSNUABFM5UWIORPF5TWS5BNNB2WEL2JONZXKZKDN5WW2ZLOOQXTIMJUHA3TINZXGAY2M4TFMFZW63VHNVSW45DJN5XKKZLWMVXHJLDGN5XXIZLSL5RWY2LDNM#issuecomment-4148747701>,
> > or unsubscribe
> > <https://github.com/notifications/unsubscribe-auth/ACKLTUX6RWEEPM2JM4NWTZL4TAX3BAVCNFSM6AAAAACW6MP2LKVHI2DSMVQWIX3LMV43OSLTON2WKQ3PNVWWK3TUHM2DCNBYG42DONZQGE>
> > .
> > You are receiving this because you were mentioned.Message ID: <dlnraja/com
> > .***@***.***>
> >
> 

> **github-actions:** All fingerprints supported in v5.11.138. Closing as resolved.

> **dlnraja:** <!-- tuya-issue-manager -->
> Owner closed after verification.
> 
> Feel free to reopen if still relevant.

> **Ssssneak:** @dlnraja - It looks like the bot auto-closed this issue again (or it was closed by mistake). 
> 
> Could you please reopen it? 
> Just a reminder: the pairing works fine (which is why the bot thinks it's resolved), but the Flow Action cards for the gangs are still completely broken. 
> 
> I provided the Diagnostics Report ID (81ad938d-6d24-409b-b336-34e0aa655721) in my previous comment so you can check the DP numbers for the action listeners. Let me know if you need anything else!

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @Ssssneak posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

> **dlnraja:** <!-- tuya-issue-manager -->
> Owner closed after verification.
> 
> Feel free to reopen if still relevant.

> **Ssssneak:** @dlnraja - I have performed a Zigbee Interview for this device directly via Homey Developer Tools as requested. 
> 
> Interestingly, it looks like this specific model does NOT use Tuya custom DPs (0xEF00) for the relays. Instead, it uses standard Zigbee Endpoints (1, 2, and 3) with the standard OnOff cluster (0x0006). This probably explains why the generic "Turn On" works (triggers EP 1), but the sub-capabilities fail if they are mapped to Tuya DPs.
> 
> Here is the raw interview output:
> 
> <details>
> <summary>Click to expand Zigbee Interview JSON</summary>
> 
> ```json
>   "ids": {
>     "modelId": "TS0003",
>     "manufacturerName": "_TZ3000_v4l4b0lp"
>   },
>   "endpoints": {
>     "ieeeAddress": "84:71:27:ff:fe:9a:68:73",
>     "networkAddress": 48267,
>     "modelId": "TS0003",
>     "manufacturerName": "_TZ3000_v4l4b0lp",
>     "endpointDescriptors": [
>       {
>         "status": "SUCCESS",
>         "nwkAddrOfInterest": 48267,
>         "_reserved": 26,
>         "endpointId": 1,
>         "applicationProfileId": 260,
>         "applicationDeviceId": 256,
>         "applicationDeviceVersion": 0,
>         "_reserved1": 1,
>         "inputClusters": [ 0, 3, 4, 5, 6, 57344, 57345 ],
>         "outputClusters": [ 25, 10 ]
>       },
>       {
>         "status": "SUCCESS",
>         "nwkAddrOfInterest": 48267,
>         "_reserved": 20,
>         "endpointId": 2,
>         "applicationProfileId": 260,
>         "applicationDeviceId": 256,
>         "applicationDeviceVersion": 0,
>         "_reserved1": 1,
>         "inputClusters": [ 3, 4, 5, 6, 57344, 57345 ],
>         "outputClusters": []
>       },
>       {
>         "status": "SUCCESS",
>         "nwkAddrOfInterest": 48267,
>         "_reserved": 20,
>         "endpointId": 3,
>         "applicationProfileId": 260,
>         "applicationDeviceId": 256,
>         "applicationDeviceVersion": 0,
>         "_reserved1": 1,
>         "inputClusters": [ 3, 4, 5, 6, 57344, 57345 ],
>         "outputClusters": []
>       }
>     ]
>   }

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @Ssssneak posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

> **dlnraja:** <!-- tuya-issue-manager -->
> Owner closed after verification.
> 
> Feel free to reopen if still relevant.

> **dlnraja:** ### ✅ Fixed in v6.0.0
> 
> **Root Cause:** Device _TZ3000_v4l4b0lp was not recognized as ZCL-only mode switch, causing incorrect endpoint/DP handling.
> 
> **Solution Applied:**
> - Added _TZ3000_v4l4b0lp to ZCL_ONLY_MANUFACTURERS_3G array
> - This activates per-endpoint ZCL handling with:
>   - Direct writeAttributes per endpoint (fixes gang-specific commands)
>   - Individual attribute listeners per endpoint (fixes state reporting)
>   - Physical button detection per gang (fixes Flow triggers)
> 
> **Testing:**
> After updating to v6.0.0:
> 1. Remove device and re-pair
> 2. Flow cards "Turn on Gang 1/2/3" will now work correctly
> 3. Physical button presses will trigger gang-specific Flow cards
> 4. State updates will be reflected per gang
> 
> Install test version: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
> 
> This fix applies the same proven pattern used for BSEED switches (forum user Pieter_Pessers).

> **Ssssneak:** @dlnraja - BAD NEWS. The latest update broke the device completely (Critical Regression).
> 
> I installed the newest test version. To ensure a clean slate, I completely removed the device from Homey and re-paired it. 
> 
> Result: The device is now totally unresponsive. The App UI (device tiles) does not work anymore, and the Flow cards still don't work. The physical clicks also no longer trigger the "WHEN" Flow cards.
> 
> One more critical detail I just noticed: When I try to use the Flow Action cards for this switch, it actually CRASHES the entire Universal Tuya Zigbee app. The app is forced to restart itself, and during this reboot phase, the switches momentarily show up as "Unknown Devices" in the Homey UI.
> 
> This means the new mapping isn't just ignoring the command; it is throwing a fatal error/unhandled exception in the app's code whenever the Flow action listener is called. It seems the new mapping for the `_TZ3000_v4l4b0lp` fingerprint completely severed the communication. 
> 
> Could you please check the latest commit? Let me know if you want me to generate a new Diagnostics Report from this broken state.

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @Ssssneak posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

> **dlnraja:** <!-- copilot-analysis -->
> ### 🤖 Assistant AI Analysis & Fix Plan
> 
> Hi @Ssssneak,
> 
> First of all, I want to deeply apologize for this critical regression. You are absolutely right—forcing the `_TZ3000_v4l4b0lp` into the BSEED ZCL-only mode completely broke your device. I have removed the auto-close behavior from our bots so this issue stays open until you confirm it is perfectly fixed.
> 
> **Deep Root Cause Analysis:**
> I have reviewed the entire flow:
> 1. The original bug ("Flow cards run, give a green checkmark, but the switch does not react") was **not** a hardware or Zigbee endpoint mapping issue. 
> 2. It was a core logic bug in our Flow Action cards. In the code, the action card was using `device.setCapabilityValue(cap, true)`, which *only updates the Homey UI* without actually sending the Zigbee command to the device! 
> 3. Because I misidentified the cause, I put your device in `ZCL_ONLY_MANUFACTURERS_3G`. Since your device is a standard Tuya router and not a pure BSEED ZCL switch, this completely skipped the standard base initialization (`super.onNodeInit`), leaving critical variables undefined. That's why triggering any action caused a fatal unhandled exception (crash).
> 
> **The Correct Fix (being applied right now):**
> 1. I am removing `_TZ3000_v4l4b0lp` from the BSEED array so your device will initialize normally again.
> 2. I am fixing ALL the Flow Action cards across the app (`switch_1gang` to `switch_8gang`) to use `device.triggerCapabilityListener(cap, value)`. This will correctly forward the Flow card commands to the Zigbee network.
> 
> I'm pushing this fix to v6.0.1 immediately. Once the test version is built, I'll let you know so you can re-pair and test it safely.

> **Ssssneak:** @dlnraja - Thank you so much for the detailed explanation and the deep root cause analysis! I really appreciate your hard work on this and for taking ownership of the bug. 
> 
> I'm looking forward to v6.0.1 with great anticipation! 😉 I will test it and report back as soon as it's available. Thanks again!

> **dlnraja:** Hey @Ssssneak,
> 
> Thanks for the detailed report! It looks like the TS0003 (_TZ3000_v4l4b0lp) is indeed using the `switch_3gang` driver, but the sub-capabilities for the individual gangs aren't linked properly for Flow actions and state reporting.
> 
> To help me troubleshoot this, could you run a device interview? This will give us more insight into how the device is communicating and help us fix the mapping issue for the Flow cards.
> 
> Once we have that info, we can work on getting those individual gang controls working as expected. Appreciate your help!

> **Ssssneak:** @dlnraja - I think our messages crossed paths! 😉 
> 
> I actually provided the full raw Zigbee Interview JSON in a comment just a little bit higher up in this thread. 
> 
> Also, in your latest reply, you already confirmed you found the root cause (the `setCapabilityValue` bug vs `triggerCapabilityListener`) and mentioned that you are pushing the fix to v6.0.1. 
> 
> Just confirming we are on the same page: you have all the data you need from my previous comment, right? I am standing by to test v6.0.1 as soon as it drops!

> **dlnraja:** Yes but there is others root causes
> 
> I continue to investigate. 
> 
> Best regards 

> **Ssssneak:** @dlnraja - Take your time! Since we are brainstorming, I was looking at the Zigbee Interview and thinking about why the Flow Action cards might still fail (or crash) even after fixing the UI state bug.
> 
> Because this specific model relies on standard ZCL Endpoints (1, 2, and 3) with the standard OnOff cluster (0x0006) instead of Tuya's custom 0xEF00 DP cluster, could the issue be in how the Homey SDK routes the command to the specific endpoints? 
> 
> If the Flow Action card eventually calls `device.triggerCapabilityListener('onoff.2', true)`, does the base device driver explicitly map `onoff.2` to `endpoint: 2` in the capability registration options? I've seen cases in Homey where, if the `{ endpoint: x }` object isn't explicitly passed during the multi-gang `genOnOff` cluster initialization, the system either defaults all commands to Endpoint 1 or throws an undefined endpoint error (which might explain the crash).
> 
> Just an engineering thought from my side! Good luck with the investigation!

> **dlnraja:** Resolved: _TZ3000_v4l4b0lp is mapped to switch_3gang driver. Sub-capability flow cards for Gang 1/2/3 have been fixed with proper endpoint routing and attribute reporting in the latest version. Remove and re-pair to apply the fix.

> **Ssssneak:** @dlnraja - Update on v6.0.1: The manual control via the device UI tiles works perfectly now, so the endpoint mapping is definitively fixed! Thank you!
> 
> However, the Flow Action cards (Turn on/off gang 1/2/3) are experiencing a "Silent Failure". 
> 
> I completely removed the device, re-paired it on v6.0.1, and created a brand new flow to test it. The Flow executes perfectly from Homey's perspective (no errors, no app crashes), BUT the physical relay does not react at all.
> 
> It looks exactly like the `setCapabilityValue` vs `triggerCapabilityListener` bug you mentioned earlier. Is it possible that the action card definitions specifically for the `switch_3gang` driver were missed in this update?
> 
> I triggered the Flow cards and immediately generated a fresh Diagnostics Report so you can see exactly what the card is sending (or missing) under the hood:
> Diagnostics ID: 08be6587-7fa0-4e1e-a57c-238a690aac73
> 

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @Ssssneak posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

> **dlnraja:** ### ✅ Fixed in the local branch!
> 
> @Ssssneak - You were absolutely right! 🎯 The silent failure was happening because the multi-gang Flow Action cards inside the \wall_switch_*_1way\ drivers were bypassing Homey's capability abstraction and directly attempting to invoke ZCL callbacks (\^Gwait onOff.setOn()\). 
> 
> Because your specific standard router device handles Tuya custom DP tunneling fallback for its sub-gangs through \TuyaZigbeeDevice\ (which does not instantiate pure independent ZCL \onOff\ Endpoint Clusters for Endpoints 2 and 3 natively out of the box), these generic ZCL calls vanished into the void!
> 
> **The Master Fix applied:**
> I have comprehensively patched all Action Flow cards across all 2-gang, 3-gang, and 4-gang driver combinations. The action handlers now properly utilize \^Gwait args.device.triggerCapabilityListener('onoff.gangX', true/false)\ instead! This routes the flow action exactly as if you had tapped the UI tile, meaning the underlying driver architecture now perfectly decides whether to tunnel the request via Tuya DPs or standard ZCL depending on the \ZCL_ONLY_MANUFACTURERS_3G\ array!
> 
> The fix is pushed to the pipeline and will be available in the next deployment cycle. Thank you again for the flawless QA testing and the exact diagnostic pointers!

> **dlnraja:** The unlinked flow cards for the 3-gang switch (TS0003) have been resolved by implementing the missing 	riggerCapabilityListener core shim and rectifying the sub-capability mapping logic in v5.12.0. This ensures all gangs now correctly trigger flows when toggled via the app or physical button. Please remove and re-pair your device to pick up the updated capability mapping. Thanks for your patience!

> **Ssssneak:** @dlnraja - We have a tiny new issue after the update! 😅
> 
> I updated the app, removed the switch, and tried to re-pair it. However, the device is no longer recognized by the Universal Tuya Zigbee app at all. It now pairs directly as a generic "Basic Zigbee Device" natively by Homey (showing the default 'Z' Zigbee icons in Flows, with no multi-gang options).
> 
> In your previous message, you mentioned: "I am removing `_TZ3000_v4l4b0lp` from the BSEED array". 
> Could it be that the fingerprint was accidentally removed entirely from the `switch_3gang` driver definitions instead of just being moved to the standard array? 
> 
> The app simply doesn't recognize `_TZ3000_v4l4b0lp` during pairing anymore.
> 

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @Ssssneak posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

> **dlnraja:** Salut @late4marshmellow ! 👋 J'ai de super nouvelles : j'ai implémenté le 'Tuya Magic Spell' directement dans la classe de base des interrupteurs hybrides. 
> 
> Cela force la lecture des attributs genBasic au démarrage, ce qui réveille le reporting des gangs 2 et 3 sur les modèles TS0003 comme le tien (_TZ3000_v4l4b0lp). Plus besoin de patch manuel par driver, c'est maintenant géré proprement et nativement pour tous les interrupteurs multiprises récalcitrants ! 🪄
> 
> La version v7.0.x arrive sur le canal Test avec ce correctif. Un immense merci pour ton aide et ta patience sur ce bug ! On ferme la boucle ici. 🎉

> **Ssssneak:** @dlnraja - I just did a clean test on v7.0.9. Unfortunately, the device is not recognized by the app at all during pairing. It falls back completely to Homey's generic "Basic Zigbee Device" (with the black 'Z' icon).
> 
> In your previous comment, you mentioned: "I am removing `_TZ3000_v4l4b0lp` from the BSEED array". 
> It looks like the fingerprint was successfully removed from there, but it seems it wasn't added to the standard `switch_3gang` driver array in the new v7 build. 
> 
> Could you please double-check if the `_TZ3000_v4l4b0lp` fingerprint is actually mapped anywhere in the current v7.0.9 code? The app is totally blind to it right now.

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @Ssssneak posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

> **dlnraja:** I have broken everything late yesterday night 😭😭
> 
> I will fix asap .
> 
> Le mar. 7 avr. 2026, 10:09, Ssssneak ***@***.***> a écrit :
> 
> > *Ssssneak* left a comment (dlnraja/com.tuya.zigbee#170)
> > <https://github.com/dlnraja/com.tuya.zigbee/issues/170#issuecomment-4197498280>
> >
> > @dlnraja <https://github.com/dlnraja> - I just did a clean test on
> > v7.0.9. Unfortunately, the device is not recognized by the app at all
> > during pairing. It falls back completely to Homey's generic "Basic Zigbee
> > Device" (with the black 'Z' icon).
> >
> > In your previous comment, you mentioned: "I am removing _TZ3000_v4l4b0lp
> > from the BSEED array".
> > It looks like the fingerprint was successfully removed from there, but it
> > seems it wasn't added to the standard switch_3gang driver array in the
> > new v7 build.
> >
> > Could you please double-check if the _TZ3000_v4l4b0lp fingerprint is
> > actually mapped anywhere in the current v7.0.9 code? The app is totally
> > blind to it right now.
> >
> > —
> > Reply to this email directly, view it on GitHub
> > <https://github.com/dlnraja/com.tuya.zigbee/issues/170#issuecomment-4197498280>,
> > or unsubscribe
> > <https://github.com/notifications/unsubscribe-auth/ACKLTUV3NHKDS47UP7O4BZD4USZUHAVCNFSM6AAAAACW6MP2LKVHI2DSMVQWIX3LMV43OSLTON2WKQ3PNVWWK3TUHM2DCOJXGQ4TQMRYGA>
> > .
> > You are receiving this because you were mentioned.Message ID: <dlnraja/com
> > .***@***.***>
> >
> 

> **Ssssneak:** @dlnraja - No worries at all, get some coffee first! ☕ 
> 
> If it helps save you some time tracking it down: since the device drops straight to Homey's generic "Basic Zigbee Device" during pairing, the Homey Zigbee core isn't matching the fingerprint with your app anymore. 
> 
> Could you do a quick check in the `driver.compose.json` (or `app.json`) specifically for the `switch_3gang` driver? It’s highly likely that `_TZ3000_v4l4b0lp` just got completely wiped from the `zigbee.manufacturerName` array when you were removing it from the BSEED list, and it never made it into the standard array.
> 
> Another quick thought: if your new "Magic Spell" base class intercepts the pairing/discovery phase, maybe it's accidentally filtering out or rejecting standard TS0003 manufacturer names now?
> 
> Just some friendly QA brainstorming! Take your time!

> **late4marshmellow:** @dlnraja
> 
> Just a heads-up related to the duplicate Flow card ID fix — It looks like something went wrong when my submitted PR was merged/applied.
> 
> The original problem was ~70 duplicate Flow card trigger IDs (from the heal-hybrid-flows.js script copying IDs verbatim from source drivers into hybrid drivers), which caused:
> 
> `Error: Found multiple Flow card triggers with the id "button_pressed"`
> 
> The fix in my PR renamed the IDs in the hybrid drivers to be driver-specific (e.g. curtain_motor_wall_hybrid_button_pressed) so they're globally unique.
> 
> However, in the current v7.0.9 the situation is significantly worse — running the same check now shows 513 duplicate flow card IDs, meaning the daily self-healing script (heal-hybrid-flows.js) ran again after the fix and regenerated all the duplicates (plus many new ones for the new hybrid drivers added since).
> 
> The root cause that needs fixing is the script itself — it needs to prefix generated IDs with the driver name, otherwise it will just keep recreating the problem every night. Something like:
> 
> ```
> // Instead of copying the ID as-is:
> id: match.id
> // Use a driver-specific prefix:
> id: `${hybrid}_${match.id.replace(/^.*?_/, '')}`
> ```
> 
> 

---

### [#162] [fingerbot] Bug:
*Author: dalobalo | Created: 2026-03-17T19:53:01Z*

**Body:**
Hi @dlnraja . Getting error "Missing Capability Listener: button.push" and "Missing Capability Listener: onoff". Also not seeing battery status.

Tried removing and re-pairing with no luck. Also re-installed the app.
Currently on v5.11.118


**Comments (6):**
> **dlnraja:** Please tell me witch devices and send me an diag log and do an interview ZigBee please. 

> **github-actions:** <!-- tuya-triage-bot -->
> Already in the [Universal Tuya Zigbee fork](https://github.com/dlnraja/com.tuya.zigbee) v5.11.138: `dlnraja` → **generic_diy**.
> 
> Grab it here: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
> 
> Remove and re-pair after installing. If something's off, drop a diagnostic report ID on the [forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).

> **dlnraja:** ### ✅ Fixed in v6.0.0
> 
> The 'Missing Capability Listener' error on initialization was a timing issue where the device was sending state reports before the driver had fully registered its listeners in the code.
> 
> This has been globally fixed in **v6.0.0** for the fingerbot and 24 other device types. The initialization sequence has been reordered so listeners are always ready before the device connects.
> 
> Battery status should also be resolved, as v6.0.0 introduces a new \PowerSourceIntelligence\ engine that handles battery reporting dynamically.
> 
> **Next Steps:**
> 1. Update to the latest test version: https://homey.app/a/com.dlnraja.tuya.zigbee/test/
> 2. Remove and re-pair your Fingerbot to apply the new sequence.

> **dlnraja:** Fixed in master. button.push capability was added to fingerbot compose configuration.

> **dalobalo:** Hi @dlnraja,
> 
> I can confirm that it’s possible to activate the Fingerbot (click motion only).
> 
> Unfortunately, battery status and flows are not available since the device is added as a generic Zigbee unit with “no supported app” (as Homey reports).
> 
> It would be great to also support additional actions such as:
> 	•	Push (two states)
> 	•	Click (including multiple clicks, e.g. X times)
> 	•	Push and hold (for X seconds)
> 
> At the moment, it’s limited to operating a single button press. It would also be nice if the icon could be changed to the same used in Johans app

> **github-actions:** <!-- tuya-reopen-bot -->
> This issue has been **automatically reopened** because @dalobalo posted a new comment.
> It will be reviewed in the next automation cycle.
> 
> > If your device is still not working, please share:
> > 1. **Device Interview** from [Developer Tools](https://tools.developer.homey.app)
> > 2. **Diagnostic Report ID** from device settings

---

## Open Pull Requests (1)

### [#201] 🔄 Universal Maintenance: Device Variants Synchronisation
*Author: app/github-actions | Created: 2026-04-07T03:36:17Z*
**Status:** OPEN | **Mergeable:** MERGEABLE

**Body:**
## 🔄 Maintenance Report
This PR automatically synchronizes new device variants and improves compatibility.

**Checks performed:**
- [x] New device IDs detected using heuristics script
- [x] Endpoint routing validated for multi-gang devices
- [x] Tuya raw frame handlers adapted

*Please review carefully before merging.*

---

