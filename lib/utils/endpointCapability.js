'use strict';

/**
 * Strict multi-gang endpoint → capability mapping (stable reliability).
 * Reimplemented for LTS — no command pacer / parallelDiscover.
 */

function parseGangFromCapability(capability) {
  const s = String(capability || '');
  const gang = s.match(/(?:gang|channel)(\d+)/i);
  if (gang) {return Number(gang[1]);}
  const dotted = s.match(/\.(\d+)$/);
  if (dotted) {return Number(dotted[1]);}
  if (s === 'onoff' || s === 'dim') {return 1;}
  return null;
}

function capabilityForOnOffEndpoint(endpointId, gangCount, root = 'onoff') {
  const ep = Number(endpointId);
  if (!Number.isInteger(ep) || ep < 1) {return null;}
  if (Number.isInteger(gangCount) && gangCount > 0 && ep > gangCount) {return null;}
  return ep === 1 ? root : `${root}.gang${ep}`;
}

function normalizeOnOffCommand(commandName) {
  const compact = String(commandName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!compact) {return 'unknown';}
  if (compact.includes('toggle')) {return 'toggle';}
  if (compact.includes('timedoff') || compact === 'commandonwithtimedoff') {return 'on';}
  if (
    compact === 'off'
    || compact === 'setoff'
    || compact === 'commandoff'
    || compact === 'commandoffwitheffect'
    || (compact.endsWith('off') && !compact.includes('on'))
  ) {
    return 'off';
  }
  if (
    compact === 'on'
    || compact === 'seton'
    || compact === 'commandon'
    || compact.startsWith('commandon')
    || compact.startsWith('seton')
  ) {
    return 'on';
  }
  return String(commandName || 'unknown');
}

module.exports = {
  parseGangFromCapability,
  capabilityForOnOffEndpoint,
  normalizeOnOffCommand,
};
