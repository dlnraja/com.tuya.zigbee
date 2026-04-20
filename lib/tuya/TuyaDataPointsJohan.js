'use strict';
const { safeParse, safeDivide } = require('../utils/tuyaUtils.js');

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
  targetTemperature: 16,           // integer | 5-30Â°C (steps of 0.5Â°C)
  holidayTemperature: 21,          // integer | 5-30Â°C (steps of 0.5Â°C)
  currentTemperature: 24,          // integer | 5-30Â°C (steps of 0.1Â°C)
  localTemperatureCalibration: 27, // integer | -9 to +9Â°C (steps of 0.1Â°C)
  batteryLevel: 35,                // integer | 0-100 (percentage)
  childLock: 40,                   // boolean
  openWindowTemperature: 102,      // integer | 5-30Â°C (steps of 0.5Â°C)
  comfortTemperature: 104,         // integer | 5-30Â°C (steps of 0.5Â°C)
  ecoTemperature: 105,             // integer | 5-30Â°C (steps of 0.5Â°C)
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
  targetTemperature: 103           // integer | Â°C * 10
};

/**
 * V2 Thermostatic Radiator Valve Data Points
 * Used by: Advanced TRVs (MOES, Saswell, etc.)
 */
const V2_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS = {
  onOff: 1,                        // boolean | 0: off, 1: on
  mode: 2,                         // enum | 0: manual, 1: auto, 2: holiday
  targetTemperature: 3,            // integer | Â°C * 10 (e.g., 250 = 25.0Â°C)
  currentTemperature: 4,           // integer | Â°C * 10 (e.g., 220 = 22.0Â°C)
  openWindow: 7,                   // boolean | 0: off, 1: on
  frostProtection: 10,             // boolean | 0: off, 1: on
  batteryLevel: 13,                // integer | 0-100 (percentage)
  childLock: 14,                   // boolean | 0: unlocked, 1: locked
  valvePosition: 15,               // integer | Valve position in percentage 0-100
  runningState: 16,                // enum | 0: idle, 1: heating
  comfortTemperature: 102,         // integer | Â°C * 10 (e.g., 220 = 22.0Â°C)
  ecoTemperature: 103,             // integer | Â°C * 10 (e.g., 180 = 18.0Â°C)
  holidayTemperature: 105,         // integer | Â°C * 10 (e.g., 150 = 15.0Â°C)
  openWindowTemperature: 106,      // integer | Â°C * 10
  presetMode: 107,                 // enum | 0: schedule, 1: manual, 2: boost, 3: comfort, 4: eco, 5: away
  boostTime: 108,                  // integer | Boost time in minutes
  autoLock: 109,                   // boolean | 0: disabled, 1: enabled
  maxTemperature: 110,             // integer | Â°C * 10
  minTemperature: 111,             // integer | Â°C * 10
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
  fanSwitch: 1,                    // Boolean
  fanCountdown: 2,                 // Integer | 0-86400 seconds
  fanSpeed: 3,                     // enum | 0: low, 1: medium, 2: high
  fanSpeedPercent: 4,              // Integer | 0-100 | Speed percentage
  mode: 5,                         // enum | 0: normal, 1: nature
  brightness: 6,                   // Integer | 0-1000 | Light brightness
  lightSwitch: 9,                  // Boolean | 0: off, 1: on
  lightCountdown: 10,              // Integer | 0-86400 seconds
  lightMode: 11,                   // Enum | white, color, scene, music
  lightBrightness: 12,             // Integer | 0-1000
  backlightSwitch: 13              // Boolean
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

/**
 * V2 Multi-Gang Switch Data Points (v0.2.73 Johan)
 * Used by: Advanced switches with safeDivide(cycle, random) timing
 */
const V2_MULTI_SWITCH_DATA_POINTS = {
  onOffSwitchOne: 1,               // Boolean
  onOffSwitchTwo: 2,               // Boolean
  onOffSwitchThree: 3,             // Boolean
  onOffSwitchFour: 4,              // Boolean
  onOffSwitchFive: 5,              // Boolean
  onOffSwitchSix: 6,               // Boolean
  countdownOne: 7,                 // Integer | seconds
  countdownTwo: 8,                 // Integer | seconds
  countdownThree: 9,               // Integer | seconds
  countdownFour: 10,               // Integer | seconds
  countdownFive: 11,               // Integer | seconds
  countdownSix: 12,                // Integer | seconds
  powerOnState: 14,                // Enum | off, on, memory
  childLock: 40,                   // Boolean
  backlight: 41,                   // Boolean
  cycleTimingOne: 201,             // Raw | Cycle timing gang 1
  cycleTimingTwo: 202,             // Raw | Cycle timing gang 2
  cycleTimingThree: 203,           // Raw | Cycle timing gang 3
  cycleTimingFour: 204,            // Raw | Cycle timing gang 4
  cycleTimingFive: 205,            // Raw | Cycle timing gang 5
  cycleTimingSix: 206,             // Raw | Cycle timing gang 6
  randomTimingOne: 207,            // Raw | Random timing gang 1
  randomTimingTwo: 208,            // Raw | Random timing gang 2
  randomTimingThree: 209,          // Raw | Random timing gang 3
  randomTimingRaw: 210             // Raw | System DP
};

// ============================================================================
// SENSOR DATA POINTS
// ============================================================================

/**
 * Climate Sensor Data Points
 * Used by: safeDivide(Temperature, Humidity) sensors
 */
const CLIMATE_SENSOR_DATA_POINTS = {
  temperature: 1,                  // integer | Â°C * 10
  humidity: 2,                     // integer | % * 10
  battery: 4,                      // integer | 0-100 (percentage)
  temperatureUnit: 9,              // enum | 0: Celsius, 1: Fahrenheit
  maxTemperature: 10,              // integer | Â°C * 10
  minTemperature: 11,              // integer | Â°C * 10
  maxHumidity: 12,                 // integer | % * 10
  minHumidity: 13,                 // integer | % * 10
  temperatureAlarm: 14,            // enum | 0: lower, 1: normal, 2: upper
  humidityAlarm: 15,               // enum | 0: lower, 1: normal, 2: upper
  tempSensitivity: 17,             // integer | Â°C * 10 (sensitivity threshold)
  humiSensitivity: 18,             // integer | % * 10 (sensitivity threshold)
  reportingInterval: 20            // integer | Reporting interval in seconds
};

/**
 * safeDivide(Motion, PIR) Sensor Data Points
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
 * safeDivide(Door, Window) Contact Sensor Data Points
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
  formaldehyde: 20,                // integer | HCHO in mg/mÂ³ * 100
  temperature: 18,                 // integer | Â°C * 10
  humidity: 19                     // integer | % * 10
};

/**
 * Soil Moisture Sensor Data Points
 * Used by: safeDivide(Plant, Soil) sensors
 */
const SOIL_SENSOR_DATA_POINTS = {
  soilMoisture: 3,                 // integer | Soil moisture %
  soilTemperature: 5,              // integer | Â°C * 10
  battery: 15                      // integer | 0-100 (percentage)
};

// ============================================================================
// TEMP/HUMID SENSOR EXTENDED DATA POINTS (v0.2.73 Johan)
// ============================================================================

const V1_TEMPHUMID_SENSOR_DATA_POINTS = {
  currentTemperature: 1,            // integer | 0.1C precision
  currentHumidity: 2,               // integer | 0.1% precision
  batteryPercentage: 4,             // integer | 0-100%
  temperatureUnit: 9,               // enum | 0: C, 1: F
  maxTemperature: 10,               // integer
  minTemperature: 11,               // integer
  maxHumidity: 12,                  // integer
  minHumidity: 13,                  // integer
  temperatureAlarm: 14,             // enum | 0: lower, 1: normal, 2: upper
  humidityAlarm: 15,                // enum | 0: lower, 1: normal, 2: upper
  temperatureSensitivity: 17,       // integer | sensitivity threshold
  humiditySensitivity: 18,          // integer | sensitivity threshold
  reportingInterval: 19,            // integer | seconds
  humiditySensitivity2: 20          // integer | %RH sensitivity
};

// ============================================================================
// RADAR SENSOR V2 DATA POINTS (v0.2.73 Johan)
// ============================================================================

const V2_RADAR_SENSOR_DATA_POINTS = {
  illuminanceLux: 104,
  presenceState: 105,
  radarSensitivity: 106,
  maximumRange: 107,
  minimumRange: 108,
  targetDistance: 109,
  fadingTime: 110,
  detectionDelay: 111
};

// ============================================================================
// IR CONTROLLER DATA POINTS (v0.2.73 Johan)
// ============================================================================

const IR_CONTROLLER_DATA_POINTS = {
  currentTemperature: 101,         // Integer | 0-600 | 10x Celsius
  currentHumidity: 102,            // Integer | 0-100 | %
  irCommands: 201                  // JSON
};

// ============================================================================
// FINGERBOT DATA POINTS (v0.2.73 Johan)
// ============================================================================

const V1_FINGER_BOT_DATA_POINTS = {
  onOff: 1,                        // Boolean
  mode: 101,                       // Enum | 0: click, 1: switch, 2: program
  lowerLimit: 102,                 // Integer
  upperLimit: 106,                 // Integer
  delay: 103,                      // Integer
  reverse: 104,                    // Boolean
  touch: 107,                      // Boolean
  battery: 105                     // Integer | Battery level percentage
};

// ============================================================================
// RAIN SENSOR DATA POINTS (v0.2.73 Johan)
// ============================================================================

const V1_RAIN_SENSOR_DATA_POINTS = {
  illuminance: 101,                // RAW
  illuminance_average_20min: 102,  // RAW
  illuminance_maximum_today: 103,  // RAW
  cleaning_reminder: 104,          // Boolean
  rain_intensity: 105              // RAW
};

// ============================================================================
// SIREN/ALARM DATA POINTS
// ============================================================================

/**
 * Siren Data Points
 * Used by: safeDivide(Indoor, outdoor) sirens
 */
const SIREN_DATA_POINTS = {
  alarm: 13,                       // boolean | 0: off, 1: on
  volume: 5,                       // enum | 0: high, 1: medium, 2: low
  duration: 7,                     // integer | 0-1800 (seconds)
  melody: 21,                      // enum | Melody selection (0-17)
  battery: 15,                     // integer | 0-100 (percentage)
  currentTemperature: 14,          // integer | reported temp (Johan v0.2.73)
  alarmSwitch: 17,                 // boolean | alarm trigger
  minAlarmVolume: 18,              // enum | min volume threshold
  maxAlarmVolume: 19,              // enum | max volume threshold
  neoMelody: 102                   // enum | 0-17 (Doorbell 1, For Elise, etc.)
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
 * Used for safeDivide(encoding, decoding) DP values
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
  V2_MULTI_SWITCH_DATA_POINTS,
  
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
  
  // TempHumid Extended
  V1_TEMPHUMID_SENSOR_DATA_POINTS,
  // Radar V2
  V2_RADAR_SENSOR_DATA_POINTS,
  // IR Controller
  IR_CONTROLLER_DATA_POINTS,
  // Fingerbot
  V1_FINGER_BOT_DATA_POINTS,
  // Rain Sensor
  V1_RAIN_SENSOR_DATA_POINTS,
  
  // Utils
  TUYA_DATA_TYPES,
  SCHEDULE_DAY_BITMAP
};
