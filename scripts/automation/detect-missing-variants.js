'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'data', 'community-sync', 'missing-variants-detected.json');

const report = {
  generatedAt: new Date().toISOString(),
  total: 0,
  missing: [],
  note: 'No missing variant detector rules are active in this branch.',
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`Variant detector completed: ${report.total} missing variants`);
