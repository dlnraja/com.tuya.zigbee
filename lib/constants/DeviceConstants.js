'use strict';

/**
 * DeviceConstants - Centralized magic numbers and thresholds for device management
 * Eliminates hardcoded values scattered across BaseUnifiedDevice.js and related files
 */

// Battery thresholds and limits
const BATTERY = {
  /** Default low battery threshold percentage */
  LOW_THRESHOLD: 20,
  /** Critical battery threshold percentage */
  CRITICAL_THRESHOLD: 10,
  /** Zigbee raw value representing 255 (unknown/unavailable) */
  RAW_UNAVAILABLE: 255,
  /** Maximum reasonable battery percentage */
  MAX_PERCENT: 100,
  /** Zigbee battery percentage raw value divisor (raw / 2 = %) */
  ZIGBEE_DIVISOR: 2,
  /** Default battery type for unknown devices */
  DEFAULT_TYPE: 'CR2032',
  /** Voltage-to-percent: max reasonable voltage in mV for CR2032 */
  CR2032_MAX_MV: 3000,
  /** Voltage-to-percent: min reasonable voltage in mV for CR2032 */
  CR2032_MIN_MV: 2500,
  /** Deduplication: minimum time between battery updates (ms) */
  DEDUP_MIN_MS: 300000,
  /** Deduplication: minimum change threshold for battery */
  DEDUP_MIN_CHANGE: 2,
};

// Throttle and timing constants
const THROTTLE = {
  /** Minimum interval between same capability updates (ms) */
  CAPABILITY_MIN_MS: 1000,
  /** Log throttle interval for repeated messages (ms) */
  LOG_THROTTLE_MS: 30000,
  /** Maximum messages per minute (RX) */
  RX_MAX_PER_MIN: 120,
  /** Maximum messages per minute (TX) */
  TX_MAX_PER_MIN: 30,
};

// Reporting intervals (seconds)
const REPORTING = {
  /** Default battery reporting min interval */
  BATTERY_MIN: 3600,
  /** Default battery reporting max interval */
  BATTERY_MAX: 43200,
  /** Button battery reporting min interval (longer for sleep devices) */
  BUTTON_BATTERY_MIN: 3600,
  /** Button battery reporting max interval */
  BUTTON_BATTERY_MAX: 65535,
  /** Button battery min change */
  BUTTON_BATTERY_CHANGE: 10,
};

// Device detection constants
const DETECTION = {
  /** Tuya DP model ID */
  TUYA_MODEL: 'TS0601',
  /** Tuya manufacturer prefix */
  TUYA_MFR_PREFIX: '_TZE',
  /** Maximum retry attempts for reading device info */
  MAX_READ_RETRIES: 3,
  /** Delay before background battery read (ms) */
  BG_BATTERY_READ_DELAY: 2000,
  /** Capability audit delay after init (ms) */
  CAPABILITY_AUDIT_DELAY: 5000,
};

// Button device detection keywords
const BUTTON_KEYWORDS = [
  'button',
  'remote',
  'wireless',
  'scene',
];

// Timer names for cleanup
const TIMER_NAMES = [
  'dailySyncTimer',
  '_dpLoggerStatusTimer',
  '_batteryConfigTimer',
  '_batteryInitTimer',
  '_bgBatteryReadTimer',
];

// Power source types
const POWER = {
  AC: 'AC',
  DC: 'DC',
  BATTERY: 'BATTERY',
  AUTO: 'auto',
};

// Cluster skip list for Tuya DP devices
const TUYA_SKIP_CLUSTERS = [
  'powerConfiguration',
  'temperatureMeasurement',
  'relativeHumidity',
  'illuminanceMeasurement',
];

// Essential clusters for fallback binding
const ESSENTIAL_CLUSTERS = [
  'onOff',
  'powerConfiguration',
  'temperatureMeasurement',
  'msTemperatureMeasurement',
  'relativeHumidity',
  'msRelativeHumidity',
];

module.exports = {
  BATTERY,
  THROTTLE,
  REPORTING,
  DETECTION,
  BUTTON_KEYWORDS,
  TIMER_NAMES,
  POWER,
  TUYA_SKIP_CLUSTERS,
  ESSENTIAL_CLUSTERS,
};
