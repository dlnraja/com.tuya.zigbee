#!/usr/bin/env node
'use strict';
/**
 * P3075 (t613u): per-family completeness, per gang / channel / phase.
 *
 * For every driver (repo files only, deterministic) and each of its channels (sub-capability suffix
 * gangN / chN / channelN / lN / phaseX / pN / epN / bare digit), lists:
 *   capabilities — base capability names on that channel; a gap is a capability that sits on at least
 *                  two other channels of the same driver but not on this one;
 *   clusters     — zigbee endpoint N (or the single endpoint) declared in driver.compose.json and its
 *                  clusters; a gap is a multi-channel driver with fewer endpoints than channels while
 *                  some of its product ids are not TS0601 (pure Tuya DP devices use one endpoint);
 *   flow cards   — driver.flow.compose.json triggers / conditions / actions naming the channel
 *                  (id token or a gang/channel/phase argument covering all channels); a gap is a
 *                  multi-channel driver where a channel has no card of a kind that another has;
 *   DPs          — Tuya DPs mapped or handled by the driver (dpMappings + handler, via P3018 tool).
 * Families = driver class. Report-only (never fails CI).
 * Usage: node scripts/kb/family-completeness.js           → writes docs/knowledge/KB/FAMILY_COMPLETENESS.md
 *        node scripts/kb/family-completeness.js --json    → JSON on stdout
 *        node scripts/kb/family-completeness.js --check   → summary (and GITHUB_STEP_SUMMARY), exit 0
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DRV = path.join(ROOT, 'drivers');
const OUT = path.join(ROOT, 'docs', 'knowledge', 'KB', 'FAMILY_COMPLETENESS.md');
const readJson = (p, d = null) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return d; } };
const arr = (v) => (Array.isArray(v) ? v : (v ? [v] : []));

const CH_RE = /^(?:gang|ch|channel|l|phase|p|ep|switch|outlet|socket|relay)?_?([0-9]+|[abc])$/i;
/** Channel key of a sub-capability suffix, or null when the suffix is not a channel (e.g. `.max`). */
function channelOf(cap) {
  const i = cap.indexOf('.');
  if (i < 0) return '1';
  const m = CH_RE.exec(cap.slice(i + 1));
  if (!m) return null;
  const v = m[1].toLowerCase();
  return /^[abc]$/.test(v) ? String('abc'.indexOf(v) + 1) : String(Number(v));
}
const baseOf = (cap) => cap.split('.')[0];

const CHANNEL_ARG = /^(gang|channel|phase|switch|outlet|socket|relay|endpoint|button|ch)$/i;
/** Channels a flow card serves: from its id (gang2, ch_3, l1, phase_b…) or all channels when it has a channel arg. */
function cardChannels(card, channels) {
  if (arr(card.args).some((a) => a && CHANNEL_ARG.test(String(a.name || '')))) return channels.slice();
  const id = String(card.id || '');
  const m = /(?:^|_)(?:gang|ch|channel|l|phase|outlet|socket|relay|switch)_?([0-9]+|[abc])(?:_|$)/i.exec(id);
  if (!m) return null; // not channel-specific
  const v = m[1].toLowerCase();
  return [/^[abc]$/.test(v) ? String('abc'.indexOf(v) + 1) : String(Number(v))];
}

let dpInfo = null;
try { dpInfo = require('./dp-endpoint-coverage').driverInfo; } catch (_e) { dpInfo = null; }

function analyseDriver(dir) {
  const id = path.basename(dir);
  const compose = readJson(path.join(dir, 'driver.compose.json'));
  if (!compose) return null;
  const flow = readJson(path.join(dir, 'driver.flow.compose.json'), {}) || {};
  const caps = arr(compose.capabilities).map(String).filter((c) => baseOf(c) !== 'button');
  const byCh = new Map();
  for (const c of caps) {
    const ch = channelOf(c);
    if (ch === null) continue;
    if (!byCh.has(ch)) byCh.set(ch, new Set());
    byCh.get(ch).add(baseOf(c));
  }
  const channels = [...byCh.keys()].sort((a, b) => Number(a) - Number(b));
  const z = compose.zigbee || {};
  const eps = z.endpoints || {};
  const epKeys = Object.keys(eps).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
  const pids = arr(z.productId).map((p) => String(p).toUpperCase());
  const efOnly = pids.length > 0 && pids.every((p) => p === 'TS0601');
  let dps = null;
  if (dpInfo) { try { const d = dpInfo(dir); dps = new Set([...d.mapped, ...d.handled]).size; } catch (_e) { dps = null; } }
  const kinds = ['triggers', 'conditions', 'actions'];
  const cardsPer = {};
  for (const ch of channels) cardsPer[ch] = { triggers: 0, conditions: 0, actions: 0 };
  for (const k of kinds) {
    for (const card of arr(flow[k])) {
      const served = cardChannels(card, channels);
      for (const ch of served || []) if (cardsPer[ch]) cardsPer[ch][k]++;
    }
  }
  const gaps = [];
  if (channels.length > 1) {
    const count = new Map();
    for (const s of byCh.values()) for (const b of s) count.set(b, (count.get(b) || 0) + 1);
    for (const ch of channels) {
      for (const [b, n] of count) if (n >= 2 && !byCh.get(ch).has(b) && n - 0 >= 2) gaps.push({ ch, kind: 'capability', what: b });
      for (const k of kinds) {
        if (!cardsPer[ch][k] && channels.some((o) => cardsPer[o][k] > 0)) gaps.push({ ch, kind: 'flow', what: k });
      }
    }
    if (!efOnly && epKeys.length > 0 && epKeys.length < channels.length) gaps.push({ ch: '*', kind: 'endpoint', what: `${epKeys.length} endpoint(s) for ${channels.length} channels` });
  }
  return {
    id, family: String(compose.class || 'other'), channels: channels.length, efOnly, dps,
    perChannel: channels.map((ch) => ({
      ch, caps: [...byCh.get(ch)].sort(),
      clusters: arr((eps[ch] || (channels.length === 1 && eps[epKeys[0]]) || {}).clusters),
      cards: cardsPer[ch],
    })),
    gaps,
  };
}

function audit(root = DRV) {
  const drivers = fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, 'driver.compose.json')))
    .sort().map((d) => analyseDriver(path.join(root, d))).filter(Boolean);
  const families = {};
  for (const d of drivers) {
    const f = families[d.family] || (families[d.family] = { drivers: 0, multiChannel: 0, channels: 0, withGaps: 0, gaps: 0 });
    f.drivers++; f.channels += d.channels; if (d.channels > 1) f.multiChannel++;
    if (d.gaps.length) { f.withGaps++; f.gaps += d.gaps.length; }
  }
  const totals = { drivers: drivers.length, multiChannel: drivers.filter((d) => d.channels > 1).length, gaps: drivers.reduce((n, d) => n + d.gaps.length, 0) };
  return { totals, families, drivers };
}

function render(a) {
  const L = ['# Family completeness per gang / channel / phase (P3075)', '',
    'Generated by `scripts/kb/family-completeness.js` (report-only, runs in validate.yml). Gaps are leads, not bugs:',
    'a shared meter on channel 1 only, or a generic Flow card, can be the right design.', '',
    `Drivers: ${a.totals.drivers} · multi-channel: ${a.totals.multiChannel} · gaps: ${a.totals.gaps}`, '',
    '| Family | Drivers | Multi-channel | Channels | Drivers with gaps | Gaps |', '|---|---:|---:|---:|---:|---:|'];
  for (const [f, s] of Object.entries(a.families).sort()) L.push(`| ${f} | ${s.drivers} | ${s.multiChannel} | ${s.channels} | ${s.withGaps} | ${s.gaps} |`);
  L.push('', '## Multi-channel drivers', '', '| Driver | Family | Ch | DPs | Per channel: caps / clusters / cards T-C-A | Gaps |', '|---|---|---:|---:|---|---|');
  for (const d of a.drivers.filter((x) => x.channels > 1)) {
    const per = d.perChannel.map((c) => `${c.ch}: ${c.caps.length} / ${c.clusters.length ? c.clusters.join(',') : (d.efOnly ? 'EF00' : '-')} / ${c.cards.triggers}-${c.cards.conditions}-${c.cards.actions}`).join('<br>');
    const g = d.gaps.map((x) => `${x.ch}:${x.kind}=${x.what}`).join(', ') || '—';
    L.push(`| ${d.id} | ${d.family} | ${d.channels} | ${d.dps === null ? '?' : d.dps} | ${per} | ${g} |`);
  }
  return `${L.join('\n')}\n`;
}

module.exports = { channelOf, cardChannels, analyseDriver, audit, render };

if (require.main === module) {
  const a = audit();
  const args = process.argv.slice(2);
  if (args.includes('--json')) { process.stdout.write(`${JSON.stringify(a, null, 2)}\n`); process.exit(0); }
  const line = `family-completeness: ${a.totals.drivers} drivers, ${a.totals.multiChannel} multi-channel, ${a.totals.gaps} gap lead(s)`;
  if (args.includes('--check')) {
    console.log(line);
    for (const [f, s] of Object.entries(a.families).sort()) if (s.gaps) console.log(`  ${f}: ${s.withGaps}/${s.drivers} drivers, ${s.gaps} gaps`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Family completeness (P3075)\n${line}\n`); } catch (_e) { /* best effort */ }
    }
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, render(a));
  console.log(`${line} → ${path.relative(ROOT, OUT)}`);
}
