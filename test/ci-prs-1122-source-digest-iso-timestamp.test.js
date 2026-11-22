'use strict';
// ci-prs 22/11/2026 Paris: Intake triage run 44979635836 (master e1984ae0fb) failed with
// "source-digest privacy guard: time" because assertClean() read "16:10" inside the digest's own
// generated ISO timestamp. Machine ISO-8601 timestamps are masked before the leak check; bare times still fail.
const assert = require('assert');
const sd = require('../scripts/lib/source-digest');

describe('source-digest assertClean ignores machine ISO-8601 timestamps', () => {
  it('accepts generated timestamps with seconds and milliseconds', () => {
    for (const t of ['2026-11-22T03:16:10.929Z', '2026-11-22T03:16:10Z', '2026-11-22T21:45:59+01:00', '2026-11-22T21:45']) {
      assert.doesNotThrow(() => sd.assertClean({ _meta: { generated: t }, items: [] }), t);
    }
  });
  it('accepts a real Date().toISOString()', () => {
    assert.doesNotThrow(() => sd.assertClean({ generated: new Date().toISOString() }));
  });
  it('still fails closed on a bare clock time in text', () => {
    assert.throws(() => sd.assertClean({ note: 'lights on at 07:30' }), /privacy guard: time/);
    assert.throws(() => sd.assertClean({ note: 'wake 7pm' }), /privacy guard: time/);
  });
  it('still fails closed on a time next to an ISO timestamp', () => {
    assert.throws(() => sd.assertClean({ a: '2026-11-22T03:16:10Z', b: 'every day 18h30' }), /privacy guard/);
  });
});
