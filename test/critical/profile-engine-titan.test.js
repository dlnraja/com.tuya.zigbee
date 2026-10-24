'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
/** TITAN v2 (syntax-check.yml): no JSON.parse(fs.readFileSync(..., 'utf8')) under lib/ — read a Buffer instead. */
const assert = require('assert'); const fs = require('fs'); const path = require('path');
describe('P-KB4 profile engine follows the TITAN JSON loading rule', () => {
  it('lib/profile-engine has no utf8 JSON.parse(readFileSync)', () => {
    const dir = path.join(__dirname, '../../lib/profile-engine');
    const bad = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).filter((f) => /JSON\.parse\(fs\.readFileSync.*'utf8'/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
    assert.deepStrictEqual(bad, []);
  });
});
