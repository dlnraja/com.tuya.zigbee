'use strict';

/**
 * Homey Zigbee interview helpers.
 *
 * Interviews always expose endpoint 242 (Green Power proxy) plus the real
 * application endpoints. Counting Object.keys(endpoints) as gangs is how
 * TS0002 (EP1+EP2+242) becomes a 3-gang and TS0043 (4 button EPs) becomes
 * a wall switch. ProductId wins over endpoint cardinality.
 */

const GREEN_POWER_ENDPOINT = 242;

function _num(id) {
  const n = Number(id);
  return Number.isInteger(n) ? n : NaN;
}

function isIgnoredInterviewEndpoint(id) {
  const n = _num(id);
  return !Number.isInteger(n) || n < 1 || n === GREEN_POWER_ENDPOINT;
}

function endpointHasOnOff(ep) {
  if (!ep) {return false;}
  const c = ep.clusters || {};
  const input = ep.inputClusters || ep.input || [];
  const names = Object.keys(c);
  if (c.onOff || c.genOnOff || c[6] || c['6'] || c['0x0006']) {return true;}
  if (names.some((k) => String(k).toLowerCase() === 'onoff' || String(k).toLowerCase() === 'genonoff')) {
    return true;
  }
  if (Array.isArray(input)) {
    return input.some((x) => Number(x) === 6 || Number(x) === 0x0006);
  }
  return false;
}

function countOnOffGangs(zclNode) {
  const eps = zclNode?.endpoints || {};
  let n = 0;
  for (const [id, ep] of Object.entries(eps)) {
    if (isIgnoredInterviewEndpoint(id)) {continue;}
    if (endpointHasOnOff(ep)) {n += 1;}
  }
  return n;
}

function modelIdOf(zclNode) {
  return String(zclNode?.modelId || zclNode?.productId || zclNode?.zb_model_id || '').toUpperCase();
}

function classifyInterview(zclNode) {
  const model = modelIdOf(zclNode);
  const gangs = countOnOffGangs(zclNode);

  if (/^TS004[1-9A]$/.test(model)) {
    const buttons = Number(model.replace(/\D/g, '').slice(-1)) || gangs || 1;
    const driverHint = buttons >= 4 ? 'button_wireless_4'
      : buttons === 3 ? 'button_wireless_3'
        : buttons === 2 ? 'button_wireless_2'
          : 'button_wireless_1';
    return { class: 'button', gangs: buttons, driverHint, reason: 'productId TS004x is a scene remote, not a wall switch' };
  }

  if (/^TS0215A?$/.test(model)) {
    return { class: 'sos', gangs: 1, driverHint: 'button_emergency_sos', reason: 'IAS SOS remote' };
  }

  if (/^TS000[1-8]$/.test(model) || /^TS001[1-8]$/.test(model)) {
    const fromModel = Number(model.slice(-1));
    const n = fromModel || gangs || 1;
    return {
      class: 'switch',
      gangs: n,
      driverHint: `switch_${n}gang`,
      reason: 'productId TS000x/TS001x names the gang count; ignore Green Power EP242',
    };
  }

  if (model === 'TS0601') {
    return { class: 'tuya_dp', gangs, driverHint: null, reason: 'EF00 MCU — gangs are DPs, not ZCL endpoints' };
  }

  if (gangs >= 2) {
    return { class: 'switch', gangs, driverHint: `switch_${gangs}gang`, reason: 'onOff endpoints excluding EP242' };
  }

  if (gangs === 1) {
    return { class: 'switch', gangs: 1, driverHint: 'switch_1gang', reason: 'single onOff endpoint' };
  }

  return { class: 'unknown', gangs: 0, driverHint: null, reason: 'no onOff application endpoints' };
}

module.exports = {
  GREEN_POWER_ENDPOINT,
  isIgnoredInterviewEndpoint,
  endpointHasOnOff,
  countOnOffGangs,
  classifyInterview,
  modelIdOf,
};
