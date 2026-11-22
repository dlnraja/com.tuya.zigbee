'use strict';

/**
 * Pure preview / apply planner for replacing one device id with another
 * in Homey flow JSON (standard + advanced). Dry-run by default.
 * Inspired by (not copied from) Flow Converter, with credit in constants.js.
 */

const { CONFIRM_TOKEN } = require('./constants');

function collectStandardHits(flow, oldId) {
  const hits = [];
  const needle = `homey:device:${oldId}`;
  if (flow && flow.trigger && String(flow.trigger.uri || '').includes(needle)) {
    hits.push({ kind: 'trigger', uri: flow.trigger.uri });
  }
  for (const key of ['actions', 'conditions']) {
    const arr = flow && flow[key];
    if (!Array.isArray(arr)) {continue;}
    for (const card of arr) {
      if (card && String(card.uri || '').includes(needle)) {
        hits.push({ kind: key, uri: card.uri });
      }
    }
  }
  return hits;
}

function collectAdvancedHits(af, oldId) {
  const hits = [];
  const needle = `homey:device:${oldId}`;
  const cards = (af && af.cards) || {};
  for (const cardId of Object.keys(cards)) {
    const card = cards[cardId] || {};
    const owner = String(card.ownerUri || '');
    if (owner.includes(needle)) {hits.push({ kind: 'card', cardId, uri: owner });}
    const dumped = JSON.stringify(card);
    if (dumped.includes(oldId) && !owner.includes(needle)) {
      hits.push({ kind: 'token', cardId });
    }
  }
  return hits;
}

function applyCapAlias(uri, capMap) {
  if (!uri || !capMap) {return uri;}
  // droptoken form: homey:device:<id>:<capability>
  const m = String(uri).match(/^(homey:device:[^:]+):(.+)$/);
  if (!m) {return uri;}
  const aliases = capMap[m[2]] || capMap.aliases && capMap.aliases[m[2]];
  if (Array.isArray(aliases) && aliases[0] && aliases[0] !== m[2]) {
    return `${m[1]}:${aliases[0]}`;
  }
  return uri;
}

function planRemap({ flows = {}, advancedFlows = {}, oldId, newId, capMap, dryRun = true, confirm }) {
  if (!oldId || !newId) {
    return { ok: false, error: 'oldId and newId are required' };
  }
  if (oldId === newId) {
    return { ok: false, error: 'oldId and newId must be different' };
  }
  const standard = [];
  for (const [id, flow] of Object.entries(flows || {})) {
    const hits = collectStandardHits(flow, oldId);
    if (hits.length) {standard.push({ id, name: flow.name || id, hits: hits.length, detail: hits });}
  }
  const advanced = [];
  for (const [id, af] of Object.entries(advancedFlows || {})) {
    const hits = collectAdvancedHits(af, oldId);
    if (hits.length) {advanced.push({ id, name: af.name || id, hits: hits.length, detail: hits });}
  }
  const wouldWrite = confirm === CONFIRM_TOKEN && dryRun === false;
  return {
    ok: true,
    dryRun: !wouldWrite,
    oldId,
    newId,
    standardCount: standard.length,
    advancedCount: advanced.length,
    standard,
    advanced,
    capMapUsed: Boolean(capMap),
    applyAllowed: wouldWrite,
  };
}

function applyPlanToClone(flow, oldId, newId, capMap) {
  const needle = `homey:device:${oldId}`;
  const next = `homey:device:${newId}`;
  const out = JSON.parse(JSON.stringify(flow));
  const swap = (uri) => {
    if (!uri) {return uri;}
    let u = String(uri).split(needle).join(next);
    u = applyCapAlias(u, capMap);
    return u;
  };
  if (out.trigger && out.trigger.uri) {out.trigger.uri = swap(out.trigger.uri);}
  for (const key of ['actions', 'conditions']) {
    if (!Array.isArray(out[key])) {continue;}
    for (const card of out[key]) {
      if (card && card.uri) {card.uri = swap(card.uri);}
    }
  }
  if (out.cards && typeof out.cards === 'object') {
    for (const card of Object.values(out.cards)) {
      if (card && card.ownerUri) {card.ownerUri = swap(card.ownerUri);}
    }
  }
  return out;
}

module.exports = { planRemap, applyPlanToClone, collectStandardHits, collectAdvancedHits };
