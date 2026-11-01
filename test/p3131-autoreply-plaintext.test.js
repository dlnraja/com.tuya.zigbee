'use strict';
const assert = require('assert');
const m = require('../scripts/diag/auto-reply-bastien.js');

describe('P3131 auto-reply plain text UTF-8', () => {
  const d = { from: 'a@example.com', to: 'abc123@apps-api.athom.com', subject: 'Re: Rapport de diagnostic é', logId: 'deadbeefcafe', body: '<p>J&apos;ai analys&eacute; &laquo;x&raquo;<br/>ok</p>' };
  const raw = m.buildMime(d);
  const [head, b64] = raw.split('\r\n\r\n');
  const text = Buffer.from(b64.replace(/\r\n/g, ''), 'base64').toString('utf8');
  it('declares text/plain UTF-8 and RFC 2047 subject', () => {
    assert.match(head, /Content-Type: text\/plain; charset=UTF-8/);
    assert.match(head, /Subject: =\?UTF-8\?B\?/);
  });
  it('text part has no HTML tags or entities', () => {
    assert.ok(!/<p>|<br|&eacute;|&apos;|&laquo;/.test(text), text);
    assert.ok(text.includes("J'ai analysé «x»"));
  });
  it('composed FR template is already plain', () => {
    const body = m.compose('fr', { cause: { fr: 'mémoire' }, fixedVersion: '1.0.221' }, { logId: 'deadbeefcafe', appVersion: '1.0.218' });
    assert.strictEqual(m.toPlainText(body), body);
  });
});
