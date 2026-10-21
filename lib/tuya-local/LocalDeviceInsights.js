'use strict';
/**
 * P2951 — Glue between the P2950 inference modules and the device / pairing flow.
 * Credits: Homey forum topic 154077 posts #526/#527 (Stijn_Van_Heeswijk) and #528 (Andi),
 * https://community.homey.app/t/154077/526 . Pure and side-effect free; every caller
 * treats a null/empty result as "keep current behaviour".
 */
const { inferSockets, subSocketPlan } = require('./MultiSocketInference');
const { inferCover } = require('./CoverModeInference');
const { buildSupportBundle } = require('./SupportBundle');

function analyse(dps, schema) {
  try {
    const sockets = inferSockets(dps);
    const cover = inferCover(dps, schema || {});
    let suggestedDriver = null;
    if (cover && cover.confidence === 'high') {suggestedDriver = 'wifi_cover';}
    else if (sockets.mode === 'multi') {suggestedDriver = 'wifi_power_strip';}
    else if (cover) {suggestedDriver = 'wifi_cover';}
    return { sockets, cover, suggestedDriver };
  } catch (_e) {
    return { sockets: { mode: 'single', sockets: [], reason: 'error' }, cover: null, suggestedDriver: null };
  }
}

/** Driver suggestion only when the paired driver looks wrong (e.g. strip paired as plug). */
function mismatchHint(currentDriverId, dps, schema) {
  const a = analyse(dps, schema);
  if (!a.suggestedDriver || a.suggestedDriver === currentDriverId) {return null;}
  return { current: currentDriverId || null, suggested: a.suggestedDriver, sockets: a.sockets, cover: a.cover };
}

module.exports = { analyse, mismatchHint, subSocketPlan, buildSupportBundle };
