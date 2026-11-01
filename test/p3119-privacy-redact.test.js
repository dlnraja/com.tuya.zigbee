'use strict';
// P3119: privacy redaction keeps placeholders stable per entity and leaves technical facts intact.
const assert = require('assert');
const { redact } = require('../scripts/ci/privacy-redact');
describe('P3119 privacy-redact', () => {
  it('stable placeholders per file, technical ids kept', () => {
    const t = 'Eclairage salon _TZ3000_ltt60asa TS0004 ieee aa:bb:cc:dd:ee:ff:00:11; salon again; cuisine; x aa:bb:cc:dd:ee:ff:00:11 mail jo' + '@' + 'gmail.com';
    const { out, n } = redact(t, 'reports/bastien-diag/TREAT.md');
    assert.match(out, /Eclairage \[pièce A\] _TZ3000_ltt60asa TS0004 ieee \[IEEE-1\]; \[pièce A\] again; \[pièce B\]; x \[IEEE-1\] mail \[email-1\]/);
    assert.ok(n >= 6);
  });
  it('room words untouched outside personal files, project mails kept', () => {
    const { out } = redact('salon mode dlnraja@gmail.com noreply@example.com', 'docs/drivers/README.md');
    assert.strictEqual(out, 'salon mode dlnraja@gmail.com noreply@example.com');
  });
  it('homey ids redacted, zero IEEE kept', () => {
    const { out } = redact('"homeyId": "0123456789abcdef01234567" 00:00:00:00:00:00:00:00', 'reports/x.json');
    assert.strictEqual(out, '"homeyId": "[homey-id-1]" 00:00:00:00:00:00:00:00');
  });
});
