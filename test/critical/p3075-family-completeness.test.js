'use strict';
// P3075 (t613u): per-family completeness per gang / channel / phase (DPs, clusters, capabilities, flow cards).
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const F = require(path.join(ROOT, 'scripts', 'kb', 'family-completeness.js'));

describe('P3075 family completeness report', () => {
  it('reads channels from sub-capability suffixes, not from option suffixes', () => {
    assert.strictEqual(F.channelOf('onoff'), '1');
    assert.strictEqual(F.channelOf('onoff.gang2'), '2');
    assert.strictEqual(F.channelOf('measure_power.l3'), '3');
    assert.strictEqual(F.channelOf('measure_current.phase_b'), '2');
    assert.strictEqual(F.channelOf('target_temperature.max'), null);
  });
  it('flow cards serve the channel in their id, or every channel through a gang/channel argument', () => {
    assert.deepStrictEqual(F.cardChannels({ id: 'x_gang3_turned_on' }, ['1', '2', '3']), ['3']);
    assert.deepStrictEqual(F.cardChannels({ id: 'x_turn_on', args: [{ name: 'gang' }] }, ['1', '2']), ['1', '2']);
    assert.strictEqual(F.cardChannels({ id: 'x_identify' }, ['1', '2']), null);
  });
  it('flags a channel missing a capability or a card kind that its siblings have', () => {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'p3075fc-'));
    const d = path.join(tmp, 'fake_3gang');
    fs.mkdirSync(d);
    fs.writeFileSync(path.join(d, 'driver.compose.json'), JSON.stringify({ class: 'socket',
      capabilities: ['onoff', 'onoff.gang2', 'onoff.gang3', 'measure_power', 'measure_power.gang2'],
      zigbee: { productId: ['TS0003'], endpoints: { 1: { clusters: [0, 6] }, 2: { clusters: [6] } } } }));
    fs.writeFileSync(path.join(d, 'driver.flow.compose.json'), JSON.stringify({ triggers: [{ id: 'f_gang1_on' }, { id: 'f_gang2_on' }] }));
    const a = F.analyseDriver(d);
    fs.rmSync(tmp, { recursive: true, force: true });
    assert.strictEqual(a.channels, 3);
    const g = a.gaps.map((x) => `${x.ch}:${x.kind}:${x.what}`);
    assert.ok(g.includes('3:capability:measure_power'), g.join(' '));
    assert.ok(g.includes('3:flow:triggers'), g.join(' '));
    assert.ok(g.some((x) => x.startsWith('*:endpoint')), g.join(' '));
  });
  it('runs on the real drivers and is wired in the validate workflow', () => {
    const a = F.audit();
    assert.ok(a.totals.drivers > 100 && a.totals.multiChannel > 5, JSON.stringify(a.totals));
    const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'validate.yml'), 'utf8');
    assert.ok(wf.includes('scripts/kb/family-completeness.js --check'));
  });
});
