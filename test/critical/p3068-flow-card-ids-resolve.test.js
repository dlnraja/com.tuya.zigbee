'use strict';
// P3068 — every literal Flow card id used in shipped code resolves against the composed manifest
// (.homeycompose/flow/* + drivers/*/driver.flow.compose.json = what `homey app build` publishes).
// WHY: Bastien diag 18/10 (v1.0.161) logged "Invalid Flow Card ID" for home_mode_changed,
// capability_value_changed_generic and device_interaction on every relay event before the OOM.
// Known unresolved ids (legacy helpers, covered by the app.js FLOW-GUARD noop) are frozen in
// test/fixtures/p3068-flow-unresolved-baseline.json: a NEW unresolved literal id fails this test.
// The FLOW-GUARD now caches rejected ids (no Homey call / throw per event).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const K = { triggers: 'trigger', conditions: 'condition', actions: 'action' };
const SKIP = new Set(['node_modules', '.git', 'test', 'tests', 'scripts', '.homeybuild', 'docs', '.github', 'tools', 'data', 'archive', '.archive']);

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { return null; } }

function appCards(ids) {
  for (const [k, v] of Object.entries(K)) {
    const d = path.join(ROOT, '.homeycompose/flow', k);
    if (!fs.existsSync(d)) { continue; }
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.json')) { continue; }
      const j = readJson(path.join(d, f));
      if (j) { ids[v].add(j.id || f.slice(0, -5)); }
    }
  }
}

function declared() {
  const ids = { trigger: new Set(), condition: new Set(), action: new Set() };
  appCards(ids);
  for (const dr of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', dr, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) { continue; }
    const j = readJson(f) || {};
    for (const [k, v] of Object.entries(K)) { for (const c of j[k] || []) { if (c && c.id) { ids[v].add(c.id); } } }
  }
  return ids;
}

function used() {
  const out = [];
  const re = /get(?:Device)?(Trigger|Condition|Action)Card\(\s*(['"])([^'"]+)\2\s*\)/g;
  (function walk(p) {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (SKIP.has(e.name)) { continue; }
      const f = path.join(p, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      if (!e.name.endsWith('.js')) { continue; }
      const s = fs.readFileSync(f, 'utf8');
      for (let m = re.exec(s); m; m = re.exec(s)) { out.push({ file: path.relative(ROOT, f), kind: m[1].toLowerCase(), id: m[3] }); }
    }
  })(ROOT);
  return out;
}

function unresolved() {
  const ids = declared();
  const set = new Set();
  for (const u of used()) { if (!ids[u.kind].has(u.id)) { set.add(`${u.file} ${u.kind} ${u.id}`); } }
  return [...set].sort();
}

test('composed manifest is readable and large enough to be the real one', () => {
  const ids = declared();
  assert.ok(ids.trigger.size > 500 && ids.action.size > 100, JSON.stringify([ids.trigger.size, ids.action.size]));
});

test('no NEW unresolved literal Flow card id in shipped code (baseline ratchet)', () => {
  const base = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/p3068-flow-unresolved-baseline.json'), 'utf8')).unresolved);
  const fresh = unresolved().filter((x) => !base.has(x));
  assert.deepStrictEqual(fresh, [], `declare these cards in .homeycompose or use safeFlowCard/isCardDeclared:\n${fresh.join('\n')}`);
});

test('Bastien diag ids are declared, or every call site is guarded by isCardDeclared', () => {
  const ids = declared();
  for (const id of ['home_mode_changed', 'capability_value_changed_generic', 'device_interaction']) {
    if (ids.trigger.has(id)) { continue; }
    for (const u of used().filter((x) => x.id === id)) {
      const src = fs.readFileSync(path.join(ROOT, u.file), 'utf8');
      assert.match(src, new RegExp(`isCardDeclared\\(this\\.homey, 'trigger', '${id}'\\)`), `${u.file} calls undeclared ${id} unguarded`);
    }
  }
});

test('app.js FLOW-GUARD: a rejected id is answered from the negative cache (Homey called once, logged once)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const a = src.indexOf('const flow = this.homey.flow;');
  const endMark = 'try { flow[m] = wrapped; } catch (_e) { /* flow methods may be non-writable */ }';
  const b = src.indexOf(endMark, a);
  assert.ok(a > 0 && b > a, 'guard block found');
  const body = `${src.slice(a, b + endMark.length)}\n}`;
  delete global.__tuyaFlowGuardFailed; delete global.__tuyaFlowGuardMissingLogged;
  let calls = 0; const logs = [];
  const flow = {
    getTriggerCard(id) { calls += 1; if (id === 'ok') { return { id }; } throw new Error(`Invalid Flow Card ID: ${id}`); },
    getActionCard(id) { return { id }; }, getConditionCard(id) { return { id }; },
  };
  const ctx = { homey: { flow }, log: (...x) => logs.push(x.join(' ')) };
  new Function(body).call(ctx); // eslint-disable-line no-new-func
  for (let i = 0; i < 50; i++) { assert.strictEqual(flow.getTriggerCard('home_mode_changed').__flowGuardNoop, true); }
  assert.strictEqual(calls, 1, 'Homey getter called once for a rejected id');
  assert.strictEqual(logs.filter((l) => l.includes('home_mode_changed')).length, 1);
  assert.strictEqual(flow.getTriggerCard('ok').id, 'ok');
  assert.strictEqual(flow.getTriggerCard('ok').id, 'ok');
  assert.strictEqual(calls, 3, 'declared ids are never cached as failures');
  delete global.__tuyaFlowGuardFailed; delete global.__tuyaFlowGuardMissingLogged;
});

module.exports = { unresolved };
