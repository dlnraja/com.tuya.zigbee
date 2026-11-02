'use strict';
const assert = require('assert');
const { assertClean, redact, maskUpstreamFacts } = require('../scripts/lib/source-digest');
const leaks = (s) => { try { assertClean(s); return false; } catch (_e) { return true; } };
describe('P3224 KB refresh digest guard: upstream device facts vs house data', () => {
  it('ignores Z2M converter enum maps that list scene names', () => {
    assert.strictEqual(leaks('128~scene_mode=lookup:{"0":"custom","2":"kitchen","4":"bedroom","5":"living_room"}'), false);
  });
  it('ignores Shelly model tokens (1PM / 2PM / 1PM Gen4)', () => {
    assert.strictEqual(leaks('{"Shelly|1PM":[["deconz","1PM Gen4 (S4SW-001P16EU)"]],"Shelly|Mini1PM":[["deconz","1PM Mini Gen4 (S4SW-001P8EU)"]],"Shelly|2PM":[]}'), false);
    assert.strictEqual(redact('Shelly 1PM Gen4'), 'Shelly 1PM Gen4');
  });
  it('treats "garage door" / "garage DP1" as a device type', () => {
    assert.strictEqual(leaks('TS0603 garage DP1 pulse trigger, garage door opener'), false);
  });
  it('still blocks real house data and clock times', () => {
    assert.strictEqual(leaks('bathroom presence watchdog'), true);
    assert.strictEqual(leaks('lights off at 1pm'), true);
    assert.strictEqual(leaks('kitchen sensor offline'), true);
    assert.strictEqual(leaks('car parked in the garage'), true);
    assert.strictEqual(leaks('failing since 09:30'), true);
  });
  it('mask only touches the upstream spans', () => {
    assert.strictEqual(maskUpstreamFacts('a lookup:{"1":"kitchen"} b'), 'a [upstream-fact] b');
  });
  it('KB lessons subjects are redacted before the guard', () => {
    const s = redact('fix(P2587): VicHY dual — Rideau heal + bathroom VMC sticky, cron 05:47');
    assert.strictEqual(leaks(s), false);
    assert.ok(/\[pièce A\]/.test(s));
  });
});
