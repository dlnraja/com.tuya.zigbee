'use strict';
/**
 * P3095 (31/10/2026, owner request): automatic AggregateError self-fix for held drivers.
 *
 * Loop (one step per Athom upload, never more often than the P3036 gate allows):
 *   - a released group reaches Test        -> every id leaves config/publish-hold-drivers.json
 *   - a released group gets AggregateError -> the group stays held, is cut in half, the first half
 *                                             is released at the next allowed slot, the second is queued
 *   - a single id gets AggregateError      -> it stays held, ledger row + diagnostic note, loop moves on
 *   - other failures (hang up, unknown)    -> nothing changes here (P3036 transient retry owns them)
 * Max 3 attempts per signature (sorted id list); after that the group stays held and the loop skips it.
 * The P3036 gate/breaker is untouched: this only decides WHAT is released, never WHEN.
 * No Athom contact: it only reads the outcome the workflow already classified.
 *
 * State: config/publish-hold-bisect-state.json { queue: [[ids]], attempts: {sig: n}, isolated: [ids], pending: {ids, at} }.
 * CLI: seed | dispatch (cron/workflow_run, prints RELEASE=<ids>)
 *      resolve            -> prints PUBLISH_HOLD_RELEASE=<ids> (input wins, else queue head) for $GITHUB_ENV
 *      after <test|AggregateError|other> [version] [build] [run]
 */
const fs = require('fs');
const path = require('path');

const MAX_ATTEMPTS = 3;
const ROOT = path.resolve(__dirname, '..', '..');
const F = {
  hold: 'config/publish-hold-drivers.json',
  state: 'config/publish-hold-bisect-state.json',
  ledger: 'docs/knowledge/athom-publish-outcomes.jsonl',
  notes: 'docs/status/publish-hold-isolated',
};

const parse = (v) => [...new Set(String(v || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
const sig = (ids) => ids.slice().sort().join(',');
const emptyState = () => ({ queue: [], attempts: {}, isolated: [], pending: null });
const PENDING_TTL_MS = 6 * 3600000;

function normState(s) {
  const o = s && typeof s === 'object' ? s : {};
  return {
    queue: Array.isArray(o.queue) ? o.queue.filter((g) => Array.isArray(g) && g.length) : [],
    attempts: o.attempts && typeof o.attempts === 'object' ? { ...o.attempts } : {},
    isolated: Array.isArray(o.isolated) ? o.isolated.slice() : [],
    pending: o.pending && Array.isArray(o.pending.ids) && o.pending.ids.length ? { ids: o.pending.ids.slice(), at: o.pending.at || null } : null,
  };
}

/** Next group to release: explicit input wins; else first queued group still held and under the attempt cap. */
function resolveRelease({ input, state, heldIds }) {
  const explicit = parse(input);
  if (explicit.length) return explicit;
  const held = new Set(heldIds || []);
  const st = normState(state);
  for (const g of st.queue) {
    const live = g.filter((id) => held.has(id) && !st.isolated.includes(id));
    if (live.length && (st.attempts[sig(live)] || 0) < MAX_ATTEMPTS) return live;
  }
  return [];
}

/**
 * Pure decision. outcome: 'test' | 'AggregateError' | other.
 * Returns { state, accept: [ids leaving the hold], isolate: id|null, next: [ids]|[], note }.
 */
function decide({ released, outcome, state, heldIds }) {
  const st = normState(state);
  st.pending = null; // an outcome (whatever it is) closes the pending dispatch
  const group = parse(released).filter((id) => !heldIds || heldIds.includes(id));
  const res = { state: st, accept: [], isolate: null, next: [], note: '' };
  if (!group.length) { res.note = 'no released group: nothing to do'; return res; }
  const s = sig(group);
  st.attempts[s] = (st.attempts[s] || 0) + 1;
  // drop this group (and any sub-group of it already consumed) from the queue head
  st.queue = st.queue.filter((g) => sig(g) !== s);
  if (/^test$/i.test(outcome)) {
    res.accept = group;
    res.note = `group of ${group.length} accepted (Test): removed from hold`;
  } else if (/AggregateError/i.test(outcome)) {
    if (group.length === 1) {
      res.isolate = group[0];
      if (!st.isolated.includes(group[0])) st.isolated.push(group[0]);
      res.note = `isolated ${group[0]}: kept on hold`;
    } else if (st.attempts[s] > MAX_ATTEMPTS) {
      res.note = `signature ${s} reached ${MAX_ATTEMPTS} attempts: kept on hold, loop skips it`;
    } else {
      const half = Math.ceil(group.length / 2);
      const a = group.slice(0, half); const b = group.slice(half);
      st.queue = [a, b, ...st.queue];
      res.note = `AggregateError on ${group.length}: split ${a.length}+${b.length}`;
    }
  } else {
    st.attempts[s] -= 1; // not a content verdict: does not count
    res.note = `outcome ${outcome || 'unknown'}: no bisect step (transient path owns it)`;
    return res;
  }
  const remaining = (heldIds || []).filter((id) => !res.accept.includes(id));
  res.next = resolveRelease({ input: '', state: st, heldIds: remaining });
  return res;
}

/**
 * Cron / workflow_run: should we dispatch auto-publish with the next group now?
 * Never while a group is pending (unless stale > 6 h), never while an auto-publish run is active.
 * The P3036 gate inside auto-publish still decides the slot (spacing, cap, breaker, green CI).
 */
function dispatchDecision({ state, heldIds, activeRuns = 0, now = Date.now() }) {
  const st = normState(state);
  if (st.pending) {
    const age = now - (Date.parse(st.pending.at) || 0);
    if (age < PENDING_TTL_MS) return { dispatch: false, reason: `group ${st.pending.ids.join(',')} pending (${Math.round(age / 60000)} min)`, state: st };
    st.pending = null; // stale: the run never reported, re-release the same queue head
  }
  if (activeRuns > 0) return { dispatch: false, reason: 'an auto-publish run is active', state: st };
  const ids = resolveRelease({ input: '', state: st, heldIds });
  if (!ids.length) return { dispatch: false, reason: 'queue empty', state: st };
  st.pending = { ids, at: new Date(now).toISOString() };
  return { dispatch: true, ids, reason: `release ${ids.length}: ${ids.join(',')}`, state: st };
}

/** Seed the queue with the whole hold list (first group = first half) when nothing is queued yet. */
function seed({ state, heldIds }) {
  const st = normState(state);
  const known = new Set([...st.queue.flat(), ...st.isolated]);
  const fresh = (heldIds || []).filter((id) => !known.has(id));
  if (fresh.length) st.queue.push(fresh);
  return st;
}

function readJson(rel, d) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (_) { return d; } }
function writeJson(rel, v) { fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(v, null, 2) + '\n'); }
const heldOf = (hold) => (hold && Array.isArray(hold.drivers) ? hold.drivers.map((d) => d && d.id).filter(Boolean) : []);

function main(argv) {
  const [cmd, outcome, version, build, run] = argv;
  const hold = readJson(F.hold, { drivers: [] });
  const state = readJson(F.state, emptyState());
  if (cmd === 'resolve') {
    // input wins; else the pending group (a P3036 deferred re-dispatch carries only the ref, not release_held)
    const st = normState(state); const held = new Set(heldOf(hold));
    const ids = parse(process.env.PUBLISH_HOLD_RELEASE).length ? parse(process.env.PUBLISH_HOLD_RELEASE)
      : (st.pending ? st.pending.ids.filter((id) => held.has(id)) : []);
    if (ids.length) console.log(`PUBLISH_HOLD_RELEASE=${ids.join(',')}`);
    return 0;
  }
  if (cmd === 'seed') { writeJson(F.state, seed({ state, heldIds: heldOf(hold) })); console.log('[p3095] seeded'); return 0; }
  if (cmd === 'dispatch') {
    const d = dispatchDecision({ state, heldIds: heldOf(hold), activeRuns: Number(process.env.ACTIVE_RUNS || 0) });
    console.log(`[p3095] ${d.dispatch ? 'DISPATCH' : 'wait'}: ${d.reason}`);
    writeJson(F.state, d.state);
    if (d.dispatch) console.log(`RELEASE=${d.ids.join(',')}`);
    return 0;
  }
  if (cmd !== 'after') { console.error('usage: resolve | after <outcome> [version] [build] [run]'); return 2; }
  const d = decide({ released: process.env.PUBLISH_HOLD_RELEASE, outcome, state, heldIds: heldOf(hold) });
  console.log(`[p3095] ${d.note}${d.next.length ? ` | next: ${d.next.join(',')}` : ''}`);
  if (/^no released group/.test(d.note) || /transient path/.test(d.note)) return 0;
  if (d.accept.length) { hold.drivers = hold.drivers.filter((x) => !d.accept.includes(x && x.id)); writeJson(F.hold, hold); }
  writeJson(F.state, d.state);
  const row = { at: new Date().toISOString(), app_id: 'com.dlnraja.tuya.zigbee', version: version || null, buildId: build ? Number(build) || build : null,
    state: /^test$/i.test(outcome) ? 'test' : 'processing_failed', kind: /^test$/i.test(outcome) ? 'ok' : outcome,
    run: run || null, p3095: { released: parse(process.env.PUBLISH_HOLD_RELEASE), accepted: d.accept, isolated: d.isolate, next: d.next, note: d.note } };
  fs.appendFileSync(path.join(ROOT, F.ledger), JSON.stringify(row) + '\n');
  if (d.isolate) {
    fs.mkdirSync(path.join(ROOT, F.notes), { recursive: true });
    fs.writeFileSync(path.join(ROOT, F.notes, `${d.isolate}.md`),
      `# ${d.isolate}: isolated by the P3095 hold bisect\n\n- Date (UTC): ${row.at}\n- Build: ${build || '?'} v${version || '?'} run ${run || '?'}\n` +
      `- Athom result: AggregateError with only this driver released, so it stays in config/publish-hold-drivers.json.\n` +
      `- Next: check its driver.compose.json (fingerprints, capabilities, settings, images, flow cards) against a Test build; no Athom contact.\n`);
  }
  if (d.next.length) console.log(`NEXT=${d.next.join(',')}`);
  return 0;
}

module.exports = { MAX_ATTEMPTS, PENDING_TTL_MS, parse, sig, resolveRelease, decide, dispatchDecision, seed, F };
if (require.main === module) process.exit(main(process.argv.slice(2)));
