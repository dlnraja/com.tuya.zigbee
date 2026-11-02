'use strict';
// P3239: continuation of contact_sensor (DRIVER_CONTINUATIONS.md) — same code; own flow card ids aliased.
module.exports = require('../../lib/drivers/ContinuationFlowAlias').continuationOf(require('../contact_sensor/device'), 'contact_sensor', 'contact_sensor_2');
