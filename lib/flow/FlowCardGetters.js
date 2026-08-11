'use strict';

/**
 * Flow card getter stubs for incomplete Homey flow includes.
 *
 * Coordinates with lib/drivers/ZigBeeDriverFlowCardPatch.js:
 *  - That patch owns ZigBeeDriver.prototype._getFlowCard
 *  - This module NEVER re-patches ZigBeeDriver
 *  - Use safeGetFlowCard / installFlowCardStubs from managers & devices
 */

const {
  safeGetFlowCard,
  installFlowCardStubs,
} = require('../io/HomeyCompensationLayer');

module.exports = {
  safeGetFlowCard,
  installFlowCardStubs,
  ...require('./FlowCardHeuristics'),
};
