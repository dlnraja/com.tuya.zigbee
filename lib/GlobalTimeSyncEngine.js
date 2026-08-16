'use strict';

/**
 * P206 — orphan shim: canonical engine lives in lib/tuya/GlobalTimeSyncEngine.js
 * (TuyaTimeSyncFormats + safe timers). Keep this path for any legacy require().
 */
module.exports = require('./tuya/GlobalTimeSyncEngine');
