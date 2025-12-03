#!/usr/bin/env node
/**
 * EWELINK CUBE OPEN API V2 - COMPLETE LOCAL DEVICE SUPPORT
 *
 * All devices supported by eWeLink CUBE/iHost in LOCAL mode without cloud API.
 * Based on: https://ewelink.cc/ewelink-cube/supported-device/zigbee/
 *
 * CSA Device Types Supported:
 * - On/Off Output, On/Off Light, On/Off Light Switch
 * - Level Control Switch, Dimmable Light
 * - Color Dimmable Light, Color Temperature Light, Extended Color Light
 * - Smart Plug, Temperature Sensor, IAS Zone, Window Covering
 *
 * @author Dylan Rajasekaram
 * @version 5.3.42
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// EWELINK CUBE SUPPORTED DEVICES - ALL BRANDS
// =============================================================================

const EWELINK_CUBE_DEVICES = {
  // ===========================================================================
  // AQARA DEVICES (Zigbee 3.0 Compatible)
  // ===========================================================================
  aqara: {
    switches: [
      { manufacturerName: 'Aqara', modelId: 'SSM-U01', desc: 'Single Switch Module' },
      { manufacturerName: 'Aqara', modelId: 'SSM-U02', desc: 'Dual Switch Module' },
      { manufacturerName: 'LUMI', modelId: 'lumi.switch.n0agl1', desc: 'Single Switch T1' },
      { manufacturerName: 'LUMI', modelId: 'lumi.switch.b1nacn02', desc: 'Wall Switch D1' },
      { manufacturerName: 'LUMI', modelId: 'lumi.switch.b2nacn02', desc: 'Wall Switch D1 2G' },
      { manufacturerName: 'Aqara', modelId: 'WS-EUK01', desc: 'Wall Switch H1 EU 1G' },
      { manufacturerName: 'Aqara', modelId: 'WS-EUK02', desc: 'Wall Switch H1 EU 2G' },
      { manufacturerName: 'Aqara', modelId: 'WS-EUK03', desc: 'Wall Switch H1 EU 3G' },
      { manufacturerName: 'Aqara', modelId: 'WS-EUK04', desc: 'Wall Switch H1 EU 4G' },
      { manufacturerName: 'LUMI', modelId: 'lumi.switch.l0agl1', desc: 'Relay T1 No Neutral' },
      { manufacturerName: 'LUMI', modelId: 'lumi.switch.n4acn4', desc: 'Smart Wall Switch T1' }
    ],
    sensors: [
      { manufacturerName: 'Aqara', modelId: 'RTCGQ14LM', desc: 'Motion Sensor P1' },
      { manufacturerName: 'Aqara', modelId: 'RTCGQ11LM', desc: 'Motion Sensor' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_motion.aq2', desc: 'Motion Sensor Aq2' },
      { manufacturerName: 'Aqara', modelId: 'MCCGQ14LM', desc: 'Door Sensor T1' },
      { manufacturerName: 'Aqara', modelId: 'MCCGQ11LM', desc: 'Door/Window Sensor' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_magnet.aq2', desc: 'Door Sensor Aq2' },
      { manufacturerName: 'Aqara', modelId: 'WSDCGQ12LM', desc: 'Temp/Humidity T1' },
      { manufacturerName: 'Aqara', modelId: 'WSDCGQ11LM', desc: 'Temp/Humidity' },
      { manufacturerName: 'LUMI', modelId: 'lumi.weather', desc: 'Weather Sensor' },
      { manufacturerName: 'Aqara', modelId: 'SJCGQ11LM', desc: 'Water Leak Sensor' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_wleak.aq1', desc: 'Water Leak Aq1' },
      { manufacturerName: 'Aqara', modelId: 'DJT11LM', desc: 'Vibration Sensor' },
      { manufacturerName: 'LUMI', modelId: 'lumi.vibration.aq1', desc: 'Vibration Aq1' }
    ],
    plugs: [
      { manufacturerName: 'Aqara', modelId: 'SP-EUC01', desc: 'Smart Plug EU' },
      { manufacturerName: 'Aqara', modelId: 'QBCZ11LM', desc: 'Smart Plug S1' },
      { manufacturerName: 'LUMI', modelId: 'lumi.plug', desc: 'Smart Plug' },
      { manufacturerName: 'LUMI', modelId: 'lumi.plug.maeu01', desc: 'Smart Plug EU' },
      { manufacturerName: 'LUMI', modelId: 'lumi.plug.mmeu01', desc: 'Smart Plug Energy' }
    ],
    curtains: [
      { manufacturerName: 'Aqara', modelId: 'ZNCLDJ12LM', desc: 'Curtain Controller B1' },
      { manufacturerName: 'Aqara', modelId: 'ZNCLDJ11LM', desc: 'Curtain Motor B1' },
      { manufacturerName: 'LUMI', modelId: 'lumi.curtain', desc: 'Curtain Controller' },
      { manufacturerName: 'LUMI', modelId: 'lumi.curtain.hagl04', desc: 'Curtain E1' },
      { manufacturerName: 'Aqara', modelId: 'ZNCLBL01LM', desc: 'Roller Shade E1' }
    ],
    buttons: [
      { manufacturerName: 'Aqara', modelId: 'WXKG11LM', desc: 'Wireless Switch' },
      { manufacturerName: 'Aqara', modelId: 'WXKG12LM', desc: 'Wireless Switch Aq' },
      { manufacturerName: 'Aqara', modelId: 'WRS-R02', desc: 'Remote Switch H1' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_switch.aq2', desc: 'Button Aq2' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_switch.aq3', desc: 'Button Aq3' },
      { manufacturerName: 'LUMI', modelId: 'lumi.remote.b1acn01', desc: 'Button T1' },
      { manufacturerName: 'Aqara', modelId: 'WXCJKG11LM', desc: 'Opple Switch 2B' },
      { manufacturerName: 'Aqara', modelId: 'WXCJKG12LM', desc: 'Opple Switch 4B' },
      { manufacturerName: 'Aqara', modelId: 'WXCJKG13LM', desc: 'Opple Switch 6B' }
    ],
    cube: [
      { manufacturerName: 'Aqara', modelId: 'MFKZQ01LM', desc: 'Cube Controller' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_cube.aqgl01', desc: 'Cube Aq' },
      { manufacturerName: 'Aqara', modelId: 'CTP-R01', desc: 'Cube T1 Pro' }
    ]
  },

  // ===========================================================================
  // IKEA DEVICES
  // ===========================================================================
  ikea: {
    bulbs: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E27 WS opal 980lm', desc: 'Bulb WS 980lm' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E27 WS opal 1000lm', desc: 'Bulb WS 1000lm' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E27 W opal 1000lm', desc: 'Bulb W 1000lm' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E27 CWS opal 600lm', desc: 'Bulb CWS 600lm' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E14 WS opal 400lm', desc: 'Bulb E14 WS' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E14 W op/ch 400lm', desc: 'Bulb E14 W' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb GU10 WS 400lm', desc: 'Bulb GU10 WS' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb GU10 W 400lm', desc: 'Bulb GU10 W' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1545G12', desc: 'LED Bulb E27' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1546G12', desc: 'LED Bulb E27 WS' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1623G12', desc: 'LED Bulb E27 opal' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1624G9', desc: 'LED Bulb E14' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1650R5', desc: 'LED Bulb GU10' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1733G7', desc: 'LED Bulb E14 WW' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1836G9', desc: 'LED Bulb E27 806lm' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1837R5', desc: 'LED Bulb GU10 400lm' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1842G3', desc: 'LED Bulb E14 250lm' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1923R5', desc: 'LED Bulb GU10 CWS' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1924G9', desc: 'LED Bulb E14 CWS' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'LED1925G6', desc: 'LED Bulb E27 CWS' }
    ],
    controllers: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI remote control', desc: 'Remote Control' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI on/off switch', desc: 'On/Off Switch' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI motion sensor', desc: 'Motion Sensor' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI wireless dimmer', desc: 'Wireless Dimmer' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'STYRBAR remote control N2', desc: 'Styrbar Remote' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'SYMFONISK Sound Controller', desc: 'Symfonisk' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'RODRET Dimmer', desc: 'Rodret Dimmer' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'SOMRIG shortcut button', desc: 'Somrig Button' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1524/E1810', desc: 'Remote 5 Button' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1743', desc: 'On/Off Switch E1743' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1744', desc: 'Symfonisk E1744' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1745', desc: 'Motion Sensor E1745' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1746', desc: 'Repeater' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1766', desc: 'Open/Close Sensor' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1812', desc: 'Shortcut Button' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E2001/E2002', desc: 'Styrbar E2001' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E2123', desc: 'Symfonisk Gen2' }
    ],
    outlets: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI control outlet', desc: 'Control Outlet' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1603/E1702/E1708', desc: 'Outlet E1603' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'ASKVADER on/off switch', desc: 'Askvader Switch' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1836', desc: 'Askvader E1836' }
    ],
    blinds: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'FYRTUR block-out roller blind', desc: 'Fyrtur Blind' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'KADRILJ roller blind', desc: 'Kadrilj Blind' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'PRAKTLYSING cellular blind', desc: 'Praktlysing' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1757', desc: 'Fyrtur E1757' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E2103', desc: 'Kadrilj E2103' }
    ],
    airPurifier: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'STARKVIND Air purifier', desc: 'Starkvind' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E2006', desc: 'Starkvind E2006' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E2007', desc: 'Starkvind Table' }
    ]
  },

  // ===========================================================================
  // PHILIPS HUE DEVICES
  // ===========================================================================
  philips: {
    bulbs: [
      { manufacturerName: 'Philips', modelId: 'LWA001', desc: 'Hue White A19' },
      { manufacturerName: 'Philips', modelId: 'LWA004', desc: 'Hue White A60' },
      { manufacturerName: 'Philips', modelId: 'LWA007', desc: 'Hue White A21' },
      { manufacturerName: 'Philips', modelId: 'LWA009', desc: 'Hue White A67' },
      { manufacturerName: 'Philips', modelId: 'LWA011', desc: 'Hue White Filament' },
      { manufacturerName: 'Philips', modelId: 'LWB006', desc: 'Hue White B22' },
      { manufacturerName: 'Philips', modelId: 'LWB010', desc: 'Hue White A19 v3' },
      { manufacturerName: 'Philips', modelId: 'LWB014', desc: 'Hue White A19 v4' },
      { manufacturerName: 'Philips', modelId: 'LWE002', desc: 'Hue White Candle' },
      { manufacturerName: 'Philips', modelId: 'LWG001', desc: 'Hue White GU10' },
      { manufacturerName: 'Philips', modelId: 'LWG004', desc: 'Hue White GU10 v2' },
      { manufacturerName: 'Philips', modelId: 'LWO003', desc: 'Hue Filament G125' },
      { manufacturerName: 'Philips', modelId: 'LWV001', desc: 'Hue Filament ST64' },
      { manufacturerName: 'Philips', modelId: 'LCA001', desc: 'Hue Color A19' },
      { manufacturerName: 'Philips', modelId: 'LCA003', desc: 'Hue Color A21' },
      { manufacturerName: 'Philips', modelId: 'LCE002', desc: 'Hue Color Candle' },
      { manufacturerName: 'Philips', modelId: 'LCG002', desc: 'Hue Color GU10' },
      { manufacturerName: 'Philips', modelId: 'LCT001', desc: 'Hue Color A19 Gen1' },
      { manufacturerName: 'Philips', modelId: 'LCT007', desc: 'Hue Color A19 Gen2' },
      { manufacturerName: 'Philips', modelId: 'LCT010', desc: 'Hue Color A19 Gen3' },
      { manufacturerName: 'Philips', modelId: 'LCT012', desc: 'Hue Color Candle' },
      { manufacturerName: 'Philips', modelId: 'LCT014', desc: 'Hue Color A19 v4' },
      { manufacturerName: 'Philips', modelId: 'LCT015', desc: 'Hue Color A19 v5' },
      { manufacturerName: 'Philips', modelId: 'LCT024', desc: 'Hue Play' },
      { manufacturerName: 'Philips', modelId: 'LST002', desc: 'Hue Lightstrip Plus' },
      { manufacturerName: 'Philips', modelId: 'LTA001', desc: 'Hue Ambiance A19' },
      { manufacturerName: 'Philips', modelId: 'LTA004', desc: 'Hue Ambiance A60' },
      { manufacturerName: 'Philips', modelId: 'LTE002', desc: 'Hue Ambiance Candle' },
      { manufacturerName: 'Philips', modelId: 'LTG002', desc: 'Hue Ambiance GU10' },
      { manufacturerName: 'Philips', modelId: 'LTV002', desc: 'Hue Filament Ambiance' },
      { manufacturerName: 'Philips', modelId: 'LTW001', desc: 'Hue Ambiance BR30' },
      { manufacturerName: 'Philips', modelId: 'LTW004', desc: 'Hue Ambiance A19 v1' },
      { manufacturerName: 'Philips', modelId: 'LTW010', desc: 'Hue Ambiance A19 v2' },
      { manufacturerName: 'Philips', modelId: 'LTW012', desc: 'Hue Ambiance Candle v2' },
      { manufacturerName: 'Philips', modelId: 'LTW013', desc: 'Hue Ambiance GU10 v2' }
    ],
    sensors: [
      { manufacturerName: 'Philips', modelId: 'SML001', desc: 'Hue Motion Sensor' },
      { manufacturerName: 'Philips', modelId: 'SML002', desc: 'Hue Motion Outdoor' },
      { manufacturerName: 'Philips', modelId: 'SML003', desc: 'Hue Motion v2' },
      { manufacturerName: 'Philips', modelId: 'SML004', desc: 'Hue Motion Outdoor v2' }
    ],
    controls: [
      { manufacturerName: 'Philips', modelId: 'RWL020', desc: 'Hue Dimmer Switch' },
      { manufacturerName: 'Philips', modelId: 'RWL021', desc: 'Hue Dimmer v2' },
      { manufacturerName: 'Philips', modelId: 'RWL022', desc: 'Hue Dimmer v3' },
      { manufacturerName: 'Philips', modelId: 'ROM001', desc: 'Hue Smart Button' },
      { manufacturerName: 'Philips', modelId: 'RDM001', desc: 'Hue Wall Switch' },
      { manufacturerName: 'Philips', modelId: 'RDM002', desc: 'Hue Dial Switch' },
      { manufacturerName: 'Philips', modelId: 'RDM004', desc: 'Hue Tap Dial' }
    ],
    plugs: [
      { manufacturerName: 'Philips', modelId: 'LOM001', desc: 'Hue Smart Plug EU' },
      { manufacturerName: 'Philips', modelId: 'LOM002', desc: 'Hue Smart Plug US' },
      { manufacturerName: 'Philips', modelId: 'LOM003', desc: 'Hue Smart Plug UK' },
      { manufacturerName: 'Philips', modelId: 'LOM005', desc: 'Hue Smart Plug AU' },
      { manufacturerName: 'Signify Netherlands B.V.', modelId: 'LOM001', desc: 'Hue Plug EU Signify' }
    ]
  },

  // ===========================================================================
  // TUYA GENERIC ZIGBEE 3.0 (via eWeLink CUBE)
  // ===========================================================================
  tuya: {
    sensors: [
      { manufacturerName: '_TZ3000_qaaysllp', modelId: 'TS0201', desc: 'Tuya Temp/Humidity' },
      { manufacturerName: '_TZ3000_bguser20', modelId: 'TS0201', desc: 'Tuya TH Sensor v2' },
      { manufacturerName: '_TZ3000_xr3htd96', modelId: 'TS0201', desc: 'Tuya TH Sensor v3' },
      { manufacturerName: '_TZ3000_fllyghyj', modelId: 'TS0201', desc: 'Tuya TH Mini' },
      { manufacturerName: '_TZ3000_dowj6gyi', modelId: 'TS0201', desc: 'Tuya TH LCD' },
      { manufacturerName: '_TZ2000_a476raq2', modelId: 'TS0201', desc: 'Tuya TH Sensor' },
      { manufacturerName: '_TYZB01_kvwjujy9', modelId: 'TS0201', desc: 'Tuya TH Blitz' },
      { manufacturerName: '_TZ3000_kmh5qpmb', modelId: 'TS0202', desc: 'Tuya Motion PIR' },
      { manufacturerName: '_TZ3000_mcxw5ehu', modelId: 'TS0202', desc: 'Tuya Motion v2' },
      { manufacturerName: '_TZ3000_msl6wxk9', modelId: 'TS0202', desc: 'Tuya Motion v3' },
      { manufacturerName: '_TZ3000_26fmupbb', modelId: 'TS0203', desc: 'Tuya Contact' },
      { manufacturerName: '_TZ3000_n2egfsli', modelId: 'TS0203', desc: 'Tuya Contact v2' },
      { manufacturerName: '_TZ3000_ebar6ljy', modelId: 'TS0203', desc: 'Tuya Contact v3' }
    ],
    switches: [
      { manufacturerName: '_TZ3000_npzfdcof', modelId: 'TS0001', desc: 'Tuya Switch 1G' },
      { manufacturerName: '_TZ3000_tqlv4ez4', modelId: 'TS0001', desc: 'Tuya Switch 1G v2' },
      { manufacturerName: '_TZ3000_hktqahrq', modelId: 'TS0002', desc: 'Tuya Switch 2G' },
      { manufacturerName: '_TZ3000_01gpyda5', modelId: 'TS0002', desc: 'Tuya Switch 2G v2' },
      { manufacturerName: '_TZ3000_vjhcxlbz', modelId: 'TS0003', desc: 'Tuya Switch 3G' },
      { manufacturerName: '_TZ3000_odzoiovu', modelId: 'TS0003', desc: 'Tuya Switch 3G v2' },
      { manufacturerName: '_TZ3000_excgg5kb', modelId: 'TS0004', desc: 'Tuya Switch 4G' }
    ],
    plugs: [
      { manufacturerName: '_TZ3000_g5xawfcq', modelId: 'TS011F', desc: 'Tuya Plug Energy' },
      { manufacturerName: '_TZ3000_cphmq0q7', modelId: 'TS011F', desc: 'Tuya Plug v2' },
      { manufacturerName: '_TZ3000_ew3ldmgx', modelId: 'TS011F', desc: 'Tuya Plug v3' },
      { manufacturerName: '_TZ3000_dpo1ysak', modelId: 'TS011F', desc: 'Tuya Plug v4' },
      { manufacturerName: '_TZ3000_cehuw1lw', modelId: 'TS011F', desc: 'Tuya Plug v5' },
      { manufacturerName: '_TZ3000_w0qqde0g', modelId: 'TS011F', desc: 'Tuya Plug v6' },
      { manufacturerName: '_TZ3000_u5u4cakc', modelId: 'TS011F', desc: 'Tuya Plug EU' }
    ],
    dimmers: [
      { manufacturerName: '_TZ3000_kdi2o9m6', modelId: 'TS110E', desc: 'Tuya Dimmer 1G' },
      { manufacturerName: '_TZ3210_ngqk6jia', modelId: 'TS110E', desc: 'Tuya Dimmer 2G' },
      { manufacturerName: '_TZE200_dfxkcots', modelId: 'TS0601', desc: 'Tuya Dimmer DP' },
      { manufacturerName: '_TZ3000_7ysdnebc', modelId: 'TS0052', desc: 'Tuya Dimmer 2Ch' }
    ],
    curtains: [
      { manufacturerName: '_TZ3000_fccpjz5z', modelId: 'TS130F', desc: 'Tuya Curtain' },
      { manufacturerName: '_TZ3000_vd43bbfq', modelId: 'TS130F', desc: 'Tuya Curtain v2' },
      { manufacturerName: '_TZ3000_1dd0d5yi', modelId: 'TS130F', desc: 'Tuya Curtain v3' },
      { manufacturerName: '_TZE200_cowvfni3', modelId: 'TS0601', desc: 'Tuya Curtain DP' },
      { manufacturerName: '_TZE200_wmcdj3aq', modelId: 'TS0601', desc: 'Tuya Blind DP' }
    ],
    bulbs: [
      { manufacturerName: '_TZ3210_sroezl0s', modelId: 'TS0505B', desc: 'Tuya RGBCCT Bulb' },
      { manufacturerName: '_TZ3210_mja6r5ix', modelId: 'TS0505B', desc: 'Tuya RGBCCT v2' },
      { manufacturerName: '_TZ3210_zrvk7xep', modelId: 'TS0504B', desc: 'Tuya RGBW Bulb' },
      { manufacturerName: '_TZ3210_s9lumfhn', modelId: 'TS0502B', desc: 'Tuya CCT Bulb' },
      { manufacturerName: '_TZ3000_f3saf1j1', modelId: 'TS0501B', desc: 'Tuya Dimmable' },
      { manufacturerName: '_TZ3210_leyz4rju', modelId: 'TS0504B', desc: 'Lidl RGBW' },
      { manufacturerName: '_TZ3210_r5afgmkl', modelId: 'TS0505B', desc: 'Lidl RGBCCT' }
    ]
  },

  // ===========================================================================
  // OTHER BRANDS SUPPORTED
  // ===========================================================================
  other: {
    develco: [
      { manufacturerName: 'Develco Products A/S', modelId: 'IOTSMART', desc: 'IO Module' },
      { manufacturerName: 'Develco', modelId: 'SPLZB-131', desc: 'Smart Plug' },
      { manufacturerName: 'Develco', modelId: 'EMIZB-132', desc: 'Energy Meter' }
    ],
    nodon: [
      { manufacturerName: 'NodOn', modelId: 'SIN-4-1-20', desc: 'Relay Switch 1Ch' },
      { manufacturerName: 'NodOn', modelId: 'SIN-4-2-20', desc: 'Relay Switch 2Ch' },
      { manufacturerName: 'NodOn', modelId: 'SIN-4-FP-20', desc: 'Pilot Wire' },
      { manufacturerName: 'NodOn', modelId: 'SIN-4-RS-20', desc: 'Roller Shutter' }
    ],
    schneider: [
      { manufacturerName: 'Schneider Electric', modelId: 'CCTFR6100', desc: 'Wiser Switch 1G' },
      { manufacturerName: 'Schneider Electric', modelId: 'CCTFR6200', desc: 'Wiser Switch 2G' },
      { manufacturerName: 'Schneider Electric', modelId: 'CCTFR6400', desc: 'Wiser Switch 4G' },
      { manufacturerName: 'Schneider Electric', modelId: 'CCTFR6700', desc: 'Wiser Motion' },
      { manufacturerName: 'Schneider Electric', modelId: 'CCTFR6500', desc: 'Wiser Thermostat' }
    ],
    somfy: [
      { manufacturerName: 'SOMFY', modelId: 'Sonesse 30', desc: 'Curtain Motor' },
      { manufacturerName: 'SOMFY', modelId: 'Zigbee smart plug', desc: 'Smart Plug' },
      { manufacturerName: 'SOMFY', modelId: 'Temp Sensor', desc: 'Temp Sensor' }
    ],
    sengled: [
      { manufacturerName: 'sengled', modelId: 'E11-G13', desc: 'Element Classic A19' },
      { manufacturerName: 'sengled', modelId: 'E11-G23', desc: 'Element Plus A19' },
      { manufacturerName: 'sengled', modelId: 'E11-N1EA', desc: 'Element Color Plus' },
      { manufacturerName: 'sengled', modelId: 'E12-N1E', desc: 'Element BR30' },
      { manufacturerName: 'sengled', modelId: 'E21-N1EA', desc: 'Soft White A19' },
      { manufacturerName: 'Sengled', modelId: 'E11-U2E', desc: 'Element Touch' },
      { manufacturerName: 'Sengled', modelId: 'E11-U3E', desc: 'Element Extra Bright' }
    ],
    linkind: [
      { manufacturerName: 'lk', modelId: 'ZB-CL01', desc: 'Tunable A60' },
      { manufacturerName: 'lk', modelId: 'ZB-CCT01', desc: 'Tunable GU10' },
      { manufacturerName: 'Linkind', modelId: 'ZS110040078', desc: 'A19 Bulb' },
      { manufacturerName: 'Linkind', modelId: 'ZS130000178', desc: 'Motion Sensor' },
      { manufacturerName: 'Linkind', modelId: 'ZS110050078', desc: 'Door Sensor' }
    ],
    innr: [
      { manufacturerName: 'innr', modelId: 'RB 285 C', desc: 'Smart Bulb RGBW' },
      { manufacturerName: 'innr', modelId: 'RB 265', desc: 'Smart Bulb White' },
      { manufacturerName: 'innr', modelId: 'RS 225', desc: 'Smart Spot GU10' },
      { manufacturerName: 'innr', modelId: 'BY 285 C', desc: 'Smart Candle' },
      { manufacturerName: 'innr', modelId: 'SP 220', desc: 'Smart Plug' },
      { manufacturerName: 'innr', modelId: 'FL 130 C', desc: 'Flex Light Strip' }
    ],
    ledvance: [
      { manufacturerName: 'LEDVANCE', modelId: 'A60 TW Value II', desc: 'A60 Tunable' },
      { manufacturerName: 'LEDVANCE', modelId: 'Outdoor Plug', desc: 'Smart Plug Outdoor' },
      { manufacturerName: 'LEDVANCE', modelId: 'SMART+ Spot GU10', desc: 'Smart Spot GU10' },
      { manufacturerName: 'OSRAM', modelId: 'Classic A60 W clear', desc: 'Classic A60' },
      { manufacturerName: 'OSRAM', modelId: 'Plug 01', desc: 'Smart Plug' }
    ],
    lidl: [
      { manufacturerName: '_TZ3000_kdi2o9m6', modelId: 'TS0505B', desc: 'Lidl RGBCCT' },
      { manufacturerName: '_TZ3000_odygigth', modelId: 'TS0505B', desc: 'Lidl LED Strip' },
      { manufacturerName: '_TZ3000_49qchf10', modelId: 'TS0502A', desc: 'Lidl CCT Bulb' },
      { manufacturerName: 'Lidl', modelId: 'HG06467', desc: 'Livarno Lux GU10' },
      { manufacturerName: 'Lidl', modelId: 'HG06106A', desc: 'Livarno Lux E14' },
      { manufacturerName: 'Lidl', modelId: 'HG06104A', desc: 'Livarno Lux E27' }
    ],
    wiser: [
      { manufacturerName: 'Schneider Electric', modelId: 'EER40030', desc: '4 Key Scene Switch' },
      { manufacturerName: 'Schneider Electric', modelId: 'EER50000', desc: 'Thermostat' },
      { manufacturerName: 'Schneider Electric', modelId: 'EER42000', desc: 'Window Sensor' },
      { manufacturerName: 'Schneider Electric', modelId: 'EER51000', desc: 'Radiator Valve' }
    ],
    paulmann: [
      { manufacturerName: 'Paulmann', modelId: '500.45', desc: 'SmartHome Dimmer' },
      { manufacturerName: 'Paulmann', modelId: '50049', desc: 'SmartHome LED Strip' },
      { manufacturerName: 'Paulmann', modelId: '50064', desc: 'RGBW Controller' },
      { manufacturerName: 'Paulmann', modelId: '371000001', desc: 'URail Spot' }
    ],
    centralite: [
      { manufacturerName: 'Centralite', modelId: '3400-D', desc: 'Keypad' },
      { manufacturerName: 'Centralite', modelId: '3210-L', desc: 'Smart Outlet' },
      { manufacturerName: 'Centralite', modelId: '3315-S', desc: 'Motion Sensor' },
      { manufacturerName: 'Centralite', modelId: '3325-S', desc: 'Contact Sensor' },
      { manufacturerName: 'Centralite', modelId: '3326-L', desc: 'Motion Temp' }
    ]
  }
};

// =============================================================================
// DRIVER MAPPING
// =============================================================================

const DRIVER_MAPPING = {
  // Aqara
  'aqara.switches': 'switch_1gang',
  'aqara.sensors': 'motion_sensor',
  'aqara.plugs': 'plug_smart',
  'aqara.curtains': 'curtain_motor',
  'aqara.buttons': 'button_wireless_1',
  'aqara.cube': 'scene_switch_4',

  // IKEA
  'ikea.bulbs': 'bulb_tunable_white',
  'ikea.controllers': 'button_wireless_4',
  'ikea.outlets': 'plug_smart',
  'ikea.blinds': 'curtain_motor',
  'ikea.airPurifier': 'hvac_dehumidifier',

  // Philips
  'philips.bulbs': 'bulb_rgbw',
  'philips.sensors': 'motion_sensor',
  'philips.controls': 'button_wireless_4',
  'philips.plugs': 'plug_smart',

  // Tuya
  'tuya.sensors': 'climate_sensor',
  'tuya.switches': 'switch_1gang',
  'tuya.plugs': 'plug_energy_monitor',
  'tuya.dimmers': 'dimmer_wall_1gang',
  'tuya.curtains': 'curtain_motor',
  'tuya.bulbs': 'bulb_rgbw',

  // Other brands
  'other.develco': 'plug_smart',
  'other.nodon': 'switch_1gang',
  'other.schneider': 'switch_1gang',
  'other.somfy': 'curtain_motor',
  'other.sengled': 'bulb_tunable_white',
  'other.linkind': 'bulb_tunable_white',
  'other.innr': 'bulb_rgbw',
  'other.ledvance': 'bulb_tunable_white',
  'other.lidl': 'bulb_rgbw',
  'other.wiser': 'radiator_valve',
  'other.paulmann': 'led_strip_rgbw',
  'other.centralite': 'plug_smart'
};

// =============================================================================
// ENRICHMENT FUNCTIONS
// =============================================================================

function loadDriverConfig(driverPath) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveDriverConfig(driverPath, config) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function enrichDriver(driversDir, driverName, devices) {
  const driverPath = path.join(driversDir, driverName);
  if (!fs.existsSync(driverPath)) return { added: 0, skipped: 0 };

  const config = loadDriverConfig(driverPath);
  if (!config) return { added: 0, skipped: 0 };

  if (!config.zigbee) config.zigbee = {};
  if (!config.zigbee.devices) config.zigbee.devices = [];

  const existing = new Set(config.zigbee.devices.map(d => `${d.manufacturerName}|${d.modelId}`));
  let added = 0, skipped = 0;

  for (const device of devices) {
    const key = `${device.manufacturerName}|${device.modelId}`;
    if (existing.has(key)) { skipped++; continue; }
    config.zigbee.devices.push({ manufacturerName: device.manufacturerName, modelId: device.modelId });
    existing.add(key);
    added++;
  }

  if (added > 0) saveDriverConfig(driverPath, config);
  return { added, skipped };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

console.log('🌐 EWELINK CUBE API V2 - COMPLETE LOCAL DEVICE SUPPORT');
console.log('========================================================\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
let totalAdded = 0, totalSkipped = 0;

// Process all brands and categories
for (const [brand, categories] of Object.entries(EWELINK_CUBE_DEVICES)) {
  console.log(`\n📦 ${brand.toUpperCase()}:`);
  for (const [category, devices] of Object.entries(categories)) {
    const mappingKey = `${brand}.${category}`;
    const driverName = DRIVER_MAPPING[mappingKey];
    if (!driverName) continue;

    const result = enrichDriver(driversDir, driverName, devices);
    totalAdded += result.added;
    totalSkipped += result.skipped;
    if (result.added > 0) console.log(`  ✅ ${category} → ${driverName}: +${result.added}`);
  }
}

// Count total devices
const totalDevices = Object.values(EWELINK_CUBE_DEVICES)
  .flatMap(brand => Object.values(brand))
  .flat().length;

console.log('\n' + '='.repeat(60));
console.log(`📱 Total device entries: ${totalDevices}`);
console.log(`✅ Devices added: ${totalAdded}`);
console.log(`⏭️ Already exist: ${totalSkipped}`);
console.log('='.repeat(60));

// Save report
const reportPath = path.join(__dirname, '..', '..', 'data', 'enrichment', 'ewelink-cube-api-v2-report.json');
fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), totalDevices, totalAdded, totalSkipped }, null, 2));

console.log(`\n📄 Report: ${reportPath}`);
console.log('✨ eWeLink CUBE API V2 enrichment complete!');

module.exports = { EWELINK_CUBE_DEVICES, DRIVER_MAPPING };
