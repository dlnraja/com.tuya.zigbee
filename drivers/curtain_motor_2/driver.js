'use strict';
// P3233: continuation of curtain_motor (DRIVER_CONTINUATIONS.md) — same code; own flow card ids aliased.
module.exports = require('../../lib/drivers/ContinuationFlowAlias').continuationOf(require('../curtain_motor/driver'), 'curtain_motor', 'curtain_motor_2');
