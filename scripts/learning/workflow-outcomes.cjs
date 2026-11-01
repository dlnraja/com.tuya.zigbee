#!/usr/bin/env node
'use strict';
/**
 * P3113 (t664u) — every workflow feeds one bounded learning ledger (no AI, no network).
 *
 * Reads the automation journal incrementally (watermark = last `at` already learned) and keeps,
 * per workflow, counters + the last outcomes + a fail streak in data/learning/workflow-outcomes.json.
 * From that it derives an advisory `hint` per workflow: 'backoff' after 3 failures in a row,
 * 'relax' after 10 green runs in a row, else 'normal'. Hints are proposals only: nothing here edits
 * a workflow, a gate, a schedule or a rule; schedulers that want to adapt read the hint themselves.
 * Bounded: max 150 workflows (least recently seen evicted), 10 outcomes each, 600 seen keys.
 *
 * CLI: node scripts/learning/workflow-outcomes.cjs [--journal=F] [--ledger=F] [--dry] [--report]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const JOURNAL = path.join(ROOT, 'data', 'progress', 'automation-journal.jsonl');
const LEDGER = path.join(ROOT, 'data', 'learning', 'workflow-outcomes.json');
const MAX_WF = 150;
const MAX_LAST = 10;
const MAX_SEEN = 600;
const BACKOFF_STREAK = 3;
const RELAX_STREAK = 10;
const OUTCOME = { ok: 'ok', recovered: 'ok', fail: 'fail', transient: 'transient', warn: 'warn' };

function emptyLedger() { return { version: 1, watermark: null, seen: [], workflows: {} }; }

function loadLedger(file) {
  try {
    const l = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (l && typeof l === 'object' && l.workflows && typeof l.workflows === 'object') {
      return { ...emptyLedger(), ...l, seen: Array.isArray(l.seen) ? l.seen : [] };
    }
  } catch (_) { /* missing or corrupt: start fresh, never throw */ }
  return emptyLedger();
}

function wfName(e) {
  const d = e && e.data && typeof e.data === 'object' ? e.data : {};
  const raw = typeof d.wf === 'string' && d.wf ? d.wf : e.workflow;
  return String(raw || '').replace(/^\.github\/workflows\//, '').slice(0, 80);
}

function hintFor(w) {
  if (w.failStreak >= BACKOFF_STREAK) return 'backoff';
  if (w.okStreak >= RELAX_STREAK) return 'relax';
  return 'normal';
}

function learn(ledger, entries) {
  const seen = new Set(ledger.seen);
  let added = 0;
  for (const e of entries) {
    if (!e || typeof e.at !== 'string' || !OUTCOME[e.status]) continue;
    if (ledger.watermark && e.at < ledger.watermark) continue;
    const key = String(e.key || `${e.workflow}:${e.at}`).slice(0, 120);
    if (seen.has(key)) continue;
    const name = wfName(e);
    if (!name) continue;
    seen.add(key);
    const o = OUTCOME[e.status];
    const w = ledger.workflows[name] || { ok: 0, fail: 0, transient: 0, warn: 0, okStreak: 0, failStreak: 0, last: [], lastAt: null };
    w[o] = (w[o] || 0) + 1;
    if (o === 'ok') { w.okStreak += 1; w.failStreak = 0; }
    else if (o === 'fail') { w.failStreak += 1; w.okStreak = 0; }
    w.last = [...w.last, o].slice(-MAX_LAST);
    if (!w.lastAt || e.at > w.lastAt) w.lastAt = e.at;
    w.hint = hintFor(w);
    ledger.workflows[name] = w;
    if (!ledger.watermark || e.at > ledger.watermark) ledger.watermark = e.at;
    added++;
  }
  const names = Object.keys(ledger.workflows);
  if (names.length > MAX_WF) {
    names.sort((a, b) => String(ledger.workflows[a].lastAt).localeCompare(String(ledger.workflows[b].lastAt)));
    for (const n of names.slice(0, names.length - MAX_WF)) delete ledger.workflows[n];
  }
  ledger.seen = [...seen].slice(-MAX_SEEN);
  return added;
}

function readJournal(file) {
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (_) { /* skip bad line */ }
  }
  return out;
}

function main(argv) {
  const arg = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const ledgerFile = arg('ledger', LEDGER);
  const ledger = loadLedger(ledgerFile);
  const added = learn(ledger, readJournal(arg('journal', JOURNAL)));
  if (!argv.includes('--dry')) {
    fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
    fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 1)}\n`);
  }
  if (argv.includes('--report')) {
    const back = Object.entries(ledger.workflows).filter(([, w]) => w.hint === 'backoff').map(([n]) => n);
    console.log(`[workflow-outcomes] +${added} outcome(s); ${Object.keys(ledger.workflows).length} workflow(s); backoff: ${back.join(', ') || 'none'}`);
  }
  return added;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { learn, loadLedger, hintFor, emptyLedger, MAX_WF, MAX_LAST };
