'use strict';

/**
 * P3045 — invalid_flow_card_id hardening.
 * 1) safeFlowCard() returns the real card when declared, otherwise a no-op card, logs once, never throws.
 * 2) Static guard: every literal get*Card('<id>') whose id is NOT declared by the compose sources
 *    (.homeycompose/flow + drivers/*\/driver.flow.compose.json) must be reached through safeFlowCard,
 *    a try block, or an explicit isCardDeclared check. No card is deleted or renamed by this patch.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { safeFlowCard, _safeMissingLogged } = require(path.join(ROOT, 'lib/flow/FlowCardPresence'));

function fakeHomey(declared, { throwOn = null } = {}) {
  const logs = [];
  const mk = (id) => ({ id, registerRunListener() { return this; }, async trigger() { return true; } });
  const getter = (id) => { if (throwOn === id) { throw new Error(`Invalid Flow Card ID: ${id}`); } return mk(id); };
  return {
    logs,
    manifest: { flow: { triggers: declared.map((id) => ({ id })), conditions: [], actions: [] } },
    app: { log: (...a) => logs.push(a.join(' ')) },
    flow: { getTriggerCard: getter, getDeviceTriggerCard: getter, getConditionCard: getter, getActionCard: getter, getDeviceActionCard: getter, getDeviceConditionCard: getter },
  };
}

test('safeFlowCard returns the real card when declared', () => {
  const h = fakeHomey(['p3045_real']);
  const c = safeFlowCard(h, 'getDeviceTriggerCard', 'p3045_real');
  assert.strictEqual(c.id, 'p3045_real');
  assert.strictEqual(h.logs.length, 0);
});

test('safeFlowCard returns a no-op card for an undeclared id and logs once', async () => {
  _safeMissingLogged.clear();
  const h = fakeHomey(['other']);
  for (let i = 0; i < 50; i++) {
    const c = safeFlowCard(h, 'getTriggerCard', 'home_mode_changed');
    assert.strictEqual(c.__flowGuardNoop, true);
    assert.strictEqual(c.registerRunListener(() => {}), c);
    assert.strictEqual(await c.trigger({}, {}), false);
  }
  assert.strictEqual(h.logs.length, 1);
  assert.match(h.logs[0], /logged once/);
});

test('safeFlowCard never throws (getter throws, no flow api, bad getter)', () => {
  _safeMissingLogged.clear();
  const h = fakeHomey(['boom'], { throwOn: 'boom' });
  assert.strictEqual(safeFlowCard(h, 'getTriggerCard', 'boom').__flowGuardNoop, true);
  assert.strictEqual(safeFlowCard({}, 'getTriggerCard', 'x').__flowGuardNoop, true);
  assert.strictEqual(safeFlowCard(null, 'getTriggerCard', 'x').__flowGuardNoop, true);
  assert.strictEqual(safeFlowCard(h, 'nope', 'x').__flowGuardNoop, true);
});

function declaredFromCompose() {
  const d = { trigger: new Set(), condition: new Set(), action: new Set() };
  const K = { triggers: 'trigger', conditions: 'condition', actions: 'action' };
  for (const [dir, k] of Object.entries(K)) {
    const p = path.join(ROOT, '.homeycompose/flow', dir);
    if (!fs.existsSync(p)) { continue; }
    for (const f of fs.readdirSync(p)) {
      if (!f.endsWith('.json')) { continue; }
      try { const j = JSON.parse(fs.readFileSync(path.join(p, f), 'utf8')); d[k].add(j.id || f.replace(/\.json$/, '')); } catch (_e) { /* skip */ }
    }
  }
  const dd = path.join(ROOT, 'drivers');
  for (const drv of fs.readdirSync(dd)) {
    const p = path.join(dd, drv, 'driver.flow.compose.json');
    if (!fs.existsSync(p)) { continue; }
    let j; try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { continue; }
    for (const [key, k] of Object.entries(K)) { for (const c of j[key] || []) { if (c && c.id) { d[k].add(c.id); } } }
  }
  return d;
}

function walk(d) {
  if (!fs.existsSync(d)) { return []; }
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) { return e.name === 'node_modules' ? [] : walk(path.join(d, e.name)); }
    return e.name.endsWith('.js') ? [path.join(d, e.name)] : [];
  });
}

test('every literal access to an undeclared flow card is guarded', () => {
  const decl = declaredFromCompose();
  const total = decl.trigger.size + decl.condition.size + decl.action.size;
  assert.ok(total > 50, `compose sources look empty (${total})`);
  const files = [...walk(path.join(ROOT, 'lib')), ...walk(path.join(ROOT, 'drivers')), path.join(ROOT, 'app.js')];
  const re = /get(?:Device)?(Trigger|Condition|Action)Card\(\s*['"`]([a-z0-9_-]+)['"`]/g;
  const bad = [];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    const lines = s.split('\n');
    let m;
    while ((m = re.exec(s))) {
      if (decl[m[1].toLowerCase()].has(m[2])) { continue; }
      const ln = s.slice(0, m.index).split('\n').length;
      const ctx = lines.slice(Math.max(0, ln - 15), ln).join('\n');
      if (/\btry\b|isCardDeclared|safeFlowCard/.test(ctx)) { continue; }
      bad.push(`${m[1].toLowerCase()}:${m[2]} @ ${path.relative(ROOT, f)}:${ln}`);
    }
  }
  assert.deepStrictEqual(bad, [], `unguarded undeclared flow cards:\n${bad.join('\n')}`);
});
