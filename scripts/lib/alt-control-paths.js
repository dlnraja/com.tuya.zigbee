'use strict';
// P3380 / t1014u: propose the alternative control paths (forum 21313 #296) for unsupported devices or
// unknown DPs, with exact card and setting ids, while the native fix is investigated. Deterministic.
const fs = require('fs');
const path = require('path');

const RULES_FILE = path.join(__dirname, '..', '..', 'config', 'alt-control-paths.json');

function loadRules(file = RULES_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function textOf(item) {
  return [item && item.text, ...(item && item.symptoms) || [], ...((item && item.dps) || []).map((d) => `dp ${d}`)]
    .filter(Boolean).join(' ').toLowerCase();
}

/**
 * suggestAltPaths(item, classification) -> [{ id, title, cards, settings, reply }]
 * item: { text, symptoms, dps }; classification: { status }.
 */
function suggestAltPaths(item = {}, classification = {}, rules = loadRules()) {
  const t = textOf(item);
  const statusHit = (rules.triggers.statuses || []).includes(classification.status);
  const symHit = (rules.triggers.symptomPatterns || []).some((p) => new RegExp(p, 'i').test(t));
  if (!statusHit && !symHit) {return [];}
  const out = [];
  for (const p of rules.paths) {
    if (p.symptomPatterns && !p.symptomPatterns.some((x) => new RegExp(x, 'i').test(t))) {continue;}
    out.push({ id: p.id, title: p.title, cards: p.cards || [], settings: p.settings || [], reply: p.reply, source: rules._meta.source });
  }
  return out;
}

/** One short English paragraph for a reply candidate (never posted by CI). */
function replyText(paths) {
  if (!paths.length) {return '';}
  return `While native support is being added, you can already: ${paths.map((p) => p.reply).join(' ')}`;
}

module.exports = { loadRules, suggestAltPaths, replyText, RULES_FILE };
