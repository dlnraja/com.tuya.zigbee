'use strict';
const fs = require('fs'); const path = require('path'); const assert = require('assert');
describe('P-KB kb-refresh workflow policy', () => {
  it('declares defaults.run.shell: bash (YAML policy gate)', () => {
    const p = path.join(__dirname, '../../.github/workflows/kb-refresh.yml');
    if (!fs.existsSync(p)) return;
    assert.match(fs.readFileSync(p, 'utf8'), /^defaults:\n {2}run:\n {4}shell: bash$/m);
  });
});
