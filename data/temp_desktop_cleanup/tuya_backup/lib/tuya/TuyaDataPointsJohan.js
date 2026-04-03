'use strict';

/**
 * TuyaDataPointsJohan.js - Versioned DP Definitions from Johan Bendz
 * 
 * Source: https://github.com/JohanBendz/com.tuya.zigbee/blob/master/lib/TuyaDataPoints.js
 * 
 * This file provides comprehensive, versioned data point definitions for various
 * Tuya device types. These definitions complement TuyaDataPointsComplete.js and
 * provide device-specific DP mappings with clear documentation.
 * 
 * Usage in drivers:
 *   const { V1_THERMOSTAT_DATA_POINTS } = require('../../lib/tuya/TuyaDataPointsJohan');
 *   const dpOnOff = V1_THERMOSTAT_DATA_POINTS.onOff; // Returns 1
 * 
 * v5.5.760: Enrichment from Johan Bendz's implementation
 */

// ============================================================================
// THERMOSTAT DATA POINTS
// ============================================================================

/**
 * V1 Thermostat Data Points
 * Used by: TS0601 thermostats, TRVs
 */
const V1_THERMOSTAT_DATA_POINTS = {
  onOff: 1,                        // boolean | 0: off, 1: on
  mode: 2,                         // enum | 0: manual, 1: auto, 2: holiday
  openWindow: 8,                   // boolean | 0: off, 1: on
  frostProtection: 10,             // boolean | 0: off, 1: on
  targetTemperature: 16,           // integer | 5-30°C (steps of 0.5°C)
  holidayTemperature: 21,          // integer | 5-30°C (steps of 0.5°C)
  currentTemperature: 24,          // integer | 5-30°C (steps of 0.1°C)
  localTemperatureCalibration: 27, // integer | -9 to +9°C (steps of 0.1°C)
  batteryLevel: 35,                // integer | 0-100 (percentage)
  childLock: 40,                   // boolean
  openWindowTemperature: 102,      // integer | 5-30°C (steps of 0.5°C)
  comfortTemperature: 104,         // integer | 5-30°C (steps of 0.5°C)
  ecoTemperature: 105,             // integer | 5-30°C (steps of 0.5°C)
  schedule: 106,                   // raw | schedule string in 10-minute intervals
  scheduleMonday: 108,             // raw | schedule string for Monday
  scheduleWednesday: 109,          // raw | schedule string for Wednesday
  scheduleFriday: 110,             // raw | schedule string for Friday
  scheduleSunday: 111,             // raw | schedule string for Sunday
  scheduleTuesday: 112,            // raw | schedule string for Tuesday
  scheduleThursday: 113,           // raw | schedule string for Thursday
  scheduleSaturday: 114,           // raw | schedule string for Saturday
  workingDay: 31                   // enum | 0: Mon-Sun, 1: Mon-Fri/Sat+Sun, 2: Separate
};

/**
 * V1 Thermostatic Radiator Valve Data Points
 * Used by: Basic TRVs with simple controls
 */
const V1_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS = {
  onOff: 101,                      // boolean | 0: off, 1: on
  targetTemperature: 103           // integer | °C * 10
};

/**
 * V2 Thermostatic Radiator Valve Data Points
 * Used by: Advanced TRVs (MOES, Saswell, etc.)
 */
const V2_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS = {
  onOff: 1,                        // boolean | 0: off, 1: on
  mode: 2,                         // enum | 0: manual, 1: auto, 2: holiday
  targetTemperature: 3,            // integer | °C * 10 (e.g., 250 = 25.0°C)
  currentTemperature: 4,           // integer | °C * 10 (e.g., 220 = 22.0°C)
  openWindow: 7,                   // boolean | 0: off, 1: on
  frostProtection: 10,             // boolean | 0: off, 1: on
  batteryLevel: 13,                // integer | 0-100 (percentage)
  childLock: 14,                   // boolean | 0: unlocked, 1: locked
  valvePosition: 15,               // integer | Valve position in percentage 0-100
  runningState: 16,                // enum | 0: idle, 1: heating
  comfortTemperature: 102,         // integer | °C * 10 (e.g., 220 = 22.0°C)
  ecoTemperature: 103,             // integer | °C * 10 (e.g., 180 = 18.0°C)
  holidayTemperature: 105,         // integer | °C * 10 (e.g., 150 = 15.0°C)
  openWindowTemperature: 106,      // integer | °C * 10
  presetMode: 107,                 // enum | 0: schedule, 1: manual, 2: boost, 3: comfort, 4: eco, 5: away
  boostTime: 108,                  // integer | Boost time in minutes
  autoLock: 109,                   // boolean | 0: disabled, 1: enabled
  maxTemperature: 110,             // integer | °C * 10
  minTemperature: 111,             // integer | °C * 10
  workdaysSchedule: 112,           // string | Schedule for workdays
  holidaysSchedule: 113            // string | Schedule for holidays
};

// ============================================================================
// CURTAIN MOTOR DATA POINTS
// ============================================================================

/**
 * V1 Curtain Motor Data Points
 * Used by: Basic curtain motors
 */
const V1_CURTAIN_MOTOR_DATA_POINTS = {
  position: 2,                     // integer | 0-100 (0: closed, 100: open)
  arrived: 3,                      // boolean | 0: false, 1: true (motor arrived at position)
  motorReverse: 4                  // boolean | 0: forward, 1: reverse
};

/**
 * V2 Curtain Motor Data Points
 * Used by: Advanced curtain motors with tilt (AM25, etc.)
 */
const V2_CURTAIN_MOTOR_DATA_POINTS = {
  state: 1,                        // enum | 0: OPEN, 1: STOP, 2: CLOSE
  position1: 2,                    // integer | Inverted position %, 0: open, 100: closed
  position2: 3,                    // integer | Inverted position %, 0: open, 100: closed
  openingMode: 4,                  // enum | 0: tilt, 1: lift
  workState: 7,                    // enum | 0: standby, 1: success, 2: learning
  battery: 13,                     // raw | Battery status
  motorDirection: 101,             // enum | 0: normal, 1: reversed
  setUpperLimit: 102,              // enum | 0: stop, 1: start
  motorSpeed: 105,                 // raw | Motor speed
  factoryReset: 107                // setLimit | Factory reset
};

/**
 * V1 Automated Curtain Data Points
 * Used by: Dual-motor automated curtains
 */
const V1_AUTOMATED_CURTAIN_DATA_POINTS = {
  curtainSwitchOne: 1,             // enum | open, stop, close, continue
  percentControlOne: 2,            // integer | 0-100
  accurateCalibrationOne: 3,       // enum | start, end
  curtainSwitchTwo: 4,             // enum | open, stop, close, continue
  percentControlTwo: 5,            // integer | 0-100
  accurateCalibrationTwo: 6,       // enum | start, end
  motorSteerOne: 8,                // enum | forward, back
  motorSteerTwo: 9,                // enum | forward, back
  quickCalibrationOne: 10,         // integer | 1-180
  quickCalibrationTwo: 11,         // integer | 1-180
  motorModeOne: 12,                // enum | strong_power, dry_contact
  motorModeTwo: 13,                // enum | strong_power, dry_contact
  lightMode: 14                    // enum | relay, pos, none
};

// ============================================================================
// FAN SWITCH DATA POINTS
// ============================================================================

/**
 * V1 Fan Switch Data Points
 * Used by: Basic fan switches
 */
const V1_FAN_SWITCH_DATA_POINTS = {
  onOff: 1,                        // boolean | 0: off, 1: on
  mode: 2,                         // enum | 0: normal, 1: nature
  fanSpeed: 3,                     // enum | 0: low, 1: medium, 2: high
  timer: 6                         // integer | Timer in minutes
};

/**
 * V2 Fan Switch Data Points
 * Used by: Advanced fan switches with more speeds
 */
const V2_FAN_SWITCH_DATA_POINTS = {
  onOff: 1,                        // boolean | 0: off, 1: on
  fanSpeed: 3,                     // enum | 0-5 (off, low, medium-low, medium, medium-high, high)
  lightOnOff: 9,                   // boolean | 0: off, 1: on
  lightMode: 11,                   // enum | 0: white, 1: color
  lightBrightness: 12,             // integer | 0-1000
  direction: 101,                  // enum | 0: forward, 1: reverse
  timer: 102                       // integer | Timer countdown in minutes
};

// ============================================================================
// DIMMER DATA POINTS
// ============================================================================

/**
 * V1 Dimmer Data Points
 * Used by: Basic dimmers (1-gang)
 */
const V1_DIMMER_DATA_POINTS = {
  switchOne: 1,                    // boolean | 0: off, 1: on
  brightnessOne: 2,                // integer | 10-1000
  minBrightnessOne: 3,             // integer | 10-1000
  typeOfLightSourceOne: 4,         // enum | 0: LED, 1: incandescent, 2: halogen
  maxBrightnessOne: 5              // integer | 10-1000
};

/**
 * V2 Dimmer Data Points
 * Used by: 2-gang dimmers
 */
const V2_DIMMER_DATA_POINTS = {
  switchOne: 1,                    // boolean | 0: off, 1: on
  brightnessOne: 2,                // integer | 10-1000
  minBrightnessOne: 3,             // integer | 10-1000
  typeOfLightSourceOne: 4,         // enum | 0: LED, 1: incandescent, 2: halogen
  maxBrightnessOne: 5,             // integer | 10-1000
  countdownOne: 6,                 // integer | Countdown timer in seconds
  switchTwo: 7,                    // boolean | 0: off, 1: on
  brightnessTwo: 8,                // integer | 10-1000
  minBrightnessTwo: 9,             // integer | 10-1000
  typeOfLightSourceTwo: 10,        // enum | 0: LED, 1: incandescent, 2: halogen
  maxBrightnessTwo: 11,            // integer | 10-1000
  countdownTwo: 12,                // integer | Countdown timer in seconds
  powerOnState: 14,                // enum | 0: off, 1: on, 2: memory
  switchType: 17                   // enum | 0: toggle, 1: state, 2: momentary
};

// ============================================================================
// SWITCH DATA POINTS
// ============================================================================

/**
 * Multi-Gang Switch Data Points
 * Used by: 1-6 gang wall switches
 */
const MULTI_GANG_SWITCH_DATA_POINTS = {
  switch1: 1,                      // boolean | Gang 1 on/off
  switch2: 2,                      // boolean | Gang 2 on/off
  switch3: 3,                      // boolean | Gang 3 on/off
  switch4: 4,                      // boolean | Gang 4 on/off
  switch5: 5,                      // boolean | Gang 5 on/off
  switch6: 6,                      // boolean | Gang 6 on/off
  countdown1: 7,                   // integer | Countdown timer gang 1
  countdown2: 8,                   // integer | Countdown timer gang 2
  countdown3: 9,                   // integer | Countdown timer gang 3
  countdown4: 10,                  // integer | Countdown timer gang 4
  countdown5: 11,                  // integer | Countdown timer gang 5
  countdown6: 12,                  // integer | Countdown timer gang 6
  powerOnState: 14,                // enum | 0: off, 1: on, 2: memory
  childLock: 15,                   // boolean | 0: unlocked, 1: locked
  backlightMode: 21,               // enum | 0: off, 1: relay, 2: position
  indicatorMode: 27                // enum | 0: off, 1: on when off, 2: on when on
};

// ============================================================================
// SENSOR DATA POINTS
// ============================================================================

/**
 * Climate Sensor Data Points
 * Used by: Temperature/Humidity sensors
 */
const CLIMATE_SENSOR_DATA_POINTS = {
  temperature: 1,                  // integer | °C * 10
  humidity: 2,                     // integer | % * 10
  battery: 4,                      // integer | 0-100 (percentage)
  temperatureUnit: 9,              // enum | 0: Celsius, 1: Fahrenheit
  maxTemperature: 10,              // integer | °C * 10
  minTemperature: 11,              // integer | °C * 10
  maxHumidity: 12,                 // integer | % * 10
  minHumidity: 13,                 // integer | % * 10
  temperatureAlarm: 14,            // enum | 0: lower, 1: normal, 2: upper
  humidityAlarm: 15,               // enum | 0: lower, 1: normal, 2: upper
  tempSensitivity: 17,             // integer | °C * 10 (sensitivity threshold)
  humiSensitivity: 18,             // integer | % * 10 (sensitivity threshold)
  reportingInterval: 20            // integer | Reporting interval in seconds
};

/**
 * Motion/PIR Sensor Data Points
 * Used by: PIR motion sensors
 */
const MOTION_SENSOR_DATA_POINTS = {
  motion: 1,                       // boolean | 0: no motion, 1: motion detected
  battery: 4,                      // integer | 0-100 (percentage)
  sensitivity: 9,                  // enum | 0: low, 1: medium, 2: high
  keepTime: 10,                    // integer | Detection hold time in seconds
  illuminance: 12                  // integer | Lux value
};

/**
 * Door/Window Contact Sensor Data Points
 * Used by: Contact sensors
 */
const CONTACT_SENSOR_DATA_POINTS = {
  contact: 1,                      // boolean | 0: closed, 1: open
  battery: 4                       // integer | 0-100 (percentage)
};

/**
 * Water Leak Sensor Data Points
 * Used by: Water leak detectors
 */
const WATER_LEAK_SENSOR_DATA_POINTS = {
  waterLeak: 1,                    // boolean | 0: dry, 1: leak detected
  battery: 4                       // integer | 0-100 (percentage)
};

/**
 * Smoke Detector Data Points
 * Used by: Smoke detectors
 */
const SMOKE_DETECTOR_DATA_POINTS = {
  smokeAlarm: 1,                   // boolean | 0: no smoke, 1: smoke detected
  battery: 4,                      // integer | 0-100 (percentage)
  selfTest: 8,                     // boolean | Trigger self-test
  silenceAlarm: 16                 // boolean | Silence the alarm
};

/**
 * Air Quality Sensor Data Points
 * Used by: CO2, VOC, Formaldehyde sensors
 */
const AIR_QUALITY_SENSOR_DATA_POINTS = {
  co2: 2,                          // integer | CO2 in ppm
  voc: 21,                         // integer | VOC level
  formaldehyde: 20,                // integer | HCHO in mg/m³ * 100
  temperature: 18,                 // integer | °C * 10
  humidity: 19                     // integer | % * 10
};

/**
 * Soil Moisture Sensor Data Points
 * Used by: Plant/Soil sensors
 */
const SOIL_SENSOR_DATA_POINTS = {
  soilMoisture: 3,                 // integer | Soil moisture %
  soilTemperature: 5,              // integer | °C * 10
  battery: 15                      // integer | 0-100 (percentage)
};

// ============================================================================
// SIREN/ALARM DATA POINTS
// ============================================================================

/**
 * Siren Data Points
 * Used by: Indoor/outdoor sirens
 */
const SIREN_DATA_POINTS = {
  alarm: 13,                       // boolean | 0: off, 1: on
  volume: 5,                       // enum | 0: low, 1: medium, 2: high
  duration: 7,                     // integer | Duration in seconds
  melody: 21,                      // enum | Melody selection (0-17)
  battery: 15                      // integer | 0-100 (percentage)
};

// ============================================================================
// SMART PLUG DATA POINTS
// ============================================================================

/**
 * Smart Plug Data Points
 * Used by: TS0601 smart plugs with energy monitoring
 */
const SMART_PLUG_DATA_POINTS = {
  onOff: 1,                        // boolean | 0: off, 1: on
  countdown: 102,                  // integer | Countdown timer in seconds
  current: 18,                     // integer | Current in mA
  power: 19,                       // integer | Power in W * 10
  voltage: 20,                     // integer | Voltage in V * 10
  energy: 17,                      // integer | Energy in Wh
  childLock: 40                    // boolean | 0: unlocked, 1: locked
};

// ============================================================================
// GARAGE DOOR DATA POINTS
// ============================================================================

/**
 * Garage Door Data Points
 * Used by: Garage door controllers
 */
const GARAGE_DOOR_DATA_POINTS = {
  trigger: 1,                      // boolean | Trigger door action
  doorState: 3,                    // enum | 0: closed, 1: open, 2: opening, 3: closing
  doorContact: 101                 // boolean | 0: closed, 1: open (contact sensor)
};

// ============================================================================
// IRRIGATION DATA POINTS
// ============================================================================

/**
 * Irrigation Controller Data Points
 * Used by: Water timers, irrigation systems
 */
const IRRIGATION_DATA_POINTS = {
  switch1: 1,                      // boolean | Zone 1 on/off
  switch2: 2,                      // boolean | Zone 2 on/off
  waterTime1: 101,                 // integer | Watering time zone 1 in minutes
  waterTime2: 102,                 // integer | Watering time zone 2 in minutes
  remainingTime1: 103,             // integer | Remaining time zone 1
  remainingTime2: 104,             // integer | Remaining time zone 2
  battery: 11                      // integer | 0-100 (percentage) for battery models
};

// ============================================================================
// TUYA DATA TYPES
// ============================================================================

/**
 * Tuya DP Data Types
 * Used for encoding/decoding DP values
 */
const TUYA_DATA_TYPES = {
  raw: 0,                          // [ bytes ]: Raw data
  bool: 1,                         // [ 0/1 ]: Boolean values
  value: 2,                        // [ 4 byte value ]: Numeric values
  string: 3,                       // [ N byte string ]: Textual data
  enum: 4,                         // [ 0-255 ]: Enumerated values
  bitmap: 5                        // [ 1,2,4 bytes ]: Bitfields
};

/**
 * Day mapping for schedule DPs
 */
const SCHEDULE_DAY_BITMAP = {
  108: 1,   // Monday
  112: 2,   // Tuesday
  109: 4,   // Wednesday
  113: 8,   // Thursday
  110: 16,  // Friday
  114: 32,  // Saturday
  111: 64   // Sunday
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Thermostats
  V1_THERMOSTAT_DATA_POINTS,
  V1_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS,
  V2_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS,
  
  // Curtains
  V1_CURTAIN_MOTOR_DATA_POINTS,
  V2_CURTAIN_MOTOR_DATA_POINTS,
  V1_AUTOMATED_CURTAIN_DATA_POINTS,
  
  // Fans
  V1_FAN_SWITCH_DATA_POINTS,
  V2_FAN_SWITCH_DATA_POINTS,
  
  // Dimmers
  V1_DIMMER_DATA_POINTS,
  V2_DIMMER_DATA_POINTS,
  
  // Switches
  MULTI_GANG_SWITCH_DATA_POINTS,
  
  // Sensors
  CLIMATE_SENSOR_DATA_POINTS,
  MOTION_SENSOR_DATA_POINTS,
  CONTACT_SENSOR_DATA_POINTS,
  WATER_LEAK_SENSOR_DATA_POINTS,
  SMOKE_DETECTOR_DATA_POINTS,
  AIR_QUALITY_SENSOR_DATA_POINTS,
  SOIL_SENSOR_DATA_POINTS,
  
  // Alarms
  SIREN_DATA_POINTS,
  
  // Plugs
  SMART_PLUG_DATA_POINTS,
  
  // Other
  GARAGE_DOOR_DATA_POINTS,
  IRRIGATION_DATA_POINTS,
  
  // Utils
  TUYA_DATA_TYPES,
  SCHEDULE_DAY_BITMAP
};
