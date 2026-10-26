'use strict';
// P3068: static memory-hazard ratchet — new unbounded this./module-level Map/Set/array, raw (ownerless)
// setInterval/setTimeout, and untruncated JSON.stringify in report/DP/frame handlers may not be added.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { scanSource, scanAll, regressions, BASELINE } = require('../../scripts/ci/memory-hazard-ratchet.js');

const count = (src, rule) => scanSource(src).hits[rule].length;

test('detector: unbounded collections (filled, never shrunk) vs bounded / local ones', () => {
  assert.strictEqual(count('class A{constructor(){this.m=new Map()} on(k,v){this.m.set(k,v)}}', 'unbounded-collection'), 1);
  assert.strictEqual(count('const cache=[];function f(x){cache.push(x)}', 'unbounded-collection'), 1);
  assert.strictEqual(count('class A{constructor(){this.m=new Map()} on(k,v){this.m.set(k,v);if(this.m.size>100)this.m.delete(this.m.keys().next().value)}}', 'unbounded-collection'), 0);
  assert.strictEqual(count('class A{constructor(){this.s=new Set()} on(k){this.s.add(k)} onUninit(){this.s.clear()}}', 'unbounded-collection'), 0);
  assert.strictEqual(count('function f(a){const out=[];for(const x of a)out.push(x);return out}', 'unbounded-collection'), 0);
});

test('detector: raw timers vs owned timers and promise delays', () => {
  assert.strictEqual(count('class A{start(){setInterval(()=>this.poll(),1000)}}', 'raw-timer'), 1);
  assert.strictEqual(count('class A{start(){global.setTimeout(()=>this.x(),5)}}', 'raw-timer'), 1);
  assert.strictEqual(count('class A{start(){this.homey.setInterval(()=>this.poll(),1000)}}', 'raw-timer'), 0);
  assert.strictEqual(count('async function d(){await new Promise((r)=>setTimeout(r,100))}', 'raw-timer'), 0);
});

test('detector: JSON.stringify in hot handlers unless truncated', () => {
  assert.strictEqual(count('class A{onDataReport(f){this.log(JSON.stringify(f))}}', 'hot-stringify'), 1);
  assert.strictEqual(count('class A{onDataReport(f){this.log(JSON.stringify(f).slice(0,200))}}', 'hot-stringify'), 0);
  assert.strictEqual(count('class A{onSettings(s){this.log(JSON.stringify(s))}}', 'hot-stringify'), 0);
});

test('ratchet: app.js, lib/, drivers/ add no memory hazard over the frozen baseline', { timeout: 120000 }, () => {
  assert.ok(fs.existsSync(BASELINE), 'baseline missing');
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')).files;
  const cur = scanAll();
  assert.deepStrictEqual(cur.parseErrors, [], 'files the scanner cannot parse escape the ratchet');
  const reg = regressions(cur.files, base);
  assert.deepStrictEqual(reg, [], `new memory hazards (bound the collection / use this.homey timers / truncate the stringify):\n${reg.join('\n')}`);
});
