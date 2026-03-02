'use strict';
/**
 * ZCL Cluster -> Homey Capability Mapping
 * Maps all standard ZCL clusters + Tuya clusters to Homey capabilities.
 * @version 1.0.0
 */

const CLUSTER_CAP_MAP = {
  // Foundation
  basic:              { id: 0x0000, caps: [], settings: ['zb_model_id','zb_manufacturer_name','zb_app_version','zb_hardware_version'] },
  powerConfiguration: { id: 0x0001, caps: ['measure_battery','alarm_battery'], attrs: { batteryPercentageRemaining: { cap:'measure_battery', fn: v=>Math.round(v/2) }, batteryVoltage: { cap:'measure_battery', fn: v=>Math.min(100,Math.round((v/10-2.1)/(3.2-2.1)*100)) } } },
  deviceTemperature:  { id: 0x0002, caps: ['measure_temperature'], attrs: { currentTemperature: { cap:'measure_temperature' } } },
  identify:           { id: 0x0003, caps: [] },
  groups:             { id: 0x0004, caps: [] },
  scenes:             { id: 0x0005, caps: [] },
  onOff:              { id: 0x0006, caps: ['onoff'], attrs: { onOff: { cap:'onoff', fn: v=>!!v } } },
  onOffSwitch:        { id: 0x0007, caps: ['onoff'] },
  levelControl:       { id: 0x0008, caps: ['dim'], attrs: { currentLevel: { cap:'dim', fn: v=>v/254 } } },
  alarms:             { id: 0x0009, caps: ['alarm_generic'] },
  time:               { id: 0x000A, caps: [] },
  analogInput:        { id: 0x000C, caps: ['measure_generic'], attrs: { presentValue: { cap:'measure_generic' } } },
  analogOutput:       { id: 0x000D, caps: [] },
  analogValue:        { id: 0x000E, caps: ['measure_generic'] },
  binaryInput:        { id: 0x000F, caps: ['alarm_contact'], attrs: { presentValue: { cap:'alarm_contact', fn: v=>!!v } } },
  binaryOutput:       { id: 0x0010, caps: ['onoff'] },
  binaryValue:        { id: 0x0011, caps: ['alarm_generic'] },
  multistateInput:    { id: 0x0012, caps: ['button'] },
  multistateOutput:   { id: 0x0013, caps: [] },
  multistateValue:    { id: 0x0014, caps: [] },

  // Closures
  shadeConfiguration: { id: 0x0100, caps: ['windowcoverings_state','dim'] },
  doorLock:           { id: 0x0101, caps: ['locked','alarm_tamper'], attrs: { lockState: { cap:'locked', fn: v=>v===1 } } },
  windowCovering:     { id: 0x0102, caps: ['windowcoverings_state','windowcoverings_set','windowcoverings_tilt_set'], attrs: { currentPositionLiftPercentage: { cap:'windowcoverings_set', fn: v=>1-(v/100) }, currentPositionTiltPercentage: { cap:'windowcoverings_tilt_set', fn: v=>1-(v/100) } } },

  // HVAC
  pumpConfigurationAndControl: { id: 0x0200, caps: ['onoff','measure_power'] },
  thermostat:         { id: 0x0201, caps: ['target_temperature','measure_temperature','thermostat_mode'], attrs: { localTemperature: { cap:'measure_temperature', fn: v=>v/100 }, occupiedHeatingSetpoint: { cap:'target_temperature', fn: v=>v/100 }, occupiedCoolingSetpoint: { cap:'target_temperature', fn: v=>v/100 }, systemMode: { cap:'thermostat_mode', fn: v=>({0:'off',1:'auto',3:'cool',4:'heat'})[v]||'auto' } } },
  fanControl:         { id: 0x0202, caps: ['fan_speed','onoff'], attrs: { fanMode: { cap:'fan_speed', fn: v=>({0:'off',1:'low',2:'medium',3:'high',4:'on',5:'auto',6:'smart'})[v]||'auto' } } },
  dehumidificationControl: { id: 0x0203, caps: ['measure_humidity','target_humidity'] },
  thermostatUi:       { id: 0x0204, caps: [] },

  // Lighting
  colorControl:       { id: 0x0300, caps: ['light_hue','light_saturation','light_temperature','light_mode'], attrs: { currentHue: { cap:'light_hue', fn: v=>v/254 }, currentSaturation: { cap:'light_saturation', fn: v=>v/254 }, colorTemperatureMireds: { cap:'light_temperature', fn: v=>1/(v||153) } } },
  ballastConfiguration: { id: 0x0301, caps: ['dim'] },

  // Measurement & Sensing
  illuminanceMeasurement: { id: 0x0400, caps: ['measure_luminance'], attrs: { measuredValue: { cap:'measure_luminance', fn: v=>Math.pow(10,(v-1)/10000) } } },
  illuminanceLevelSensing:{ id: 0x0401, caps: ['measure_luminance','alarm_generic'] },
  temperatureMeasurement: { id: 0x0402, caps: ['measure_temperature'], attrs: { measuredValue: { cap:'measure_temperature', fn: v=>v/100 } } },
  pressureMeasurement:    { id: 0x0403, caps: ['measure_pressure'], attrs: { measuredValue: { cap:'measure_pressure' } } },
  flowMeasurement:        { id: 0x0404, caps: ['measure_water'], attrs: { measuredValue: { cap:'measure_water', fn: v=>v/10 } } },
  relativeHumidity:       { id: 0x0405, caps: ['measure_humidity'], attrs: { measuredValue: { cap:'measure_humidity', fn: v=>v/100 } } },
  occupancySensing:       { id: 0x0406, caps: ['alarm_motion'], attrs: { occupancy: { cap:'alarm_motion', fn: v=>!!(v&1) } } },

  // Security & Safety (IAS)
  iasZone:  { id: 0x0500, caps: ['alarm_contact','alarm_motion','alarm_tamper','alarm_water','alarm_smoke','alarm_battery'], zoneTypeMap: { 0x000D:'alarm_motion', 0x0015:'alarm_contact', 0x0028:'alarm_smoke', 0x002A:'alarm_water', 0x002B:'alarm_co', 0x002D:'alarm_vibration' } },
  iasACE:   { id: 0x0501, caps: ['homealarm_state'] },
  iasWD:    { id: 0x0502, caps: ['onoff','alarm_generic'] },

  // Smart Energy
  metering: { id: 0x0702, caps: ['meter_power','measure_power'], attrs: { currentSummationDelivered: { cap:'meter_power', fn: v=>v/1000 }, instantaneousDemand: { cap:'measure_power' } } },
  electricalMeasurement: { id: 0x0B04, caps: ['measure_power','meter_power','measure_voltage','measure_current'], attrs: { activePower: { cap:'measure_power', fn: v=>v/10 }, rmsVoltage: { cap:'measure_voltage', fn: v=>v/10 }, rmsCurrent: { cap:'measure_current', fn: v=>v/1000 } } },

  // Diagnostics
  diagnostics: { id: 0x0B05, caps: [] },

  // Touchlink
  touchlink: { id: 0x1000, caps: [] },

  // OTA
  ota:         { id: 0x0019, caps: [] },
  pollControl: { id: 0x0020, caps: [] },

  // Tuya Proprietary
  tuyaEF00: { id: 0xEF00, caps: ['onoff','dim','windowcoverings_set','target_temperature','measure_temperature','measure_humidity','alarm_contact','alarm_motion','alarm_water','measure_battery','measure_co2','measure_pm25','measure_voc'] },

  // Manufacturer-specific
  zosungIRControl:    { id: 0xE004, caps: ['button'] },
  zosungIRTransmit:   { id: 0xE005, caps: [] },
  xiaomiSwitch:       { id: 0xFC00, caps: ['onoff','measure_power','meter_power'] },
  legrandCluster:     { id: 0xFC03, caps: ['onoff','dim'] },
  philipsEntertainment:{ id: 0xFC01, caps: ['onoff','dim','light_hue','light_saturation'] }
};

// =============================================================================
// Z2M EXPOSE TYPE → HOMEY CAPABILITY
// =============================================================================
const Z2M_EXPOSE_MAP = {
  // Binary
  state:           { cap: 'onoff', type: 'boolean' },
  occupancy:       { cap: 'alarm_motion', type: 'boolean' },
  contact:         { cap: 'alarm_contact', type: 'boolean', invert: true },
  water_leak:      { cap: 'alarm_water', type: 'boolean' },
  smoke:           { cap: 'alarm_smoke', type: 'boolean' },
  gas:             { cap: 'alarm_gas', type: 'boolean' },
  carbon_monoxide: { cap: 'alarm_co', type: 'boolean' },
  vibration:       { cap: 'alarm_vibration', type: 'boolean' },
  tamper:          { cap: 'alarm_tamper', type: 'boolean' },
  battery_low:     { cap: 'alarm_battery', type: 'boolean' },
  led_disabled_night: { cap: 'onoff', type: 'boolean' },
  child_lock:      { cap: 'child_lock', type: 'boolean' },
  valve_detection: { cap: 'alarm_generic', type: 'boolean' },
  window_detection:{ cap: 'alarm_contact', type: 'boolean' },

  // Numeric
  temperature:     { cap: 'measure_temperature', type: 'number', unit: '°C' },
  humidity:        { cap: 'measure_humidity', type: 'number', unit: '%' },
  pressure:        { cap: 'measure_pressure', type: 'number', unit: 'hPa' },
  illuminance:     { cap: 'measure_luminance', type: 'number', unit: 'lx' },
  illuminance_lux: { cap: 'measure_luminance', type: 'number', unit: 'lx' },
  co2:             { cap: 'measure_co2', type: 'number', unit: 'ppm' },
  pm25:            { cap: 'measure_pm25', type: 'number', unit: 'µg/m³' },
  pm10:            { cap: 'measure_pm25', type: 'number', unit: 'µg/m³' },
  voc:             { cap: 'measure_voc', type: 'number', unit: 'ppb' },
  formaldehyde:    { cap: 'measure_formaldehyde', type: 'number', unit: 'mg/m³' },
  soil_moisture:   { cap: 'measure_humidity', type: 'number', unit: '%' },
  battery:         { cap: 'measure_battery', type: 'number', unit: '%' },
  voltage:         { cap: 'measure_voltage', type: 'number', unit: 'V' },
  current:         { cap: 'measure_current', type: 'number', unit: 'A' },
  power:           { cap: 'measure_power', type: 'number', unit: 'W' },
  energy:          { cap: 'meter_power', type: 'number', unit: 'kWh' },
  brightness:      { cap: 'dim', type: 'number', min: 0, max: 1 },
  color_temp:      { cap: 'light_temperature', type: 'number' },
  position:        { cap: 'windowcoverings_set', type: 'number', min: 0, max: 1, convert: v=>v/100 },
  tilt:            { cap: 'windowcoverings_tilt_set', type: 'number', min: 0, max: 1, convert: v=>v/100 },
  local_temperature:       { cap: 'measure_temperature', type: 'number' },
  current_heating_setpoint:{ cap: 'target_temperature', type: 'number' },
  occupied_heating_setpoint:{ cap: 'target_temperature', type: 'number' },
  local_temperature_calibration: { cap: null, type: 'number', setting: 'temp_calibration' },
  away_preset_temperature: { cap: null, type: 'number', setting: 'away_temp' },

  // Enum
  system_mode:     { cap: 'thermostat_mode', type: 'enum', values: { off:'off', auto:'auto', cool:'cool', heat:'heat', emergency_heating:'heat', fan_only:'fan' } },
  preset:          { cap: 'thermostat_mode', type: 'enum' },
  fan_mode:        { cap: 'fan_speed', type: 'enum' },
  running_state:   { cap: null, type: 'enum' },
  effect:          { cap: 'light_mode', type: 'enum' },
  power_on_behavior: { cap: null, type: 'enum', setting: 'power_on_state' },
  backlight_mode:  { cap: null, type: 'enum', setting: 'backlight' },
  indicator_mode:  { cap: null, type: 'enum', setting: 'indicator_mode' },
  switch_type:     { cap: null, type: 'enum', setting: 'switch_type' },
  mode:            { cap: null, type: 'enum' },

  // Composite / Special
  color_hs:        { cap: ['light_hue','light_saturation'], type: 'composite' },
  color_xy:        { cap: ['light_hue','light_saturation'], type: 'composite' },
  color_temp_startup: { cap: null, type: 'number', setting: 'color_temp_startup' },
  action:          { cap: 'button', type: 'action' },
  linkquality:     { cap: null, type: 'number' }
};

// =============================================================================
// ZHA QUIRK CLUSTER → HOMEY CAPABILITY
// =============================================================================
const ZHA_CLUSTER_MAP = {
  'TuyaThermostatCluster':    ['target_temperature','measure_temperature','thermostat_mode'],
  'TuyaThermostat':           ['target_temperature','measure_temperature','thermostat_mode'],
  'TuyaNewManufCluster':      [],
  'TuyaLocalCluster':         [],
  'TuyaZBE000Cluster':        ['onoff'],
  'TuyaZBOnOffAttributeCluster': ['onoff'],
  'TuyaDimmerCluster':        ['onoff','dim'],
  'TuyaElectricalMeasurement':['measure_power','meter_power','measure_voltage','measure_current'],
  'TuyaSmartRemoteOnOffCluster': ['onoff','button'],
  'TuyaAirQualityCluster':    ['measure_co2','measure_pm25','measure_voc','measure_formaldehyde','measure_temperature','measure_humidity'],
  'TuyaMCUCluster':           [],
  'TuyaPowerConfigurationCluster': ['measure_battery','alarm_battery'],
  'TuyaOccupancySensing':     ['alarm_motion'],
  'TuyaIlluminanceMeasurement': ['measure_luminance'],
  'TuyaNoBindPowerConfigurationCluster': ['measure_battery']
};

// =============================================================================
// TUYA DP → HOMEY CAPABILITY (common patterns)
// =============================================================================
const TUYA_DP_CAP_MAP = {
  // Switches (DP 1-8 = gang states)
  1:  { caps: ['onoff'], type: 'bool', gangIndex: 1 },
  2:  { caps: ['onoff'], type: 'bool', gangIndex: 2 },
  3:  { caps: ['onoff'], type: 'bool', gangIndex: 3 },
  4:  { caps: ['onoff'], type: 'bool', gangIndex: 4 },
  5:  { caps: ['onoff'], type: 'bool', gangIndex: 5 },
  6:  { caps: ['onoff'], type: 'bool', gangIndex: 6 },
  // Common sensor DPs
  18: { caps: ['measure_temperature'], type: 'value', divisor: 10 },
  19: { caps: ['measure_humidity'], type: 'value', divisor: 10 },
  20: { caps: ['measure_pm25'], type: 'value', divisor: 1 },
  21: { caps: ['measure_voc'], type: 'value', divisor: 1 },
  22: { caps: ['measure_formaldehyde'], type: 'value', divisor: 100 },
  // Settings
  14: { caps: [], type: 'enum', setting: 'power_on_state' },
  15: { caps: [], type: 'enum', setting: 'backlight' },
  101:{ caps: [], type: 'bool', setting: 'child_lock' },
  // Curtain
  // 1: open/stop/close (enum), 2: position (value), 3: arrived (bool)
};

// =============================================================================
// DECONZ RESOURCE → HOMEY CAPABILITY
// =============================================================================
const DECONZ_TYPE_MAP = {
  'ZHATemperature':    ['measure_temperature'],
  'ZHAHumidity':       ['measure_humidity'],
  'ZHAPressure':       ['measure_pressure'],
  'ZHALightLevel':     ['measure_luminance'],
  'ZHAOpenClose':      ['alarm_contact'],
  'ZHAPresence':       ['alarm_motion'],
  'ZHAWater':          ['alarm_water'],
  'ZHAFire':           ['alarm_smoke'],
  'ZHAVibration':      ['alarm_vibration'],
  'ZHACarbonMonoxide': ['alarm_co'],
  'ZHAAirQuality':     ['measure_co2','measure_pm25','measure_voc'],
  'ZHAPower':          ['measure_power','meter_power'],
  'ZHAConsumption':    ['meter_power'],
  'ZHABattery':        ['measure_battery'],
  'ZHAThermostat':     ['target_temperature','measure_temperature','thermostat_mode'],
  'ZHASwitch':         ['button'],
  'Light':             ['onoff','dim','light_hue','light_saturation','light_temperature'],
  'On/Off plug-in unit':['onoff','measure_power','meter_power'],
  'Window covering device': ['windowcoverings_set','windowcoverings_state']
};

// =============================================================================
// HOMEY CAPABILITY METADATA (for driver.compose.json generation)
// =============================================================================
const HOMEY_CAPABILITY_META = {
  onoff:                   { title: 'On/Off', type: 'boolean', getable: true, setable: true, icon: '/assets/icons/onoff.svg' },
  dim:                     { title: 'Dim', type: 'number', min: 0, max: 1, step: 0.01, getable: true, setable: true },
  measure_temperature:     { title: 'Temperature', type: 'number', units: '°C', getable: true, setable: false },
  measure_humidity:        { title: 'Humidity', type: 'number', units: '%', getable: true, setable: false },
  measure_pressure:        { title: 'Pressure', type: 'number', units: 'hPa', getable: true, setable: false },
  measure_luminance:       { title: 'Luminance', type: 'number', units: 'lx', getable: true, setable: false },
  measure_battery:         { title: 'Battery', type: 'number', units: '%', min: 0, max: 100, getable: true, setable: false },
  measure_power:           { title: 'Power', type: 'number', units: 'W', getable: true, setable: false },
  measure_voltage:         { title: 'Voltage', type: 'number', units: 'V', getable: true, setable: false },
  measure_current:         { title: 'Current', type: 'number', units: 'A', getable: true, setable: false },
  meter_power:             { title: 'Energy', type: 'number', units: 'kWh', getable: true, setable: false },
  measure_co2:             { title: 'CO₂', type: 'number', units: 'ppm', getable: true, setable: false },
  measure_pm25:            { title: 'PM2.5', type: 'number', units: 'µg/m³', getable: true, setable: false },
  measure_voc:             { title: 'VOC', type: 'number', units: 'ppb', getable: true, setable: false },
  measure_formaldehyde:    { title: 'Formaldehyde', type: 'number', units: 'mg/m³', getable: true, setable: false },
  measure_water:           { title: 'Water Flow', type: 'number', units: 'l/min', getable: true, setable: false },
  target_temperature:      { title: 'Target Temp', type: 'number', units: '°C', min: 5, max: 35, step: 0.5, getable: true, setable: true },
  thermostat_mode:         { title: 'Mode', type: 'enum', values: [{id:'off',title:'Off'},{id:'auto',title:'Auto'},{id:'heat',title:'Heat'},{id:'cool',title:'Cool'}], getable: true, setable: true },
  alarm_motion:            { title: 'Motion', type: 'boolean', getable: true, setable: false },
  alarm_contact:           { title: 'Contact', type: 'boolean', getable: true, setable: false },
  alarm_water:             { title: 'Water', type: 'boolean', getable: true, setable: false },
  alarm_smoke:             { title: 'Smoke', type: 'boolean', getable: true, setable: false },
  alarm_co:                { title: 'CO', type: 'boolean', getable: true, setable: false },
  alarm_gas:               { title: 'Gas', type: 'boolean', getable: true, setable: false },
  alarm_vibration:         { title: 'Vibration', type: 'boolean', getable: true, setable: false },
  alarm_tamper:            { title: 'Tamper', type: 'boolean', getable: true, setable: false },
  alarm_battery:           { title: 'Battery Low', type: 'boolean', getable: true, setable: false },
  alarm_generic:           { title: 'Alarm', type: 'boolean', getable: true, setable: false },
  locked:                  { title: 'Locked', type: 'boolean', getable: true, setable: true },
  windowcoverings_state:   { title: 'State', type: 'enum', values: [{id:'up'},{id:'idle'},{id:'down'}], getable: true, setable: true },
  windowcoverings_set:     { title: 'Position', type: 'number', min: 0, max: 1, step: 0.01, getable: true, setable: true },
  windowcoverings_tilt_set:{ title: 'Tilt', type: 'number', min: 0, max: 1, step: 0.01, getable: true, setable: true },
  light_hue:               { title: 'Hue', type: 'number', min: 0, max: 1, step: 0.01, getable: true, setable: true },
  light_saturation:        { title: 'Saturation', type: 'number', min: 0, max: 1, step: 0.01, getable: true, setable: true },
  light_temperature:       { title: 'Color Temp', type: 'number', min: 0, max: 1, step: 0.01, getable: true, setable: true },
  light_mode:              { title: 'Light Mode', type: 'enum', values: [{id:'color'},{id:'temperature'}], getable: true, setable: true },
  fan_speed:               { title: 'Fan Speed', type: 'enum', values: [{id:'low'},{id:'medium'},{id:'high'},{id:'auto'}], getable: true, setable: true },
  homealarm_state:         { title: 'Alarm State', type: 'enum', values: [{id:'armed'},{id:'disarmed'},{id:'partially_armed'}], getable: true, setable: true },
  button:                  { title: 'Button', type: 'boolean', getable: true, setable: false }
};

// =============================================================================
// DRIVER TYPE CLASSIFICATION
// =============================================================================
function classifyDeviceType(caps) {
  if (!caps || !caps.length) return 'other';
  const c = new Set(caps);
  if (c.has('light_hue') || c.has('light_saturation') || c.has('light_temperature')) return 'light';
  if (c.has('target_temperature') || c.has('thermostat_mode')) return 'thermostat';
  if (c.has('windowcoverings_set') || c.has('windowcoverings_state')) return 'cover';
  if (c.has('locked')) return 'lock';
  if (c.has('fan_speed')) return 'fan';
  if (c.has('homealarm_state') || c.has('alarm_smoke') || c.has('alarm_co')) return 'alarm';
  if (c.has('alarm_motion') || c.has('alarm_contact') || c.has('alarm_water') || c.has('alarm_vibration')) return 'sensor';
  if (c.has('measure_temperature') || c.has('measure_humidity') || c.has('measure_co2') || c.has('measure_pm25')) return 'sensor';
  if (c.has('measure_power') || c.has('meter_power') || c.has('measure_voltage')) return 'energy';
  if (c.has('dim')) return 'dimmer';
  if (c.has('onoff')) return 'switch';
  return 'other';
}

// =============================================================================
// CLUSTER → CAPABILITIES RESOLVER
// =============================================================================
function resolveCapabilities(clusterIds) {
  const caps = new Set();
  for (const id of clusterIds) {
    const entry = Object.values(CLUSTER_CAP_MAP).find(e => e.id === id);
    if (entry && entry.caps) entry.caps.forEach(c => caps.add(c));
  }
  return [...caps];
}

function resolveFromZ2MExposes(exposes) {
  const caps = new Set();
  const settings = [];
  for (const expose of (exposes || [])) {
    const name = expose.property || expose.name || expose;
    const mapped = Z2M_EXPOSE_MAP[name];
    if (!mapped) continue;
    if (mapped.cap) {
      if (Array.isArray(mapped.cap)) mapped.cap.forEach(c => caps.add(c));
      else caps.add(mapped.cap);
    }
    if (mapped.setting) settings.push({ key: mapped.setting, expose: name });
  }
  return { capabilities: [...caps], settings };
}

function resolveFromZHAQuirks(quirkClasses) {
  const caps = new Set();
  for (const cls of (quirkClasses || [])) {
    const mapped = ZHA_CLUSTER_MAP[cls];
    if (mapped) mapped.forEach(c => caps.add(c));
  }
  return [...caps];
}

function resolveFromDeCONZ(resourceType) {
  return DECONZ_TYPE_MAP[resourceType] || [];
}

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  CLUSTER_CAP_MAP,
  Z2M_EXPOSE_MAP,
  ZHA_CLUSTER_MAP,
  TUYA_DP_CAP_MAP,
  DECONZ_TYPE_MAP,
  HOMEY_CAPABILITY_META,
  classifyDeviceType,
  resolveCapabilities,
  resolveFromZ2MExposes,
  resolveFromZHAQuirks,
  resolveFromDeCONZ
};
