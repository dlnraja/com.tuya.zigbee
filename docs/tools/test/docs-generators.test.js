'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const D = require('../data');
const md = require('../md');
const site = require('../build-site');
const readme = require('../build-readme');
const links = require('../check-links');

const APP = {
  id: 'com.dlnraja.tuya.zigbee', version: '9.9.9', name: { en: 'Universal Tuya' },
  drivers: [
    { id: 'switch_1gang', name: { en: 'Switch' }, class: 'socket', capabilities: ['onoff'], zigbee: { manufacturerName: ['_TZ3000_abc', '_tz3000_ABC', '_TZ3000_def'], productId: ['TS0001'] } },
    { id: 'wifi_plug', name: { en: 'Plug' }, class: 'socket', capabilities: ['onoff', 'measure_power'], connectivity: ['lan'] },
  ],
};

test('collectDevices dedups case-insensitively and links to the compose of the branch', () => {
  const d = D.collectDevices(APP, 'stable-v5');
  assert.strictEqual(d.length, 2);
  assert.deepStrictEqual(d[0].mfrs, ['_TZ3000_abc', '_TZ3000_def']);
  assert.strictEqual(d[1].protocol, 'wifi');
  assert.match(d[0].source, /blob\/stable-v5\/drivers\/switch_1gang\/driver\.compose\.json$/);
});

test('stats are computed, not typed', () => {
  const s = D.stats(D.collectDevices(APP));
  assert.deepStrictEqual([s.drivers, s.zigbee, s.wifi, s.manufacturers, s.productIds], [2, 1, 1, 2, 1]);
});

test('branchFromAppId maps the three apps', () => {
  assert.strictEqual(D.branchFromAppId('com.dlnraja.tuya.zigbee'), 'master');
  assert.strictEqual(D.branchFromAppId('com.dlnraja.tuya.zigbee.stable'), 'stable-v5');
  assert.strictEqual(D.branchFromAppId('com.dlnraja.tuya.zigbee.bastien'), 'bastien-home');
});

test('scrub removes personal data', () => {
  const s = D.scrub('mail a.b@example.com id 123e4567-e89b-12d3-a456-426614174000 ip 192.168.1.20 localKey: abcdef123456');
  assert.ok(!/example\.com|123e4567|192\.168|abcdef123456/.test(s), s);
});

test('markdown renders headings with ids, tables, code and rewrites links', () => {
  const r = md.render('# T\n\n| a | b |\n|---|---|\n| `x` | [l](y.md) |\n\n```\n<b>\n```\n- one\n- two', { rewriteLink: u => u.replace(/\.md$/, '.html') });
  assert.match(r.html, /<h1 id="t">T<\/h1>/);
  assert.match(r.html, /<table>.*<code>x<\/code>.*href="y.html"/s);
  assert.match(r.html, /<pre><code>&lt;b&gt;<\/code><\/pre>/);
  assert.match(r.html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
});

test('link rewriter maps known pages and sends the rest to GitHub', () => {
  const rw = site.makeRewriter('kb/a.html', 'docs/knowledge/A.md', { 'docs/knowledge/B.md': 'kb/B.html' }, 'master');
  assert.strictEqual(rw('B.md#x'), '../kb/B.html#x');
  assert.strictEqual(rw('../../lib/x.js'), 'https://github.com/dlnraja/com.tuya.zigbee/blob/master/lib/x.js');
  assert.strictEqual(rw('https://e.org'), 'https://e.org');
});

test('cmpVer orders versions numerically', () => {
  assert.ok(site.cmpVer('9.0.1589', '9.0.999') > 0);
});

function fakeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-gen-'));
  fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify(APP));
  fs.writeFileSync(path.join(root, '.homeychangelog.json'), JSON.stringify({ changelog: [{ version: '9.9.8', date: '2026-10-20', en: 'old' }, { version: '9.9.9', date: '2026-10-21', en: 'new | fix' }] }));
  fs.writeFileSync(path.join(root, 'CREDITS.md'), '# Credits\n\n- someone');
  fs.mkdirSync(path.join(root, 'docs', 'site-src'), { recursive: true });
  for (const f of ['faq', 'request-device', 'architecture', 'contributing']) {
    fs.copyFileSync(path.join(__dirname, '..', '..', 'site-src', f + '.md'), path.join(root, 'docs', 'site-src', f + '.md'));
  }
  fs.mkdirSync(path.join(root, 'docs', 'knowledge', 'KB'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'knowledge', 'NOTE.md'), '# Note\n\nSee [kb](KB/TOPIC.md) and [code](../../lib/x.js).');
  fs.writeFileSync(path.join(root, 'docs', 'knowledge', 'KB', 'TOPIC.md'), '# Topic\n\nBack to [note](../NOTE.md).');
  return root;
}

test('build-site generates every page and passes the link checker', () => {
  const root = fakeRepo();
  const out = path.join(root, 'site', 'docs');
  const r = site.build({ root, out });
  for (const p of ['index.html', 'devices.html', 'devices-master.json', 'faq.html', 'request-device.html', 'changelog.html', 'architecture.html', 'credits.html', 'sources.html', 'contributing.html', 'kb/index.html', 'kb/NOTE.html', 'kb/kb-TOPIC.html']) {
    assert.ok(r.pages.includes(p), 'missing ' + p);
  }
  const res = links.check(out, { allowOutside: path.join(root, 'site') });
  // architecture.html links into real KB notes absent from this fake repo; ignore only those
  const real = res.broken.filter(b => !/^architecture\.html -> kb\//.test(b));
  assert.deepStrictEqual(real, []);
  assert.match(fs.readFileSync(path.join(out, 'kb', 'NOTE.html'), 'utf8'), /href="kb-TOPIC.html"|href="\.\.\/kb\/kb-TOPIC.html"/);
  assert.match(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), /github\.com\/dlnraja\/com\.tuya\.zigbee\/issues/);
});

test('link checker reports a broken link and a missing anchor', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'links-'));
  fs.writeFileSync(path.join(dir, 'a.html'), '<a href="b.html">x</a><a href="a.html#nope">y</a><a href="https://x.org">z</a><h1 id="ok"></h1><a href="#ok">k</a>');
  const r = links.check(dir);
  assert.strictEqual(r.broken.length, 2);
});

test('README is generated from app.json with issues link and no hand-typed counts', () => {
  const out = readme.render(APP, { changelog: { changelog: [{ version: '9.9.9', en: 'a | b' }] } });
  assert.match(out, /\| Drivers \| 2 \(1 Zigbee, 1 Wi-Fi\) \|/);
  assert.match(out, /GitHub issues are the way to report/);
  assert.match(out, /homey\.app\/a\/com\.dlnraja\.tuya\.zigbee\/test\//);
  assert.match(out, /\| 9\.9\.9 \|  \| a \/ b \|/);
  const st = readme.render(Object.assign({}, APP, { id: 'com.dlnraja.tuya.zigbee.stable' }));
  assert.match(st, /This branch is `stable-v5`/);
});
