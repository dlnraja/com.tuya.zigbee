# L99 Four-Thread Full Harvest — 2026-09-14

Silent only. **Never** Homey forum POST (T157628). Local-first. Never invent pid.

Generated: 2026-09-13T22:39:08.785Z

## T140352 — universal-tuya-zigbee
- Title: [APP][Pro] Universal TUYA Zigbee Device App - test
- Posts fetched: **2155** / highest #2235
- Classes: {"maintainer":700,"other":500,"question":184,"thanks":243,"bug":142,"device_request":44,"diagnostic":342}
- Images: 1859 · Diags: 366
- Top link hosts: us1.discourse-cdn.com(2325), emoji.discourse-cdn.com(709), github.com(138), homey.app(122), sea1.discourse-cdn.com(101), community.homey.app(39), tools.developer.homey.app(24), nl.aliexpress.com(12), www.zigbee2mqtt.io(12), a.aliexpress.com(9)

### Uncovered couples (mfr not in app.json — verify before lock)
- `_TZE200_xxxxx`+`TS0601` ×1 users=dlnraja posts=#1045
- `_TZE200_xxxxx`+`TS0207` ×1 users=dlnraja posts=#1045
- `_TZE200_abc123`+`TS0601` ×1 users=dlnraja posts=#2165

### Recent bugs
- #2157 @Mike_Nono: Hi. No fork for me, but don’t have like 400 duplicates for the same device in different devices = fail. But I wish you the best on this journey.
- #2160 @Peter_van_Werkhoven: Hi Dylan Good day unfortunately the app is crashing again. 1000040469 1220×2712 226 KB Good luck and have a nice day with best regards Peter.
- #2178 @Gabriel_Pedrosa_Mach: Appreciate you digging into the endpoint isolation. On gang2: I get why onoff.gang2 -style capability instances mirror the physical Tuya layout more closely, bu
- #2182 @Gabriel_Pedrosa_Mach: hanks for forwarding it! The switches I’ve been testing correspond to the TB25 series — TB25-1, TB25-2, TB25-3, TB25-4 and TB25-6 (1 to 6 gang), plus a 4-gang Z
- #2209 @Cam: Hi there @dlnraja Just checking in after a few months of devices not working and trying to add them again. My smart button and motion sensor aren’t detecting/pa
- #2218 @Joep_Vullings: I tried to repair my two way Irrigation Valve, but it wasn’t recognized. It paired as unknown Zigbee device. Could you look into it?
- #2222 @VicHY: Hi @dlnraja I’ve noticed that if I delete the presence sensor and reconnect it, it works fine, but after a while (it seems to coincide roughly with updates), it
- #2228 @Eduard_Martirosyan: Hi @dlnraja , Thanks a lot for your work on this app. I have a tubular roller blind motor with a built-in Tuya Zigbee receiver that is not recognised. It pairs 

### Recent device requests
- #1604 @Olivier_VE: Hi, ​ Could you please add support for this 3-gang Wall Switch (HOBEIAN ZG-302Z3)? ​ Manufacturer ID: HOBEIAN ​Product ID: ZG-302Z3 ​ Device ID: a4:c1:38:37:d3:
- #1701 @Adri1: Title: Add support for temperature/humidity sensor TS0201 (_TZ3000_bgsigers) Body: Device: Temperature / Humidity sensor manufacturerName: _TZ3000_bgsigers mode
- #1912 @Roger_Gorissen: smarthomesven: You need to run npm install first before running homey app install . All right, did that. But that really scares me. As far as I understand the e
- #2032 @dzsandzsee: Please add this Presence sensor to the app "ieeeAddress":string"a4:c1:38:d3:de:d0:e6:77", "networkAddress":int65248, "modelId":string"CK-BL702-MWS-01(7016)", "m
- #2099 @VicBehrens: Hi Dylan, Thanks for assisting with all these different device issues! I requested a Moes 4-gang smart switch to be added 2 weeks ago, and as per the Github com
- #2115 @thierry_arguimbau: Hello, could you please add this dual energy meter to your app? Thank you in advance. Best regards, https://fr.aliexpress.com/item/1005007902450082.html?spm=a2g
- #2129 @Welshsmarthome: Hi. Hope ive not missed it already, so many devices Could you please add support for Zigbee Dual wall socket without power metering IMG_0038 1289×694 63.5 KB Ma
- #2130 @Kanbros: Hi @dlnraja , Could you please add support for the BSEED 2-gang touch switch to your Universal TUYA Zigbee Device app? Currently, it pairs as a basic device and

## T26439 — johan-tuya-zigbee
- Title: [APP][Pro] Tuya Zigbee App
- Posts fetched: **1201** / highest #5511
- Classes: {"bug":93,"device_request":87,"thanks":178,"other":504,"question":301,"diagnostic":23,"maintainer":15}
- Images: 737 · Diags: 27
- Top link hosts: us1.discourse-cdn.com(593), emoji.discourse-cdn.com(253), sea1.discourse-cdn.com(206), github.com(117), community.homey.app(56), homey.app(33), www.aliexpress.com(13), a.aliexpress.com(12), tools.developer.homey.app(9), nl.aliexpress.com(8)

### Uncovered couples (mfr not in app.json — verify before lock)
- `_Tze204_1Dxkck`+`TS0601` ×1 users=Gabriel_Pedrosa_Mach posts=#5201

### Recent bugs
- #5443 @Roger_Gorissen: This app suddenly starts to crash. Restarting, reinstalling, nothing helps. Out of the blue. Anyone any idea??
- #5445 @Rudi_Hendrix: What do you mean with “crash”? I don’t get any notification… And everything seems to run well
- #5448 @Rudi_Hendrix: Ah, ok… In my case there is no crash. Then again, I am using my own version of the app. I don’t have the Universal Zigbee app installed anymore. I had it for a 
- #5449 @Roger_Gorissen: smarthomesven: You can also disable 1 of the apps before pairing, then it will pair with the other, enabled app. So before pairing, you need to disable the app 
- #5460 @Riccardo_Baro: Hi @Johann_Bendz , could you please add support for this 4-gang switch? It is currently recognized as an Unknown Zigbee Device. Manufacturer ID: _TZE204_ex3rcdh
- #5463 @Kringloper: Roger_Gorissen: In the first post of this topic/ app is explained how to interview a device to get the data to add it to the app. Just mentioning the name of th
- #5506 @smarthomesven: At least for me, all devices work perfectly. There was only 1 issue which was caused by a bug in the Tuya Homey app, so not Tuya’s fault. Many devices I pair wi
- #5511 @Kai_Dybvik: Thanks for a lot of good answers here nice and have a dilog on this. Tuya is cheap and works perfectly fine with the tuya app. but Homey is now my new hub. The 

### Recent device requests
- #5437 @punkportaldan: Thanks for the very fast answer! Is there any way to troubleshoot what my issue with this device might be? Can I collect traces somehow? As I see Github is used
- #5454 @Tobias-B: Hi @Johann_Bendz I’ve just submitted a device request on GitHub for a new SmarterCurry (JoyousMall) Solar Lux Sensor. It’s currently recognized as a generic Zig
- #5457 @Christian_Jorgensen: Device Request: Vibration Sensor Hi! Could you please add support for this vibration sensor? It currently adds as an Unknown/Generic Zigbee device with non-func
- #5481 @late4marshmellow: Even though that is indeed a better way to post interviews, they should be directed to Github johan_bendz: PROCESS FOR REQUESTING DEVICES TO BE ADDED If your de
- #5488 @Sergio_B: Hi @johan_bendz Please add support for this smart button switch: Manufacturer name: Hobeian Model ID: ZG-101ZL Device type: enddevice Thank you
- #5491 @Martin_Kliment: Device Request - Soil Moisture Sensor SGS02Z - _TZE284_nt4pquef / TS0601 Hi, could you please add support for the Tuya Zigbee soil moisture &amp; temperature se
- #5493 @Alejandro_Palladino: Necesitaria conectar este dispositivo: Hi! Could you please add support for this Tuya mmWave presence sensor? Manufacturer ID: _TZE284_debczeci Product ID: TS06
- #5509 @smarthomesven: Probably because the newer Tuya Zigbee devices are not supported. With a Tuya Zigbee gateway (I use one as well), you can connect them using the official app. I

## T106779 — tuya-inc-official
- Title: [APP] Tuya - Connect any Tuya device with Homey (by Tuya Inc. / Athom)
- Posts fetched: **1131** / highest #1172
- Classes: {"other":624,"thanks":98,"bug":74,"question":298,"device_request":27,"diagnostic":5,"maintainer":5}
- Images: 722 · Diags: 12
- Top link hosts: us1.discourse-cdn.com(462), sea1.discourse-cdn.com(264), emoji.discourse-cdn.com(238), github.com(70), community.homey.app(52), homey.app(43), developer.tuya.com(7), www.tuya.com(4), www.youtube.com(4), en.wikipedia.org(3)

### Uncovered couples (mfr not in app.json — verify before lock)
- (none in extract)

### Recent bugs
- #1049 @bogdan_marcu: I started looking into homey at the start of the year when the tuya was still working. Have tons of tuya devices so i thought this was a very good idea. Couple 
- #1052 @Dijker: dlnraja: much for 1 licence Key for 1 Homey pro for tuya cube .? I would like to buy one Go to Cube Private Cloud / Tuya Smart And push the Screenshot_20250610_
- #1053 @bwa: Hi ! I’m using Homey to control my AC, it works fine, but the reporting back flow card is not working, or works but delayed with several hours. The flow card im
- #1081 @deejayreissue: Thanks for the update I’m honestly done with Tuya. I’ll be replacing my Bathroom GU10s with Aqara very soon and my Knightsbridge sockets with the upcoming Aqara
- #1082 @Ronwell: i found a cheap work around to get tuya devices into homey. I bought a $30 rasberry pi and did a basic home assistant install ( I hear ya, I hate HA as well). I
- #1086 @luca_reina: I struggle to understand.. probably it’s just my own problem. We all (hopefully) have reason, taste, and the freedom to choose whatever solution best fits us. Y
- #1149 @Andy_Henderson: SamB: I am a bit stuck here too. I understand I can control the device using a flow but can’ t I tie that flow to the press of the button that’s created with th
- #1156 @Rudi_Hendrix: It’s broken in my case. Someone complained in the Tuya Cloud topic. However that one is still working. All devices connected mention to be unavailable

### Recent device requests
- #459 @Bernd_Gaykema: Yep, I made a device request for my heatpump (AdlarCastra Aurora 2). Hopefully the tile will be available before the cold season starts … . In the meantime I pl
- #466 @bayrambass: Hi, I am getting this error: Invalid Value: led_type_2 It is a Tuya 2 Gang dimmer. These are the device specifications: { “device”: { “active_time”: 1723816911,
- #509 @Peter_Kawa: Stefan, it looks like your specific siren is not supported yet. You can request for support here
- #704 @Rett_Pop: Personally for me it is perfect lesson to stay away from cloud based devices. Especially for lights. Lights I even keep on physical switches duplicating them wi
- #974 @Rudi_Hendrix: robertklep: Which still doesn’t explain why “In using the HA community app, I might as well think of continuing to use the Homey Tuya Cloud community app” . Yes
- #975 @robertklep: Rudi_Hendrix: If I use the official HA - Tuya integration it is supported by Tuya. (Like we hoped the official Homey - Tuya app would be supported by Tuya) If I
- #984 @SunBeech: Are you using the latest test version of the Tuya Zigbee app (v0.2.73)? If not supported by that version, check the first post for requesting support for this d
- #1023 @semolex: Yep, just what I thought And again - sorry for off topic. Very very sad, I really tried to struggle with it but tired up writing own drivers for each Zigbee dev

## T15811 — tuyapi-neo-coolcam-wifi
- Title: [APP][Pro] TuyAPI / Neo Coolcam wall plug WIFI app
- Posts fetched: **336** / highest #356
- Classes: {"other":141,"question":113,"bug":22,"thanks":44,"device_request":14,"diagnostic":2}
- Images: 192 · Diags: 3
- Top link hosts: us1.discourse-cdn.com(184), emoji.discourse-cdn.com(62), github.com(22), sea1.discourse-cdn.com(22), homey.app(12), ae01.alicdn.com(10), community.homey.app(9), www.aliexpress.com(8), www.action.com(5), www.amazon.co.uk(4)

### Uncovered couples (mfr not in app.json — verify before lock)
- (none in extract)

### Recent bugs
- #210 @Giuseppe_Rechichi: After reinstalling app, it doesn’t crash anymore. But the power strip is still not working Any suggestion? Screenshot_2021-04-02-13-28-41-860_app.homey 1080×234
- #214 @Giuseppe_Rechichi: Hi. Thank you. Now there’s no error shown but I it’s not working (if I switch on or off nothing happens). Tell me if I can help you to help me I don’t know what
- #222 @Giuseppe_Rechichi: Hi @Rens_Brandwijk , AOFO power strip still not working! The symbol on the device icon disappeared after a while, but I still can’t switch it on/off from the ap
- #244 @Giuseppe_Rechichi: Nope. Still not working
- #266 @LinusN: also finding NEW DATA ATRIBUTE: {“dps”:{“9”:0},“t”:1641751481} NEW DATA ATRIBUTE: {“dps”:{“17”:3},“t”:1641753150} 9 = Switch 1 countdown countdown_1 Send and re
- #270 @Rens_Brandwijk: Well, the script indeed does not process these parameters (as homey does not have anywhere to store it) but i check the availability of every parameter before p
- #290 @Kulawig: concerning neo plug 3600 with power meter, i have the ID and KEY for the unit but i can only connect to the plug if i use a static IP address – and even if homy
- #295 @Rens_Brandwijk: I removed the backend of those flowcards in the 2.1.3 release because they kept crashing multisock devices and at the time there was no real documentation on ho

### Recent device requests
- #91 @Rens_Brandwijk: [APP][Pro] TuyAPI / Neo Coolcam wall plug WIFI app Apps Just submitted version 1.0.7 for review by Athom (normaly takes a couple of days to get accepted). In th
- #167 @Rens_Brandwijk: [APP][Pro] TuyAPI / Neo Coolcam wall plug WIFI app Apps Just submitted version 1.0.7 for review by Athom (normaly takes a couple of days to get accepted). In th
- #199 @Pierre-Axel_ROGER: Hi! Will you add support for garage door? I succesfully grab the key, the id and of course the IP. It only miss the support by the app. It’s a short contact and
- #201 @Rens_Brandwijk: So, first of all. I’m sorry for being silent for so long. These are very busy times for me. I’ve published the SDK / 5.0 version to live. As far as i can see th
- #225 @DemonicDM: hello. I installed the app and added my wifi smart led strip. it wont do the changes despite it gets connected by ID, KEY and IP so i get connected but any chan
- #238 @BennyB100: Hi @Rens_Brandwijk , are you planning to add support for the LSC Smart Flood light with sensor? Thanks
- #253 @Rudi_Hendrix: A cloud version of Homey, you mean? I am aware of that, but I don’t see the added valeu compared to a Homey Pro I recently switched from Domoticz to Homey Pro b
- #297 @mbnn: Does this plugin still not need the Tuya cloud api stuff? And if so, is it possible to add support for humidifiers and heaters (Duux)?

## Cross-ref doctrine
- Implement in Universal Tuya / Stable silently when couple verified (Z2M/ZHA/Blakadder).
- WiFi thread 15811 → local-first / tuyapi patterns only — do not cloud-lock.
- Johan 26439 / Tuya Inc 106779 → scan for FPs & UX gaps; never paste AI to those threads.

## L99 treat result (2026-09-14 — silent)

| Metric | Value |
|--------|------:|
| Posts harvested | 2155 + 1201 + 1131 + 336 = **4823** |
| Images / diags (extract) | ~3510 / ~408 |
| Couples with real mfr in harvest | **601** |
| Truly missing from compose | **0** (junk only: `xxxxx` / `abc123` / OCR `1Dxkck`) |
| Media deep-scan | 120 posts/topic; ignore invent `_TZE200_ABC123` |

### Implemented (P2485 — BOTH)
- `_TZE200_hewlydpz`+`TS0601` → `wall_switch_4_gang_tuya` (was `curtain_motor`) — Z2M `TS0601_switch_4_gang_2`
- `_TZE204_hewlydpz`+`TS0601` → `wall_switch_4_gang_tuya` (was `sensor_illuminance_presence`) — Z2M with `7ytnacie`
- `_TZE204_7ytnacie`+`TS0601` → `wall_switch_4_gang_tuya` (was `dimmer_wall_1gang`)
- `_TZE204_rkbxtclc`+`TS0601` → `switch_3gang` (was `dimmer_wall_1gang`) — Z2M `TS0601_3gang_rkbxtclc`
- Sacred-keep also: `debczeci`, `dhotiauw`, `crq3r3la`
- Gate: `npm run check:p2485`

### Already locked (tip lag / re-pair only)
- Peter #2235 OOM → P2484 tip ≥**9.0.914**
- Joep Insoma `fhvpaltk`, VicHY `clrdrnya`, Eduard `fodv6bkr`/`libht6ua`, soil `nt4pquef`/`oitavov2`, DIN `6ocnqlhn`, BSEED `w5xztuy7`, presence `ex3rcdha` / `debczeci` / `crq3r3la` / `gkfbdvyx`, dual meter `dhotiauw`
- Johan #5460 user said “4-gang” for `ex3rcdha` — Z2M/ZHA = **presence radar** (correct driver already)

### WiFi T15811 (MASTER_ONLY local-first)
- Demands: multisock DPS, static IP+local key, garage contact, LSC flood, Duux humidifier — map to `LocalWiFiTuyaBridge` / tuyapi local patterns; **never** Tuya Inc cloud lock from 106779.
- Official Tuya Inc thread = cloud UX pain → reinforces Zigbee local + WiFi local-first vision.

### Do not invent / do not forum-post
- `_TZE2841000000_3MZB0SDZ`, `_TZE200_xxxxx`, `_Tze204_1Dxkck`
- No Homey Community replies (T157628). Publish Homey Test only.