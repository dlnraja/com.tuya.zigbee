'use strict';
/**
 * P3374: intake / repair helpers for couple moves.
 * Always check in-place migration (onMapDeviceClass) before proposing a re-pair.
 */
const { FLOW_CONVERTER } = require('../../lib/flow-remap/constants');

function moveAdvice({ canMapInPlace, capabilityIdsChange }) {
  if (canMapInPlace) {
    return {
      action: 'in-place',
      rePair: false,
      mentionFlowConverter: Boolean(capabilityIdsChange),
      flowConverter: capabilityIdsChange ? FLOW_CONVERTER : null,
      reason: 'Keep the existing device id with onMapDeviceClass / additive caps.',
    };
  }
  return {
    action: 're-pair',
    rePair: true,
    mentionFlowConverter: true,
    flowConverter: FLOW_CONVERTER,
    reason: 'Re-pair would change the device id. Mention Flow Converter in the digest, reply-candidate, changelog and in-app hint. It is optional, never a dependency.',
  };
}

module.exports = { moveAdvice, FLOW_CONVERTER };
