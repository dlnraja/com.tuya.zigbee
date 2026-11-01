'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AT = '@';
const RELAY = '0123456789abcdef01234567' + AT + 'apps-api.athom.com';
const ar = require('../scripts/diag/auto-reply-bastien');

const body = (ver, extra = '') => [
  'App ID', '', 'com.dlnraja.tuya.zigbee.bastien', '', 'App Version', '', `v${ver}`, '', 'Stack Trace', '',
  'Note: this log has been manually submitted by a user.', '    Log ID: 7f72cffe-2179-41a6-b70e-b6476f2d2d09', '',
  '    User Message:', '    Erreur  c3 crache souvent pour aucun raison sans action', '', '    stdout:', extra,
].join('\r\n');
const OOM = 'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory at JSON.parse';
const cfg = { signatures: [{ id: 'oom', match: ['heap out of memory', 'JSON\\.parse'], fixedVersion: '1.0.221', released: true, cause: { fr: 'mémoire', en: 'memory' } }] };
const msg = (over = {}) => Object.assign({ from: 'Homey <noreply@homey.app>', subject: ar.SUBJECT, replyTo: RELAY, messageId: '<a' + AT + 'homey.app>', references: '', text: body('1.0.218', OOM) }, over);
const opts = (over = {}) => Object.assign({ cfg, state: { replied: {}, sent: [] }, ourAddr: 'user' + AT + 'example.com', threadHasOurReply: false }, over);

describe('P3110 Bastien diag auto-reply', () => {
  it('parses app id, version, log id and user message', () => {
    const d = ar.parseDiag(body('1.0.218', OOM));
    assert.strictEqual(d.appId, 'com.dlnraja.tuya.zigbee.bastien');
    assert.strictEqual(d.appVersion, '1.0.218');
    assert.strictEqual(d.logId, '7f72cffe-2179-41a6-b70e-b6476f2d2d09');
    assert.match(d.userMessage, /c3 crache/);
  });
  it('only the Bastien subject from noreply@homey.app, only the hex apps-api relay', () => {
    assert.ok(ar.isBastienDiag(msg()));
    assert.ok(!ar.isBastienDiag(msg({ subject: ar.SUBJECT.replace('.bastien', '') })));
    assert.ok(!ar.isBastienDiag(msg({ from: 'x' + AT + 'example.com' })));
    assert.strictEqual(ar.safeReplyTo('noreply@homey.app'), null);
    assert.strictEqual(ar.safeReplyTo('support@athom.com'), null);
    assert.strictEqual(ar.safeReplyTo('abc' + AT + 'apps-api.athom.com.example.com'), null);
    assert.strictEqual(ar.decide(msg({ replyTo: 'noreply@homey.app' }), opts()).why, 'no-safe-reply-to');
  });
  it('sends in-thread French reply for a matched, released, newer fix', () => {
    const d = ar.decide(msg({ references: '<z' + AT + 'x>' }), opts());
    assert.strictEqual(d.action, 'send');
    assert.strictEqual(d.to, RELAY);
    assert.strictEqual(d.inReplyTo, '<a' + AT + 'homey.app>');
    assert.strictEqual(d.references, '<z' + AT + 'x> <a' + AT + 'homey.app>');
    assert.ok(d.subject.startsWith('Re: '));
    assert.strictEqual(d.lang, 'fr');
    assert.match(d.body, /^Bonjour,/);
    assert.match(d.body, /Cordialement,\r\n\r\nDylan Rajasekaram/);
    assert.ok(!/https?:|www\./.test(d.body));
    const mime = ar.buildMime(d);
    assert.match(mime, new RegExp('In-Reply-To: <a' + AT + 'homey.app>'));
    assert.match(mime, new RegExp('To: <' + RELAY + '>'));
  });
  it('English when the user message is English', () => {
    const t = body('1.0.218', OOM).replace(/Erreur.*action/, 'App crashes all the time');
    assert.strictEqual(ar.decide(msg({ text: t }), opts()).lang, 'en');
  });
  it('skips unknown, already-fixed, unreleased or ambiguous causes', () => {
    assert.strictEqual(ar.decide(msg({ text: body('1.0.218', 'TypeError foo') }), opts()).why, 'no-known-signature');
    assert.match(ar.decide(msg({ text: body('1.0.221', OOM) }), opts()).why, /version-already-fixed/);
    const unrel = { signatures: [Object.assign({}, cfg.signatures[0], { released: false })] };
    assert.match(ar.decide(msg(), opts({ cfg: unrel })).why, /fix-not-released/);
    const dup = { signatures: [cfg.signatures[0], Object.assign({}, cfg.signatures[0], { id: 'b' })] };
    assert.strictEqual(ar.decide(msg(), opts({ cfg: dup })).why, 'ambiguous-signature');
  });
  it('released is derived from the Athom Test/Live build snapshot', () => {
    const unrel = { signatures: [Object.assign({}, cfg.signatures[0], { released: false })] };
    unrel.athomBuilds = [{ version: '1.0.222', state: 'test' }];
    assert.strictEqual(ar.decide(msg(), opts({ cfg: unrel })).action, 'send');
    unrel.athomBuilds = [{ version: '1.0.222', state: 'draft' }, { version: '1.0.220', state: 'test' }];
    assert.match(ar.decide(msg(), opts({ cfg: unrel })).why, /fix-not-released/);
  });
  it('dedups by Log ID state and by our existing reply in the thread; caps per day', () => {
    const state = { replied: { '7f72cffe-2179-41a6-b70e-b6476f2d2d09': { at: 'x' } }, sent: [] };
    assert.match(ar.decide(msg(), opts({ state })).why, /already-replied\(state\)/);
    const t = ar.decide(msg(), opts({ threadHasOurReply: true }));
    assert.ok(t.why.includes('thread') && t.record);
    const now = Date.now();
    const full = { replied: {}, sent: Array.from({ length: 5 }, () => new Date(now - 1000).toISOString()) };
    assert.strictEqual(ar.decide(msg(), opts({ state: full, now })).why, 'daily-cap');
  });
  it('kill switches config/autonomy-paused and .autoreply', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3110-'));
    fs.mkdirSync(path.join(root, 'config'));
    assert.strictEqual(ar.isPaused(root), false);
    fs.writeFileSync(path.join(root, 'config', 'autonomy-paused.autoreply'), '');
    assert.strictEqual(ar.isPaused(root), true);
    fs.rmSync(root, { recursive: true, force: true });
    assert.ok(require('../scripts/ci/autonomy-learn').FEATURES.includes('autoreply'));
  });
  it('shipped signature config is valid and conservative', () => {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'diag-autoreply-signatures.json'), 'utf8'));
    for (const s of c.signatures) { assert.ok(s.match.length >= 2 && /^\d+\.\d+\.\d+$/.test(s.fixedVersion) && s.cause.fr && s.cause.en); s.match.forEach(r => new RegExp(r)); }
  });
});
