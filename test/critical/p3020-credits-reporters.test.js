'use strict';
/** P3020: GitHub issue reporters credited in CREDITS.md (snapshot 2026-10-24, gh issue list --state all). */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('P3020 CREDITS issue reporters', () => {
  const credits = fs.readFileSync(path.join(__dirname, '..', '..', 'CREDITS.md'), 'utf8');
  it('has the reporters section with unique @logins and issue refs', () => {
    const i = credits.indexOf('## GitHub issue reporters (P3020');
    assert.ok(i >= 0);
    const lines = credits.slice(i).split('\n').filter((l) => /^- @/.test(l));
    assert.ok(lines.length >= 50, `only ${lines.length} reporters`);
    const logins = lines.map((l) => l.match(/^- @([A-Za-z0-9-]+) — (#\d+)(, #\d+)*$/)).map((m, k) => { assert.ok(m, lines[k]); return m[1].toLowerCase(); });
    assert.strictEqual(new Set(logins).size, logins.length);
  });
  it('keeps known reporters credited (samples)', () => {
    for (const l of ['artisare', 'askseb', 'Nespouique', 'tknapstad']) {assert.ok(credits.toLowerCase().includes(l.toLowerCase()), l);}
  });
});
