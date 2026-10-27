#!/usr/bin/env node
/**
 * P3075 (t613u): Flow hints in plain words, written in the compose sources.
 *
 * WHY: the bump rebuilds app.json from .homeycompose + drivers/<id>/driver.flow.compose.json, so a
 * Flow trim made only in app.json is lost at the next bump. This pass edits the compose files.
 * Driver cards only. It removes hints that only repeat the card title, or that only carry developer jargon
 * (DP numbers, ZCL clusters, capability ids); when such a hint also said something useful
 * (a colour backlight is needed, 24 h maximum, scene mode only), that part is kept in short words.
 * Card ids, titles, args and tokens are never touched.
 *
 * Usage: node scripts/maintenance/flow-hint-plain.cjs [--write] [--root=DIR]   (default: dry run, prints counts)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const KINDS = ['triggers', 'conditions', 'actions'];
const JARGON = /\b(measure_\w+|alarm_\w+|ZCL|DP ?\d+|onoff|offon|cluster 0x)/;
// Useful part of a jargon hint, in our own words (en, fr, nl, de). Anything else jargon-only is dropped.
const KEEP = [
  [/^Set LED color for ON or OFF state/, { en: 'Needs a colour backlight.', fr: 'Nécessite un rétroéclairage couleur.', nl: 'Vereist gekleurde achtergrondverlichting.', de: 'Erfordert farbige Hintergrundbeleuchtung.' }],
  [/^Auto turn off after countdown/, { en: 'Up to 24 h, then the switch turns off.', fr: "Jusqu'à 24 h, puis l'interrupteur s'éteint.", nl: 'Tot 24 u, daarna gaat de schakelaar uit.', de: 'Bis 24 h, danach schaltet der Schalter aus.' }],
  [/recalls a Zigbee scene/, { en: 'Only in scene mode.', fr: 'Uniquement en mode scène.', nl: 'Alleen in scènemodus.', de: 'Nur im Szenenmodus.' }],
];
const STOP = new Set('when the a an is are has have been be was for of to its it this that on in at by with from or and state device sensor value changes changed change becomes turns turned gets'.split(' '));
const stem = (w) => w.replace(/ies$/, 'y').replace(/(ing|ed|es|s)$/, '');
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((w) => w && !STOP.has(w)).map(stem);
const en = (x) => x && typeof x === 'object' ? x.en : x;

/** 'drop' | {replacement} | null for one card. */
function planHint(card) {
  const h = en(card && card.hint);
  if (!h || typeof h !== 'string') { return null; }
  if (JARGON.test(h)) {
    const k = KEEP.find(([re]) => re.test(h));
    if (!k) { return 'drop'; }
    return JSON.stringify(card.hint) === JSON.stringify(k[1]) ? null : { ...k[1] };
  }
  const t = new Set(words(en(card.title)));
  const hw = words(h);
  return hw.length && t.size && hw.every((w) => t.has(w)) ? 'drop' : null;
}

function composeFiles(root) {
  const out = [];
  const dd = path.join(root, 'drivers');
  for (const d of fs.existsSync(dd) ? fs.readdirSync(dd) : []) {
    const f = path.join(dd, d, 'driver.flow.compose.json');
    if (fs.existsSync(f)) { out.push(f); }
  }
  // App-level cards (.homeycompose/flow) are left alone: their hints explain sub-capability ids on purpose.
  return out;
}

function run(root = process.cwd(), { write = false } = {}) {
  const res = { files: 0, dropped: 0, rewritten: 0, bytes: 0, skippedFormat: [] };
  for (const f of composeFiles(root)) {
    const src = fs.readFileSync(f, 'utf8');
    let j;
    try { j = JSON.parse(src); } catch (_) { continue; }
    const cards = j && j.id ? [j] : KINDS.flatMap((k) => j && Array.isArray(j[k]) ? j[k] : []);
    let changed = false;
    for (const c of cards) {
      const p = planHint(c);
      if (!p) { continue; }
      const before = JSON.stringify(c.hint).length;
      if (p === 'drop') { delete c.hint; res.dropped++; res.bytes += before + 8; } else { c.hint = p; res.rewritten++; res.bytes += before - JSON.stringify(p).length; }
      changed = true;
    }
    if (!changed) { continue; }
    const nl = src.endsWith('\n') ? '\n' : '';
    // Only files whose formatting round-trips are rewritten, so a diff never reformats a whole file.
    if (JSON.stringify(JSON.parse(src), null, 2) + nl !== src) { res.skippedFormat.push(path.relative(root, f)); continue; }
    res.files++;
    if (write) { fs.writeFileSync(f, JSON.stringify(j, null, 2) + nl); }
  }
  return res;
}

module.exports = { planHint, run, JARGON, KEEP };

if (require.main === module) {
  const rootArg = process.argv.find((a) => a.startsWith('--root='));
  const r = run(rootArg ? rootArg.slice(7) : process.cwd(), { write: process.argv.includes('--write') });
  console.log(JSON.stringify(r));
}
