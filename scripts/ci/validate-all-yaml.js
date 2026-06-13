#!/usr/bin/env node
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const root = path.resolve(__dirname, '../../..');
const patterns = [
  '.github/workflows/*.yml',
  '.github/actions/**/*.yml',
  '.github/ISSUE_TEMPLATE/*.yml',
  '.github/*.yml',
  '.github/state/*.yml',
];

let total = 0;
let errors = [];

for (const pat of patterns) {
  const files = glob.sync(pat, { cwd: root });
  for (const f of files) {
    total++;
    const full = path.join(root, f);
    try {
      const content = fs.readFileSync(full, 'utf8');
      yaml.load(content);
    } catch (e) {
      errors.push({ file: f, line: e.mark ? e.mark.line + 1 : '?', error: e.reason || e.message });
    }
  }
}

console.log(`\n=== YAML Validation Report ===`);
console.log(`Total files checked: ${total}`);
console.log(`Errors found: ${errors.length}\n`);

if (errors.length > 0) {
  console.log('YAML ERRORS:');
  for (const e of errors) {
    console.log(`\n❌ ${e.file} (line ${e.line}):`);
    console.log(`   ${e.error}`);
  }
  process.exit(1);
} else {
  console.log('✅ All YAML files parse correctly');
}
