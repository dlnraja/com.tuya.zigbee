'use strict';

const TU = require('../utils/TuyaNormalizer');
const { resolveGang } = require('../utils/GangIndexResolver');
const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');
const DeviceOperatingMode = require('../zigbee/DeviceOperatingMode');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   PhysicalButtonMixin v5.5.999 - Advanced Physical Button Detection         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Detects physical button presses vs app commands with support for:          ║
 * ║  - Single press                                                              ║
 * ║  - Double press                                                              ║
 * ║  - Long press (hold)                                                         ║
 * ║  - Triple press                                                              ║
 * ║  Manufacturer-specific timing profiles (BSEED=2000ms, default=500ms)        ║
 * ║  v5.5.999: Enhanced state tracking for all buttons (packetninja pattern)    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   MANUFACTURER-SPECIFIC DEVICE PROFILES                                      ║
 * ║   Based on Z2M, ZHA research and user feedback from forum                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║   Sources:                                                                   ║
 * ║   - Z2M #14523: TS0003 individual channel issue                              ║
 * ║   - ZHA #2443: TS0003/TS0004 group toggle bug (0xE000/0xE001 clusters)       ║
 * ║   - Forum: BSEED, Zemismart, Moes switches user reports                      ║
 * ║   - PR #116: packetninja BSEED physical button detection                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
const DEVICE_PROFILES = {
  // ════════════════════════════════════════════════════════════════════════════
  // BSEED Switches - Use ZCL only, clusters 0xE000/0xE001, slow response
  // From: PR #116, forum diagnostics, Blakadder database
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_blhvsaqf': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_ysdv91bk': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_hafsqare': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_e98krvvk': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_iedbgyxt': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'BSEED'
  },
  '_TZ3000_mrduubod': {
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'Moes/BSEED',
    productId: 'TS0014', gangCount: 4, buttonCount: 4,
    perEndpointControl: true, requiresExplicitBinding: true, source: 'homey_forum_2099'
  },
  // v5.8.1: BSEED 2-gang (Pieter_Pessers forum report)
  '_TZ3000_l9brjwau': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0012'
  },
  // v5.8.1: BSEED 3-gang
  '_TZ3000_qkixdnon': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0013'
  },
  '_TZ3000_v4l4b0lp': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0013'
  },
  '_TZ3000_zivfvd7h': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0013'
  },
  '_TZ3000_cfz9h9re': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0013'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Zemismart Switches - Similar to BSEED, have 0xE000/0xE001 clusters
  // ZHA #2443: "all gangs toggle together" bug - needs per-endpoint control
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_a37eix1s': { 
    appCommandWindow: 1500, doubleClickWindow: 400, longPressThreshold: 700,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'Zemismart',
    perEndpointControl: true  // Must send to specific endpoint, not broadcast
  },
  '_TZ3000_empogkya': { 
    appCommandWindow: 1500, doubleClickWindow: 400, longPressThreshold: 700,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'Zemismart',
    perEndpointControl: true
  },
  '_TZ3000_18ejxrzk': { 
    appCommandWindow: 1500, doubleClickWindow: 400, longPressThreshold: 700,
    protocol: 'zcl_only', customClusters: [0xE000, 0xE001], brand: 'Zemismart',
    perEndpointControl: true
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Moes Switches - Various timing requirements per user feedback
  // Forum: Freddyboy / meter91 _TZ3000_zgyzgdua + TS0044 scene switch
  // WHY(P2253): hybrid RX (0xFD + E000 + raw + optional EF00) — NEVER write 0x8004
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_zgyzgdua': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', sceneSwitch: true, usesE000: true,
    productId: 'TS0044', buttonCount: 4, skip8004: true, writeSceneAttr: false,
    source: 'P2253_meter91_hybrid'
  },
  // WHY: Nobø SWS-IZ diag 9cbf9eb6 — single-EP clusters 5/6/8, multi-button via
  // TS0044-RAW endpoint actions; never write genOnOff 0x8004 on this firmware.
  '_TZ3000_xffhmvhv': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Nobo', usesE000: false, productId: 'TS004F',
    buttonCount: 4, skip8004: true, source: 'gmail_diag_9cbf9eb6'
  },
  '_TZ3000_abrsvsou': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  '_TZ3000_mh9px7cq': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  '_TZ3000_uri7ez8u': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  '_TZ3000_rrjr1q0u': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true
  },
  '_TZ3000_vp6clf9d': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true,
    // Hubitat kkossev: retransmits outlast TSN dedup — needs ~1200ms window
    debounceMs: 1200
  },
  // v10.4.0: Hubitat kkossev forcedDebounce family (TS0044/TS0043 flaky retransmitters)
  '_TZ3000_ur5fpg7p': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0044',
    buttonCount: 4, debounceMs: 1200, skip8004: true, writeSceneAttr: false, sceneSwitch: true
  },
  '_TZ3000_wkai4ga5': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0044',
    buttonCount: 4, debounceMs: 1200, skip8004: true, writeSceneAttr: false,
    sceneSwitch: true, source: 'P2253_z2m_moes_ts0044'
  },
  '_TZ3000_gbm10jnj': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0043',
    buttonCount: 3, debounceMs: 1200, skip8004: true, writeSceneAttr: false, sceneSwitch: true
  },
  // v5.8.0: From Hubitat kkossev TS004F driver research
  '_TZ3000_fa9mlvja': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0041'
  },
  '_TZ3000_s0i14ubi': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0041'
  },
  // WHY(P2282/P2285): Peter #2202 + Z2M SH-SC07 + Johan #1120 interview
  // EP1–4 exist in interview but physical is 1-button; presses = genOnOff 0xFD;
  // clusters EP1: 0,1,6,E000 — NO EF00; skip 0x8004; never battery reporting cfg (Z2M #8072)
  '_TZ3000_mrpevh8p': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya/SH-SC07', usesE000: true, productId: 'TS0041',
    buttonCount: 1, skip8004: true, writeSceneAttr: false,
    collapsePhantomEndpoints: true, batteryEpOnly: 1, skipBatteryReporting: true,
    noEf00Tx: true, mapAllEndpointsToButton1: true,
    whiteLabel: ['SH-SC07', 'RSH-SC021'],
    source: 'P2285_z2m_hubitat_johan1120_forum2202',
  },
  '_TZ3000_5bpeda8u': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya/SH-SC07', usesE000: true, productId: 'TS0041',
    buttonCount: 1, skip8004: true, writeSceneAttr: false,
    collapsePhantomEndpoints: true, batteryEpOnly: 1, skipBatteryReporting: true,
    noEf00Tx: true, mapAllEndpointsToButton1: true,
    source: 'P2285_z2m_whitelabel_SH-SC07',
  },
  '_TZ3000_b4awzgct': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya/SH-SC07', usesE000: true, productId: 'TS0041',
    buttonCount: 1, skip8004: true, writeSceneAttr: false,
    collapsePhantomEndpoints: true, batteryEpOnly: 1, skipBatteryReporting: true,
    noEf00Tx: true, mapAllEndpointsToButton1: true,
    source: 'P2285_z2m_whitelabel_SH-SC07_was_4ts0041_misroute',
  },
  // FIX: Add _TZ3000_yj6k7vfo for button detection (Issues #334, #410)
  '_TZ3000_yj6k7vfo': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0041', buttonCount: 4
  },
  // Forum Moes 4-button / button_wireless_4 sacred couple (TS0044)
  // WHY(P2251): skip8004 — firmware rejects genOnOff 0x8004 (scene_mode_unsupported)
  '_TZ3000_kfu8zapd': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS0044', buttonCount: 4,
    debounceMs: 750, skip8004: true, writeSceneAttr: false, source: 'P2251_diag_scene_mode'
  },
  '_TZ3000_tzvbimpq': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0042'
  },
  '_TZ3000_t8hzpgnd': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0042'
  },
  '_TZ3000_h1c2eamp': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0042'
  },
  // v5.8.0: TS0046 6-button devices (from Hubitat research)
  '_TZ3000_iszegwpd': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'LoraTap', usesE000: true, productId: 'TS0046', buttonCount: 6
  },
  // v5.8.1: LoraTap TS0043 3-button (GitHub #98 DVMasters)
  '_TZ3000_famkxci2': { 
    appCommandWindow: 1000, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'zcl_only', brand: 'LoraTap', usesE000: true, productId: 'TS0043', buttonCount: 3
  },
  '_TZ3000_nrfkrgf4': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0046', buttonCount: 6
  },
  // v5.8.0: Sonoff SNZB-01 button (from Hubitat research)
  'eWeLink': { 
    appCommandWindow: 800, doubleClickWindow: 400, longPressThreshold: 500,
    protocol: 'zcl_only', brand: 'Sonoff', productId: 'SNZB-01'
  },
  // v5.8.0: Konke button (from Hubitat research)
  'Konke': { 
    appCommandWindow: 1000, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'zcl_only', brand: 'Konke'
  },
  '_TZ3000_tbfw36ye': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes'
  },
  // v5.8.1: Additional E000 cluster devices from Z2M/Hubitat research
  '_TZ3000_w8jwkczz': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044'
  },
  '_TZ3000_dku2cfsc': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044'
  },
  '_TZ3000_ja5osu5g': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS004F'
  },
  '_TZ3000_an5rjiwd': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS004F'
  },
  '_TZ3000_nuombroo': { 
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044'
  },
  '_TZ3000_pcqjmcud': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044'
  },
  // v10.1.0: FIX TS0044 4-button remote (_TZ3000_u3nv1jwk) - buttons not detected
  // Device sends button actions via cluster 0xE000 + scenes cluster + Tuya DP
  // All endpoints list cluster 57344 (0xE000) in compose.json
  '_TZ3000_u3nv1jwk': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_BI6LPSEW': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_VP6CLF9D': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_A4XYCPRS': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_UFHTXR59': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_dziaict4': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_j61x9rxn': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_11PG3IMA': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_CZUYT8LZ': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_ET7AFZXZ': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_0ht8dnxj': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  '_TZ3000_b3mgfu0d': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0044', buttonCount: 4
  },
  // v10.1.0: FIX TS004F variants missing profiles
  // WHY(P2251): same 0x8004 reject class as Nobø/kfu8zapd — endpoint 0xFD path only
  '_TZ3000_xabckq1v': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS004F', buttonCount: 4,
    skip8004: true, writeSceneAttr: false, source: 'P2251_diag_scene_mode'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Lonsonho/Tuya Generic - Standard timing, Tuya DP protocol
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_cfnprab5': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'tuya_dp', brand: 'Lonsonho'
  },
  '_TZ3000_vjhcxkzb': { 
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'tuya_dp', brand: 'Lonsonho'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TS0726 - BSEED 4-gang with special bindings (Hartmut_Dunker forum)
  // Needs explicit onOff cluster binding per endpoint
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3002_pzao9ls1': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0726',
    requiresExplicitBinding: true,
    perEndpointControl: true  // v5.8.87: Hartmut — fw toggles ALL gangs on single EP cmd
  },
  '_TZ3002_vaq2bfcu': { 
    appCommandWindow: 2000, doubleClickWindow: 500, longPressThreshold: 800,
    protocol: 'zcl_only', brand: 'BSEED', productId: 'TS0726',
    requiresExplicitBinding: true,
    perEndpointControl: true
  },

  // ════════════════════════════════════════════════════════════════════════════
  // HOBEIAN Switches - User reports from forum
  // ════════════════════════════════════════════════════════════════════════════
  'HOBEIAN': { 
    appCommandWindow: 1000, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'HOBEIAN'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // _TZ3000_h1ipgkwn / _TZ3000_iwtv2jwo - TS0002 USB 2-Port Relay + Zigbee Repeater
  // Has physical button (cycle USB ports), clusters 0xE000/0xE001 for moesStartUpOnOff
  // Z2M #23625, #31782: ZCL-only (OnOff EP1 & EP2), mains-powered, NO battery
  // slsys.io: 2-port USB relay with physical button + blue LED
  // ════════════════════════════════════════════════════════════════════════════
  '_TZ3000_h1ipgkwn': { 
    appCommandWindow: 800, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'zcl_only', brand: 'Tuya', productId: 'TS0002', perEndpointControl: true,
    customClusters: [0xE000, 0xE001], usbRelay: true, gangCount: 2
  },
  '_TZ3000_iwtv2jwo': {
    appCommandWindow: 800, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'zcl_only', brand: 'Tuya', productId: 'TS0002', perEndpointControl: true,
    customClusters: [0xE000, 0xE001], usbRelay: true, gangCount: 2
  },

  // ════════════════════════════════════════════════════════════════════════════
  // v10.2.0: Z2M Cross-Referenced Manufacturer Profiles
  // Sourced from zigbee-herdsman-converters (Z2M) device definitions and
  // ZHA quirks database. These extend coverage for devices that were previously
  // falling back to the generic 'default' profile.
  // ════════════════════════════════════════════════════════════════════════════

  // -- LoraTap Z2M converters: scene-capable switches with multi-press --
  '_TZ3000_buge3vuq': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'LoraTap', usesE000: true, productId: 'TS0044', buttonCount: 4,
    source: 'z2m_tuya_ts0044'
  },
  '_TZ3000_oxslg1pe': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'LoraTap', usesE000: true, productId: 'TS0044', buttonCount: 4,
    source: 'z2m_tuya_ts0044'
  },

  // -- Tuya Z2M: TS004F 1/2/4-button scene remotes --
  '_TZ3000_p65xmirz': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS004F', buttonCount: 1,
    source: 'z2m_tuya_ts004f'
  },
  '_TZ3000_4l3pgnas': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS004F', buttonCount: 2,
    source: 'z2m_tuya_ts004f'
  },
  '_TZ3000_cx9vufus': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS004F', buttonCount: 4,
    source: 'z2m_tuya_ts004f'
  },

  // -- Tuya Z2M: TS0041 1-button with scene mode --
  '_TZ3000_r42zji12': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0041',
    source: 'z2m_tuya_ts0041'
  },

  // -- Tuya Z2M: TS0042 2-button --
  '_TZ3000_lfsabhkv': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0042',
    source: 'z2m_tuya_ts0042'
  },

  // -- Tuya / Zemismart Z2M: TS0043 3-button sticky wall remote --
  '_TZ3000_a7ouggvs': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Zemismart', usesE000: true, productId: 'TS0043', buttonCount: 3,
    skip8004: true, writeSceneAttr: false, sceneSwitch: true, source: 'P2253_z2m_zemismart_ts0043'
  },
  // WHY(P2253): Blakadder ZM-ZS-3 — same 3-EP hybrid path as a7ouggvs
  '_TZ3400_key8kk7r': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Zemismart', usesE000: true, productId: 'TS0043', buttonCount: 3,
    skip8004: true, writeSceneAttr: false, sceneSwitch: true, source: 'P2253_blakadder_zm_zs3'
  },
  '_TZ3000_bczr4e10': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0043', buttonCount: 3,
    skip8004: true, writeSceneAttr: false, sceneSwitch: true, source: 'P2253_INT170'
  },
  '_TZ3000_qzjcsmar': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Zemismart', usesE000: true, productId: 'TS0043', buttonCount: 3,
    skip8004: true, writeSceneAttr: false, sceneSwitch: true, source: 'z2m_zemismart_ts0043'
  },
  '_TZ3000_xkwjqeqd': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0043', buttonCount: 3,
    skip8004: true, writeSceneAttr: false, sceneSwitch: true, source: 'z2m_tuya_ts0043'
  },

  // -- Tuya Z2M: TS0046 6-button remote --
  '_TZ3000_2se8efxk': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Tuya', usesE000: true, productId: 'TS0046', buttonCount: 6,
    source: 'z2m_tuya_ts0046'
  },

  // -- Zemismart Z2M: 4-gang scene switch --
  '_TZ3000_vt1sgyto': {
    appCommandWindow: 1500, doubleClickWindow: 400, longPressThreshold: 700,
    protocol: 'zcl_only', brand: 'Zemismart', customClusters: [0xE000, 0xE001],
    perEndpointControl: true, source: 'z2m_zemismart_scene'
  },

  // -- Moes Z2M: TS004F 4-button scene remote --
  '_TZ3000_oteubstp': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Moes', usesE000: true, productId: 'TS004F', buttonCount: 4,
    source: 'z2m_moes_ts004f'
  },

  // -- Lonsonho Z2M: curtain/cover switches --
  '_TZ3000_ikvnogmv': {
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'tuya_dp', brand: 'Lonsonho', productId: 'TS130F',
    source: 'z2m_lonsonho_ts130f'
  },

  // -- Zemismart Z2M: TS004F 4-button --
  '_TZ3000_wkdbocra': {
    appCommandWindow: 1000, doubleClickWindow: 350, longPressThreshold: 600,
    protocol: 'hybrid', brand: 'Zemismart', usesE000: true, productId: 'TS004F', buttonCount: 4,
    source: 'z2m_zemismart_ts004f'
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Default profile for unknown manufacturers
  // ════════════════════════════════════════════════════════════════════════════
  'default': {
    appCommandWindow: 500, doubleClickWindow: 400, longPressThreshold: 600,
    protocol: 'auto', brand: 'Generic'
  }
};

const DiagnosticLogger = require('../diagnostics/DiagnosticLogger');

const PhysicalButtonMixin = (SuperClass) => {
  // v9.0.404: same guard as VirtualButtonMixin — a non-constructor base used
  // to crash with "Class extends value # is not a constructor or null".
  if (!SuperClass || typeof SuperClass !== 'function') {
    return class PhysicalButtonFallback {
      async initPhysicalButtonDetection() {
        // Fallback mode - no-op when base class unavailable
      }
    };
  }
  return class extends SuperClass {

  /**
   * v5.5.999: Get the last known onoff state for a specific gang
   * @param {number} gang - Gang number (1-based)
   * @returns {boolean|null} Last known state or null if unknown
   */
  getLastOnoffState(gang = 1) {
    return this._physicalButtonState?.[gang]?.lastState ?? null;
  }

  /**
   * v5.5.999: Get all gang states as an object
   * @returns {Object} Object with gang numbers as keys and states as values
   */
  getAllGangStates() {
    const states = {};
    const gangCount = this.gangCount || 1;
    for (let g = 1; g <= gangCount; g++) {
      states[g] = this.getLastOnoffState(g);
    }
    return states;
  }

  /**
   * v5.5.999: Check if an app command is pending for a gang
   * @param {number} gang - Gang number (1-based)
   * @returns {boolean} True if app command is pending
   */
  isAppCommandPending(gang = 1) {
    return this._physicalButtonState?.[gang]?.appCommandPending ?? false;
  }

  /**
   * v5.5.999: Get the last physical button event for a gang
   * @param {number} gang - Gang number (1-based)
   * @returns {Object|null} Last event info or null
   */
  getLastPhysicalEvent(gang = 1) {
    return this._physicalButtonState?.[gang]?.lastPhysicalEvent ?? null;
  }

  /**
   * v10.4.0: Tuya magic packet — one-shot genBasic read that keeps sleepy
   * Tuya remotes awake/paired (z2m configureMagicPacket, ZHA TuyaQuirk).
   * Only sent to Tuya-family manufacturers; harmless no-op elsewhere.
   * @param {Object} zclNode
   */
  async _sendTuyaMagicPacket(zclNode) {
    try {
      const { sendTuyaMagicPacket } = require('../zigbee/TuyaMagicPacket');
      await sendTuyaMagicPacket(this, zclNode, 1);
    } catch (e) {
      // best-effort only
    }
  }

  /**
   * Initialize physical button detection for all gangs
   * Call this in onNodeInit after super.onNodeInit()
   */
  async initPhysicalButtonDetection(zclNode) {
    // v10.3.0 FIX (B10): Guard against double initialization.
    // Some drivers call this directly on top of TuyaZigbeeDevice.onNodeInit,
    // and wall_switch drivers used to double-wrap the mixin — both produced
    // duplicate listeners on the same endpoints.
    if (this._physicalButtonDetectionInitialized) {
      this.log(' Already initialized, skipping duplicate setup');
      return;
    }

    // Initialize diagnostic logger for button events
    if (!this._buttonDiagLogger) {
      this._buttonDiagLogger = new DiagnosticLogger(this, 'PhysicalButtonMixin');
    }

    // Check if physical button detection is enabled in settings
    const enabled = this.getSetting?.('physical_button_enabled') ?? true;
    if (!enabled) {
      this._buttonDiagLogger.info('Physical button detection DISABLED in settings');
      // P115: do NOT mark initialized — allow re-init when setting flips on.
      // Still seed empty state so markAppCommand never silent-no-ops.
      this._physicalButtonState = this._physicalButtonState || {};
      return;
    }

    this._physicalButtonDetectionInitialized = true;

    // WHY(P2285/P2290): SH-SC07 / mrpevh8p — interview lists EP2–4 but physical is 1 btn
    const earlyProfile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
    if (earlyProfile?.buttonCount && Number(earlyProfile.buttonCount) > 0) {
      this.buttonCount = Number(earlyProfile.buttonCount);
      if (earlyProfile.collapsePhantomEndpoints || earlyProfile.mapAllEndpointsToButton1) {
        // Force BOTH counters — resolveGangCount uses Math.max(gang,button)
        // and a leftover gangCount=4 from interview would defeat collapse.
        this.gangCount = Number(earlyProfile.buttonCount);
      }
    }

    // Get timing profile from settings or manufacturer defaults
    this._timingProfile = this._getTimingProfile();
    this._buttonDiagLogger.info('Physical button detection initialized', {
      gangCount: this.gangCount || this.buttonCount || 1,
      appWindow: this._timingProfile.appCommandWindow,
      doubleClick: this._timingProfile.doubleClickWindow,
      longPress: this._timingProfile.longPressThreshold,
      brand: this._timingProfile.brand
    });

    // v9.0.40: TSN-level deduplication - tracks last-seen transactionSequenceNumber per endpoint
    // Prevents duplicate button events at the protocol level before any other processing
    this._lastTSN = new Map();

    // v10.4.0: Tuya "magic packet" (z2m configureMagicPacket / ZHA quirk).
    // A one-shot genBasic read of [0x0004, 0x0000, 0x0001, 0x0005, 0x0007, 0xfffe]
    // right after init keeps sleepy Tuya remotes properly paired and reporting —
    // without it some units silently stop sending press events. Best-effort,
    // fire-and-forget; failures are normal on mains/non-Tuya devices.
    this._sendTuyaMagicPacket(zclNode).catch(() => {});

    // WHY(P2283): remotes use buttonCount; wall switches use gangCount — cover Math.max
    const { resolveGangCount, ensureDedup } = require('../utils/BidirectionalButtonState');
    let gangCount = resolveGangCount(this);
    // WHY(P2290): clamp after Math.max so phantom EP4 never wins over 1-btn profile
    if (earlyProfile?.collapsePhantomEndpoints || earlyProfile?.mapAllEndpointsToButton1) {
      gangCount = Number(earlyProfile.buttonCount) || 1;
      this.buttonCount = gangCount;
      this.gangCount = gangCount;
    }
    ensureDedup(this);
    this._physicalButtonState = {};

    for (let gang = 1; gang <= gangCount; gang++) {
      this._physicalButtonState[gang] = {
        lastState: null,
        appCommandPending: false,
        appCommandTimeout: null,
        pressStartTime: null,
        clickCount: 0,
        clickTimeout: null,
        lastClickTime: 0,
        // v5.5.999: Enhanced state tracking (packetninja pattern)
        lastPhysicalEvent: null,      // { type: 'on'|'off'|'single'|'double'|'long_press'|'triple', timestamp: Date.now() }
        lastAppEvent: null,           // { type: 'on'|'off', timestamp: Date.now() }
        stateHistory: [],             // Last 10 state changes for debugging
        totalPhysicalPresses: 0,      // Counter for diagnostics
        totalAppCommands: 0           // Counter for diagnostics
      };

      // v6.0.0: Restore cumulative metrics from store if available
      const storedMetrics = this.getStoreValue(`physical_metrics_gang${gang}`);
      if (storedMetrics) {
        this._physicalButtonState[gang].totalPhysicalPresses = storedMetrics.totalPhysicalPresses || 0;
        this._physicalButtonState[gang].totalAppCommands = storedMetrics.totalAppCommands || 0;
      }
    }

    // v6.0.0: Persistent Memory Sync Task (FIX: stored for cleanup + dedup cleanup)
    if (this._metricsSyncInterval) {try { (this.homey?.clearInterval ? this.homey.clearInterval.bind(this.homey) : globalThis.clearInterval)(this._metricsSyncInterval); } catch (_e) {}}
    this._metricsSyncInterval = (this.homey?.setInterval ? this.homey.setInterval.bind(this.homey) : globalThis.setInterval)(() => {
      if (this._destroyed) {return;}
      if (!this._physicalButtonState) {return;}
      for (let gang = 1; gang <= gangCount; gang++) {
        const state = this._physicalButtonState[gang];
        this.setStoreValue(`physical_metrics_gang${gang}`, {
          totalPhysicalPresses: state.totalPhysicalPresses,
          totalAppCommands: state.totalAppCommands,
          lastSync: Date.now()
        }).catch(() => {});
      }
      // FIX: Clean up _sceneDedup entries older than 60 seconds
      if (this._sceneDedup) {
        const cutoff = Date.now() - 60000;
        for (const key in this._sceneDedup) {
          if (this._sceneDedup[key] < cutoff) {delete this._sceneDedup[key];}
        }
      }
    }, 1000 * 60 * 10); // Every 10 minutes

    // Setup detection for each endpoint
    for (let gang = 1; gang <= gangCount; gang++) {
      await this._setupGangPhysicalDetection(zclNode, gang);
    }

    // WHY: Tuya remotes send manufacturer cmd 0xFD on genOnOff (cluster 6).
    // Register lib/clusters/OnOffBoundCluster (has handleFrame 0xFD) + raw catcher.
    await this._setupOnOffFdBoundCluster(zclNode);

    // P2223: complement cascade L5 E000 BoundCluster + silent bind retry (additive)
    try {
      const { enrichCaptureCascade } = require('./ButtonCaptureCascade');
      await enrichCaptureCascade(this, zclNode);
    } catch (e) {
      this.log(`[CASCADE] enrich skipped: ${e.message}`);
    }

    // v7.0.0: TX/RX Debounce tracking
    this._lastReportTimestamp = 0;
    this._reportDebounceMs = 200; // 200ms debounce for rapid-fire ZCL reports

    this.log(` Initialized for ${gangCount} gang(s) - SDK 3 Ready`);

    // v5.13.7: Universal Scene Mode Switching (hardened fleet)
    await this.initSceneModeManagement(zclNode);

    // P2221: log parallel RX stack (Homey-native gaps compensated)
    this._logBidirectionalButtonStack?.(gangCount);
  }

  /**
   * P2221 — Vision checklist: Homey does not natively decode Tuya mfr OnOff 0xFD/0xFC.
   * We run complementary layers in parallel (BoundCluster + raw + scenes + ZCL + EF00).
   */
  _logBidirectionalButtonStack(gangCount) {
    const layers = {
      physicalInit: !!this._physicalButtonDetectionInitialized,
      onOffFdBound: !!this._onOffFdBoundClusterInitialized,
      onOffFdRaw: !!this._onOffFdRawCatcherHooked,
      virtualReady: typeof this.initVirtualButtons === 'function' || typeof this._handleVirtualToggle === 'function',
      uiListeners: this._buttonCapListenersRegistered === true
        || (this._buttonCapListenersRegistered instanceof Set && this._buttonCapListenersRegistered.size > 0),
      markAppCommand: typeof this.markAppCommand === 'function',
      dedup: !!this._virtualPhysicalDedup || true,
      gangs: gangCount || this.gangCount || 1,
    };
    this.log(`[BIDIR-BTN] stack ${JSON.stringify(layers)}`);
  }

  /**
   * Scene / command mode: TS004F writes genOnOff 0x8004.
   * TS0041/42/43/44 are per-endpoint remotes — do NOT write 0x8004.
   * Wall TS000x use E001 switchType; 0x8004 there is switchMode, not scene.
   * WHY(P2254): DEVICE_PROFILES.skip8004 is an active gate (not metadata-only).
   */
  async initSceneModeManagement(zclNode) {
    const settings = this.getSettings?.() || {};
    const mode = String(settings.button_mode || 'auto').toLowerCase();

    DeviceOperatingMode.registerOperationModeListener(this, zclNode);

    const family = DeviceOperatingMode.classifyOperatingFamily(this);
    const profile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
    const profileSkip = !!(profile?.skip8004 || profile?.writeSceneAttr === false);
    if (!family.writeSceneAttr || profileSkip) {
      this.log(`[PHYSICAL-MODE] skip 0x8004 (family=${family.family}${profileSkip ? ',profileSkip' : ''})`);
      return;
    }

    if (mode === 'dimmer' || mode === 'command') {
      this.log('[PHYSICAL-MODE] Dimmer/command mode selected, writing 0x8004=0');
      await this._switchToSceneMode(zclNode);
      return;
    }

    this.log(`[PHYSICAL-MODE] ${family.family} needs event/scene mode`);
    await this._switchToSceneMode(zclNode);
    this._scheduleSceneModeRecovery(zclNode);
  }

  /**
   * Apply Homey button_mode onto TS004F only (genOnOff 0x8004).
   * WHY(P2253): TS0041–44 / scene_switch_4 are endpoint remotes — writeSceneAttr=false.
   * Writing 0x8004 on those kills physical presses (5.x “worked better” = less wake spam).
   */
  async _switchToSceneMode(zclNode) {
    const node = (zclNode && zclNode.endpoints) ? zclNode : this.zclNode;
    if (!node) {return;}
    try {
      const r = await DeviceOperatingMode.applyDesiredMode(this, node);
      if (r.skipped) {
        this.log(`[PHYSICAL-MODE] skip 0x8004 (${r.skipped})`);
        return;
      }
      if (r.ok) {
        this.log(`[PHYSICAL-MODE] operation mode ${r.desired} via ${r.via}`);
        this._lastSceneModeApply = Date.now();
        return;
      }
      this.log(`[PHYSICAL-MODE] mode write skipped: ${r.unsupported ? 'unsupported' : r.reason}`);
    } catch (err) {
      this.log(` Mode switch failed: ${err.message}`);
    }
  }

  /**
   * v10.2.0: Periodic scene mode recovery
   * Battery devices use 1h interval (they lose state on deep sleep).
   * Mains-powered devices keep the interval at 4h.
   */
  _scheduleSceneModeRecovery(zclNode) {
    if (this._sceneRecoveryTimer) {clearInterval(this._sceneRecoveryTimer);}

    // Determine if this is a battery device
    const hasBattery = this.hasCapability?.('measure_battery') ||
                       this.hasCapability?.('alarm_battery');
    const isBatteryDevice = hasBattery &&
                            !this.hasCapability?.('measure_voltage') &&
                            !this.driver?.manifest?.data?.zigbee?.categories?.includes('socket');

    // v10.2.0: Battery devices need more frequent recovery (1h) because they lose
    // state on deep sleep. Mains-powered devices keep the original 4h interval.
    const recoveryIntervalMs = isBatteryDevice
      ? 1 * 60 * 60 * 1000   // 1 hour for battery devices
      : 4 * 60 * 60 * 1000;  // 4 hours for mains-powered devices

    const label = isBatteryDevice ? '1h (battery)' : '4h (mains)';
    this.log(`[PHYSICAL-MODE] Scene recovery interval: ${label}`);

    this._sceneRecoveryTimer = (this.homey?.setInterval ? this.homey.setInterval.bind(this.homey) : globalThis.setInterval)(async () => {
      if (this._destroyed) {return;}
      this.log('[PHYSICAL-MODE] Periodic recovery check...');
      await this._switchToSceneMode(zclNode);
    }, recoveryIntervalMs);
  }

  /**
   * v5.13.7: Re-apply scene mode on wake (button press)
   */
  async _reapplySceneModeOnWake() {
    const now = Date.now();
    const lastApply = this._lastSceneModeApply || 0;
    
    // Debounce re-application (max once per 10 minutes)
    if (now - lastApply < 10 * 60 * 1000) {return;}

    this.log(' Re-applying scene mode on wake...');
    await this._switchToSceneMode(this.zclNode);
  }

  /**
   * v9.0.47: Per-gang report debounce check
   *
   * CAUSE RACINE #2 (régression multi-gang) :
   *   L'ancien `_isDebounced()` utilisait un seul `_lastReportTimestamp` global
   *   pour tout le device. Sur un interrupteur multi-gang, un rapport ZCL arrivant
   *   sur le gang 1 désactivait la détection sur les gangs 2-6 pendant 200 ms.
   *   Conséquence : les clics quasi-simultanés sur plusieurs boutons étaient perdus.
   *
   * FIX : Un Map par-gang (`_lastReportTimestampPerGang`) isole le debounce.
   * Chaque gang a sa propre fenêtre anti-rebond, indépendante des autres.
   *
   * @param {number} gang - Numéro de gang (1-based) pour le debounce ciblé
   * @returns {boolean} true si le rapport doit être ignoré (debounce actif)
   */
  _isDebounced(gang = 1) {
    const now = Date.now();
    // Migration transparente : initialise le Map par-gang si nécessaire
    if (!this._lastReportTimestampPerGang) {
      this._lastReportTimestampPerGang = new Map();
      // Préserve la dernière valeur globale connue pour éviter un reset brutal
      if (typeof this._lastReportTimestamp === 'number' && this._lastReportTimestamp > 0) {
        this._lastReportTimestampPerGang.set(gang, this._lastReportTimestamp);
      }
    }

    const lastForGang = this._lastReportTimestampPerGang.get(gang) || 0;
    // v10.4.0: profile-aware debounce — Hubitat kkossev found several TS0044/43
    // manufacturers need ~1200ms (retransmits beyond TSN dedup). Profiles may
    // set `debounceMs`; default stays 200ms (_reportDebounceMs).
    const profileDebounce = this.getDeviceProfile?.()?.debounceMs;
    const debounceMs = profileDebounce || this._reportDebounceMs || 200;
    if (now - lastForGang < debounceMs) {
      this.log(` Debounce actif gang ${gang}: skip (${now - lastForGang}ms < ${debounceMs}ms)`);
      return true;
    }
    this._lastReportTimestampPerGang.set(gang, now);
    return false;
  }

  /**
   * Get the full device profile for this manufacturer
   * Returns profile with timing, protocol, and special flags
   */
  getDeviceProfile() {
    // WHY(P2290): same mfr chain as DeviceOperatingMode / MfrHelper — settings lag
    // at onNodeInit left SH-SC07 on default profile → phantom EP presses miss gang1 flows.
    let manufacturerName = '';
    let modelId = '';
    try {
      const MfrHelper = require('../helpers/ManufacturerNameHelper');
      manufacturerName = MfrHelper.getManufacturerName(this) || '';
      modelId = MfrHelper.getModelId(this) || '';
    } catch (_e) {
      manufacturerName = this.getSetting?.('zb_manufacturer_name')
        || this.getStoreValue?.('zb_manufacturer_name')
        || this.getStoreValue?.('manufacturerName')
        || this.getData?.()?.manufacturerName
        || this.zclNode?.endpoints?.[1]?.clusters?.basic?.attributes?.manufacturerName
        || '';
      modelId = this.getSetting?.('zb_model_id')
        || this.getData?.()?.productId
        || this.getData?.()?.modelId
        || '';
    }

    // Exact case-insensitive mfr match (avoid substring false positives)
    for (const [mfr, profile] of Object.entries(DEVICE_PROFILES)) {
      if (mfr !== 'default' && TU.equalsIgnoreCase(manufacturerName, mfr)) {
        this.log?.(`[PROFILE] Matched ${mfr} for "${manufacturerName}"`);
        return { ...profile, manufacturerName: mfr, detectedName: manufacturerName };
      }
    }

    // WHY(P2290): Peter #2203 — button_wireless_1 + TS0041 always 1 physical btn
    // even when zb_manufacturer_name settings are still empty after pair/update.
    const driverId = String(this.driver?.id || this.driverId || '');
    const modelUp = String(modelId || '').toUpperCase();
    if (/button_wireless_1/.test(driverId) && /^TS0041$/.test(modelUp)) {
      this.log?.(`[PROFILE] P2290 driver+TS0041 fallback for "${manufacturerName || 'mfr?'}"`);
      return {
        ...DEVICE_PROFILES.default,
        protocol: 'hybrid',
        brand: 'Tuya/SH-SC07',
        productId: 'TS0041',
        buttonCount: 1,
        skip8004: true,
        writeSceneAttr: false,
        collapsePhantomEndpoints: true,
        batteryEpOnly: 1,
        skipBatteryReporting: true,
        noEf00Tx: true,
        mapAllEndpointsToButton1: true,
        manufacturerName: manufacturerName || 'unknown',
        detectedName: manufacturerName || 'unknown',
        source: 'P2290_button_wireless_1_ts0041',
      };
    }

    return { ...DEVICE_PROFILES.default, manufacturerName: 'unknown', detectedName: manufacturerName };
  }

  /**
   * Get timing profile from device settings or manufacturer defaults
   * Settings override manufacturer defaults for full user control
   */
  _getTimingProfile() {
    // First check device settings (user-configurable)
    const settingsAppWindow = this.getSetting?.('app_command_timeout');
    const settingsDoubleClick = this.getSetting?.('double_click_window');
    const settingsLongPress = this.getSetting?.('long_press_threshold');

    // Get device profile for defaults
    const deviceProfile = this.getDeviceProfile();

    // If settings configured, override defaults (but keep profile metadata)
    if (settingsAppWindow || settingsDoubleClick || settingsLongPress) {
      const profile = {
        ...deviceProfile,
        appCommandWindow: settingsAppWindow || deviceProfile.appCommandWindow,
        doubleClickWindow: settingsDoubleClick || deviceProfile.doubleClickWindow,
        longPressThreshold: settingsLongPress || deviceProfile.longPressThreshold
      };
      this.log(`[PHYSICAL] Using SETTINGS profile (base: ${deviceProfile.brand})`);
      return profile;
    }

    this.log(`[PHYSICAL] Using ${deviceProfile.brand} device profile (mfr: ${deviceProfile.manufacturerName})`);
    return deviceProfile;
  }

  /**
   * v9.8.0 + P104: Safe flow card trigger — heuristic candidate chain.
   * Guards against missing homey.flow / getDeviceTriggerCard / hybrid IDs.
   */
  _safeTriggerFlow(triggerId, tokens = {}, debug = {}) {
    try {
      if (!this.homey?.flow) {
        this.log(` Cannot trigger flow '${triggerId}': homey.flow unavailable`);
        return Promise.resolve(false);
      }
      let candidates = Array.isArray(triggerId) ? triggerId : [triggerId];
      try {
        const { buildPhysicalFlowCandidates, triggerFlowCardHeuristic } = require('../flow/FlowCardHeuristics');
        if (debug && debug.pressType != null && debug.gang != null && candidates.length === 1) {
          const driverId = this.driver?.id || 'switch_1gang';
          const extra = buildPhysicalFlowCandidates(driverId, debug.gang, debug.pressType, {
            gangCount: this.gangCount || this.buttonCount || 1,
            isButtonDevice: !!(this.constructor?.name?.includes('Button')
              || this._forcedDeviceType === 'BUTTON'
              || /button_wireless|scene_switch|remote_button|smart_remote/i.test(String(driverId))),
          });
          candidates = [...candidates, ...extra.filter((x) => !candidates.includes(x))];
        }
        return triggerFlowCardHeuristic(this, candidates, tokens, 'trigger');
      } catch (_e) {
        // Fallback to legacy single-ID path
      }
      const { safeGetFlowCard, isNoopFlowCard } = require('../io/HomeyCompensationLayer');
      const { collectDeclaredFlowIds, findDeclaredCI } = require('../flow/FlowCardHeuristics');
      const declared = collectDeclaredFlowIds(this.homey);
      const target = findDeclaredCI(declared, candidates[0]) || (declared.size ? null : candidates[0]);
      if (!target) {return Promise.resolve(false);}
      const triggerCard = safeGetFlowCard(this.homey, target, 'trigger', declared.size ? declared : null);
      if (isNoopFlowCard(triggerCard) || typeof triggerCard?.trigger !== 'function') {
        this.log(` Flow '${target}' trigger method unavailable`);
        return Promise.resolve(false);
      }
      return triggerCard.trigger(this, tokens, {})
        .then(() => true)
        .catch((err) => {
          this.error(`[PHYSICAL] Flow '${target}' failed: ${err.message}`);
          return false;
        });
    } catch (err) {
      this.log(`[PHYSICAL] ℹ Flow card not available: '${triggerId}' (${err.message})`);
      return Promise.resolve(false);
    }
  }

  /**
   * Trigger a physical button flow card
   * v5.5.999: Enhanced with lastPhysicalEvent tracking (packetninja pattern)
   * v9.8.0: DEFENSIVE - Uses _safeTriggerFlow to prevent "getDeviceTriggerCard is not a function"
   */
  _triggerPhysicalFlow(gang, pressType, tokens = {}) {
    // v9.0.411 (P92.115): stamp the shared virtual/physical dedup structure so
    // a UI press right after this physical press is dropped (bidirectional).
    try {
      const { ensureDedup, stampPhysical } = require('../utils/BidirectionalButtonState');
      ensureDedup(this);
      // Only stamp "physical" presses. Virtual triggers must not pollute the
      // physical dedup gate, otherwise a UI press can mask a real physical press.
      if (tokens?.source !== 'virtual') {
        stampPhysical(this, gang);
      }
    } catch (_e) {
      if (!this._virtualPhysicalDedup) {
        this._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
      }
      if (tokens?.source !== 'virtual') {
        this._virtualPhysicalDedup.lastPhysicalPress[gang] = Date.now();
      }
    }

    // v9.0.53: NEW LOGIC - Dispatch to ButtonDevice.js `triggerButtonPress` if available
    // and this is not an internal fallback loop.
    if (typeof this.triggerButtonPress === 'function' && !tokens._internalTrigger) {
      // Convert physical clicks/types into universal format
      const clicks = tokens.clicks || (pressType === 'double' ? 2 : pressType === 'triple' ? 3 : 1);
      let normType = pressType;
      if (normType === 'long_press') {normType = 'long';}
      // WHY (P2235): rotate_* → single flow card + preserve type for tokens/diagnostics
      const rotateTypes = { rotate_left: 1, rotate_right: 1, rotate_stop: 1, rotation_left: 1, rotation_right: 1 };
      const extra = { source: 'physical' };
      if (rotateTypes[normType] || tokens.rotate) {
        extra.type = normType;
        extra.rotate = true;
        if (tokens.direction != null) {extra.direction = tokens.direction;}
        normType = 'single';
      }

      // Let ButtonDevice handle the robust, multi-layer fallbacks!
      // v10.3.0 FIX (B2): await the router so lastPhysicalPress is recorded
      // before any parallel virtual path can run.
      return this.triggerButtonPress(gang, normType, clicks, extra);
    }

    // WHY: ButtonDevice.triggerButtonPress calls us with _internalTrigger to
    // stamp dedup only — it already fires the real flow cards below. Building
    // speculative IDs here caused FLOW-GUARD spam:
    //   scene_switch_4_button_1gang_button_pressed (meter91 55e3e591)
    //   button_wireless_4_button_N_button_pressed (Nobø 9cbf9eb6)
    if (tokens?._internalTrigger) {
      return Promise.resolve(true);
    }

    const gangCount = this.gangCount || this.buttonCount || 1;
    const driverId = this.driver?.id || 'switch_1gang';

    // v5.5.999: Record last physical event (packetninja pattern)
    const state = this._physicalButtonState?.[gang];
    if (state) {
      state.lastPhysicalEvent = {
        type: pressType,
        timestamp: Date.now(),
        tokens: { ...tokens }
      };
      state.totalPhysicalPresses++;
    }

    // Log button press for diagnostics
    if (this._buttonDiagLogger) {
      this._buttonDiagLogger.info('Physical button press detected', {
        gang,
        pressType,
        totalPresses: state?.totalPhysicalPresses || 0,
        gangCount
      });
    }

    // Build flow card ID
    // FIX: Check if this is a ButtonDevice (uses different flow card naming)
    let flowCardId;
    const isButtonDevice = this.constructor?.name?.includes('Button') ||
      this._forcedDeviceType === 'BUTTON' ||
      driverId.includes('button_wireless') ||
      driverId.includes('scene_switch');

    // v7.1.1: Define pressMap at function scope so fallback code can reference it
    const pressMap = { single: 'button_pressed', double: 'button_double_press', long: 'button_long_press' };

    if (isButtonDevice) {
      // Button device pattern: ${driverId}_button_${gangCount}gang_button_pressed
      // WHY: never invent *_button_1gang_button_pressed (meter91 FLOW-GUARD on scene_switch_4).
      // Prefer short compose IDs when gangCount===1 or scene_switch_*.
      const suffix = pressMap[pressType] || 'button_pressed';
      if (gangCount === 1 || /scene_switch/.test(driverId)) {
        flowCardId = `${driverId}_${suffix}`;
      } else {
        flowCardId = `${driverId}_button_${gangCount}gang_${suffix}`;
      }
    } else {
      // Switch device pattern: ${driverId}_physical_${pressType}
      if (gangCount === 1) {
        flowCardId = `${driverId}_physical_${pressType}`;
      } else {
        flowCardId = `${driverId}_physical_gang${gang}_${pressType}`;
      }
    }

    if (this._buttonDiagLogger) {
      this._buttonDiagLogger.flowTrigger(flowCardId, { gang, pressType });
    }

    // v5.12.5: Scene mode support - v9.8.0: DEFENSIVE
    const sceneMode = typeof this.sceneMode !== 'undefined' ? this.sceneMode : 'auto';
    if ((pressType === 'on' || pressType === 'off') && (sceneMode === 'magic' || sceneMode === 'both' || sceneMode === 'auto')) {
      const sceneCardId = gangCount === 1
        ? `${driverId}_gang1_scene`
        : `${driverId}_gang${gang}_scene`;
      this._safeTriggerFlow(sceneCardId, { action: pressType, gang }, { type: 'scene' });
    }
    if (sceneMode === 'magic' && (pressType === 'on' || pressType === 'off')) {return;}

    // Add gang to tokens
    const flowTokens = { ...tokens, gang };

    // v9.8.0: DEFENSIVE - Use _safeTriggerFlow helper with proper fallback logic
    this._safeTriggerFlow(flowCardId, flowTokens, { pressType, gang }).then(success => {
      // v7.1.1: Try short-pattern fallback for button devices (button_wireless flow compose uses
      // `${driverId}_button_pressed` instead of `${driverId}_button_1gang_button_pressed`)
      if (!success && isButtonDevice) {
        const shortSuffix = pressMap[pressType] || 'button_pressed';
        // Try ${driverId}_${shortSuffix} (e.g. button_wireless_button_pressed)
        const shortCardId = `${driverId}_${shortSuffix}`;
        if (shortCardId !== flowCardId) {
          this._safeTriggerFlow(shortCardId, flowTokens, { pressType, gang });
        }
      }
      // Try fallback to on/off flow cards if this was a single/double/triple press AND the primary card didn't exist/failed
      if (!success && (pressType === 'single' || pressType === 'double' || pressType === 'triple')) {
        const fallbackId = gangCount === 1
          ? `${driverId}_physical_on`
          : `${driverId}_physical_gang${gang}_on`;
        this._safeTriggerFlow(fallbackId, flowTokens, { type: 'fallback', originalPressType: pressType });
      }
      // P205: always also fire app-level universal cards (cross-driver Flow recipes)
      this._triggerAppLevelButtonFlows(gang, pressType, flowTokens);
    });
  }

  /**
   * App-level Homey Flow parity — works even when driver.flow.compose.json is incomplete.
   * Cards: button_pressed | button_double_press | button_long_press
   */
  _triggerAppLevelButtonFlows(gang, pressType, tokens = {}) {
    const map = {
      single: 'button_pressed',
      on: 'button_pressed',
      off: 'button_pressed',
      double: 'button_double_press',
      triple: 'button_pressed',
      long: 'button_long_press',
      long_press: 'button_long_press',
    };
    const cardId = map[pressType] || 'button_pressed';
    const typeToken = pressType === 'long_press' ? 'long' : pressType;
    this._safeTriggerFlow(cardId, {
      button: String(gang),
      type: typeToken,
      gang,
      ...tokens,
    }, { type: 'app-level', pressType, gang });
  }

  /**
   * Check if this device requires ZCL-only mode (no Tuya DP)
   */
  isZclOnlyDevice() {
    const profile = this.getDeviceProfile();
    return profile.protocol === 'zcl_only';
  }

  /**
   * Check if this device has custom Tuya clusters (0xE000/0xE001)
   */
  hasCustomClusters() {
    const profile = this.getDeviceProfile();
    return profile.customClusters && profile.customClusters.length > 0;
  }

  /**
   * Check if this device requires per-endpoint control
   * (ZHA #2443: prevents "all gangs toggle together" bug)
   */
  requiresPerEndpointControl() {
    const profile = this.getDeviceProfile();
    return profile.perEndpointControl === true;
  }

  /**
   * Check if this device requires explicit cluster binding
   * (TS0726 BSEED 4-gang - Hartmut_Dunker forum)
   */
  requiresExplicitBinding() {
    const profile = this.getDeviceProfile();
    return profile.requiresExplicitBinding === true;
  }

  /**
   * WHY: physical 0xFD lives on genOnOff as a manufacturer command.
   * Must require lib/clusters/OnOffBoundCluster (handleFrame 0xFD).
   * lib/OnOffBoundCluster.js is stale (no 0xFD) -- do not require it.
   * Do NOT Cluster.addCluster on standard OnOff. Do NOT configureReporting onOff.
   * Do NOT write 0x8004 on TS0044 (DeviceOperatingMode already skips).
   */
  async _setupOnOffFdBoundCluster(zclNode) {
    if (this._onOffFdBoundClusterInitialized) {return;}
    this._onOffFdBoundClusterInitialized = true;
    const gangCount = this.gangCount || this.buttonCount || 1;
    const map1 = !!(this.getDeviceProfile?.()?.mapAllEndpointsToButton1);
    // WHY(P2290): SH-SC07 phantom EP2–4 still emit 0xFD — bind them, route to btn1
    const bindMax = map1
      ? Math.max(gangCount, ...Object.keys(zclNode?.endpoints || {}).map(Number).filter((n) => n >= 1 && n <= 4), 1)
      : gangCount;
    try {
      const OnOffBoundCluster = require('../clusters/OnOffBoundCluster');
      const { PRESS_MAP } = require('../utils/TuyaPressTypeMap');
      for (let ep = 1; ep <= bindMax; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) {continue;}
        const flowGang = map1 ? 1 : ep;
        const bc = new OnOffBoundCluster({
          onSetOn: (payload) => {
            let press = 'single';
            if (payload && (payload.cmdId === 0xFD || payload.scene !== undefined)) {
              press = PRESS_MAP[payload.scene] || payload.press || 'single';
            }
            this.log(`[PHYSICAL] EP${ep}→btn${flowGang} OnOffBound 0xFD scene=${payload?.scene} -> ${press}`);
            this._triggerPhysicalFlow(flowGang, press);
          },
          onSetOff: () => this._triggerPhysicalFlow(flowGang, 'double'),
          // 0xFC rotate uses onToggle handler in OnOffBoundCluster.handleFrame
          onToggle: (payload) => {
            if (payload && payload.cmdId === 0xFC) {
              const dir = payload.direction;
              const press = dir === 1 ? 'rotate_left' : dir === 2 ? 'rotate_stop' : 'rotate_right';
              this.log(`[PHYSICAL] EP${ep}→btn${flowGang} OnOffBound 0xFC -> ${press}`);
              // WHY (P2235): preserve rotate_* (maps to single flow + type token in triggerButtonPress)
              this._triggerPhysicalFlow(flowGang, press, { rotate: true, direction: dir });
              return;
            }
            this._triggerPhysicalFlow(flowGang, 'long');
          },
        });
        bc._device = this;
        if (!endpoint.bindings) {endpoint.bindings = {};}
        endpoint.bindings.onOff = bc;
        this.log(`[PHYSICAL] OnOffBoundCluster EP${ep}→btn${flowGang} ready (0xFD)`);
      }
    } catch (e) {
      this.log(`[PHYSICAL] OnOffBoundCluster (clusters/) not available: ${e.message}`);
    }

    // Raw cluster-6 catcher for 0xFD when BoundCluster handleFrame is not invoked.
    // WHY(P2283): append-only wrapHandleFrame — never orphan prior IO/scene_switch wrappers.
    try {
      if (!zclNode) {return;}
      const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
      const { PRESS_MAP } = require('../utils/TuyaPressTypeMap');
      const self = this;
      wrapHandleFrame(zclNode, 'physical-onoff-fd', (args, next) => {
        const epId = args[0];
        const cId = args[1];
        const f = args[2];
        try {
          // WHY(P2289): Peter #2203 — also accept manufacturerSpecific framing
          // where cmdId lives under frame.command / frame.meta (Homey SDK variants).
          if (cId === 6 || cId === 0x0006) {
            const json = typeof f?.toJSON === 'function' ? f.toJSON() : f;
            const d = Buffer.isBuffer(json?.data) ? json.data
              : Array.isArray(json?.data) ? Buffer.from(json.data)
              : Buffer.isBuffer(f) ? f : null;
            const cmd = f?.cmdId ?? f?.commandId ?? f?.command?.id ?? json?.cmdId ?? json?.commandId;

            const looksFd = cmd === 0xFD || cmd === 253 || (d && d.length && d.includes(0xFD));
            if (looksFd) {
              const scene = (typeof cmd === 'number' && cmd === 0xFD && d && d.length) ? d[0]
                : (d && d.length > 1 ? d[d.length - 1] : 0);
              const pt = PRESS_MAP[scene] || 'single';
              // WHY(P2285): phantom EP2–4 on 1-btn SH-SC07 → always button 1
              const map1 = !!(self.getDeviceProfile?.()?.mapAllEndpointsToButton1);
              const gang = map1 ? 1 : ((epId >= 1 && epId <= gangCount) ? epId : 1);
              const now = Date.now();
              self._sceneDedup = self._sceneDedup || {};
              const dk = `raw6_fd_${gang}_${scene}_${map1 ? epId : ''}`;
              if (now - (self._sceneDedup[dk] || 0) >= 350) {
                self._sceneDedup[dk] = now;
                self.log(`[PHYSICAL-RAW] EP${epId}→btn${gang} cluster6 0xFD scene=${scene} -> ${pt}`);
                self._triggerPhysicalFlow(gang, pt);
              }
            }

            const looksFc = cmd === 0xFC || cmd === 252;
            if (looksFc) {
              const dir = (d && d.length) ? d[0] : 0;
              const pt = dir === 1 ? 'rotate_left' : dir === 2 ? 'rotate_stop' : 'rotate_right';
              const map1 = !!(self.getDeviceProfile?.()?.mapAllEndpointsToButton1);
              const gang = map1 ? 1 : ((epId >= 1 && epId <= gangCount) ? epId : 1);
              const now = Date.now();
              self._sceneDedup = self._sceneDedup || {};
              const dk = `raw6_fc_${gang}_${dir}`;
              if (now - (self._sceneDedup[dk] || 0) >= 200) {
                self._sceneDedup[dk] = now;
                self.log(`[PHYSICAL-RAW] EP${epId}→btn${gang} cluster6 0xFC dir=${dir} -> ${pt}`);
                self._triggerPhysicalFlow(gang, pt, { rotate: true, direction: dir });
              }
            }
          }
        } catch (_e) { /* keep RX */ }
        return next(...args);
      });
      this._onOffFdRawCatcherHooked = true;
      this.log('[PHYSICAL] raw cluster-6 0xFD catcher ready (chain)');
    } catch (e) {
      this.log(`[PHYSICAL] raw cluster-6 catcher failed: ${e.message}`);
    }
  }

  /**
   * Setup physical button detection for a specific gang
   * v5.5.996: Enhanced to support ZCL, Tuya DP, and Hybrid modes
   */
  async _setupGangPhysicalDetection(zclNode, gang) {
    const endpoint = zclNode?.endpoints?.[gang];
    
    // v7.1.1: Robust Cluster Find Evolution (L2 Layer)
    const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff || endpoint?.clusters?.[6] || endpoint?.clusters?.['onOff'];
    const profile = this.getDeviceProfile();

    // Z2M/ZHA: bind genOnOff on EACH endpoint after the Tuya spell, otherwise
    // newer TS000x firmware treats all relays as one group.
    if (onOffCluster && typeof onOffCluster.bind === 'function') {
      try {
        await onOffCluster.bind();
      } catch (err) {
        this.log(`[PHYSICAL] OnOff bind EP${gang}: ${err.message}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // L1 PROTOCOL QUIRKS: Groups, Scenes, MultistateInput, LevelControl
    // Ported from legacy ButtonDevice.js for ultimate multi-layer compatibility
    // ════════════════════════════════════════════════════════════════════════

    // 1. Join Group 0 for Tuya Broadcast events
    // Relays must not join group 0 — a group OnOff hits every gang (ZHA #2443).
    // Scene remotes still need group 0 for Tuya broadcast presses.
    const isMultiGangRelay = (this.gangCount > 1) && this.hasCapability?.('onoff');
    const groupsCluster = endpoint?.clusters?.groups || endpoint?.clusters?.genGroups || endpoint?.clusters?.[4] || endpoint?.clusters?.['groups'];
    if (groupsCluster && !isMultiGangRelay) {
      try {
        if (typeof groupsCluster.addGroup === 'function') {
          await groupsCluster.addGroup({ groupId: 0, groupName: 'HomeyGroup' });
          this.log(` Endpoint ${gang} joined group 0 (addGroup)`);
        } else if (typeof groupsCluster.add === 'function') {
          await groupsCluster.add({ groupId: 0, groupName: 'HomeyGroup' });
          this.log(` Endpoint ${gang} joined group 0 (add)`);
        }
      } catch (err) {
        this.log(' Group join failed (may already be member):', err.message);
      }
    }

    // 2. Scenes Cluster (Tuya Remotes TS004F/TS0044)
    const scenesCluster = endpoint?.clusters?.scenes || endpoint?.clusters?.genScenes || endpoint?.clusters?.[5] || endpoint?.clusters?.['scenes'];
    if (scenesCluster && typeof scenesCluster.on === 'function') {
      try {
        if (typeof scenesCluster.bind === 'function') {await scenesCluster.bind();}
        
        // Load manufacturer mapping or fallback to authoritative
        const PRESS_MAP = require('../utils/TuyaPressTypeMap').PRESS_MAP;
        const config = this._manufacturerConfig || {};
        const TUYA_PRESS_TYPES = config.pressTypeMapping || PRESS_MAP;

        const handleScene = (sceneId) => {
          // Anti-flood dedup
          const now = Date.now();
          const dedupKey = `raw_${gang}_${sceneId}`;
          this._sceneDedup = this._sceneDedup || {};
          if (now - (this._sceneDedup[dedupKey] || 0) < 500) {return;}
          this._sceneDedup[dedupKey] = now;

          const pressAction = TUYA_PRESS_TYPES[sceneId] || 'single';
          this.log(` Gang ${gang} scene recall: ${sceneId} -> ${pressAction.toUpperCase()}`);
          this._triggerPhysicalFlow(gang, pressAction);
        };

        // Bulletproof payload extraction ported from legacy
        const extractSceneId = (payload) => {
          const id = payload?.sceneId ?? payload?.sceneid ?? payload?.scene ?? payload ?? 0;
          return typeof id === 'number' ? id : 0;
        };

        scenesCluster.on('command', (commandName, commandPayload) => {
          if (commandName === 'recall' || commandName === 'recallScene') {
            handleScene(extractSceneId(commandPayload?.data?.[0] ?? commandPayload));
          }
        });
        
        scenesCluster.on('recall', (payload) => handleScene(extractSceneId(payload)));
        scenesCluster.on('recallScene', (payload) => handleScene(extractSceneId(payload)));
        scenesCluster.on('attr.currentScene', (sceneId) => handleScene(sceneId));
        
        this.log(`[PHYSICAL] Gang ${gang} scenes cluster detection setup complete`);
      } catch (e) {
        this.log(' Scenes bind failed:', e.message);
      }
    }

    // 3. MultistateInput Cluster (Some obscure Tuya buttons)
    const msCluster = endpoint?.clusters?.multistateInput || endpoint?.clusters?.genMultistateInput || endpoint?.clusters?.multiStateInput || endpoint?.clusters?.[0x0012] || endpoint?.clusters?.[18];
    if (msCluster && typeof msCluster.on === 'function') {
      msCluster.on('attr.presentValue', (value) => {
        this.log(` Gang ${gang} multistateInput value: ${value}`);
        const type = value === 1 ? 'single' : value === 2 ? 'double' : value === 3 ? 'triple' : 'long';
        this._triggerPhysicalFlow(gang, type);
      });
      this.log(`[PHYSICAL] Gang ${gang} multistateInput detection setup complete`);
    }

    // 4. LevelControl Cluster (Tuya Dimmers)
    const lcCluster = endpoint?.clusters?.levelControl || endpoint?.clusters?.genLevelCtrl || endpoint?.clusters?.[8] || endpoint?.clusters?.['levelControl'];
    if (lcCluster && typeof lcCluster.on === 'function') {
      lcCluster.on('step', () => this._triggerPhysicalFlow(gang, 'single'));
      lcCluster.on('move', () => this._triggerPhysicalFlow(gang, 'long'));
      lcCluster.on('stop', () => this._triggerPhysicalFlow(gang, 'single'));
      this.log(`[PHYSICAL] Gang ${gang} levelControl detection setup complete`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ZCL MODE: Listen to onOff cluster attribute reports
    // ════════════════════════════════════════════════════════════════════════
    if (onOffCluster && typeof onOffCluster.on === 'function') {
      onOffCluster.on('attr.onOff', (value, data) => {
        this._handleAttributeReport(gang, value, data);
      });

      // Also listen for explicit commands (Stateless buttons sending toggle/on/off)
      // v9.0.52 ENRICHMENT : 9 patterns OnOff portés de stable-v5 ButtonDevice.
      // Certains firmwares Tuya utilisent commandOn/commandOff/setOn/setOff au lieu
      // de on/off/toggle. Sans ces 5 patterns supplémentaires, ces boutons ne déclenchent pas.
      try {
        // v10.3.0 FIX (B1): Route through the same resolution as
        // ButtonDevice._normalizeButtonPressType (commandOff→double,
        // commandToggle→long, off/on→single) instead of forcing 'single'.
        // Forcing 'single' raced against handleEndpointCommand's mapping and
        // made single/double nondeterministic under the 500ms debounce.
        const { resolve: resolveOnOffPressType } = require('../utils/TuyaPressTypeMap');
        const onOffCmdMap = ['toggle', 'on', 'off', 'commandOn', 'commandOff',
          'commandToggle', 'setOn', 'setOff', 'command'];
        for (const cmd of onOffCmdMap) {
          onOffCluster.on(cmd, () => this._triggerPhysicalFlow(gang, resolveOnOffPressType(cmd, 'onOffCmdMap')));
        }

        // v10.2.0: Tuya-specific 0xFD command handler
        // Some Tuya buttons (TS004F, TS0044, etc.) send proprietary 0xFD command
        // on the OnOff cluster with press type encoded in payload
        // v9.0.52 ENRICHMENT : match étendu (6 variantes portées de stable-v5)
        onOffCluster.on('command', (commandName, commandPayload) => {
          const isTuyaAction = commandName === '0xFD' || commandName === 'tuyaAction'
            || commandName === '253' || commandName === 'fd'
            || commandName === 'commandTuyaAction'
            || (commandName === 'unknown' && (commandPayload === 253 || commandPayload?.data?.[0] === 253));
          if (!isTuyaAction) {return;}
          let payload = commandPayload?.data?.[0] ?? commandPayload;
          if (typeof payload !== 'number') {payload = 0;}
          const PRESS_MAP = require('../utils/TuyaPressTypeMap').PRESS_MAP;
          const pressType = PRESS_MAP[payload] || 'single';
          this.log(`[PHYSICAL] Gang ${gang} Tuya 0xFD (${commandName}): payload=${payload} -> ${pressType}`);
          this._triggerPhysicalFlow(gang, pressType);
        });

        onOffCluster.on('response', (command, status) => {
          this.log(`[PHYSICAL] Gang ${gang} command response: ${command} = ${status}`);
        });
      } catch (e) { /* ignore if not supported */ }

      this.log(`[PHYSICAL] Gang ${gang} ZCL detection setup complete`);
    } else {
      this.log(`[PHYSICAL] No onOff cluster on EP${gang} - ZCL detection skipped`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TUYA DP MODE: Listen to Tuya cluster for physical button detection
    // v5.5.996: Support Tuya DP devices (packetninja hybrid support)
    // ════════════════════════════════════════════════════════════════════════
    // Bind leftover EF00 only for real Tuya-DP switches. ZCL multi-gang
    // units often expose a dead 0xEF00 that would cross-link gangs on RX.
    if ((profile.protocol === 'tuya_dp' || this._isPureTuyaDP === true)
      && !this._tuyaDpPhysicalDetectionBound) {
      this._tuyaDpPhysicalDetectionBound = true;
      this._setupTuyaDPPhysicalDetection(zclNode, gang);
    }
  }


  /**
   * v5.5.996: Setup Tuya DP physical button detection
   * For Tuya DP devices, physical buttons send DP reports
   * We detect physical vs app by checking appCommandPending flag
   */
  _setupTuyaDPPhysicalDetection(zclNode, gang) {
    const endpoint = zclNode?.endpoints?.[1]; // Tuya DP always on EP1
    if (!endpoint?.clusters) {return;}

    // Find Tuya cluster (Robust L2 Finder)
    const tuyaCluster = endpoint?.clusters?.tuya ||
      endpoint?.clusters?.manuSpecificTuya ||
      endpoint?.clusters?.[0xEF00] ||
      endpoint?.clusters?.['61184'] ||
      endpoint?.clusters?.['tuya'];

    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.log('[PHYSICAL] No Tuya cluster found - DP detection skipped');
      return;
    }

    // Only setup once (gang 1)
    if (gang !== 1) {return;}

    // Listen for DP reports
    const handleTuyaDP = (data) => {
      if (!data) {return;}
      
      // Parse DP from various formats
      let dpId, value;
      if (data.dp !== undefined) {
        dpId = data.dp;
        value = data.value ?? data.data;
      } else if (data.dpId !== undefined) {
        dpId = data.dpId;
        value = data.value ?? data.data;
      } else if (Buffer.isBuffer(data) && data.length >= 5) {
        dpId = data[2];
        const len = data.readUInt16BE(4);
        if (len === 1) {value = data[6];}
        else if (len === 4) {value = data.readInt32BE(6);}
      }

      if (dpId === undefined) {return;}

      // Map DP to gang (DP1=gang1, DP2=gang2, etc.)
      const gangFromDP = dpId;
      if (gangFromDP >= 1 && gangFromDP <= (this.gangCount || 8)) {
        const boolValue = value === 1 || value === true;
        this._handleTuyaDPReport(gangFromDP, boolValue);
      }
    };

    // Listen to all Tuya event types
    const events = ['dp', 'datapoint', 'response', 'data', 'report'];
    for (const evt of events) {
      try {
        tuyaCluster.on(evt, handleTuyaDP);
      } catch (e) { /* ignore */ }
    }

    this.log(` Tuya DP physical detection setup for ${this.gangCount || 1} gang(s)`);
  }

  /**
   * v5.5.996: Handle Tuya DP report for physical button detection
   */
  _handleTuyaDPReport(gang, value) {
    const state = this._physicalButtonState?.[gang];
    if (!state) {return;}

    // v9.0.47: Per-gang debounce (FIX cause racine #2)
    if (this._isDebounced(gang)) {return;}

    const now = Date.now();
    const isPhysical = !state.appCommandPending;

    // v5.11.19: CRITICAL FIX - Skip if state hasn't changed (curtain_motor false→false spam)
    // Same guard as _handleAttributeReport — periodic DP reports with unchanged value are NOT button presses
    if (state.lastState === value) {
      this.log(`[PHYSICAL-DP] Gang ${gang}: ${value} unchanged - skipping (periodic DP report)`);
      return;
    }

    this.log(`[PHYSICAL-DP] Gang ${gang}: ${state.lastState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

    // Update state
    const previousState = state.lastState;
    state.lastState = value;

    // Only process physical button presses
    if (!isPhysical) {return;}

    // Detect press type (same logic as ZCL)
    if (value === true) {
      // Button pressed ON - start tracking
      state.pressStartTime = now;
      state.clickCount++;
      
      if (state.clickTimeout) {
        safeClearTimeout(this, state.clickTimeout);
        state.clickTimeout = null;
      }

      state.clickTimeout = safeSetTimeout(this, () => {
        if (this._destroyed) {return;}
        this._finalizeClickDetection(gang);
      }, this._timingProfile.doubleClickWindow);

    } else if (value === false && state.pressStartTime) {
      const pressDuration = now - state.pressStartTime;
      
      if (pressDuration >= this._timingProfile.longPressThreshold) {
        this._triggerPhysicalFlow(gang, 'long_press', { duration: pressDuration });
        state.clickCount = 0;
        if (state.clickTimeout) {
          safeClearTimeout(this, state.clickTimeout);
          state.clickTimeout = null;
        }
      }
      
      state.pressStartTime = null;
    }

    // v5.11.18: Only trigger on/off flow when state actually changed (fixes curtain_motor false→false spam)
    if (previousState !== value) {
      this._triggerPhysicalFlow(gang, value ? 'on' : 'off', {});

      // v5.13.7: Re-apply scene mode on wake
      if (value === true && typeof this._reapplySceneModeOnWake === 'function') {
        this._reapplySceneModeOnWake().catch(() => {});
      }
    }
  }

  /**
   * Handle attribute report from device (indicates state change)
   * v5.5.999: Enhanced with state history tracking (packetninja pattern)
   * v5.8.12: CYRIL FORUM FIX - Skip triggering when state hasn't changed (prevents 10min notifications)
   * v9.0.40: TSN-level deduplication to filter duplicate button events at protocol level
   */
  _handleAttributeReport(gang, value, data) {
    const state = this._physicalButtonState?.[gang];
    if (!state) {return;}

    // v9.0.49: TSN deduplication durcie (FIX cause racine #1)
    // Le TSN est un compteur 8-bit qui RECYCLE (0→255→0). L'ancien code rejetait
    // silencieusement tout TSN déjà vu → suppression d'événements légitimes après recyclage.
    // FIX : fenêtre temporelle 5s + nettoyage périodique du Map.
    // v10.4.0 (z2m #20024): ring des 5 DERNIERS TSN par gang — les retransmissions
    // Zigbee arrivent parfois DÉSORDONNÉES ; un seul TSN mémorisé laisse passer
    // un doublon plus ancien que le dernier vu.
    if (data && data.transactionSequenceNumber !== undefined) {
      const tsn = data.transactionSequenceNumber;
      const nowT = Date.now();
      if (!this._lastTSNRing) {this._lastTSNRing = new Map();}
      let ring = this._lastTSNRing.get(gang);
      if (!ring) {ring = []; this._lastTSNRing.set(gang, ring);}
      const isDup = ring.some(e => e.tsn === tsn && (nowT - e.ts) < 5000);
      if (isDup) {
        this.log(`[PHYSICAL] Gang ${gang}: Doublon TSN ${tsn} — skip`);
        return;
      }
      ring.push({ tsn, ts: nowT });
      // Garde les 5 plus récents + purge > 10s
      while (ring.length > 5) {ring.shift();}
      for (let i = ring.length - 1; i >= 0; i--) {
        if (nowT - ring[i].ts > 10000) {ring.splice(i, 1);}
      }
      if (this._lastTSNRing.size > 16) {
        for (const [g, r] of this._lastTSNRing.entries()) {
          if (!r.length || nowT - r[r.length - 1].ts > 10000) {this._lastTSNRing.delete(g);}
        }
      }
    }

    // v9.0.49: Per-gang debounce (FIX — gang arg manquant causait blocage global)
    if (this._isDebounced(gang)) {return;}

    const now = Date.now();
    const isPhysical = !state.appCommandPending;

    // v5.8.12: CRITICAL FIX - Skip if state hasn't changed (periodic reports with same value)
    // This prevents false physical button triggers from attribute polling/reporting
    const previousState = state.lastState;
    if (previousState === value) {
      // State unchanged - this is just a periodic report, NOT a button press
      this.log(`[PHYSICAL] Gang ${gang}: ${value} unchanged - skipping (periodic report)`);
      return;
    }

    this.log(`[PHYSICAL] Gang ${gang}: ${previousState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

    // Update state
    state.lastState = value;

    // v5.5.999: Record state change in history (keep last 10)
    state.stateHistory.push({
      from: previousState,
      to: value,
      timestamp: now,
      source: isPhysical ? 'physical' : 'app'
    });
    if (state.stateHistory.length > 10) {
      state.stateHistory.shift();
    }

    // Only process physical button presses
    if (!isPhysical) {return;}

    // Detect press type
    if (value === true) {
      // Button pressed ON - start tracking
      state.pressStartTime = now;
      state.clickCount++;
      
      // Clear previous click timeout
      if (state.clickTimeout) {
        safeClearTimeout(this, state.clickTimeout);
        state.clickTimeout = null;
      }

      // Set timeout to finalize click detection
      // v9.0.49: Fallback robuste avec timer Homey bindé.
      state.clickTimeout = safeSetTimeout(this, () => {
        if (this._destroyed) {return;}
        this._finalizeClickDetection(gang);
      }, this._timingProfile.doubleClickWindow);

    } else if (value === false && state.pressStartTime) {
      // Button released OFF - calculate press duration
      const pressDuration = now - state.pressStartTime;
      
      if (pressDuration >= this._timingProfile.longPressThreshold) {
        // Long press detected
        this._triggerPhysicalFlow(gang, 'long_press', { duration: pressDuration });
        state.clickCount = 0; // Reset click count
        if (state.clickTimeout) {
          safeClearTimeout(this, state.clickTimeout);
          state.clickTimeout = null;
        }
      }
      
      state.pressStartTime = null;
    }

    // v5.11.18: Only trigger on/off flow when state actually changed
    if (previousState !== value) {
      this._triggerPhysicalFlow(gang, value ? 'on' : 'off', {});

      // v5.13.7: Re-apply scene mode on wake
      if (value === true && typeof this._reapplySceneModeOnWake === 'function') {
        this._reapplySceneModeOnWake().catch(() => {});
      }
    }
  }

  /**
   * Finalize click detection after timeout
   */
  _finalizeClickDetection(gang) {
    const state = this._physicalButtonState?.[gang];
    if (!state) {return;}
    const clickCount = state.clickCount;

    if (clickCount === 1) {
      this._triggerPhysicalFlow(gang, 'single', {});
    } else if (clickCount === 2) {
      this._triggerPhysicalFlow(gang, 'double', {});
    } else if (clickCount >= 3) {
      this._triggerPhysicalFlow(gang, 'triple', { clicks: clickCount });
    }

    // Reset
    state.clickCount = 0;
    state.clickTimeout = null;
  }

  /**
   * Mark that an app command was sent (to distinguish from physical)
   * Call this before sending any command to the device
   * v5.5.999: Enhanced with lastAppEvent tracking (packetninja pattern)
   * @param {number} gang - Gang number (1-based)
   * @param {boolean} value - The value being sent (true=on, false=off)
   */
  markAppCommand(gang = 1, value = null) {
    // P115: NEVER early-return before super / _appCommandPending.
    // Missing physical state (detection disabled / race) previously caused
    // ghost physical flow triggers when Homey UI toggled onoff.
    this._appCommandPending = true;
    if (typeof super.markAppCommand === 'function') {
      super.markAppCommand(gang, value);
    }

    // WHY(P2283): virtual TX must stamp lastVirtualPress so physical echo is dropped
    try {
      const { stampVirtual } = require('../utils/BidirectionalButtonState');
      stampVirtual(this, gang);
    } catch (_e) { /* soft */ }

    if (!this._physicalButtonState) {
      this._physicalButtonState = {};
    }
    let state = this._physicalButtonState[gang];
    if (!state) {
      state = this._physicalButtonState[gang] = {
        lastState: null,
        appCommandPending: false,
        appCommandTimeout: null,
        pressStartTime: null,
        clickCount: 0,
        clickTimeout: null,
        lastClickTime: 0,
        lastPhysicalEvent: null,
        lastAppEvent: null,
        stateHistory: [],
        totalPhysicalPresses: 0,
        totalAppCommands: 0,
      };
    }

    state.appCommandPending = true;
    
    // v5.5.999: Record last app event (packetninja pattern)
    state.lastAppEvent = {
      type: value === true ? 'on' : value === false ? 'off' : 'unknown',
      timestamp: Date.now(),
      value: value
    };
    state.totalAppCommands++;
    
    if (state.appCommandTimeout) {
      safeClearTimeout(this, state.appCommandTimeout);
      state.appCommandTimeout = null;
    }
    
    state.appCommandTimeout = safeSetTimeout(this, () => {
      if (this._destroyed) {return;}
      state.appCommandPending = false;
      
      // Legacy compatibility reset
      const anyPending = Object.values(this._physicalButtonState || {}).some(s => s.appCommandPending);
      if (!anyPending) {
        this._appCommandPending = false;
      }
    }, this._timingProfile?.appCommandWindow || 2000);
  }

  /**
   * Mark app command for all gangs
   */
  markAppCommandAll() {
    const { resolveGangCount } = require('../utils/BidirectionalButtonState');
    const gangCount = resolveGangCount(this);
    for (let gang = 1; gang <= gangCount; gang++) {
      this.markAppCommand(gang);
    }
  }

  /**
   * Cleanup on device deletion
   * v8.1.0: Also clears scene recovery timer to prevent memory leaks
   */
  /**
   * WHY(P2298): Called from ManufacturerNameHelper after late zb_manufacturer_name /
   * zb_model_id write (Peter #2202–#2203). Re-bind OnOff 0xFD with SH-SC07 profile.
   */
  async _onZigbeeIdentityResolved(updates = {}) {
    const mfr = String(updates.zb_manufacturer_name || this.getSetting?.('zb_manufacturer_name') || '');
    const pid = String(updates.zb_model_id || this.getSetting?.('zb_model_id') || '');
    const profile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
    const needsRearm = !!(profile?.mapAllEndpointsToButton1
      || profile?.collapsePhantomEndpoints
      || /mrpevh8p|5bpeda8u|b4awzgct/i.test(mfr)
      || (/button_wireless_1/.test(String(this.driver?.id || '')) && /^TS0041$/i.test(pid)));
    if (!needsRearm) return;
    this.log?.(`[PHYSICAL] P2298 identity resolved (${mfr}|${pid}) — re-arm 0xFD listeners`);
    this._cleanupPhysicalButtonDetection();
    const zclNode = this.zclNode;
    if (zclNode && typeof this.initPhysicalButtonDetection === 'function') {
      await this.initPhysicalButtonDetection(zclNode).catch((err) => {
        this.log?.(`[PHYSICAL] P2298 re-arm failed: ${err.message}`);
      });
    }
  }

  _cleanupPhysicalButtonDetection() {
    // v10.3.0: Allow re-initialization after cleanup (pairs with the
    // _physicalButtonDetectionInitialized guard in initPhysicalButtonDetection)
    this._physicalButtonDetectionInitialized = false;
    this._onOffFdBoundClusterInitialized = false;
    this._onOffFdRawCatcherHooked = false;

    if (!this._physicalButtonState) {return;}

    // v9.0.40: Clean up TSN tracking map
    if (this._lastTSN) {
      this._lastTSN.clear();
      this._lastTSN = null;
    }

    for (const [gang, state] of Object.entries(this._physicalButtonState)) {
      if (state.appCommandTimeout) {safeClearTimeout(this, state.appCommandTimeout);}
      if (state.clickTimeout) {safeClearTimeout(this, state.clickTimeout);}
    }

    // FIX: Clear metrics sync interval
    if (this._metricsSyncInterval) {
      this.homey.clearInterval(this._metricsSyncInterval);
      this._metricsSyncInterval = null;
    }

    // v8.1.0: Clear scene mode recovery timer
    if (this._sceneRecoveryTimer) {
      this.homey.clearInterval(this._sceneRecoveryTimer);
      this._sceneRecoveryTimer = null;
    }

    this._physicalButtonState = null;
    this.log('[PHYSICAL] Cleanup complete');
  }

  /**
   *  L1 LAYER INTERCEPTION: RAW RX/TX
   * Catches button presses at the absolute lowest Zigbee layer before Homey Native parsing.
   * Guarantees button interception even if Homey cluster definitions or L2 mappings fail.
   * Fulfills "Manage buttons at all layers and levels (ZCL, RX/TX, L1/L2/Lx) whatever the architecture"
   */
  onZigBeeMessage(endpointId, clusterId, frame, meta) {
    if (!frame) {return false;}
    
    // Cascade to parent
    if (super.onZigBeeMessage && super.onZigBeeMessage(endpointId, clusterId, frame, meta) === true) {
      return true;
    }

    // Capture standard button clusters (Scenes, OnOff, LevelControl, Tuya custom)
    // v10.4.0: + 0xE001 (HOBEIAN ZG-101ZL family — forum #1242, maintainer
    // analysis #907: button presses travel on 0xE001, same layout as 0xE000)
    if (clusterId === 5 || clusterId === 6 || clusterId === 8 || clusterId === 0xE000 || clusterId === 0xE001) {
      const frameData = frame.toJSON?.().data || frame.data || [];
      if (!frameData || frameData.length < 3) {return false;}
      
      const cmd = frameData[2]; // Command ID
      
      // E000: Tuya proprietary multi-press
      if (clusterId === 0xE000 && cmd === 0) {
        // v9.0.413 (P92.121): 0-based vs 1-based — frameData[3]===0 is a
        // VALID button index on 0-based firmwares (the old `|| endpointId`
        // silently mis-mapped it). resolveGang learns the base per device.
        const rawButton = frameData[3];
        const action = frameData[4]; // 0=single, 1=double, 2=long
        let button;
        if (rawButton === undefined || rawButton === 255 || rawButton === null) {
          button = endpointId > 0 && endpointId < 255 ? endpointId : 1;
        } else {
          button = resolveGang(this, rawButton, 'e000', this.gangCount || 0);
        }

        const pressType = action === 0 ? 'single' : action === 1 ? 'double' : 'long';
        
        // Global Debouncer Engine (350ms deduplication)
        const now = Date.now();
        const dedupKey = `raw_e000_${button}_${action}`;
        this._sceneDedup = this._sceneDedup || {};
        if (now - (this._sceneDedup[dedupKey] || 0) < 350) {
            this.log(` E000 Button ${button} DEBOUNCED`);
            return true;
        }
        this._sceneDedup[dedupKey] = now;

        this.log(` E000 Button ${button} ${pressType.toUpperCase()} PRESS`);
        if (typeof this._triggerPhysicalFlow === 'function') {
          this._triggerPhysicalFlow(button, pressType);
        }
        return true;
      }

      // v10.4.0: E001 (HOBEIAN ZG-101ZL) — same cmd-0 layout as E000
      // (button @ data[3], action 0/1/2 @ data[4]). Defensive: log unknown
      // layouts so diagnostics can teach us the real variants.
      if (clusterId === 0xE001 && cmd === 0) {
        // v9.0.413 (P92.121): same 0-based fix as E000 (see above).
        const rawButton = frameData[3];
        const action = frameData[4];
        let button;
        if (rawButton === undefined || rawButton === 255 || rawButton === null) {
          button = endpointId > 0 && endpointId < 255 ? endpointId : 1;
        } else {
          button = resolveGang(this, rawButton, 'e001', this.gangCount || 0);
        }
        if (action === undefined || action > 2) {
          this.log(` E001 trame non reconnue (len=${frameData.length}): ${JSON.stringify(frameData).slice(0, 80)}`);
          return false;
        }
        const pressType = action === 0 ? 'single' : action === 1 ? 'double' : 'long';
        const nowE1 = Date.now();
        const dedupKeyE1 = `raw_e001_${button}_${action}`;
        this._sceneDedup = this._sceneDedup || {};
        if (nowE1 - (this._sceneDedup[dedupKeyE1] || 0) < 350) {
            this.log(` E001 Button ${button} DEBOUNCED`);
            return true;
        }
        this._sceneDedup[dedupKeyE1] = nowE1;
        this.log(` E001 Button ${button} ${pressType.toUpperCase()} PRESS (HOBEIAN)`);
        if (typeof this._triggerPhysicalFlow === 'function') {
          this._triggerPhysicalFlow(button, pressType);
        }
        return true;
      }
      
      // SCENES (5): recall (0x07) or recallScene
      if (clusterId === 5 && (cmd === 7 || cmd === 0x07)) {
        const sceneId = frameData.length > 3 ? frameData[3] | (frameData[4] << 8) : 0;
        this.log(` Button ${endpointId} scene recall: ${sceneId}`);
        const manufacturerConfig = this._manufacturerConfig || {};
        const PRESS_MAP = require('../utils/TuyaPressTypeMap').PRESS_MAP;
        const TUYA_PRESS_TYPES = manufacturerConfig.pressTypeMapping || PRESS_MAP;
        
        const pressAction = TUYA_PRESS_TYPES[sceneId] || 'single';
        this.log(` Button ${endpointId} ${pressAction.toUpperCase()} PRESS`);
        
        // Global Debouncer Engine
        const now = Date.now();
        const dedupKey = `raw_${endpointId}_${sceneId}`;
        this._sceneDedup = this._sceneDedup || {};
        if (now - (this._sceneDedup[dedupKey] || 0) < 350) {
            this.log(` Scene Button ${endpointId} DEBOUNCED`);
            return true;
        }
        this._sceneDedup[dedupKey] = now;
        
        if (typeof this._triggerPhysicalFlow === 'function') {
          this._triggerPhysicalFlow(endpointId, pressAction);
        }
        return true;
      }
      
      // ONOFF (6): Tuya manufacturer 0xFD (scene remotes TS004x)
      if (clusterId === 6 && cmd === 0xFD) {
        const scene = frameData.length > 3 ? frameData[3] : (frameData.length ? frameData[0] : 0);
        const PRESS_MAP = require('../utils/TuyaPressTypeMap').PRESS_MAP;
        const pressType = PRESS_MAP[scene] || 'single';
        const nowFd = Date.now();
        const dedupKeyFd = `raw_onoff_fd_${endpointId}_${scene}`;
        this._sceneDedup = this._sceneDedup || {};
        if (nowFd - (this._sceneDedup[dedupKeyFd] || 0) < 350) {
          return true;
        }
        this._sceneDedup[dedupKeyFd] = nowFd;
        this.log(` Button ${endpointId} OnOff 0xFD scene=${scene} -> ${pressType}`);
        if (typeof this._triggerPhysicalFlow === 'function') {
          this._triggerPhysicalFlow(endpointId, pressType);
        }
        return true;
      }

      // ONOFF (6): Tuya manufacturer 0xFC rotate (TS004F knobs) — Homey-native gap
      if (clusterId === 6 && cmd === 0xFC) {
        const dir = frameData.length ? frameData[0] : 0;
        const nowFc = Date.now();
        const dedupKeyFc = `raw_onoff_fc_${endpointId}_${dir}`;
        this._sceneDedup = this._sceneDedup || {};
        if (nowFc - (this._sceneDedup[dedupKeyFc] || 0) < 200) {
          return true;
        }
        this._sceneDedup[dedupKeyFc] = nowFc;
        this.log(` Button ${endpointId} OnOff 0xFC rotate dir=${dir}`);
        if (typeof this._triggerPhysicalFlow === 'function') {
          this._triggerPhysicalFlow(endpointId, 'single');
        }
        return true;
      }

      // ONOFF (6): toggle (0x02), on (0x01), off (0x00)
      // v10.3.0 FIX (B1): only accept cmd 0-2 when the frame carries no
      // attribute-report payload (frameData.length <= 3). Longer frames are
      // ZCL reads/reports (e.g. cmd 0x0A report attributes), not presses.
      if (clusterId === 6 && cmd <= 2 && frameData.length <= 3) {
        this.log(` Button ${endpointId} OnOff command: ${cmd} (Auto-Mode Detection)`);
        
        // Global Debouncer Engine
        const now = Date.now();
        const dedupKey = `raw_onoff_${endpointId}_${cmd}`;
        this._sceneDedup = this._sceneDedup || {};
        if (now - (this._sceneDedup[dedupKey] || 0) < 350) {
            this.log(` OnOff Button ${endpointId} DEBOUNCED`);
            return true;
        }
        this._sceneDedup[dedupKey] = now;
        
        // v9.0.86: Auto Mode-Detection. Treat as single click for scene switches stuck in Command Mode
        if (typeof this._triggerPhysicalFlow === 'function') {
          this._triggerPhysicalFlow(endpointId, 'single');
        }
        return true;
      }

      // LEVELCONTROL (8): step, move, stop (Tuya Dimmers)
      if (clusterId === 8) {
        this.log(` Button ${endpointId} LevelControl command: ${cmd}`);
        let pressAction = 'single';
        // cmd 1=move, 4=moveWithOnOff -> Long press
        if (cmd === 1 || cmd === 4) {
          pressAction = 'long';
        }
        
        const now = Date.now();
        const dedupKey = `raw_level_${endpointId}_${cmd}`;
        this._sceneDedup = this._sceneDedup || {};
        if (now - (this._sceneDedup[dedupKey] || 0) < 500) {return true;}
        this._sceneDedup[dedupKey] = now;
        
        if (typeof this._triggerPhysicalFlow === 'function') {
          this._triggerPhysicalFlow(endpointId, pressAction);
        }
        return true;
      }
    }
    
    return false;
  }

  /**
   * v10.2.0: CRITICAL FIX - Re-apply bindings on Device Announce
   * Physical buttons often lose connectivity or bindings when they go to deep sleep.
   * Re-binding when the device announces itself (wake up) ensures persistent reporting.
   * Previously only in ButtonDevice; now universal for all button-class devices.
   */
  async onEndDeviceAnnounce() {
    if (typeof super.onEndDeviceAnnounce === 'function') {
      await super.onEndDeviceAnnounce().catch((err) => {
        this.log(`[PHYSICAL] super announce: ${err && err.message}`);
      });
    }

    this.log('[PHYSICAL] Device announce (wake/rejoin) - re-applying bindings...');

    const zclNode = this.zclNode;
    if (!zclNode) {return;}

    try {
      this._tuyaMagicPacketSent = false;
      const { sendTuyaMagicPacket } = require('../zigbee/TuyaMagicPacket');
      await sendTuyaMagicPacket(this, zclNode, 1, { force: true });
    } catch (_e) { /* best-effort */ }

    // WHY(P2282): deferred IO passive-listen may wrap handleFrame after init —
    // re-arm OnOffBound + raw 0xFD catcher on wake so presses still reach flows.
    try {
      this._onOffFdBoundClusterInitialized = false;
      this._onOffFdRawCatcherHooked = false;
      await this._setupOnOffFdBoundCluster(zclNode);
    } catch (_e) { /* best-effort */ }

    const endpoints = Math.max(Number(this.gangCount) || 1, Number(this.buttonCount) || 1);
    for (let ep = 1; ep <= endpoints; ep++) {
      const endpoint = zclNode.endpoints[ep];
      if (!endpoint) {continue;}

      const clusterIdsToBind = [5, 6, 18, 8, 0xE000, 0xE003];

      for (const cid of clusterIdsToBind) {
        try {
          if (typeof endpoint.bind === 'function') {
            endpoint.bind(cid).then(() => {
              this.log(`[PHYSICAL] Re-bound cluster 0x${cid.toString(16)} on EP${ep}`);
            }).catch(err => {
              if (!err.message?.includes('timeout')) {
                this.log(`[PHYSICAL] Cluster 0x${cid.toString(16)} bind EP${ep}: ${err.message}`);
              }
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // v10.2.0 + P2249/P2254: Scene Mode recovery ONLY when family supports 0x8004
    // AND profile does not skip (TS0041–44 / sacred mfrs).
    // TS0041/42/43/44 reject genOnOff attr 32772 — triple-write on wake was
    // burning sleepy radio and killing physical presses (meter91 / Peter).
    if (typeof this._switchToSceneMode === 'function') {
      let allowSceneWrite = true;
      try {
        const DOM = require('../zigbee/DeviceOperatingMode');
        const fam = DOM.classifyOperatingFamily(this);
        const profile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
        allowSceneWrite = !!fam.writeSceneAttr
          && !(profile?.skip8004 || profile?.writeSceneAttr === false);
        if (!allowSceneWrite) {
          this.log(`[PHYSICAL] skip scene-mode write on wake (family=${fam.family})`);
        }
      } catch (_e) { /* best-effort */ }
      if (allowSceneWrite) {
        for (let i = 0; i < 3; i++) {
          try {
            await this._switchToSceneMode(this.zclNode);
            await new Promise(r => safeSetTimeout(this, r, 1000));
          } catch (err) {
            this.log(`[PHYSICAL] Scene mode recovery attempt ${i + 1} failed: ${err.message}`);
          }
        }
      }
    }

    // P116: on wake, re-probe battery (Z2M sleepy remotes only report when awake).
    // Prefer store restore + ZCL read; never invent fake %.
    try {
      if (this.hasCapability?.('measure_battery') && !this.mainsPowered) {
        const stored = await Promise.resolve(this.getStoreValue?.('last_battery_percentage')).catch(() => null);
        if (typeof stored === 'number' && Number.isFinite(stored)
          && this.getCapabilityValue?.('measure_battery') == null) {
          if (typeof this.safeSetCapabilityValue === 'function') {
            await this.safeSetCapabilityValue('measure_battery', stored).catch(() => {});
          }
        }
        const ep = zclNode.endpoints?.[1];
        const pc = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg || ep?.clusters?.[1];
        if (pc && typeof pc.readAttributes === 'function') {
          pc.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).then((data) => {
            if (this._destroyed) {return;}
            if (this.smartBattery && typeof this.smartBattery.setBattery === 'function') {
              const rem = data?.batteryPercentageRemaining;
              if (rem != null && rem !== 255) {
                const pct = rem <= 100 ? rem : Math.round(rem / 2);
                this.smartBattery.setBattery(pct, { source: 'announce-zcl', estimated: false });
              } else if (data?.batteryVoltage) {
                this.smartBattery.setBattery(
                  this.smartBattery._voltageToPercent?.(data.batteryVoltage),
                  { source: 'announce-zcl-voltage', estimated: false },
                );
              }
            }
          }).catch(() => {});
        }
        // Quirk-driven: query known battery DPs after wake
        try {
          const { resolveDeviceMfr, getBatteryDpPlan } = require('../utils/ProtocolQuirkLookup');
          const plan = getBatteryDpPlan(resolveDeviceMfr(this));
          const dps = [...(plan.percentDps || []), ...(plan.voltageDps || [])].slice(0, 3);
          for (const dp of dps) {
            if (typeof this.requestDP === 'function') {
              this.requestDP(dp).catch(() => {});
            } else if (this.io && typeof this.io.requestDP === 'function') {
              this.io.requestDP(dp).catch(() => {});
            }
          }
        } catch (_e) { /* optional */ }
      }
    } catch (e) {
      this.log('[PHYSICAL] Announce battery probe skipped:', e?.message || e);
    }
  }

  onDeleted() {
    this._cleanupPhysicalButtonDetection();
    if (super.onDeleted) {super.onDeleted();}
  }

  /**
   * v8.1.0: SDK3 onUninit() — called on app restart/update
   * Prevents interval leaks when app restarts without device deletion
   */
  onUninit() {
    this._cleanupPhysicalButtonDetection();
    if (super.onUninit) {super.onUninit();}
  }
};
};

module.exports = PhysicalButtonMixin;
