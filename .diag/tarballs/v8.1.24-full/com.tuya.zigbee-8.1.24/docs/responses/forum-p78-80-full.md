# Forum Responses - Pages 78-80 (Full Personalized)
# Post as dlnraja on community.homey.app

---

## 1. @Hartmut_Dunker - 4-Gang Switch (CRITICAL FIX)
**Device:** _TZ3002_pzao9ls1 / TS0726 | **Diag:** 7646007a

Hi Hartmut,

Thank you for your patience and for the new diagnostic. I found the root cause: your device was incorrectly assigned to wall_switch_4gang_1way instead of switch_4gang. The wall_switch driver only exposes 1 virtual button, which explains why all 4 physical buttons were controlled together and only button #1 was detected.

**Fix applied:** I've removed the conflicting fingerprints from wall_switch_4gang_1way. Your TS0726 will now correctly pair with switch_4gang, which has full support for all 4 gangs with the BSEED ZCL-only packetninja technique.

**Action needed:** Please remove the device from Homey and re-pair it after updating to the next test version. You should then see 4 separate gang controls.

Best regards.

---

## 2. @DomLAJO - PIR Motion Sensor ZM-35H-Q (FIXED)
**Device:** _TZE200_gjldowol / TS0601

Hi DomLAJO,

Your PIR motion sensor ZM-35H-Q (_TZE200_gjldowol) has been added to the motion_sensor driver. It was previously misclassified. The Z2M reference you shared (issue #24085) confirmed it's a Tuya DP-based PIR sensor.

**Action needed:** Update to the next test version, remove and re-pair the device. It should now appear as a Motion Sensor with PIR detection capabilities.

Best regards.

---

## 3. @Jeff_James - Contact Sensor DS01 / Zbeacon (FIXED)
**Device:** Zbeacon / DS01

Hi Jeff,

The Zbeacon manufacturer has been added back to the contact_sensor driver. Your DS01 should now be recognized correctly.

**Action needed:** Update to the next test version, remove and re-pair. The contact sensor should appear with open/close detection.

Regarding "turning on" the contact sensor - contact sensors are passive devices that detect door/window open/close states. They don't have an on/off switch. If you mean the sensor is not reporting state changes, please send a diagnostic code after re-pairing and I'll investigate further.

Best regards.

---

## 4. @Chris_M - 1-Gang Switch TS0041
**Device:** _TZ3000_22ugzkme / TS0041

Hi Chris,

Your device _TZ3000_22ugzkme / TS0041 is already supported in the app as a wireless scene button (button_wireless_1 driver). TS0041 devices are battery-powered wireless scene switches, not mains-powered wall switches.

**Action needed:** Make sure you're on the latest test version (https://homey.app/a/com.dlnraja.tuya.zigbee/test/). Remove and re-pair the device - it should appear as "Wireless Button 1-Gang". If it still shows as unknown, please send a diagnostic code.

Best regards.

---

## 5. @ManuelKugler - Smart Plug TS011F Energy + Soil Fertilizer
**Device 1:** _TZ3000_wzmuk9ai / TS011F (plug_energy_monitor)
**Device 2:** Soil sensor - fertilizer level

Hi Manuel,

**Smart plug:** Your _TZ3000_wzmuk9ai / TS011F is in the plug_energy_monitor driver which supports energy measurement via ZCL clusters 2820 (electricalMeasurement) and 1794 (metering). Both clusters are present in your device interview. If the energy values don't appear after re-pairing, please send a diagnostic code - some TS011F variants need specific attribute configuration.

**Soil fertilizer:** The fertilizer level capability requires specific DPs from the device. Not all soil sensors report fertilizer data. Could you share the manufacturer name and a diagnostic code for this device? That will help me check which DPs your specific sensor supports.

**Rain sensor IAS Zone error:** The "IAS Zone enrollment incomplete" message means the sensor needs to re-enroll with Homey's coordinator. Please remove and re-pair the device - the latest version has improved IAS enrollment handling.

Best regards.

---

## 6. @Bjorn_Snijders - Smart Knob TS004F
**Device:** _TZ3000_gwkzibhs / TS004F (smart_knob_rotary)

Hi Bjorn,

Your smart knob is recognized by the correct driver (smart_knob_rotary). The press and rotation events use ZCL scene/level cluster commands. The error messages in your screenshots suggest the device is sending commands but they're not being processed correctly.

**Action needed:** Please send a diagnostic code after the issue occurs. Also, check if the knob has different modes (event mode vs command mode) - some TS004F knobs need to be switched to "event mode" by pressing and holding for 3 seconds. In command mode, they send direct ZCL commands instead of scene events.

Best regards.

---

## 7. @Ronald_Bok - Soil Moisture Sensor
**Device:** _TZE284_oitavov2 / TS0601 (soil_sensor)

Hi Ronald,

Your soil moisture sensor is supported in the soil_sensor driver. The "Can't make connection" error during pairing is common with sleepy end devices (battery-powered). These devices only wake up briefly to communicate.

**Tips for pairing:**
1. Keep the sensor very close to Homey (within 1 meter) during pairing
2. Press the reset/pair button on the sensor and immediately start the pairing process in Homey
3. Try multiple times - sleepy devices can be tricky to pair
4. Make sure no other Zigbee pairing process is active

The fact that it appears in the developer tool means the Zigbee network sees it. It just needs to complete the pairing handshake during a wake window.

Best regards.

---

## 8. @Peter_van_Werkhoven - Multiple Devices
**Device 1:** _TZE200_pay2byax (contact_sensor) - inverted + SOS
**Device 2:** _TZE200_vvmbj46n (lcdtemphumidsensor) - won't connect
**Device 3:** _TZ3000_0dumfk2z (button_emergency_sos) - no response
**Diags:** cbb048b3, 8944df4d

Hi Peter, thank you for your continued patience and kind words!

**Contact sensor (_TZE200_pay2byax):**
The invert contact setting should work. If setting it to "Yes" makes it stuck on "closed", there may be a DP value inversion issue specific to this model. I'll check the DP mapping in the next version. For now, you can try using a flow to invert the state as a workaround.

**LCD Temp/Humidity (_TZE200_vvmbj46n):**
This is a Tuya DP device that can be difficult to re-pair. Same tips as for Ronald: keep very close, press reset, try multiple times. The device appearing in developer tools is a good sign - it means the radio connection works but the application-level pairing didn't complete.

**SOS Button (_TZ3000_0dumfk2z):**
This device is in the button_emergency_sos driver. If the button hasn't reported in 2 months, the battery may be dead or the device lost its network connection. Try: new battery, re-pair close to Homey.

I'll look at your diagnostics in detail for the next release.

Best regards.

---

## 9. @Lasse_K - Contact Sensor Unknown
Hi Lasse,

I see you've reported this across multiple versions (5.11.113, 115, 118). To investigate, I need to know the exact device - could you please:
1. Go to Developer Tools (https://my.homey.app/tools)
2. Find your contact sensor in the Zigbee section
3. Share the manufacturerName and modelId

Or send a diagnostic code from the app settings. Without knowing the specific fingerprint, I can't determine why it's showing as unknown.

If it worked in v43 (Johan's original version), the fingerprint may have been removed during the conflict resolution process. Once I know the exact device, I can add it back.

Best regards.

---

## 10. @Simon_Ojstersek - Scene Switch 4 Buttons
**Diag:** f3c3248f-5b5a-4916-924d-8c378b37251c

Hi Simon,

I'll check your diagnostic to identify the exact device. Scene switches with 4 buttons are typically TS0044 (battery-powered) or TS004F (smart knob). These are supported in the button_wireless_4 or smart_knob_rotary drivers.

Could you also share the manufacturerName and modelId from Developer Tools? That helps speed up the investigation.

Best regards.

---

## 11. @FinnKje - IR Remote TS1201 (Already Supported)
**Device:** _TZ3210_jic09i9a / TS1201

Hi FinnKje,

Your IR remote is already supported in the ir_blaster driver! Both _TZ3210_jic09i9a and _TZ3210_ogx8u9it are in the fingerprint database.

**Action needed:** Update to the latest test version and pair the device. It should appear as an IR Blaster. The Tuya DP protocol (cluster 0xEF00) with DP1/DP2/DP3 for code control/learn/report is handled by the TuyaEF00Manager.

Best regards.

---

## 12. @Olivier_VE - HOBEIAN ZG-302Z3 3-Gang (FIXED)
**Device:** HOBEIAN / ZG-302Z3

Hi Olivier,

The HOBEIAN manufacturer has been added to the switch_3gang driver. Your ZG-302Z3 should now be recognized correctly with all 3 gangs.

**Action needed:** Update to the next test version, remove and re-pair. All 3 buttons should be controllable individually.

Best regards.

---

## 13. @H_van_Barneveld - Tank Level Sensor
Hi H_van_Barneveld,

Could you share the manufacturerName and modelId of your tank-a-level sensor? You can find this in Developer Tools (https://my.homey.app/tools) under the Zigbee section. That will help me check if it's supported or needs to be added.

Best regards.

---

## 14. @blutch32 - Device Not Responding
**Diag:** 693fd5c1

Hi blutch32,

The red signal means the device lost its Zigbee connection. This can happen after power outages, Homey restarts, or if the device is too far from the mesh.

**Steps to fix:**
1. Power cycle the device (unplug/replug)
2. If that doesn't work: remove from Homey, factory reset the device, then re-pair
3. Make sure you have Zigbee routers (powered devices) between Homey and your device for mesh reliability

If the issue persists after re-pairing, send a new diagnostic and I'll investigate.

Best regards.
