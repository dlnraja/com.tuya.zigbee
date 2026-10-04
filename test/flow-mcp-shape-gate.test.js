'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { checkCard, run } = require('../tools/ci/flow-mcp-shape-gate');

describe('flow MCP shape gate (ChatGPT / Homey MCP)', function () {
  this.timeout(30000);
  it('flags dropdown values without title (label-only) and string droptoken', () => {
    const issues = [];
    checkCard({ id: 'x', title: { en: 'X' }, droptoken: 'number', args: [{ type: 'dropdown', name: 'd', values: [{ id: 'a', label: { en: 'A' } }] }] }, 'x', issues);
    assert.strictEqual(issues.length, 2);
  });
  it('accepts documented { id, title } values', () => {
    const issues = [];
    checkCard({ id: 'x', title: { en: 'X' }, args: [{ type: 'dropdown', name: 'd', values: [{ id: 'a', title: { en: 'A' }, label: { en: 'A' } }] }] }, 'x', issues);
    assert.deepStrictEqual(issues, []);
  });
  it('repo flow cards are clean', () => {
    assert.deepStrictEqual(run(), []);
  });
});
