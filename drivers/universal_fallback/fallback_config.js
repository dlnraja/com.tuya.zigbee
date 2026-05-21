'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          FALLBACK CONFIG - CLUSTER MAP v8.1.1 ENRICHED                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Maps ZCL cluster IDs to Homey capabilities for universal fallback         ║
 * ║  Covers all standard Zigbee clusters + Tuya-specific + manufacturer ext     ║
 * ║                                                                             ║
 * ║  Usage: UniversalFallbackDevice._detectCapabilities() iterates zclNode      ║
 * ║  endpoints → matches clusterId → adds capability strings to device.         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * CLUSTER_MAP
 * Key: Decimal cluster ID (ZCL spec)
 * Value: Array of capability strings to add if cluster is detected
 *
 * Coverage: 40+ clusters including all standard ZCL, Tuya, and manufacturer extensions
 */
const CLUSTER_MAP = {
  // ── Foundation (ZCL Core) ──────────────────────────────────────────
  0:    [],                    // Basic (0x0000) - skip, metadata only
  1:    ['measure_battery'],   // genPowerCfg (0x0001) - battery percentage
  2:    [],                    // genDeviceTemperatureCfg (0x0002) - skip
  3:    [],                    // Identify (0x0003) - skip, standard
  4:    [],                    // Groups (0x0004) - skip, groups
  5:    [],                    // Scenes (0x0005) - skip, scenes
  6:    ['onoff'],             // OnOff (0x0006)
  7:    ['onoff'],             // OnOff Configuration (0x0007)
  8:    ['dim'],               // LevelControl (0x0008) - dimmable
  9:    [],                    // Alarms (0x0009) - skip
  10:   [],                    // Time (0x000A) - skip
  11:   [],                    // RSSI Location (0x000B) - skip
  12:   [],                    // Analog Input (0x000C) - skip
  13:   [],                    // Analog Output (0x000D) - skip
  14:   [],                    // Analog Value (0x000E) - skip
  15:   [],                    // Binary Input (0x000F) - skip
  16:   [],                    // Binary Output (0x0010) - skip
  17:   [],                    // Binary Value (0x0011) - skip
  18:   [],                    // Multistate Input (0x0012) - skip
  19:   [],                    // Multistate Output (0x0013) - skip
  20:   [],                    // Multistate Value (0x0014) - skip
  21:   [],                    // Commissioning (0x0015) - skip

  // ── Security & IAS ─────────────────────────────────────────────────
  1280: ['alarm_contact'],     // IAS Zone (0x0500) - contact/motion
  1281: ['alarm_contact'],     // IAS ACE (0x0501)
  1282: ['alarm_contact'],     // IAS WD (0x0502)

  // ── Measurement & Sensing ──────────────────────────────────────────
  1024: ['measure_luminance'],           // IlluminanceMeasurement (0x0400)
  1025: ['measure_luminance'],           // IlluminanceLevelSensing (0x0401)
  1026: ['measure_temperature'],         // TemperatureMeasurement (0x0402)
  1027: ['measure_temperature'],         // TemperatureConfiguration (0x0403)
  1029: ['measure_humidity'],            // RelativeHumidityMeasurement (0x0405)
  1030: ['measure_humidity'],            // RelativeHumidityConfiguration (0x0406)
  1031: ['measure_barometer'],           // PressureMeasurement (0x0407) — some devices use this
  1033: ['alarm_water'],                 // FlowMeasurement (0x0409) — rain/water sensor
  1036: ['measure_soil_moisture'],       // SoilMoisture (0x040C)
  1043: ['measure_co2'],                 // CO2Measurement (0x0413)
  1046: ['measure_pm25'],               // PM25Measurement (0x0416)
  1062: ['measure_tvoc'],               // VOCMeasurement (0x0426) — sometimes 0xFC02

  // ── HVAC ───────────────────────────────────────────────────────────
  513:  ['target_temperature'],          // Thermostat (0x0201)
  514:  ['thermostat_mode'],             // FanControl (0x0202)
  516:  ['thermostat_heating_setpoint'], // Thermostat UI config (0x0204)

  // ── Lighting ───────────────────────────────────────────────────────
  256:  ['onoff'],                       // BallastConfiguration (0x0100)
  768:  ['light_hue', 'light_saturation'],  // ColorControl (0x0300)
  769:  ['light_temperature'],           // ColorConfiguration (0x0301)

  // ── Closures ───────────────────────────────────────────────────────
  258:  ['windowcoverings_set'],         // WindowCovering (0x0102)
  259:  ['windowcoverings_set'],         // WindowCovering (0x0103)

  // ── Smart Energy / Metering ────────────────────────────────────────
  1794: ['measure_power', 'meter_power'],  // Metering (0x0702)
  1795: ['measure_power'],               // MeteringExt (0x0703)
  2820: ['measure_power', 'measure_voltage', 'measure_current'],  // ElectricalMeasurement (0x0B04)
  2821: ['measure_power'],               // Diagnostic (0x0B05) — some have power factor

  // ── Tuya Specific ──────────────────────────────────────────────────
  61184: ['tuya_dp_value', 'tuya_data_report'],  // Tuya DP Cluster (0xEF00)
  57344: ['button'],                      // Tuya Button Events (0xE000) — scene switches
  57345: ['tuya_dp_value'],              // Tuya Settings (0xE001)
  57346: ['tuya_dp_value'],              // Tuya Ext (0xE002)
  57347: ['tuya_dp_raw'],                // Tuya Raw Data (0xE003)

  // ── Manufacturer Specific Clusters ─────────────────────────────────
  64512: ['tuya_data_report'],           // 0xFC00 — various manufacturers (Xiaomi, etc.)
  64513: ['tuya_dp_value'],              // 0xFC01 — FineDust/PM2.5 on some devices
  64514: ['measure_tvoc'],               // 0xFC02 — VOC measurement
  64515: ['measure_co2'],                // 0xFC03 — CO2 measurement
  64516: ['measure_formaldehyde'],       // 0xFC04 — Formaldehyde/HCHO
  64517: ['alarm_smoke'],                // 0xFC05 — Smoke alarm
  64518: ['alarm_co'],                   // 0xFC06 — CO alarm
  64519: ['measure_pm25'],               // 0xFC07 — PM2.5 alternative
  64520: ['measure_soil_moisture'],      // 0xFC08 — Soil moisture
  64521: ['measure_humidity'],           // 0xFC09 — Extra humidity
  64522: ['measure_temperature'],        // 0xFC0A — Extra temperature
  64523: ['measure_battery'],            // 0xFC0B — Extra battery
  64524: ['measure_luminance'],          // 0xFC0C — Extra luminance
  64525: ['alarm_contact'],              // 0xFC0D — Contact sensor alternative
  64526: ['alarm_motion'],               // 0xFC0E — Motion sensor alternative
  64527: ['alarm_water'],                // 0xFC0F — Water leak
  64660: ['measure_power'],              // 0xFC94 — Custom energy (power clamp meters)
  64768: ['measure_temperature'],        // 0xFD00 — Philips/Z3 specific
  64800: ['alarm_contact'],              // 0xFD20 — Custom IAS
  65280: ['onoff'],                      // 0xFF00 — Custom on/off
  65535: [],                             // 0xFFFF — Wildcard, skip

  // ── Occupancy Detection ────────────────────────────────────────────
  1030: ['alarm_motion'],                // OccupancySensing (0x0406) — motion
  1032: ['alarm_motion'],                // OccupancySensingExt (0x0408)

  // ── Electrical / Switch Types ──────────────────────────────────────
  17:   ['onoff'],                        // MultistateInput (0x0011) — sometimes switch endpoint
};

/**
 * ATTRIBUTE_MAP
 * Maps specific ZCL attribute IDs to more precise capabilities
 * Used when cluster-level mapping is too coarse
 */
const ATTRIBUTE_MAP = {
  // IAS Zone (0x0500) attributes
  '1280/0x0000': { capability: 'alarm_contact', parser: (v) => v !== 0 },
  '1280/0x0001': { capability: 'alarm_motion', parser: (v) => (v & 0x01) !== 0 },
  '1280/0x0002': { capability: 'alarm_battery', parser: (v) => (v & 0x08) !== 0 },

  // genPowerCfg (0x0001) attributes
  '1/0x0021': { capability: 'measure_battery', parser: (v) => Math.round(v / 2) },
  '1/0x0020': { capability: 'measure_voltage', parser: (v) => v / 100 },

  // ElectricalMeasurement (0x0B04) attributes
  '2820/0x050B': { capability: 'measure_power', parser: (v) => v / 10 },
  '2820/0x0505': { capability: 'measure_voltage', parser: (v) => v / 10 },
  '2820/0x0508': { capability: 'measure_current', parser: (v) => v / 1000 },
  '2820/0x0000': { capability: 'meter_power', parser: (v) => v / 100 },

  // Metering (0x0702) attributes
  '1794/0x0000': { capability: 'meter_power', parser: (v) => v },
  '1794/0x0301': { capability: 'measure_power', parser: (v) => v },

  // Thermostat (0x0201) attributes
  '513/0x0000': { capability: 'measure_temperature', parser: (v) => v / 100 },
  '513/0x0012': { capability: 'target_temperature', parser: (v) => v / 100 },
  '513/0x001C': { capability: 'thermostat_mode', parser: (v) => v },
  '513/0x001E': { capability: 'thermostat_heating_setpoint', parser: (v) => v / 100 },

  // TemperatureMeasurement (0x0402)
  '1026/0x0000': { capability: 'measure_temperature', parser: (v) => v / 100 },

  // HumidityMeasurement (0x0405)
  '1029/0x0000': { capability: 'measure_humidity', parser: (v) => v / 100 },

  // Illuminance (0x0400)
  '1024/0x0000': { capability: 'measure_luminance', parser: (v) => v },

  // OccupancySensing (0x0406)
  '1030/0x0000': { capability: 'alarm_motion', parser: (v) => v === 1 },
  '1032/0x0000': { capability: 'alarm_motion', parser: (v) => v === 1 },
};

/**
 * VALUE_RANGES
 * Validation ranges for common capabilities
 * Used by ProductValueValidator to filter spurious sensor readings
 */
const VALUE_RANGES = {
  measure_temperature:     { min: -40,   max: 100 },
  measure_humidity:        { min: 0,     max: 100 },
  measure_battery:         { min: 0,     max: 100 },
  measure_power:           { min: 0,     max: 10000 },
  measure_voltage:         { min: 0,     max: 300 },
  measure_current:         { min: 0,     max: 100 },
  meter_power:             { min: 0,     max: 9999999 },
  measure_luminance:       { min: 0,     max: 100000 },
  measure_co2:             { min: 0,     max: 5000 },
  measure_pm25:            { min: 0,     max: 1000 },
  measure_tvoc:            { min: 0,     max: 60000 },
  measure_formaldehyde:    { min: 0,     max: 10 },
  measure_barometer:       { min: 300,   max: 1100 },
  measure_soil_moisture:   { min: 0,     max: 100 },
  dim:                     { min: 0,     max: 1 },
  windowcoverings_set:     { min: 0,     max: 1 },
  target_temperature:      { min: 0,     max: 40 },
  light_temperature:        { min: 0,     max: 1 },
  light_hue:               { min: 0,     max: 1 },
  light_saturation:        { min: 0,     max: 1 },
};

module.exports = {
  CLUSTER_MAP,
  ATTRIBUTE_MAP,
  VALUE_RANGES,
};
