'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const REPORT = path.join(ROOT, 'data', 'community-sync', 'missing-variants-detected.json');

let total = 0;
if (fs.existsSync(REPORT)) {
  try {
    total = JSON.parse(fs.readFileSync(REPORT, 'utf8')).total || 0;
  } catch {
    total = 0;
  }
}

console.log(total > 0
  ? `Variant fixer found ${total} reported variants but no automatic fixer rules are active.`
  : 'Variant fixer completed: no missing variants to apply.');
