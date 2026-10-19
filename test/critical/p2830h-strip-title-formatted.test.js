'use strict';
// P2830h: the publish-only titleFormatted strip must be lossless (homey-lib ignores the removed field).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { stripRedundantTitleFormatted, isRedundant } = require('../../scripts/maintenance/strip-redundant-title-formatted.cjs');

const T = (en) => ({ en, fr: en + ' fr' });
const dev = { name: 'device', type: 'device', filter: 'driver_id=x' };

describe('P2830h strip redundant titleFormatted', () => {
  it('removes it only when no visible arg, no droptoken, no placeholder', () => {
    assert.strictEqual(isRedundant({ title: T('a'), titleFormatted: T('a'), args: [dev] }), true);
    assert.strictEqual(isRedundant({ title: T('a'), titleFormatted: T('a') }), true);
    assert.strictEqual(isRedundant({ title: T('a'), titleFormatted: T('a [[v]]'), args: [dev, { name: 'v', type: 'number' }] }), false);
    assert.strictEqual(isRedundant({ title: T('a'), titleFormatted: T('a'), args: [{ name: 'device', type: 'device', filter: 'capabilities=onoff' }] }), false);
    assert.strictEqual(isRedundant({ title: T('a'), titleFormatted: T('a'), args: [dev, { ...dev }] }), false);
    assert.strictEqual(isRedundant({ title: T('a'), titleFormatted: T('a'), droptoken: ['number'] }), false);
    assert.strictEqual(isRedundant({ title: T('a'), titleFormatted: T('a [[device]]'), args: [dev] }), false);
  });

  it('keeps ids, args, tokens and titles intact', () => {
    const m = { flow: { triggers: [{ id: 't', title: T('a'), titleFormatted: T('a'), args: [dev], tokens: [{ name: 'k' }] }], actions: [{ id: 'x', title: T('b'), titleFormatted: T('b [[n]]'), args: [{ name: 'n', type: 'number' }] }] } };
    const before = JSON.parse(JSON.stringify(m));
    const r = stripRedundantTitleFormatted(m);
    assert.strictEqual(r.removed, 1);
    delete before.flow.triggers[0].titleFormatted;
    assert.deepStrictEqual(m, before);
  });

  it('is wired into prepare-publish before the 4 MB check', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../scripts/prepare-publish.js'), 'utf8');
    const i = src.indexOf('strip-redundant-title-formatted.cjs');
    assert.ok(i > 0);
    assert.ok(i < src.indexOf('post Zigbee matrix compact'));
  });
});
