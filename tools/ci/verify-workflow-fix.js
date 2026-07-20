const fs = require('fs');
const c = fs.readFileSync('.github/workflows/draft-to-test.yml', 'utf8');
const lines = c.split('\n');
lines.slice(113, 120).forEach((l, i) => console.log(`${113 + i + 1}: ${JSON.stringify(l)}`));
