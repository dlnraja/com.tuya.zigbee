'use strict';
// P3216: privacy-redactor aliases every uuid, so the Homey diag Log ID must be read before redaction.
const { describe, it } = global.describe ? global : require('node:test');
const assert = require('assert');
const { extractDiagLogId } = require('../.github/scripts/gmail-imap-reader');
const privacy = require('../.github/scripts/privacy-redactor');
process.env.FGD_NO_MAIN = '1';
const { backfillLogIndexEntry } = require('../.github/scripts/fetch-gmail-diagnostics');

const RAW = 'Stack Trace\r\nNote: this log has been manually submitted by a user.\r\n    Log ID: 00000000-1111-4222-8333-444444444444\r\n\r\n    User Message:\r\n    crash\r\n';
describe('P3216 diag Log ID survives uuid redaction', () => {
  it('redaction removes the uuid (root cause)', () => { assert.ok(!privacy.redact(RAW).includes('00000000-1111')); });
  it('reader extracts it from the raw body', () => { assert.strictEqual(extractDiagLogId(RAW), '00000000-1111-4222-8333-444444444444'); });
  it('backfill uses the reader id on a redacted body', () => {
    const bf = backfillLogIndexEntry(privacy.redact(RAW), '00000000-1111-4222-8333-444444444444');
    assert.strictEqual(bf.id, '00000000-1111-4222-8333-444444444444');
    assert.strictEqual(backfillLogIndexEntry(privacy.redact(RAW)), null);
  });
});

describe('P3216b logIndex keyed on raw Log ID, not the redacted entry', () => {
  it('redactObject aliases logId, so the index must use rawLogId', () => {
    assert.ok(/"logId":"\[REDACTED/.test(JSON.stringify(privacy.redactObject({ logId: '00000000-1111-4222-8333-444444444444' }))));
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '.github', 'scripts', 'fetch-gmail-diagnostics.js'), 'utf8');
    assert.ok(src.includes('st.logIndex[rawLogId]') && !src.includes('st.logIndex[String(entry.logId)'));
  });
});

describe('P3216c logIndex holds only scanner-clean structured fields', () => {
  it('no free-text highlights/stacks in logIndex and findLeaks guard present', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '.github', 'scripts', 'fetch-gmail-diagnostics.js'), 'utf8');
    const blk = src.slice(src.indexOf('P3216c'), src.indexOf('length>300', src.indexOf('P3216c')));
    assert.ok(!/logHighlights|stackTraces:\(/.test(blk) && blk.includes('privacy.findLeaks(li)'));
  });
});
