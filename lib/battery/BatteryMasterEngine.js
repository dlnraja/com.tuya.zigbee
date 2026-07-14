'use strict';

/**
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘          BatteryMasterEngine v1.0.0 â€” P35 ULTIMATE BATTERY ENGINE          â•‘
 * â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
 * â•‘                                                                              â•‘
 * â•‘  SynthÃ¨se INTÃ‰GRALE de TOUTES les versions de gestion batterie :           â•‘
 * â•‘                                                                              â•‘
 * â•‘  v5.5.810 â€” TS0201 climate sensor missing clusters                          â•‘
 * â•‘  v5.5.814 â€” Sync zigbee endpoints, 13 drivers fixed                         â•‘
 * â•‘  v5.5.815 â€” 89 drivers with correct cluster endpoints                       â•‘
 * â•‘  v5.5.886 â€” Bulbs/HVAC cleanup - battery caps removed                       â•‘
 * â•‘  v5.5.988 â€” Patrick #1288 ZCL battery throttle                              â•‘
 * â•‘  v5.8.30 â€” Enhanced battery sensor passive Tuya DP listeners                â•‘
 * â•‘  v5.8.43 â€” HOBEIAN 10G radar sensor battery config fix                     â•‘
 * â•‘  v5.8.67 â€” Non-linear discharge curves + driver.id-first detection         â•‘
 * â•‘  v5.8.68 â€” _TZ3000_h1ipgkwn wrong driver fix                               â•‘
 * â•‘  v5.8.69 â€” 7 bugs comprehensive fix (sleeping devices)                      â•‘
 * â•‘  v5.8.69 â€” Battery persist & restore (sleepy device)                      â•‘
 * â•‘  v5.8.69 â€” SmartBatteryManager battery persist                             â•‘
 * â•‘  v5.8.70 â€” ANTI-FLOOD                                                    â•‘
 * â•‘  v5.8.76 â€” 4 diagnostic fixes - battery init                              â•‘
 * â•‘  v5.8.92 â€” Battery button wake-up fix                                     â•‘
 * â•‘  v5.8.99 â€” _readBatteryOnButtonPress crash fix                             â•‘
 * â•‘  v5.11.3 â€” ZCL battery throttle (100%â†”1% oscillation)                     â•‘
 * â•‘  v5.11.13 â€” Fix presence_sensor_radar log spam                             â•‘
 * â•‘  v8.1.0 â€” Battery & button mixins hardening                               â•‘
 * â•‘  v8.5.0 â€” UnifiedBatteryHandler + _destroyed guard                         â•‘
 * â•‘  v8.5.1 â€” Master self-heal 222 fixes (95 battery dual-inject)             â•‘
 * â•‘  v9.0.83 â€” Self-Healing engine (Z2M quirks, 0-50 scale)                   â•‘
 * â•‘  v9.0.85 â€” 10 critical root causes (battery halving, linear formula)      â•‘
 * â•‘  v9.0.87 â€” 3 critical issues (ternary crash, 200% sentinel, Z2M cross-ref) â•‘
 * â•‘  v9.0.89 â€” 200% sentinel fix (a234bcf32)                                 â•‘
 * â•‘  v9.0.215 (P28) â€” UniversalBatteryFallback                                â•‘
 * â•‘  v9.0.219 (P28) â€” battery cartography                                   â•‘
 * â•‘                                                                              â•‘
 * â•‘  BATTERYMASTERENGINE EST UN SUPERSET â€” il NE REMPLACE PAS, il AJOUTE.       â•‘
 * â•‘  Combine les meilleurs patterns de TOUTES les versions.                     â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SECTION 1: BATTERY CHEMISTRY SPECS (synthÃ¨se de toutes les versions)
// v5.5.47: BatteryCalculator with non-linear discharge curves
// v5.8.67: BATTERY RECOGNITION FIX
// v9.0.215 (P28): UniversalBatteryFallback avec 15+ chem profiles
// v9.0.219 (P28): 18+ chem profiles consolidÃ©s
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const BATTERY_SPECS = {
  // â”€â”€â”€ 3V LITHIUM COIN CELLS (CR series) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CR2032: {
    type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00, capacity: 220,
    curve: [[3.30,100],[3.10,98],[3.00,95],[2.95,90],[2.90,85],[2.85,75],[2.80,65],[2.75,50],[2.70,40],[2.60,25],[2.50,15],[2.40,8],[2.30,4],[2.20,2],[2.00,0]],
  },
  CR2450: {
    type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00, capacity: 620,
    curve: [[3.30,100],[3.00,95],[2.90,85],[2.80,70],[2.70,50],[2.60,30],[2.50,15],[2.40,8],[2.00,0]],
  },
  CR2477: {
    type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00, capacity: 1000,
    curve: [[3.30,100],[3.00,95],[2.90,85],[2.80,70],[2.70,50],[2.60,30],[2.50,15],[2.00,0]],
  },
  CR123A: {
    type: 'Lithium Photo', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00, capacity: 1500,
    curve: [[3.30,100],[3.15,95],[3.00,90],[2.90,80],[2.80,65],[2.70,45],[2.60,25],[2.50,12],[2.40,5],[2.00,0]],
  },
  CR1632: {
    type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0,
    fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00, capacity: 140,
    curve: [[3.30,100],[3.00,95],[2.90,85],[2.80,70],[2.70,50],[2.60,30],[2.50,15],[2.00,0]],
  },
  // â”€â”€â”€ 1.5V ALKALINE (single cell) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  AAA: {
    type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1, nominal: 1.5,
    fresh: 1.65, full: 1.55, low: 1.10, dead: 0.90, capacity: 1200,
    curve: [[1.65,100],[1.55,95],[1.50,90],[1.45,80],[1.40,70],[1.35,60],[1.30,50],[1.25,40],[1.20,30],[1.15,20],[1.10,12],[1.05,6],[1.00,3],[0.90,0]],
  },
  AA: {
    type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1, nominal: 1.5,
    fresh: 1.65, full: 1.55, low: 1.10, dead: 0.90, capacity: 2850,
    curve: [[1.65,100],[1.55,95],[1.50,90],[1.45,80],[1.40,70],[1.35,60],[1.30,50],[1.25,40],[1.20,30],[1.15,20],[1.10,12],[1.05,6],[1.00,3],[0.90,0]],
  },
  C: {
    type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1, nominal: 1.5,
    fresh: 1.65, full: 1.55, low: 1.10, dead: 0.90, capacity: 8000,
    curve: [[1.65,100],[1.55,95],[1.50,88],[1.45,78],[1.40,68],[1.35,55],[1.30,42],[1.25,30],[1.20,20],[1.10,8],[0.90,0]],
  },
  D: {
    type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1, nominal: 1.5,
    fresh: 1.65, full: 1.55, low: 1.10, dead: 0.90, capacity: 17000,
    curve: [[1.65,100],[1.55,95],[1.50,88],[1.45,78],[1.40,68],[1.35,55],[1.30,42],[1.25,30],[1.20,20],[1.10,8],[0.90,0]],
  },
  '9V': {
    type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 6, nominal: 9.0,
    fresh: 9.60, full: 9.00, low: 7.20, dead: 5.40, capacity: 565,
    curve: [[9.60,100],[9.30,95],[9.00,88],[8.70,78],[8.40,65],[8.10,50],[7.80,35],[7.50,22],[7.20,12],[6.60,5],[5.40,0]],
  },
  // â”€â”€â”€ MULTI-CELL (common in Zigbee) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  '2xAAA': {
    type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 2, nominal: 3.0,
    fresh: 3.30, full: 3.10, low: 2.20, dead: 1.80, capacity: 1200,
    curve: [[3.30,100],[3.10,95],[3.00,90],[2.90,80],[2.80,70],[2.70,60],[2.60,50],[2.50,40],[2.40,30],[2.30,20],[2.20,12],[2.00,5],[1.80,0]],
  },
  '2xAA': {
    type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 2, nominal: 3.0,
    fresh: 3.30, full: 3.10, low: 2.20, dead: 1.80, capacity: 2850,
    curve: [[3.30,100],[3.10,95],[3.00,90],[2.90,80],[2.80,70],[2.70,60],[2.60,50],[2.50,40],[2.40,30],[2.30,20],[2.20,12],[2.00,5],[1.80,0]],
  },

// New R4 chem profiles
  'LiPo': {
    type: 'Lithium Polymer', chemistry: 'LiPo', cells: 1, nominal: 3.7,
    fresh: 4.20, full: 3.90, low: 3.30, dead: 3.00, capacity: 2500,
    curve: [[4.20,100],[4.10,90],[3.95,75],[3.85,60],[3.75,45],[3.65,30],[3.50,20],[3.30,10],[3.00,5],[2.80,0]],
  },
  'LiFePO4': {
    type: 'Lithium Iron Phosphate', chemistry: 'LiFePO4', cells: 1, nominal: 3.2,
    fresh: 3.60, full: 3.40, low: 2.80, dead: 2.50, capacity: 1000,
    curve: [[3.60,100],[3.45,90],[3.30,75],[3.20,60],[3.10,45],[3.00,30],[2.90,20],[2.80,10],[2.65,5],[2.50,0]],
  },
  'ZnAir': {
    type: 'Zinc-Air', chemistry: 'Zn-O2', cells: 1, nominal: 1.4,
    fresh: 1.55, full: 1.45, low: 1.10, dead: 0.90, capacity: 600,
    curve: [[1.55,100],[1.45,90],[1.35,75],[1.25,60],[1.20,50],[1.15,40],[1.10,30],[1.05,20],[1.00,10],[0.90,0]],
  },
  'ER14505': {
    type: 'Lithium Thionyl Chloride', chemistry: 'LiSOCl2', cells: 1, nominal: 3.6,
    fresh: 3.90, full: 3.60, low: 3.00, dead: 2.50, capacity: 2400,
    curve: [[3.90,100],[3.75,95],[3.60,90],[3.45,80],[3.30,70],[3.15,55],[3.00,40],[2.80,25],[2.60,10],[2.50,0]],
  },
  'ER14250': {
    type: 'Lithium Thionyl Chloride', chemistry: 'LiSOCl2', cells: 1, nominal: 3.6,
    fresh: 3.90, full: 3.60, low: 3.00, dead: 2.50, capacity: 1200,
    curve: [[3.90,100],[3.75,95],[3.60,90],[3.45,80],[3.30,70],[3.15,55],[3.00,40],[2.80,25],[2.60,10],[2.50,0]],
  },

  'Li-ion-18650': {
    type: 'Lithium-ion', chemistry: 'Li-ion', cells: 1, nominal: 3.7,
    fresh: 4.20, full: 3.90, low: 3.30, dead: 2.80, capacity: 2600,
    curve: [[4.20,100],[4.10,90],[3.95,75],[3.85,60],[3.75,45],[3.65,30],[3.50,20],[3.30,10],[3.00,5],[2.80,0]],
  },
  'NiMH-AA': {
    type: 'Nickel-Metal Hydride', chemistry: 'NiMH', cells: 1, nominal: 1.2,
    fresh: 1.45, full: 1.25, low: 1.10, dead: 1.00, capacity: 2500,
    curve: [[1.45,100],[1.35,90],[1.25,80],[1.20,70],[1.18,60],[1.15,50],[1.12,40],[1.10,30],[1.05,15],[1.00,0]],
  },
  'NiMH-AAA': {
    type: 'Nickel-Metal Hydride', chemistry: 'NiMH', cells: 1, nominal: 1.2,
    fresh: 1.40, full: 1.25, low: 1.10, dead: 1.00, capacity: 900,
    curve: [[1.40,100],[1.32,90],[1.25,80],[1.20,70],[1.18,60],[1.15,50],[1.12,40],[1.10,30],[1.05,15],[1.00,0]],
  },
  'CR2': {
    type: 'Lithium Manganese Dioxide', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0,
    fresh: 3.30, full: 3.10, low: 2.50, dead: 2.00, capacity: 800,
    curve: [[3.30,100],[3.20,95],[3.10,85],[3.00,75],[2.85,60],[2.70,40],[2.50,20],[2.30,10],[2.10,5],[2.00,0]],
  },
  'CR-P2': {
    type: 'Lithium Manganese Dioxide', chemistry: 'Li-MnO2', cells: 1, nominal: 6.0,
    fresh: 6.60, full: 6.20, low: 5.00, dead: 4.00, capacity: 1450,
    curve: [[6.60,100],[6.40,90],[6.20,80],[6.00,70],[5.70,55],[5.40,40],[5.10,25],[4.80,15],[4.40,5],[4.00,0]],
  },
  'CR-V3': {
    type: 'Lithium Manganese Dioxide', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0,
    fresh: 3.30, full: 3.10, low: 2.50, dead: 2.00, capacity: 3000,
    curve: [[3.30,100],[3.20,90],[3.10,80],[3.00,70],[2.85,55],[2.70,40],[2.50,25],[2.30,15],[2.10,5],[2.00,0]],
  },
  'LS14500': {
    type: 'Lithium Thionyl Chloride', chemistry: 'LiSOCl2', cells: 1, nominal: 3.6,
    fresh: 3.90, full: 3.60, low: 3.00, dead: 2.50, capacity: 2600,
    curve: [[3.90,100],[3.75,95],[3.60,90],[3.45,80],[3.30,70],[3.15,55],[3.00,40],[2.80,25],[2.60,10],[2.50,0]],
  },
  '4xAAA': {
    type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 4, nominal: 6.0,
    fresh: 6.60, full: 6.20, low: 4.40, dead: 3.60, capacity: 1200,
    curve: [[6.60,100],[6.20,95],[6.00,90],[5.80,80],[5.60,70],[5.40,60],[5.20,50],[5.00,40],[4.80,30],[4.60,20],[4.40,12],[4.00,5],[3.60,0]],
  },
  '3xAA': {
    type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 3, nominal: 4.5,
    fresh: 4.95, full: 4.65, low: 3.30, dead: 2.70, capacity: 2850,
    curve: [[4.95,100],[4.65,95],[4.50,90],[4.35,80],[4.20,70],[4.05,60],[3.90,50],[3.75,40],[3.60,30],[3.45,20],[3.30,12],[3.00,5],[2.70,0]],
  },
  // â”€â”€â”€ LITHIUM-ION RECHARGEABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  'Li-ion': {
    type: 'Lithium-ion Rechargeable', chemistry: 'Li-ion', cells: 1, nominal: 3.7,
    fresh: 4.20, full: 4.10, low: 3.30, dead: 2.80, capacity: 2600,
    curve: [[4.20,100],[4.15,98],[4.10,95],[4.00,88],[3.90,78],[3.80,65],[3.70,50],[3.60,35],[3.50,22],[3.40,12],[3.30,5],[3.00,2],[2.80,0]],
  },
  'Li-Po': {
    type: 'Lithium-polymer Rechargeable', chemistry: 'Li-po', cells: 1, nominal: 3.7,
    fresh: 4.20, full: 4.10, low: 3.30, dead: 3.00, capacity: 1200,
    curve: [[4.20,100],[4.15,97],[4.10,93],[4.00,85],[3.90,73],[3.80,58],[3.70,42],[3.60,28],[3.50,16],[3.40,8],[3.30,3],[3.00,0]],
  },
  '18650': {
    type: 'Lithium-ion 18650', chemistry: 'Li-ion', cells: 1, nominal: 3.7,
    fresh: 4.20, full: 4.10, low: 3.30, dead: 2.50, capacity: 3400,
    curve: [[4.20,100],[4.10,95],[4.00,88],[3.90,78],[3.80,65],[3.70,50],[3.60,35],[3.50,22],[3.40,12],[3.30,5],[3.00,2],[2.50,0]],
  },
  'LiFePO4': {
    type: 'Lithium Iron Phosphate', chemistry: 'LiFePO4', cells: 1, nominal: 3.2,
    fresh: 3.60, full: 3.40, low: 3.00, dead: 2.50, capacity: 1500,
    curve: [[3.60,100],[3.40,95],[3.30,85],[3.20,75],[3.10,60],[3.00,40],[2.90,20],[2.80,10],[2.70,5],[2.50,0]],
  },
  // â”€â”€â”€ NiMH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  NiMH: {
    type: 'NiMH Rechargeable', chemistry: 'NiMH', cells: 1, nominal: 1.2,
    fresh: 1.40, full: 1.25, low: 1.00, dead: 0.90, capacity: 2500,
    curve: [[1.40,100],[1.30,90],[1.25,80],[1.20,70],[1.15,55],[1.10,40],[1.05,25],[1.00,10],[0.95,3],[0.90,0]],
  },
  '2xAA-NiMH': {
    type: 'NiMH Multi-Cell', chemistry: 'NiMH', cells: 2, nominal: 2.4,
    fresh: 2.80, full: 2.50, low: 2.00, dead: 1.80, capacity: 2500,
    curve: [[2.80,100],[2.50,80],[2.40,65],[2.30,45],[2.20,30],[2.10,15],[2.00,5],[1.80,0]],
  },
  // â”€â”€â”€ USB / MAINS (no battery) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  USB: {
    type: 'USB Powered', chemistry: 'none', cells: 0, nominal: 5.0,
    fresh: 5.0, full: 5.0, low: 5.0, dead: 0, capacity: Infinity,
    curve: [[5,100],[0,0]],
  },
  MAINS: {
    type: 'AC Powered', chemistry: 'none', cells: 0, nominal: 230,
    fresh: 230, full: 230, low: 200, dead: 0, capacity: Infinity,
    curve: [[230,100],[0,0]],
  },
};

const DEFAULT_BATTERY = 'CR2032';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SECTION 2: TUYA DPs
// v5.5.47: Tuya DP4 = battery percent
// v9.0.89 (a234bcf32): 200% sentinel
// v9.0.83 (4c2f0fc64): 0-50 scale, Z2M quirks
// P14: soil_sensor DP4/15/101
// P28: 10 percent + 2 state + 3 voltage
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const TUYA_PERCENT_DPS = [4, 15, 101, 10, 21, 100, 102, 104, 105, 121];
const TUYA_STATE_DPS = [3, 14];
const TUYA_VOLTAGE_DPS = [33, 35, 247];
const TUYA_FAULT_DPS = [12, 13];

// v5.5.983 Z2M quirks + v9.0.83 Z2M cross-ref
const TUYA_DP_KNOWN_QUIRKS = {
  // DP 4 with multiply_2 algorithm (some climate sensors)
  4: { algorithms: ['direct', 'multiply_2'] },
  // DP 101 with voltage-as-percent (some soil sensors)
  101: { algorithms: ['direct', 'multiply_2', 'voltage_as_percent'] },
  // DP 14 with state semantics
  14: { algorithms: ['direct', 'low_bool'] },
};

// v9.0.89 (a234bcf32) â€” Manufacturers that LEGITIMATELY use 200 as 100%
const BATTERY_200_WHITELIST = new Set([
  '_TZ3000_lqmvrwa2',
  // Some other manufacturers that may use 200 as 100%
  // (z2m device definitions have this pattern)
]);

// ZCL sentinel values (multiple fixes: 2e9e12e8e, a234bcf32, 1441b5347)
const ZCL_SENTINELS = [255, 0xFFFF];

// v9.0.85 â€” Z2M cross-ref: 0-50 scale device whitelist
const TUE_50_SCALE_WHITELIST = new Set([
  '_TZE200_vvmbj4f5',
  '_TZE284_vvmbj4f5',
  '_TZE200_8wh8x3iy',
  '_TZE284_8wh8x3iy',
]);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SECTION 3: MANUFACTURER PROFILES (synthÃ¨se)
// v9.0.215 (P28): 32 profiles
// v9.0.219 (P28): consolidated
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const MANUFACTURER_PROFILES = {
  // Soil sensors (v5.8.67 + P14)
  '_TZE284_oitavov2':  { chemistry: 'CR2032', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE284_aao3yzhs': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE200_myd45weu': { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE204_myd45weu': { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE284_myd45weu': { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  // Climate sensors
  '_TZE284_vvmbj4f5': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2' },
  '_TZE200_vvmbj4f5': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2' },
  '_TZE200_bjawzodf': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2' },
  '_TZE200_a8sdabtg': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'direct' },
  // SOS buttons (skipZclPolling from P28)
  '_TZ3000_0dumfk2z': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct', skipZclPolling: true },
  '_TZ3000_fdr5rqsn': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct', skipZclPolling: true },
  // PIR motion
  '_TZ3000_mcxw5ehu': { chemistry: 'AAA', source: 'zcl_power', algorithm: 'alkaline_curve' },
  '_TZ3000_kmh5qpmb': { chemistry: 'CR123A', source: 'zcl_power', algorithm: 'lithium_flat' },
  // Contact sensors
  '_TZ3000_26fmupbb': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_decxrtwa': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_fxwsnmhb': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  // Scene switches
  '_TZ3400_keyjqthh': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_bi6lpsew': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  // 4-button scene (v5.5.988 zcl200IsPercent)
  '_TZ3000_b4awzgct': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_yj6k7vfo': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_u3nv1jwk': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_kfu8zapd': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_xabckq1v': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_czuyt8lz': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_b3mgfu0d': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_rco1yzb1': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_qja6nq5z': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_gwkzibhs': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  // USB / mains powered
  '_TZE200_rhgsbacq': { chemistry: 'USB', source: 'none' },
  '_TZE204_sxm7l9xa': { chemistry: 'USB', source: 'none' },
  '_TZ3000_h1ipgkwn': { chemistry: 'MAINS', source: 'none' },
  
  '_TZE200_khah2lkr':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE200_yflzeeqj':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE200_d9mzkhoq':  { chemistry: 'CR123A',  source: 'tuya_dp', dpId: 15, algorithm: 'lithium_flat'    },
  '_TZE200_3ejwxpmu':  { chemistry: 'CR123A',  source: 'tuya_dp', dpId: 15, algorithm: 'lithium_flat'    },
  '_TZE200_cduqh1l0':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE200_n8dljorx':  { chemistry: 'AA',      source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve'  },
  '_TZE200_qjp4ynvi':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE200_s1xgth2u':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE204_lawxy9e2':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE200_tsxpl0d0':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE200_auin8mzr':  { chemistry: 'CR123A',  source: 'tuya_dp', dpId: 15, algorithm: 'lithium_flat'    },
  '_TZE200_raz9qavg':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE200_gomuk3dc':  { chemistry: 'AA',      source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve'  },
  '_TZE200_8whu6kkr':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE200_utwgivdk':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE204_z7a2jmyy':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE204_zrctll6o':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE284_xz4yr5nz':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE204_nvkl4dkf':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE200_hkdl0fmv':  { chemistry: 'CR2032',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE204_qasifk8z':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE204_oh8y2grn':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE204_rqhsbjr2':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE284_8catj2au':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZ3000_gbmcijn6':  { chemistry: 'CR2430',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZ3000_bv1czkkn':  { chemistry: 'CR2430',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZ3000_4a3l0x0t':  { chemistry: 'CR2430',  source: 'tuya_dp', dpId: 4,  algorithm: 'cr2032_curve'    },
  '_TZE204_4f2wexj6':  { chemistry: 'AA',      source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve'  },
  '_TZE284_zjho8u0y':  { chemistry: 'AA',      source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve'  },
  '_TZE200_5vqk5kod':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE204_dq7c8fng':  { chemistry: 'MAINS',   source: 'none'                                       },
  '_TZE200_mwgsmffw':  { chemistry: 'AAA',     source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve'  },
  '_TZE200_0hg3xegf':  { chemistry: 'AA',      source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve'  },'LELLKI':             { chemistry: 'MAINS', source: 'none' },

  // R4 — new mfr profiles from P40
  '_TZE284_2nhqasjh':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE284_oitavov2_dup': null, // already in
  '_TZE200_pay2byax':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE608_c75zqghm':  { chemistry: 'MAINS', source: 'none' },
  '_TZE608_fmemczv1':  { chemistry: 'MAINS', source: 'none' },
  '_TZE608_lapuuoke':  { chemistry: 'MAINS', source: 'none' },
  '_TZE608_xkr8gep3':  { chemistry: 'MAINS', source: 'none' },
  '_TZE200_ckud7u2l':  { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE200_cwnjrr72':  { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE200_fphxkxue':  { chemistry: 'AA', source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve' },
  '_TZE200_r32ctezx':  { chemistry: 'AA', source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve' },
  '_TZE200_spyvfeti':  { chemistry: 'AA', source: 'tuya_dp', dpId: 15, algorithm: 'alkaline_curve' },
  '_TZE200_clrdrnya':  { chemistry: 'USB', source: 'none' },
  '_TZE200_crq3r3la':  { chemistry: 'USB', source: 'none' },
  '_TZE200_f1pvdgoh':  { chemistry: 'USB', source: 'none' },
  '_TZE200_gkfbdvyx':  { chemistry: 'USB', source: 'none' },
  '_TZE200_hyhl5y36':  { chemistry: 'USB', source: 'none' },
  '_TZE200_juzago6i':  { chemistry: 'USB', source: 'none' },
  '_TZE200_kb5noeto':  { chemistry: 'USB', source: 'none' },
  '_TZE200_lu01t0zl':  { chemistry: 'USB', source: 'none' },
  '_TZE200_mp902om5':  { chemistry: 'USB', source: 'none' },
  '_TZE200_p9zbdqgs':  { chemistry: 'USB', source: 'none' },
  '_TZE200_ppuj1vem':  { chemistry: 'USB', source: 'none' },
  '_TZE200_qasjif9e':  { chemistry: 'USB', source: 'none' },
  '_TZE200_rhgsbacq_dup': null, // already in
  '_TZE200_sbyx0lm6':  { chemistry: 'USB', source: 'none' },
  '_TZE200_tyffvoij':  { chemistry: 'USB', source: 'none' },
  '_TZE200_ya4ft0w4':  { chemistry: 'USB', source: 'none' },
  '_TZE204_clrdrnya':  { chemistry: 'USB', source: 'none' },
  '_TZE204_bmdsp6bs':  { chemistry: 'USB', source: 'none' },
  '_TZE204_bvfld3xc':  { chemistry: 'USB', source: 'none' },
  '_TZE204_dtzziy1e':  { chemistry: 'USB', source: 'none' },
  '_TZE204_e5m9c5hl':  { chemistry: 'USB', source: 'none' },
  '_TZE204_ex3rcdha':  { chemistry: 'USB', source: 'none' },
  '_TZE204_fwondbzy':  { chemistry: 'USB', source: 'none' },
  '_TZE204_kyhbrfyl':  { chemistry: 'USB', source: 'none' },
  '_TZE204_lbbg34rj':  { chemistry: 'USB', source: 'none' },
  '_TZE204_mtoaryre':  { chemistry: 'USB', source: 'none' },
  '_TZE204_no6qtgtl':  { chemistry: 'USB', source: 'none' },
  '_TZE204_pfayrzcw':  { chemistry: 'USB', source: 'none' },
  '_TZE204_ya4ft0w4':  { chemistry: 'USB', source: 'none' },
  '_TZE204_ycke4deo':  { chemistry: 'USB', source: 'none' },
  '_TZE284_4qznlkbu':  { chemistry: 'USB', source: 'none' },
  '_TZE284_debczeci':  { chemistry: 'USB', source: 'none' },
  '_TZE284_hgeqeyuv':  { chemistry: 'USB', source: 'none' },
  '_TZE284_ozf4e02o':  { chemistry: 'USB', source: 'none' },
  '_TZE284_pzm3wab5':  { chemistry: 'USB', source: 'none' },
  '_TZE284_twybxdzl':  { chemistry: 'USB', source: 'none' },
  '_TZE284_vceqncho':  { chemistry: 'USB', source: 'none' },
  '_TZE284_who1jxwd':  { chemistry: 'USB', source: 'none' },
  '_TZE284_yrwmnya3':  { chemistry: 'USB', source: 'none' },
  '_TZE204_2jnoY8dj':  { chemistry: 'MAINS', source: 'none' },
  '_TZE204_lawxy9e2':  { chemistry: 'MAINS', source: 'none' },
  '_TZE200_lawxy9e2':  { chemistry: 'MAINS', source: 'none' },
  '_TZ3000_g9g2xnch':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_2iiimqs9':  { chemistry: 'MAINS', source: 'none' },
  '_TZ3000_pcqjmcud':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_gwkzibhs':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_5ajpkyq6':  { chemistry: 'MAINS', source: 'none' },
  '_TZ3000_knoj8lpk':  { chemistry: 'MAINS', source: 'none' },
  '_TZ3210_4ubylghk':  { chemistry: 'MAINS', source: 'none' },
  '_TZ3210_claeh5ds':  { chemistry: 'MAINS', source: 'none' },
  '_TZ3000_bpkijo14':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_rid8lzvo':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_timx9ivq':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_udyjylt7':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_996rpfy6':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_5bpeda8u':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
};

const PRODUCT_ID_DEFAULTS = {
  'TS0601': { source: 'tuya_dp', dpId: 4, algorithm: 'direct' },
  'TS0001': { chemistry: 'MAINS', source: 'none' },
  'TS0002': { chemistry: 'MAINS', source: 'none' },
  'TS0003': { chemistry: 'MAINS', source: 'none' },
  'TS0004': { chemistry: 'MAINS', source: 'none' },
  'TS011F': { chemistry: 'MAINS', source: 'none' },
  'TS0115': { chemistry: 'MAINS', source: 'none' },
  'TS0201': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  'TS0202': { chemistry: 'AAA', source: 'zcl_power', algorithm: 'alkaline_curve' },
  'TS0203': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  'TS0207': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  'TS0215A': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct' },
  'TS0041': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  'TS0042': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  'TS0043': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  'TS0044': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  'TS004F': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SECTION 4: HELPER FUNCTIONS
// Synthesis of: UniversalBatteryFallback (P28), BatteryCascadeEngine (P33),
// UnifiedBatteryHandler (v8.5.0), BatteryManager (v5.8.67), BatteryHelper
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function coerceNumeric(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (Buffer.isBuffer(value)) {
    if (value.length === 0) return null;
    if (value.length <= 4) return value.readUIntBE(0, value.length);
    return value[value.length - 1];
  }
  if (Array.isArray(value)) return coerceNumeric(Buffer.from(value));
  if (typeof value === 'object') {
    return coerceNumeric(value.value ?? value.dpValue ?? value.data ?? value.raw);
  }
  return null;
}

function normalizeVoltage(raw) {
  const v = coerceNumeric(raw);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 800 && v <= 6000) return v / 1000;  // mV
  if (v > 100 && v <= 600) return v / 100;       // cV
  if (v >= 20 && v <= 60) return v / 10;          // dV
  if (v >= 0.8 && v <= 15) return v;              // V
  return null;
}

function voltageToPercent(voltage, batteryType = DEFAULT_BATTERY, temperature = 20) {
  const spec = BATTERY_SPECS[batteryType] || BATTERY_SPECS[DEFAULT_BATTERY];
  if (!Number.isFinite(voltage) || voltage <= 0) return null;

  // Temperature compensation (P28)
  let compensated = voltage;
  if (temperature < 20 && spec.tempCoeff) {
    compensated = voltage - (spec.tempCoeff * (20 - temperature));
  }

  if (compensated >= spec.fresh) return 100;
  if (compensated <= spec.dead) return 0;

  for (let i = 0; i < spec.curve.length - 1; i++) {
    const [vH, pH] = spec.curve[i];
    const [vL, pL] = spec.curve[i + 1];
    if (compensated >= vL && compensated <= vH) {
      const t = (compensated - vL) / (vH - vL);
      return Math.round(pL + t * (pH - pL));
    }
  }
  return compensated > spec.curve[0][0] ? 100 : 0;
}

function normalizeZigbeeValue(rawValue, options = {}) {
  const value = coerceNumeric(rawValue);
  if (!Number.isFinite(value)) return null;
  const treat200AsSentinel = options.treat200AsSentinel !== false;
  const lastValue = options.lastValue;
  const hasLastValue = Number.isFinite(lastValue);
  const manufacturer = options.manufacturer || '';
  const isTUE50ScaleMfr = TUE_50_SCALE_WHITELIST.has(manufacturer);

  // SENTINELS â€” multiple fixes
  if (ZCL_SENTINELS.includes(value) || value < 0) return null;

  // 0-50 SCALE ANOMALY (v9.0.83 4c2f0fc64)
  if (value > 0 && value <= 50 && (hasLastValue && lastValue > 0 && lastValue <= 50 || isTUE50ScaleMfr)) {
    return Math.min(100, Math.round(value * 2));
  }

  // 200 SENTINEL (v9.0.89 a234bcf32)
  if (value === 200) {
    if (treat200AsSentinel && !BATTERY_200_WHITELIST.has(manufacturer)) return null;
    return 100;
  }

  // 1000-4000 mV
  if (value >= 1000 && value <= 4000) {
    const voltage = value / 1000;
    return voltageToPercent(voltage, options.batteryType || DEFAULT_BATTERY, options.temperature);
  }

  // 201-1000 (rare 0-1000 scale)
  if (value > 200 && value < 1000) {
    return Math.round((value / 255) * 100);
  }

  // 25-50 with last value > 40 (voltage as percent, 2.5-3.6V â†’ 0-100%)
  if (value >= 25 && value <= 50 && hasLastValue && lastValue > 40) {
    return Math.round(((value - 25) / 11) * 100);
  }

  // 101-200 = ZCL 0-200 scale (e.g., 160 = 80%)
  if (value > 100 && value <= 200) {
    return Math.round(value / 2);
  }

  // 0-100 = direct percent
  if (value >= 0 && value <= 100) {
    return Math.round(value);
  }

  // Out of range â€” clamp
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tuyaDpToPercent(dp, value, options = {}) {
  const dpId = Number(dp);
  const raw = coerceNumeric(value);
  if (!Number.isFinite(dpId) || !Number.isFinite(raw)) return null;

  if (raw === 255 || raw === 0xFFFF || raw < 0) return null;

  // VOLTAGE DPs
  if (TUYA_VOLTAGE_DPS.includes(dpId)) {
    const voltage = normalizeVoltage(raw);
    if (voltage === null) return null;
    return voltageToPercent(voltage, options.batteryType || DEFAULT_BATTERY, options.temperature);
  }

  // STATE DPs (3, 14)
  if (TUYA_STATE_DPS.includes(dpId)) {
    if (raw === 0) return 10;  // low
    if (raw === 1) return 50;  // medium
    if (raw === 2) return 100; // high
    if (raw === 3) return 5;   // critical (extended)
    if (raw >= 4 && raw <= 100) return Math.round(raw);
    return null;
  }

  // FAULT DPs (12, 13) â€” return null, these are fault indicators not battery
  if (TUYA_FAULT_DPS.includes(dpId)) return null;

  // PERCENT DPs
  if (TUYA_PERCENT_DPS.includes(dpId)) {
    // Reject low values from extended DPs (often state, not percent)
    if (raw <= 2 && ![4, 15, 101].includes(dpId)) return null;
    return normalizeZigbeeValue(raw, options);
  }

  return null;
}

function lookupProfile(manufacturer, productId) {
  if (manufacturer && MANUFACTURER_PROFILES[manufacturer]) {
    return { source: 'manufacturer', ...MANUFACTURER_PROFILES[manufacturer] };
  }
  if (productId) {
    const pid = String(productId).toUpperCase();
    for (const [pattern, profile] of Object.entries(PRODUCT_ID_DEFAULTS)) {
      if (pid.startsWith(pattern)) {
        return { source: 'productId', ...profile };
      }
    }
  }
  return null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SECTION 5: BatteryMasterEngine CLASS
// SUPERSET of:
//   - BatteryCascadeEngine (P33)
//   - UniversalBatteryFallback (P28)
//   - UnifiedBatteryHandler (v8.5.0)
//   - BatteryManager (v5.8.67)
//   - BatteryHelper
//
// All 7 cascade methods (P33) + ALL historical fixes (P1-P33) + new 8th method
// (8. LowLevelBridge integration)
//
// THIS IS NOT A REPLACEMENT â€” it ADDS to existing code.
// Existing BatteryCascadeEngine, UniversalBatteryFallback, UnifiedBatteryHandler
// continue to work. BatteryMasterEngine is the new "ultimate" option.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

class BatteryMasterEngine {
  constructor(device, options = {}) {
    this.device = device;
    this.zclNode = device?.zclNode;
    this.options = {
      // Default options â€” can be overridden per device
      smoothing: true,
      smoothingFactor: 0.3,
      maxJump: 5,
      antiFlood: true,
      minInterval: 60000,        // 1 minute (v5.8.70 ANTI-FLOOD)
      minChangeThreshold: 2,
      maxChangeRejection: 50,    // reject >50% jumps (v9.0.85 53550844c)
      maxChangeWindow: 86400000,  // 24h
      batteryReplacementJump: 20,// >20% = replacement
      persistToStore: true,
      enableHealth: true,
      enableVoltageCompensation: true,
      enableSanityFilter: true,  // v9.0.79 (fe5741510)
      defaultTemperature: 20,
      enableLowLevelBridge: true, // P34 integration
      // v9.0.85: anti-battery-halving (don't divide by 2 if already in 0-100)
      antiBatteryHalving: true,
      // v5.5.988: throttle min change (5%)
      throttleMinChange: 5,
      // v5.11.3: throttle 5min for ZCL reports
      zclThrottleMs: 300000,
      ...options,
    };

    // State
    this.lastValue = null;
    this.lastVoltage = null;
    this.lastUpdate = 0;
    this.lastSource = null;
    this._smoothedValue = null;
    this._initialized = false;
    this._destroyed = false;

    // v9.0.79: SanityFilter state (fe5741510)
    this._history = [];
    this._maxHistorySize = 30;

    // Health state
    this.health = {
      drainRate: null,
      estimatedDays: null,
      history: [],
      lastReport: null,
    };

    // Profile cache
    this._profile = null;
    this._batteryType = null;
    this._temperature = this.options.defaultTemperature;

    // Source tracking
    this._sources = {
      stored: 0,
      profile: 0,
      tuya: 0,
      zcl: 0,
      voltage: 0,
      state: 0,
      ias: 0,
      lowLevel: 0,
    };

    // Try to load LowLevelBridge (P34) for raw access
    this._LowLevelBridge = null;
    try {
      const { LowLevelBridge } = require('./LowLevelBridge');
      this._LowLevelBridge = LowLevelBridge;
    } catch (e) { /* not available, OK */ }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // 8-METHOD CASCADE (was 7 in P33, now + LowLevelBridge)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async readBattery() {
    if (this._destroyed) return null;

    // METHOD 1: STORED VALUE (P19.1 50847cd15 â€” cold-boot restore)
    let result = this._tryStored();
    if (result) {
      this._sources.stored++;
      return { ...result, method: 1, sourceLabel: 'stored' };
    }

    // METHOD 2: PROFILE LOOKUP (mfr â†’ battery type)
    result = this._tryProfile();
    if (result) {
      this._sources.profile++;
      return { ...result, method: 2, sourceLabel: 'profile' };
    }

    // METHOD 3: TUYA DP
    if (this.device.tuyaEF00Manager) {
      result = this._tryTuyaDP();
      if (result) {
        this._sources.tuya++;
        return { ...result, method: 3, sourceLabel: 'tuya' };
      }
    }

    // METHOD 4: ZCL PERCENT
    result = await this._tryZclPercent();
    if (result) {
      this._sources.zcl++;
      return { ...result, method: 4, sourceLabel: 'zcl' };
    }

    // METHOD 5: ZCL VOLTAGE
    result = await this._tryZclVoltage();
    if (result) {
      this._sources.voltage++;
      return { ...result, method: 5, sourceLabel: 'voltage' };
    }

    // METHOD 6: IAS ZONE
    result = this._tryIasZone();
    if (result) {
      this._sources.ias++;
      return { ...result, method: 6, sourceLabel: 'ias' };
    }

    // METHOD 7: VOLTAGE FALLBACK (raw value)
    result = await this._tryVoltageFallback();
    if (result) {
      this._sources.voltage++;
      return { ...result, method: 7, sourceLabel: 'voltage-fallback' };
    }

    // METHOD 8: LOW-LEVEL BRIDGE (P34 â€” bypass all wrappers)
    if (this.options.enableLowLevelBridge && this._LowLevelBridge) {
      result = await this._tryLowLevelBridge();
      if (result) {
        this._sources.lowLevel++;
        return { ...result, method: 8, sourceLabel: 'lowlevel-bridge' };
      }
    }

    return null;
  }

  _tryStored() {
    if (!this.device.getStoreValue) return null;
    const stored = this.device.getStoreValue('last_battery_percentage');
    if (!Number.isFinite(stored)) return null;
    return { value: Number(stored), source: 'stored', estimated: true };
  }

  _tryProfile() {
    if (!this._profile) {
      const settings = this.device.getSettings?.() || {};
      const mfr = settings.zb_manufacturer_name || '';
      const pid = settings.zb_model_id || '';
      this._profile = lookupProfile(mfr, pid);
      if (this._profile) {
        this._batteryType = this._profile.chemistry || DEFAULT_BATTERY;
        this.device.log?.(`[BAT-MASTER] Profile: mfr=${mfr} pid=${pid} â†’ ${this._batteryType}`);
      }
    }
    if (!this._profile || this._profile.source === 'none') return null;
    return null;  // Profile just gives type, value from another method
  }

  _tryTuyaDP() {
    try {
      const mgr = this.device.tuyaEF00Manager;
      if (!mgr) return null;
      for (const dp of [4, 15, 101, 14, 3, 33, 35, 247]) {
        try {
          let value = null;
          if (typeof mgr.getDP === 'function') value = mgr.getDP(dp);
          else if (typeof mgr.get === 'function') value = mgr.get(`dp-${dp}`);
          else if (mgr.cachedDPs) value = mgr.cachedDPs[dp];

          if (value !== null && value !== undefined) {
            const percent = tuyaDpToPercent(dp, value, {
              batteryType: this._batteryType || DEFAULT_BATTERY,
              temperature: this._temperature,
              lastValue: this.lastValue,
            });
            if (percent !== null) {
              return { value: percent, source: `tuya-dp-${dp}`, dp, rawValue: value };
            }
          }
        } catch (err) { /* try next */ }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  async _tryZclPercent() {
    try {
      if (!this.zclNode?.endpoints) return null;
      const settings = this.device.getSettings?.() || {};
      const mfr = settings.zb_manufacturer_name || '';

      for (const ep of Object.values(this.zclNode.endpoints)) {
        if (!ep || typeof ep !== 'object' || !ep.clusters) continue;
        const cluster = ep.clusters.powerConfiguration
          || ep.clusters.genPowerCfg
          || ep.clusters[0x0001]
          || ep.clusters[1];
        if (!cluster) continue;

        // v5.5.988: throttle ZCL reads (5min + 5% change)
        const now = Date.now();
        if (this._lastZclRead?.[`${ep.endpointId || 1}`]) {
          const elapsed = now - this._lastZclRead[ep.endpointId || 1];
          if (elapsed < this.options.zclThrottleMs) continue;
        }

        if (typeof cluster.readAttributes === 'function') {
          try {
            const attrs = await cluster.readAttributes(['batteryPercentageRemaining']).catch(() => ({}));
            if (attrs?.batteryPercentageRemaining !== undefined) {
              this._lastZclRead = this._lastZclRead || {};
              this._lastZclRead[ep.endpointId || 1] = now;
              const percent = normalizeZigbeeValue(attrs.batteryPercentageRemaining, {
                batteryType: this._batteryType || DEFAULT_BATTERY,
                manufacturer: mfr,
                treat200AsSentinel: this._profile?.zcl200IsPercent !== true,
                lastValue: this.lastValue,
                temperature: this._temperature,
              });
              if (percent !== null) {
                return { value: percent, source: 'zcl-percent', rawValue: attrs.batteryPercentageRemaining };
              }
            }
          } catch (err) { /* sleepy device */ }
        }

        if (cluster.batteryPercentageRemaining !== undefined) {
          const percent = normalizeZigbeeValue(cluster.batteryPercentageRemaining, {
            batteryType: this._batteryType || DEFAULT_BATTERY,
            manufacturer: mfr,
            treat200AsSentinel: this._profile?.zcl200IsPercent !== true,
            lastValue: this.lastValue,
          });
          if (percent !== null) {
            return { value: percent, source: 'zcl-direct', rawValue: cluster.batteryPercentageRemaining };
          }
        }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  async _tryZclVoltage() {
    try {
      if (!this.zclNode?.endpoints) return null;

      for (const ep of Object.values(this.zclNode.endpoints)) {
        if (!ep || typeof ep !== 'object' || !ep.clusters) continue;
        const cluster = ep.clusters.powerConfiguration
          || ep.clusters.genPowerCfg
          || ep.clusters[0x0001]
          || ep.clusters[1];
        if (!cluster) continue;

        if (typeof cluster.readAttributes === 'function') {
          try {
            const attrs = await cluster.readAttributes(['batteryVoltage']).catch(() => ({}));
            if (attrs?.batteryVoltage !== undefined) {
              const voltage = normalizeVoltage(attrs.batteryVoltage);
              if (voltage !== null) {
                this.lastVoltage = voltage;
                const percent = voltageToPercent(voltage, this._batteryType || DEFAULT_BATTERY, this._temperature);
                if (percent !== null) {
                  return { value: percent, source: 'zcl-voltage', voltage, rawValue: attrs.batteryVoltage };
                }
              }
            }
          } catch (err) { /* sleepy */ }
        }

        if (cluster.batteryVoltage !== undefined) {
          const voltage = normalizeVoltage(cluster.batteryVoltage);
          if (voltage !== null) {
            this.lastVoltage = voltage;
            const percent = voltageToPercent(voltage, this._batteryType || DEFAULT_BATTERY, this._temperature);
            if (percent !== null) {
              return { value: percent, source: 'zcl-direct-voltage', voltage, rawValue: cluster.batteryVoltage };
            }
          }
        }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  _tryIasZone() {
    try {
      if (!this.zclNode?.endpoints) return null;
      for (const ep of Object.values(this.zclNode.endpoints)) {
        if (!ep || typeof ep !== 'object' || !ep.clusters) continue;
        const cluster = ep.clusters.iasZone
          || ep.clusters.ssIasZone
          || ep.clusters[0x0500];
        if (!cluster) continue;
        if (typeof cluster.readAttributes === 'function') {
          const attrs = cluster.readAttributes(['zoneStatus']);
          if (attrs?.zoneStatus !== undefined) {
            const isLow = (Number(attrs.zoneStatus) & 0x08) !== 0;
            return { value: isLow ? 5 : 100, source: 'ias-zone', estimated: isLow };
          }
        }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  async _tryVoltageFallback() {
    try {
      if (!this.zclNode?.endpoints) return null;
      for (const ep of Object.values(this.zclNode.endpoints)) {
        if (!ep || typeof ep !== 'object' || !ep.clusters) continue;
        const cluster = ep.clusters.powerConfiguration;
        if (!cluster) continue;
        for (const attr of ['batteryVoltage', 'batteryQuantity', 'batteryRatedVoltage']) {
          if (cluster[attr] !== undefined) {
            const voltage = normalizeVoltage(cluster[attr]);
            if (voltage !== null && voltage > 0.5 && voltage < 15) {
              const percent = voltageToPercent(voltage, this._batteryType || DEFAULT_BATTERY, this._temperature);
              if (percent !== null) {
                return { value: percent, source: `voltage-fallback-${attr}`, voltage };
              }
            }
          }
        }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  async _tryLowLevelBridge() {
    try {
      if (!this._LowLevelBridge) return null;
      const bridge = new this._LowLevelBridge(this.device);
      const result = await bridge.readBatteryLowLevel();
      if (result && Number.isFinite(result.value)) {
        return { value: result.value, source: `lowlevel-${result.source}`, method: result.method };
      }
    } catch (e) { /* silent */ }
    return null;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // UPDATE â€” all historical fixes applied here
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  update(percent, meta = {}) {
    if (this._destroyed) return null;
    if (!Number.isFinite(percent)) return null;

    const value = Math.max(0, Math.min(100, Math.round(percent)));
    const now = Date.now();
    const previous = this.lastValue;

    // v9.0.79 SanityFilter (fe5741510) â€” replace large jumps
    if (this.options.enableSanityFilter) {
      this._history.push({ time: now, value, source: meta.source });
      if (this._history.length > this._maxHistorySize) this._history.shift();
    }

    // v5.8.70 ANTI-FLOOD
    if (this.options.antiFlood && this.lastValue !== null) {
      const elapsed = now - this.lastUpdate;
      const change = Math.abs(value - this.lastValue);

      if (value === this.lastValue) return this.lastValue;
      if (elapsed < this.options.minInterval && change < this.options.minChangeThreshold) return this.lastValue;

      // v9.0.85: ANTI-FLUCTUATION (>50% in <24h)
      if (elapsed < this.options.maxChangeWindow && change > this.options.maxChangeRejection && value > 0) {
        this.device.log?.(`[BAT-MASTER] âš ï¸ Rejected ${this.lastValue}â†’${value} (${change}% in ${Math.round(elapsed/1000)}s)`);
        // Trigger anomaly flow card
        try {
          const card = this.device.homey?.flow?.getDeviceTriggerCard?.('battery_anomaly_detected');
          if (card) {
            card.trigger(this.device, { previous_value: this.lastValue, current_value: value, change }).catch(() => {});
          }
        } catch { /* ignore */ }
        return this.lastValue;
      }
      this.lastUpdate = now;
    } else {
      this.lastUpdate = now;
    }

    // v5.8.69 PERSIST CHECK â€” anti-battery-halving (v9.0.85 53550844c)
    if (this.options.antiBatteryHalving && this._smoothedValue !== null) {
      // Don't allow battery to halve without reason
      if (value < this._smoothedValue / 2 && this._smoothedValue > 60) {
        this.device.log?.(`[BAT-MASTER] âš ï¸ Anti-halve: refused ${this._smoothedValue}â†’${value}`);
        return this._smoothedValue;
      }
    }

    // v9.0.85: EMA SMOOTHING (BatteryManager v5.8.67)
    let smoothed = value;
    if (this.options.smoothing && this._smoothedValue !== null) {
      if (value > this._smoothedValue + this.options.batteryReplacementJump) {
        this.device.log?.(`[BAT-MASTER] ðŸ”„ Replacement: ${this._smoothedValue}% â†’ ${value}%`);
        this._smoothedValue = value;
      } else {
        const candidate = this._smoothedValue + this.options.smoothingFactor * (value - this._smoothedValue);
        const rounded = Math.round(candidate);
        const maxJump = this.options.maxJump;
        if (Math.abs(rounded - this._smoothedValue) > maxJump) {
          this._smoothedValue = this._smoothedValue + Math.sign(rounded - this._smoothedValue) * maxJump;
        } else {
          this._smoothedValue = rounded;
        }
        smoothed = this._smoothedValue;
      }
    } else {
      this._smoothedValue = value;
    }

    this.lastValue = smoothed;
    this.lastSource = meta.source || 'unknown';

    // v5.8.69 Health monitoring
    this._updateHealth(smoothed);

    // Update capabilities
    if (this.device.hasCapability?.('measure_battery')) {
      this.device.setCapabilityValue('measure_battery', parseFloat(smoothed)).catch(err => {
        this.device.error?.(`[BAT-MASTER] setCapabilityValue failed: ${err.message}`);
      });
    }
    if (this.lastVoltage !== null && this.device.hasCapability?.('measure_voltage')) {
      this.device.setCapabilityValue('measure_voltage', parseFloat(this.lastVoltage)).catch(() => {});
    }

    // v5.8.69 PERSIST TO STORE
    if (this.options.persistToStore && this.device.setStoreValue) {
      try {
        this.device.setStoreValue('last_battery_percentage', smoothed);
        this.device.setStoreValue('last_battery_time', Date.now());
        this.device.setStoreValue('last_battery_source', this.lastSource);
        if (this.lastVoltage !== null) {
          this.device.setStoreValue('battery_voltage', this.lastVoltage);
        }
      } catch { /* ignore */ }
    }

    // Battery low flow card
    if (smoothed <= 20 && previous > 20) {
      try {
        const card = this.device.homey?.flow?.getDeviceTriggerCard?.('battery_low');
        if (card) card.trigger(this.device, { battery: smoothed }).catch(() => {});
      } catch { /* ignore */ }
    }

    this.device.log?.(`[BAT-MASTER] ${this.lastSource}: ${smoothed}% (raw: ${percent}%)`);

    return smoothed;
  }

  _updateHealth(percent) {
    const now = Date.now();
    this.health.history.push({ time: now, percentage: percent });
    if (this.health.history.length > 30) this.health.history.shift();
    if (this.health.history.length >= 2) {
      const oldest = this.health.history[0];
      const newest = this.health.history[this.health.history.length - 1];
      const daysDiff = (newest.time - oldest.time) / (1000 * 60 * 60 * 24);
      const percentDiff = oldest.percentage - newest.percentage;
      if (daysDiff > 0 && percentDiff > 0) {
        this.health.drainRate = percentDiff / daysDiff;
        this.health.estimatedDays = Math.round(percent / this.health.drainRate);
      }
    }
    this.health.lastReport = now;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PUBLIC API
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  feedZcl(value) {
    const percent = normalizeZigbeeValue(value, {
      batteryType: this._batteryType || DEFAULT_BATTERY,
      manufacturer: this.device.getSettings?.()?.zb_manufacturer_name || '',
      treat200AsSentinel: this._profile?.zcl200IsPercent !== true,
      lastValue: this.lastValue,
      temperature: this._temperature,
    });
    if (percent !== null) return this.update(percent, { source: 'zcl-feed' });
    return null;
  }

  feedTuyaDP(dp, value) {
    const percent = tuyaDpToPercent(dp, value, {
      batteryType: this._batteryType || DEFAULT_BATTERY,
      lastValue: this.lastValue,
      temperature: this._temperature,
    });
    if (percent !== null) return this.update(percent, { source: `tuya-dp-${dp}` });
    return null;
  }

  feedVoltage(volts) {
    const percent = voltageToPercent(volts, this._batteryType || DEFAULT_BATTERY, this._temperature);
    if (percent !== null) {
      this.lastVoltage = volts;
      return this.update(percent, { source: 'voltage-direct' });
    }
    return null;
  }

  feedState(state) {
    const map = { 0: 10, 1: 50, 2: 100, 3: 5 };
    const percent = map[state];
    if (percent !== undefined) return this.update(percent, { source: 'state-enum' });
    return null;
  }

  onEndDeviceAnnounce() {
    this.device.log?.('[BAT-MASTER] Device wake â€” re-reading battery');
    return this.readBattery().then(r => r ? this.update(r.value, { source: `wake-${r.sourceLabel}` }) : null);
  }

  async restoreFromStore() {
    if (!this.device.getStoreValue) return null;
    try {
      const stored = await Promise.resolve(this.device.getStoreValue('last_battery_percentage')).catch(() => null);
      if (Number.isFinite(Number(stored))) {
        const value = Number(stored);
        this.lastValue = value;
        this._smoothedValue = value;
        if (this.device.hasCapability?.('measure_battery')) {
          await this.device.setCapabilityValue('measure_battery', parseFloat(value)).catch(() => {});
        }
        this.device.log?.(`[BAT-MASTER] âœ… Restored from store: ${value}%`);
        return value;
      }
    } catch { /* ignore */ }
    return null;
  }

  getDiagnostics() {
    return {
      version: '1.0.0',
      lastValue: this.lastValue,
      lastVoltage: this.lastVoltage,
      lastSource: this.lastSource,
      batteryType: this._batteryType,
      profile: this._profile,
      health: this.health,
      history: this._history,
      sources: this._sources,
      options: this.options,
    };
  }

  destroy() {
    this._destroyed = true;
    this.lastValue = null;
    this.lastVoltage = null;
    this._smoothedValue = null;
    this._profile = null;
    this._history = [];
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXPORTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

module.exports = {
  BatteryMasterEngine,
  BATTERY_SPECS,
  MANUFACTURER_PROFILES,
  PRODUCT_ID_DEFAULTS,
  TUYA_PERCENT_DPS,
  TUYA_STATE_DPS,
  TUYA_VOLTAGE_DPS,
  TUYA_FAULT_DPS,
  TUYA_DP_KNOWN_QUIRKS,
  BATTERY_200_WHITELIST,
  TUE_50_SCALE_WHITELIST,
  ZCL_SENTINELS,
  DEFAULT_BATTERY,
  // Helpers
  coerceNumeric,
  normalizeVoltage,
  voltageToPercent,
  normalizeZigbeeValue,
  tuyaDpToPercent,
  lookupProfile,
  // Version
  version: '1.0.0',
  cascadeSteps: 8,
  chemProfiles: Object.keys(BATTERY_SPECS).length,
  manufacturerProfiles: Object.keys(MANUFACTURER_PROFILES).length,
  productIdDefaults: Object.keys(PRODUCT_ID_DEFAULTS).length,
  historicalVersionsIntegrated: [
    'v5.5.810', 'v5.5.814', 'v5.5.815', 'v5.5.886', 'v5.5.988',
    'v5.8.30', 'v5.8.43', 'v5.8.67', 'v5.8.68', 'v5.8.69', 'v5.8.70',
    'v5.8.76', 'v5.8.92', 'v5.8.99', 'v5.11.3', 'v5.11.13',
    'v8.1.0', 'v8.5.0', 'v8.5.1',
    'v9.0.79', 'v9.0.83', 'v9.0.85', 'v9.0.87', 'v9.0.89',
    'P14', 'P18', 'P19', 'P19.1', 'P21', 'P22', 'P23', 'P24.7', 'P24.8', 'P25',
    'P26', 'P26.4', 'P27.1', 'P28', 'P29', 'P30', 'P31', 'P32', 'P33', 'P34',
  ],
};



