#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { extractFP: _vFP, extractPID: _vPID } = require('./fp-validator');

function log(msg) { console.log(`[FINGERPRINT-LOADER] ${msg}`); }

function loadFingerprints() {
  const fps = new Set();
  const driversDir = path.join(__dirname, '..', '..', 'drivers');
  if (!fs.existsSync(driversDir)) return fps;
  for (const d of fs.readdirSync(driversDir)) {
    const cf = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
      for (const m of (data.zigbee?.manufacturerName || [])) fps.add(m);
      for (const p of (data.zigbee?.productId || [])) fps.add(p);
    } catch (e) {
      const matches = fs.readFileSync(cf, 'utf8').match(/"_T[A-Za-z0-9_]+"/g) || [];
      for (const m of matches) fps.add(m.replace(/"/g, ''));
    }
  }
  return fps;
}

function findDriver(fp) {
  const drivers = findAllDrivers(fp);
  return drivers.length > 0 ? drivers[0] : null;
}

function findAllDrivers(fp) {
  const driversDir = path.join(__dirname, '..', '..', 'drivers');
  const fpL = (fp || '').toLowerCase();
  const result = [];
  
  // v7.5.1: Check Forced Discovery Map first
  const forcedFile = path.join(__dirname, '..', '..', 'lib', 'data', 'BOT_FORCED_DISCOVERY.json');
  if (fs.existsSync(forcedFile)) {
    try {
      const forced = JSON.parse(fs.readFileSync(forcedFile, 'utf8'));
      const key = Object.keys(forced).find(k => k.toLowerCase() === fpL);
      if (key) {
        log(`    [FORCED-HIT] ${fp} matched to ${forced[key].join(', ')}`);
        return forced[key];
      }
    } catch (e) {}
  }

  if (!fs.existsSync(driversDir)) return result;
  for (const d of fs.readdirSync(driversDir)) {
    const cf = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const content = fs.readFileSync(cf, 'utf8').toLowerCase();
      if (content.includes(`"${fpL}"`)) result.push(d);
    } catch (e) {}
  }
  return result;
}

function extractMfrFromText(text) {
  const results = new Set();
  const tuya = _vFP(text);
  tuya.forEach(m => results.add(m));
  const known = ['eWeLink', 'SONOFF', 'Legrand', 'Danfoss', 'D5X84YU',
    'Schneider Electric', 'BOSCH', 'LUMI', 'Aqara', 'IKEA of Sweden',
    'NIKO NV', 'Netatmo', 'Wiser', 'Philips', 'OSRAM', 'innr'];
  for (const k of known) {
    if (text && text.includes(k)) results.add(k);
  }
  const snzb = (text || '').match(/SNZB-\d{2}[A-Z0-9]*/g) || [];
  snzb.forEach(m => results.add(m));
  return [...results];
}

const NON_TUYA_KNOWN = [' Legrand', '3reality', 'A89G12C', 'D5X84YU', 'DANFOSS', 'Danfoss', 'EWELINK', 'HOBEIAN', 'Hobeian', 'Legrand', 'NIKO NV', 'Netatmo', 'SONOFF', 'Schneider', 'Schneider Electric', 'TUYATEC-0l6xaqmi', 'TUYATEC-3tipnsrx', 'TUYATEC-53o41joc', 'TUYATEC-7qunn4gq', 'TUYATEC-Bfq2i2Sy', 'TUYATEC-abkehqus', 'TUYATEC-b5g40alm', 'TUYATEC-bd5faf9p', 'TUYATEC-crr8qb0p', 'TUYATEC-deetibst', 'TUYATEC-dgtxmihe', 'TUYATEC-dxnohkpd', 'TUYATEC-g3gl6cgy', 'TUYATEC-ip9ganvw', 'TUYATEC-kbqf60nt', 'TUYATEC-ktge2vqt', 'TUYATEC-lha8pbwd', 'TUYATEC-r9hgssol', 'TUYATEC-rkqiqvcs', 'TUYATEC-sb6t7ett', 'TUYATEC-smmlguju', 'TUYATEC-trhrga6p', 'TUYATEC-zn9wyqtr', 'TUYATEC-zw6hxafz', 'Visonic', 'Zbeacon', '_TZ3000_2ac', '_TZ3000_g', '_TZ3000_ke_x0oo3', '_TZ3000_xyz', '_TZ3210_1ac', '_TZ3210_2ac', '_TZE200_2usb_socket', '_TZE204_2usb_socket', '_TZb', '_TZc', '_TZe', '_TZf', '_TZh', '_TZj', '_TZl', '_TZn', '_TZq', '_TZs', '_TZw', '_tyst', '_tyzb', 'adurosmart', 'allegion', 'arduino', 'atsmart', 'aubess', 'august', 'aurora', 'aurora lighting', 'avatto', 'berker', 'bingoelec', 'bitron', 'bitron home', 'bitron video', 'blitzwolf', 'bticino', 'busch-jaeger', 'cc1352', 'cc1352p', 'cc2530', 'cc2531', 'cc2652', 'cc2652p', 'cc2652r', 'cc2652rb', 'centralite', 'climax', 'climax technology', 'cod.m', 'conbee', 'connectivity standards alliance', 'cooper', 'coordinator', 'coswall', 'cree inc.', 'custom', 'danalock', 'danfoss', 'danfoss a/s', 'dawon dns', 'deconz', 'develco', 'develco products a/s', 'development', 'diyruz', 'dln-diy', 'dlnraja', 'dresden elektronik', 'e104', 'eWeLight', 'eWeLink', 'eaton corporation', 'ecolink', 'ecosmart', 'efekta', 'efr32', 'efr32mg', 'efr32mg21', 'efr32mg22', 'electrolama', 'eltako', 'enbrighten', 'esp-idf', 'esp32', 'esp32-c6', 'esp32-h2', 'esp32c6', 'esp32h2', 'espidf', 'espressif', 'eurotronic', 'eurotronic technology', 'ewelink', 'example', 'feit electric', 'finder', 'first alert', 'frient', 'frient a/s', 'gewiss', 'gio.zigbee', 'girier', 'gledopto', 'gocontrol', 'heiman', 'heimantechnology', 'heimgard', 'hobeian', 'home_automation', 'homeautomation', 'homemade', 'hue essentials', 'ikea of sweden', 'iluminize', 'innr lighting b.v.', 'jasco products', 'jn5168', 'jn5169', 'konyks', 'koreakoss', 'ktnnkg', 'ledvance', 'leedarson', 'leedarson lighting', 'legrand', 'leviton manufacturing', 'lidl livarno', 'linear', 'linkind', 'livarno', 'livarno lux', 'livolo', 'lonsonho', 'lumi router', 'lumi.router', 'lutron electronics', 'matter', 'medion', 'merten', 'miboxer', 'modkam', 'monoprice', 'muller licht', 'mÃ¼ller licht', 'namron', 'nanoleaf', 'nas-', 'neo coolcam', 'nordic', 'nortek', 'nrf52', 'nrf52840', 'nutone', 'open source', 'opensource', 'paulmann', 'paulmann licht', 'paulmann licht gmbh', 'perenio', 'philips', 'philips hue', 'phoscon', 'platformio', 'prototype', 'ptvo.info', 'ptvo.switch', 'raspbee', 'revogni', 'rf-star', 'rfstar', 'ring llc', 'robert bosch gmbh', 'router', 'samjin', 'sample', 'samsung', 'samsung electronics', 'saswell', 'schneider electric', 'securifi', 'sengled', 'sengled inc.', 'sengoku', 'sercomm', 'shinasystem', 'signify', 'signify netherlands b.v.', 'silabs', 'silicon labs', 'silvercrest', 'sinope', 'sinope technologies', 'siterwell', 'slaesh', 'slzb-06', 'slzb-07', 'smartech', 'smartthings', 'smartthings inc.', 'smartvill', 'sonoff', 'sonoff zbbridge', 'sonoffzigbee', 'spectrum brands', 'sr-zg', 'stelpro', 'sunricher', 'tasmota', 'terncy', 'texas instruments', 'third reality', 'third reality, inc', 'thread', 'ti router', 'ti.router', 'tradfri', 'trust international', 'tube\'s zb', 'tuyatec', 'tuyatec-0l6xaqmi', 'tuyatec-1g3tawnp', 'tuyatec-1uxx9cci', 'tuyatec-3tipnsrx', 'tuyatec-53o41joc', 'tuyatec-7qunn4gq', 'tuyatec-abkehqus', 'tuyatec-b5g40alm', 'tuyatec-bd5faf9p', 'tuyatec-bduz1xxp', 'tuyatec-bfq2i2sy', 'tuyatec-crr8qb0p', 'tuyatec-deetibst', 'tuyatec-dgtxmihe', 'tuyatec-dxnohkpd', 'tuyatec-g3gl6cgy', 'tuyatec-gqhxixyk', 'tuyatec-h4wnrtck', 'tuyatec-haoiuwzy', 'tuyatec-ip9ganvw', 'tuyatec-kbqf60nt', 'tuyatec-ktev3uwq', 'tuyatec-lha8pbwd', 'tuyatec-nzrrvgco', 'tuyatec-o6sncwd6', 'tuyatec-ojmxeikg', 'tuyatec-ojmxeikq', 'tuyatec-prhs1rsd', 'tuyatec-qun7vq14', 'tuyatec-r9hgssol', 'tuyatec-riuj5xzs', 'tuyatec-rkqiqvcs', 'tuyatec-sb6t7ett', 'tuyatec-trhrga6p', 'tuyatec-v3uxbuxy', 'tuyatec-vmgh3fxd', 'tuyatec-yg5dcbfu', 'tuyatec-zn9wyqtr', 'tuyatec-zw6hxafz', 'u-tec', 'ultraloq', 'vision', 'visonic', 'wallpad', 'weinzierl', 'winners', 'woolley', 'xiaomi', 'xyzroe', 'yagusmart', 'yeelight', 'yoolax', 'z-stack', 'zbbridge', 'zbeacon', 'zemismart', 'zen thermostat', 'zig-a-zig-ah', 'zigbee alliance', 'zigbee home', 'zigbee home automation', 'zigbee router', 'zigbee-router', 'zigbee2mqtt', 'zigbee2tasmota', 'zigbee_home', 'zigbeehome', 'zigbeerouter', 'zigfred', 'zigstar', 'znrf52', 'zstack', 'zzh!'];

const NON_TS_PIDS = ['014G2461', '014G2463', '01MINIZB', '0x8040', '3300-S', '3305-S', '3315-S', '3315-Seu', '3320-L', '3325-S', '3326-L', '3450-L', 'A11Z', 'A19 W 10 year', 'AM02', 'AM43-0.45/40-ES-EB', 'AM43-0.45/40-ES-EZ', 'ARDUINO_ZIGBEE', 'Arteco', 'BASICZBR3', 'BR30 W 10 year', 'BSP-EZ2', 'BSP-FZ2', 'BUTTON', 'Battery switch, 1 button', 'Battery switch, 2 buttons', 'CC1352P_DEV', 'CC1352_DEV', 'CC2530', 'CC2530_ROUTER', 'CC2530_SENSOR', 'CC2530_SWITCH', 'CC2531', 'CC2531_ROUTER', 'CC2531_USB', 'CC2652', 'CC2652P_DEV', 'CC2652RB_DEV', 'CC2652R_DEV', 'CC2652_DEV', 'CK-BL702-AL-01(7009_Z102LG03-1)', 'CK-BL702-MWS-01', 'CK-BL702-MWS-01(7016)', 'CK-BL702-SWP-01(7020)', 'CK-TLSR8656-SS5-01(7002)', 'CK-TLSR8656-SS5-01(7014)', 'COD.M', 'CONBEE', 'CONBEE II', 'CONBEE III', 'CS-201Z', 'CUSTOM', 'Classic A60 RGBW', 'Classic A60 TW', 'DIMMER', 'DIY-01', 'DIY-02', 'DIY-03', 'DIY-04', 'DIY-08', 'DIY-LIGHT', 'DIY-ROUTER', 'DIY-SENSOR', 'DIY-SWITCH', 'DIYRUZ', 'DIYRUZ_AIRSENSE', 'DIYRUZ_CONTACT', 'DIYRUZ_FLOWER', 'DIYRUZ_GEIGER', 'DIYRUZ_MOTION', 'DS01', 'DS421', 'DS82', 'E11-G13', 'E11-G14', 'E11-G23', 'E11-N13', 'E11-N14', 'E12-N13', 'E12-N14', 'E1524/E1810', 'E1525/E1745', 'E1603/E1702', 'E1603/E1702/E1708', 'E1743', 'E1744', 'E1745', 'E1757', 'E1812', 'E2001/E2002', 'E2123', 'EDM-1ZBA-EU', 'EFEKTA', 'EFR32MG_DEV', 'EFR32_DEV', 'ERS-10TZBVK-AA', 'ESP32', 'ESP32-C6', 'ESP32-H2', 'ESP32C6_DEV', 'ESP32H2_DEV', 'FE-GU10-5W', 'FYRTUR', 'Flex RGBW', 'GL-B-001Z', 'GL-B-007Z', 'GL-B-008Z', 'GL-C-006', 'GL-C-007', 'GL-C-008', 'GS361A-H04', 'HS1SA', 'HS1WL', 'HS3SA', 'HUE_BRIDGE', 'HY0104', 'HY0105', 'IH012-RT01', 'JTYJ-GD-01LM/BW', 'JZ-ZB-005', 'KADRILJ', 'LCT001', 'LCT002', 'LCT003', 'LCT007', 'LCT010', 'LCT011', 'LCT012', 'LCT014', 'LCT015', 'LCT016', 'LED1545G12', 'LED1546G12', 'LED1623G12', 'LED1649C5', 'LED1836G9', 'LS21001', 'LSPA9', 'LTW001', 'LTW004', 'LTW010', 'LTW012', 'LTW013', 'LTW015', 'LWB004', 'LWB006', 'LWB010', 'LWB014', 'MCCGQ01LM', 'MCCGQ11LM', 'MCCGQ12LM', 'MCCGQ14LM', 'MG1_5RZ', 'ZBMINIL2-R2', 'ZBMINIR2-R2', 'ZBM5-1C-120', 'SNZB-04R2', 'SNZB-03R2', 'S40ZBTPF', 'S40ZBTPG', 'S60ZBTPF-R2', 'SWV-ZN', 'TRVZB', 'SNZB-05P', 'MS01', 'MSO1', 'NAS-SD02B0', 'PAR38 W 10 year', 'PG-S11Z', 'PHOSCON_GATEWAY', 'PLATFORMIO_ZIGBEE', 'PROTOTYPE', 'PTVO.DIMMER', 'PTVO.LIGHT', 'PTVO.ROUTER', 'PTVO.SENSOR', 'PTVO.SWITCH', 'Plug 01', 'RASPBEE', 'RASPBEE II', 'RB 165', 'RB 175 W', 'RB 178 T', 'RB 185 C', 'RB 285 C', 'RH3001', 'RH3040', 'ROM001', 'ROUTER', 'RS 125', 'RS 128 T', 'RWL020', 'RWL021', 'RWL022', 'S26R2ZB', 'S31 Lite zb', 'S31ZB', 'S40LITE', 'S40ZBTPB', 'S60ZBTPE', 'S60ZBTPF', 'S60ZBTPG', 'SA-028-1', 'SA-029-1', 'SA12IZL', 'SAMPLE', 'SD8SC_00.00.03.12TC', 'SDM01-3Z1', 'SDM02-2Z1', 'SEA801-Zigbee', 'SENSOR', 'SJCGQ11LM', 'SJCGQ12LM', 'SJCGQ13LM', 'SLZB-06', 'SLZB-07', 'SM0201', 'SMD9300', 'SML001', 'SML002', 'SML003', 'SML004', 'SMSZB-120', 'SNTZ003', 'SNZB-01', 'SNZB-01M', 'SNZB-01P', 'SNZB-02', 'SNZB-02D', 'SNZB-02DR2', 'SNZB-02LD', 'SNZB-02P', 'SNZB-02WD', 'SNZB-03', 'SNZB-03P', 'SNZB-04', 'SNZB-04P', 'SNZB-04PR2', 'SNZB-05', 'SNZB-06P', 'SONOFF_ZBBRIDGE', 'SP 120', 'SP 220', 'SP 222', 'SP-EUC01', 'SP-EUC02', 'SPM01-1Z2', 'SPM02-3Z3', 'SPZB0001', 'SPZB0003', 'SQ510A', 'SSSQS01LM', 'STZB402', 'STZB403', 'SWITCH', 'SZLMR10', 'TASMOTA', 'TH01', 'THS317-ET', 'TRADFRI control outlet', 'TRADFRI motion sensor', 'TRADFRI open/close remote', 'TRI-C1ZR', 'TRI-K1ZR', 'TRV001', 'TRV003', 'TRV601', 'TRV602', 'TS0001_din', 'TS0001_fingerbot', 'TS0001_power', 'TS0001_switch', 'TS0001_switch_module', 'TS0002_power', 'TS0002_switch_module', 'TS0003_power', 'TS0003_switch_module', 'TS0004_power', 'TS0004_switch_module', 'TS000F', 'TS004F', 'TS011F', 'TS0207_rain', 'TS0601_3phase', 'TS0601_8gang', 'TS0601_ac', 'TS0601_air_purifier', 'TS0601_breaker', 'TS0601_ceiling', 'TS0601_clamp', 'TS0601_co', 'TS0601_co2', 'TS0601_curtain_tilt', 'TS0601_dehum', 'TS0601_dim1', 'TS0601_dimmer3', 'TS0601_door', 'TS0601_fan', 'TS0601_fanctrl', 'TS0601_feeder', 'TS0601_garage', 'TS0601_gas', 'TS0601_generic', 'TS0601_gw', 'TS0601_hcho', 'TS0601_heatctrl', 'TS0601_heater', 'TS0601_humid', 'TS0601_irrigation', 'TS0601_lcd', 'TS0601_led', 'TS0601_lock', 'TS0601_meter', 'TS0601_mmwave', 'TS0601_pool', 'TS0601_rad', 'TS0601_rcbo', 'TS0601_repeater', 'TS0601_scene1', 'TS0601_scene2', 'TS0601_scene3', 'TS0601_scene6', 'TS0601_shutter', 'TS0601_smartlock', 'TS0601_sp1', 'TS0601_strip', 'TS0601_strip_adv', 'TS0601_strip_rgbw', 'TS0601_tank', 'TS0601_tempswitch', 'TS0601_thermo', 'TS0601_thermo4ch', 'TS0601_valve', 'TS0601_watervalve', 'TS0601_weather', 'TS0601_wirelesssw', 'TS110E', 'TS110F', 'TS130F', 'TV01-ZB', 'TV02-ZB', 'TY0201', 'TY0202', 'WB01', 'WSDCGQ01LM', 'WSDCGQ11LM', 'WSDCGQ12LM', 'WXKG01LM', 'WXKG02LM', 'WXKG03LM', 'WXKG06LM', 'WXKG07LM', 'WXKG11LM', 'WXKG12LM', 'YG400A', 'Z111PL0H-1JX', 'ZBBRIDGE', 'ZBCurtain', 'ZBMINI', 'ZBMINI-L', 'ZBMINIL2', 'ZBMINIR2', 'ZBPB10BK', 'ZBT-CCTLight', 'ZBT-ColorLight', 'ZBT-DimmableLight', 'ZC-LS02', 'ZG-101ZL', 'ZG-101ZS', 'ZG-102Z', 'ZG-102ZL', 'ZG-102ZM', 'ZG-103ZL', 'ZG-204Z', 'ZG-204ZH', 'ZG-204ZK', 'ZG-204ZL', 'ZG-204ZM', 'ZG-204ZV', 'ZG-205Z', 'ZG-222Z', 'ZG-223Z', 'ZG-227Z', 'ZG-303Z', 'ZIGBEE_DEV_KIT', 'ZIGSTAR', 'ZIGSTAR_LAN', 'ZIGSTAR_POE', 'ZIGSTAR_STICK', 'ZP-301Z', 'ZZH!', 'Zen-01', '_TZ3000_eit6l5', '_TZ3000_k4ej3ww2', '_TZ3000_kyb656no', 'eT093WRG', 'eT093WRO', 'eTRV0100', 'eTRV0101', 'eTRV0103', 'generic', 'lumi.airrtc.agl001', 'lumi.airrtc.vrfegl01', 'lumi.curtain', 'lumi.curtain.acn002', 'lumi.curtain.hagl04', 'lumi.magnet.ac01', 'lumi.magnet.agl02', 'lumi.motion.ac02', 'lumi.motion.agl04', 'lumi.plug.macn01', 'lumi.plug.maeu01', 'lumi.plug.mmeu01', 'lumi.remote.b1acn01', 'lumi.sensor_ht', 'lumi.sensor_ht.agl02', 'lumi.sensor_magnet', 'lumi.sensor_magnet.aq2', 'lumi.sensor_motion', 'lumi.sensor_motion.aq2', 'lumi.sensor_smoke', 'lumi.sensor_switch', 'lumi.sensor_switch.aq2', 'lumi.sensor_switch.aq3', 'lumi.sensor_wleak.aq1', 'lumi.weather', 'q9mpfhw'];

function buildFullIndex(driversDir) {
  driversDir = driversDir || path.join(__dirname, '..', '..', 'drivers');
  const mfrIdx = new Map(), pidIdx = new Map();
  const allMfrs = new Set(), allPids = new Set();
  if (!fs.existsSync(driversDir)) return { mfrIdx, pidIdx, allMfrs, allPids };
  for (const d of fs.readdirSync(driversDir)) {
    const f = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      for (const m of (data.zigbee?.manufacturerName || [])) {
        allMfrs.add(m);
        if (!mfrIdx.has(m)) mfrIdx.set(m, []);
        if (!mfrIdx.get(m).includes(d)) mfrIdx.get(m).push(d);
      }
      for (const p of (data.zigbee?.productId || [])) {
        allPids.add(p);
        if (!pidIdx.has(p)) pidIdx.set(p, []);
        if (!pidIdx.get(p).includes(d)) pidIdx.get(p).push(d);
      }
    } catch {}
  }
  return { mfrIdx, pidIdx, allMfrs, allPids };
}

function extractAllFP(text, allMfrs, allPids) {
  const mfr = _vFP(text);
  const pid = [...new Set((text || '').match(/\bTS[0-9]{4}[A-Z]?\b/g) || [])];
  for (const k of NON_TUYA_KNOWN) { if (text && text.includes(k) && !mfr.includes(k)) mfr.push(k); }
  for (const p of NON_TS_PIDS) { if (text && text.includes(p) && !pid.includes(p)) pid.push(p); }
  if (allMfrs) { for (const m of allMfrs) { if (m.length >= 4 && text && text.includes(m) && !mfr.includes(m)) mfr.push(m); } }
  if (allPids) { for (const p of allPids) { if (p.length >= 4 && text && text.includes(p) && !pid.includes(p)) pid.push(p); } }
  return { mfr, pid };
}

function resolveFingerprint(mfr, pid, dir) {
  dir = dir || path.join(__dirname, '..', '..', 'drivers');
  if (!mfr || !pid) return findDriver(mfr || pid);
  const ml = mfr.toLowerCase(), pl = pid.toLowerCase();
  
  // Forced check
  const forcedFile = path.join(__dirname, '..', '..', 'lib', 'data', 'BOT_FORCED_DISCOVERY.json');
  if (fs.existsSync(forcedFile)) {
    try {
      const forced = JSON.parse(fs.readFileSync(forcedFile, 'utf8'));
      if (forced[mfr]) return forced[mfr][0];
    } catch (e) {}
  }

  for (const d of fs.readdirSync(dir)) {
    const f2 = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(f2)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(f2, 'utf8'));
      const ms = (data.zigbee?.manufacturerName || []).map(s => s.toLowerCase());
      const ps = (data.zigbee?.productId || []).map(s => s.toLowerCase());
      if (ms.includes(ml) && ps.includes(pl)) return d;
    } catch {}
  }
  return null;
}

module.exports = { loadFingerprints, findDriver, findAllDrivers, extractMfrFromText, buildFullIndex, extractAllFP, NON_TUYA_KNOWN, NON_TS_PIDS, resolveFingerprint };
