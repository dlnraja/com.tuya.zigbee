'use strict';
// Breadcrumbs for a native JSON.parse abort. The before line is written
// first. JSON.parse is not replaced. A parse Homey does before app.js
// cannot appear here.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const trace = require('../../lib/utils/parse-trace');

function capture(fn) {
  const chunks = [];
  const orig = process.stderr.write;
  process.stderr.write = (c, ...a) => { chunks.push(String(c)); return orig.call(process.stderr, c, ...a); };
  try { return { out: fn(), text: chunks.join('') }; }
  finally { process.stderr.write = orig; }
}

async function captureAsync(fn) {
  const chunks = [];
  const orig = process.stderr.write;
  process.stderr.write = (c, ...a) => { chunks.push(String(c)); return orig.call(process.stderr, c, ...a); };
  try { return { out: await fn(), text: chunks.join('') }; }
  finally { process.stderr.write = orig; }
}

describe('P3275 parse breadcrumbs', () => {
  it('writes before, then after, and does not copy the payload', () => {
    trace._resetParseTraceForTests();
    const buf = Buffer.from(`{"k":"${'a'.repeat(9000)}"}`);
    const cap = capture(() => trace.parseJsonBuffer('fp-shard', buf));
    assert.equal(cap.out.k.length, 9000);
    const b = cap.text.indexOf('[PARSE] before id=fp-shard');
    const a = cap.text.indexOf('[PARSE] after id=fp-shard');
    assert.ok(b >= 0 && a > b);
    assert.match(cap.text, /bytes=\d+/);
    assert.equal(cap.text.includes('aaaa'), false);
    assert.equal(JSON.parse, JSON.parse);
  });

  it('logs an error category and rethrows the original exception', () => {
    trace._resetParseTraceForTests();
    const buf = Buffer.from('[' + '1,'.repeat(5000) + ']');
    const cap = capture(() => {
      try { trace.parseJsonBuffer('fp-shard', buf); }
      catch (err) { return err; }
    });
    assert.ok(cap.out instanceof SyntaxError);
    assert.match(cap.text, /\[PARSE\] error id=fp-shard .* cat=parse/);
    assert.equal(cap.text.includes('Unexpected'), false);
  });

  it('redacts unsafe ids, stops after the per-id cap, and survives a throwing memoryUsage', () => {
    trace._resetParseTraceForTests();
    const big = Buffer.from(`{"n":${'1'.repeat(9000)}}`);
    const cap = capture(() => {
      trace.beforeParse('kitchen/ieee aa:bb', big.length);
      for (let i = 0; i < 6; i++) {trace.beforeParse('fp-shard', big.length);}
    });
    assert.match(cap.text, /id=redacted/);
    assert.equal(cap.text.includes('kitchen'), false);
    assert.equal(cap.text.includes('aa:bb'), false);
    const marks = cap.text.split('[PARSE] before id=fp-shard').length - 1;
    assert.equal(marks, trace.MAX_PER_ID);
    const orig = process.memoryUsage;
    process.memoryUsage = () => { const e = new Error('ENOENT: uv_resident_set_memory'); e.code = 'ENOENT'; throw e; };
    try {
      const cap2 = capture(() => trace.beforeParse('driver-map', big.length));
      assert.match(cap2.text, /heap=-?\d+/);
    } finally { process.memoryUsage = orig; }
  });

  it('a child prints the before line and then aborts inside JSON.parse', () => {
    const child = `
      const t = require(${JSON.stringify(path.join(ROOT, 'lib/utils/parse-trace.js'))});
      t.beforeParse('abort-probe', 8192);
      const s = '[' + '1,'.repeat(8e6) + '0]';
      JSON.parse(s);
    `;
    const r = spawnSync(process.execPath, ['--max-old-space-size=32', '-e', child], { encoding: 'utf8' });
    assert.match(r.stderr || '', /\[PARSE\] before id=abort-probe /);
    assert.notEqual(r.status, 0);
    assert.equal((r.stderr || '').includes('[PARSE] after id=abort-probe'), false);
  });

  it('PARSE_TRACE=0 writes nothing and app.js does not replace JSON.parse', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.equal(src.includes('JSON.parse ='), false);
    assert.match(src, /parse-trace/);
    const prev = process.env.PARSE_TRACE;
    process.env.PARSE_TRACE = '0';
    trace._resetParseTraceForTests();
    try {
      const cap = capture(() => trace.beforeParse('fp-shard', 20000));
      assert.equal(cap.text, '');
    } finally {
      if (prev === undefined) {delete process.env.PARSE_TRACE;} else {process.env.PARSE_TRACE = prev;}
    }
    const ignore = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
    assert.equal(ignore.includes('lib/utils/parse-trace.js'), false);
  });

  it('two devices stay distinct, mfr and pid are kept, and a name is only a length', () => {
    trace._resetParseTraceForTests();
    const a = { id: 1 };
    const b = { id: 2 };
    const cap = capture(() => {
      trace.traceDevice('init', a, { driver: 'button_wireless_3', mfr: '_TZ3000_vsxvaj9i', pid: 'TS0043', dir: 'init' });
      trace.traceDevice('init', a, { driver: 'button_wireless_3', mfr: '_TZ3000_vsxvaj9i', pid: 'TS0043', dir: 'init' });
      trace.traceDevice('init', b, { driver: 'button_wireless_1', mfr: '_TZ3000_axpdxqgu', pid: 'TS0041', value: 'kitchen', dir: 'init' });
      trace.traceDevice('lookup', null, { driver: 'fingerprint', mfr: '_TZ3000_vsxvaj9i', pid: 'TS0043', dir: 'lookup' });
      trace.traceDevice('lookup', null, { driver: 'fingerprint', mfr: '_TZ3000_axpdxqgu', pid: 'TS0041', dir: 'lookup' });
      trace.phase('oninit-start', '1.0.230');
      const t0 = Date.now();
      while (Date.now() - t0 < 5) { /* duration sample */ }
      trace.phase('oninit-end', '1.0.230');
      trace.noteBudget({ shards: 2, shardCap: 32, shardHigh: 2, cache: 1, cacheCap: 24, cacheHigh: 1, cacheEvict: 0 });
    });
    assert.match(cap.text, /init dev=d1 .* mfr=_TZ3000_vsxvaj9i pid=TS0043/);
    assert.match(cap.text, /init dev=d2 .* mfr=_TZ3000_axpdxqgu pid=TS0041/);
    assert.match(cap.text, /lookup dev=d0 .* mfr=_TZ3000_vsxvaj9i pid=TS0043/);
    assert.match(cap.text, /lookup dev=d0 .* mfr=_TZ3000_axpdxqgu pid=TS0041/);
    assert.match(cap.text, /v=str:7/);
    assert.equal(cap.text.includes('kitchen'), false);
    assert.match(cap.text, /phase id=oninit-end note=1\.0\.230 ms=[1-9]/);
    assert.match(cap.text, /budget shards=2\/32 high=2 cache=1\/24/);
    const dev1 = cap.text.split('dev=d1').length - 1;
    assert.equal(dev1, 2);
  });

  it('a flood of unknown frames stays inside the line cap and drops the payload', () => {
    trace._resetParseTraceForTests();
    const secret = 'ieee-aa:bb:cc:dd:ee:ff-kitchen';
    const devices = [{}, {}, {}, {}];
    const cap = capture(() => {
      for (let i = 0; i < 80; i++) {
        trace.traceDevice('decode', devices[i % 4], { driver: 'switch_1gang', mfr: '_TZ3000_aa5t61rh', pid: 'TS0001', dp: i & 255, value: secret, dir: 'report' });
      }
    });
    const lines = cap.text.split('\n').filter(Boolean);
    assert.ok(lines.length <= trace.MAX_LINES);
    assert.equal(cap.text.includes(secret), false);
    assert.equal(cap.text.includes('aa:bb'), false);
    assert.match(cap.text, /v=str:\d+/);
    assert.match(cap.text, /\[PARSE\] drop /);
  });

  it('sendTuyaDP emits attempt then sent and calls the radio once', async () => {
    trace._resetParseTraceForTests();
    const calls = [];
    const device = {
      homey: {},
      driver: { id: 'button_wireless_3' },
      getSetting(k) { return k === 'zb_manufacturer_name' ? '_TZ3000_vsxvaj9i' : 'TS0043'; },
      zclNode: { endpoints: { 1: { clusters: { tuya: { datapoint: async () => { calls.push('radio'); } } } } } },
    };
    const Mgr = require('../../lib/tuya/TuyaEF00Manager');
    const mgr = Object.create(Mgr.prototype);
    mgr.device = device;
    mgr._log = () => {};
    mgr._error = () => {};
    mgr._normalizeDPTypeId = () => 2;
    mgr._stopIfUnreachable = () => false;
    const cap = await captureAsync(() => mgr.sendTuyaDP(1, 2, 1));
    assert.equal(calls.length, 1);
    assert.equal(cap.out, true);
    const attempt = cap.text.indexOf('tx-attempt');
    const sent = cap.text.indexOf('tx-sent');
    assert.ok(attempt >= 0 && sent > attempt);
    assert.match(cap.text, /mfr=_TZ3000_vsxvaj9i/);
    assert.match(cap.text, /dir=attempt/);
    assert.match(cap.text, /dir=sent/);
  });

  it('an unreachable device stops after one radio call and a timeout is not called offline', async () => {
    trace._resetParseTraceForTests();
    const Mgr = require('../../lib/tuya/TuyaEF00Manager');
    const calls = [];
    const device = {
      homey: {},
      driver: { id: 'switch_1gang' },
      getSetting(k) { return k === 'zb_manufacturer_name' ? '_TZ3000_aa5t61rh' : 'TS0001'; },
      zclNode: { endpoints: { 1: { clusters: { tuya: { datapoint: async () => { calls.push('radio'); throw new Error("Impossible de joindre l'appareil"); } } }, sendFrame: async () => { calls.push('frame'); } } } },
    };
    const mgr = Object.create(Mgr.prototype);
    mgr.device = device;
    mgr._log = () => {};
    mgr._error = () => {};
    mgr._normalizeDPTypeId = () => 2;
    mgr._stopIfUnreachable = Mgr.prototype._stopIfUnreachable;
    const off = await captureAsync(() => mgr.sendTuyaDP(1, 2, 1));
    assert.deepEqual(calls, ['radio']);
    assert.equal(off.out, false);
    assert.match(off.text, /dir=offline/);
    assert.equal(off.text.includes('joindre'), false);

    calls.length = 0;
    device.zclNode.endpoints[1].clusters.tuya.datapoint = async () => { calls.push('radio'); throw new Error('timed out'); };
    device.zclNode.endpoints[1].sendFrame = async () => { calls.push('frame'); throw new Error('timed out'); };
    const timed = await captureAsync(() => mgr.sendTuyaDP(2, 2, 0));
    assert.deepEqual(calls, ['radio', 'frame']);
    assert.match(timed.text, /dir=timeout/);
    assert.equal(timed.text.includes('timed out'), false);
  });

  it('looking up many real couples keeps the shard ceiling and still resolves a house button', () => {
    const db = require('../../lib/tuya/DeviceFingerprintDB');
    const dir = db.FP_SHARDS_DIR;
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json') && name !== 'manifest.json');
    assert.ok(files.length > 100);
    const couples = [];
    for (const name of files) {
      if (couples.length >= 48) {break;}
      if (files.indexOf(name) % 4 !== 0) {continue;}
      const data = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      const mfr = Object.keys(data)[0];
      if (!mfr) {continue;}
      const pid = (data[mfr].modelIds && data[mfr].modelIds[0]) || '';
      couples.push([mfr, pid]);
    }
    assert.ok(couples.length >= 40);
    const before = process.memoryUsage().heapUsed;
    const prev = process.env.PARSE_TRACE;
    process.env.PARSE_TRACE = '0';
    try {
      for (const [mfr, pid] of couples) {db.getFingerprint(mfr, pid);}
    } finally {
      if (prev === undefined) {delete process.env.PARSE_TRACE;} else {process.env.PARSE_TRACE = prev;}
    }
    const house = db.getFingerprint('_TZ3000_axpdxqgu', 'TS0041');
    assert.equal(typeof (house && house.driverId), 'string');
    assert.ok(house.driverId.length > 0);
    const snap = db.runtimeBudgetSnapshot();
    const grew = process.memoryUsage().heapUsed - before;
    assert.ok(snap.shards <= snap.shardCap + 1, JSON.stringify(snap));
    assert.ok(snap.shardHigh <= snap.shardCap + 1, JSON.stringify(snap));
    assert.ok(snap.shards < 100, JSON.stringify(snap));
    assert.ok(grew < 25 * 1024 * 1024, `heap grew ${grew} snap ${JSON.stringify(snap)}`);
    console.log(`P3275 catalog couples=${couples.length} shards=${snap.shards} high=${snap.shardHigh} cap=${snap.shardCap} heapGrew=${grew}`);
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/parse-trace.js'), 'utf8');
    assert.equal(src.includes('process.exit'), false);
    assert.equal(src.includes('setInterval'), false);
    assert.equal(src.includes('heapdump'), false);
  });
});
