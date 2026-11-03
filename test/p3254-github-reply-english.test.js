'use strict';
// P3254 (t822u): standing rule — all GitHub replies are written in English, never French.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

describe('P3254 GitHub replies in English', () => {
  it('SSOT declares en as default and forbids fr', () => {
    const s = JSON.parse(read('config/architecture/github-reply-language-ssot.json'));
    assert.strictEqual(s.defaultLanguage, 'en');
    assert.ok(s.forbiddenLanguages.includes('fr'));
  });
  it('rule is in docs/rules/GITHUB_HUMANIZE.md and every constitution copy', () => {
    for (const p of ['docs/rules/GITHUB_HUMANIZE.md', 'CORE_RULES.md', '.specify/memory/constitution.md', '.agents/rules/constitution.md', '.gemini/rules/constitution.md']) {
      if (!fs.existsSync(path.join(root, p))) continue;
      assert.match(read(p), /GitHub replies[^\n]*\n?[^\n]*English, never French/, p);
    }
  });
});

describe('P3254 GitHub comment templates are English', () => {
  it('smart-pr-merge comments carry no French template', () => {
    const s = read('.github/scripts/smart-pr-merge.js');
    assert.ok(!/Merci de|Conflits de merge|Tentative de r/.test(s));
  });
});
