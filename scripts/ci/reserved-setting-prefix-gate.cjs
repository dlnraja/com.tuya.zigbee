'use strict';

const path = require('path');
const { scanRoot } = require('./reserved-setting-prefix.cjs');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const hits = scanRoot(root);
if (!hits.length) {
  console.log('reserved-setting-prefix: 0 hits');
  process.exit(0);
}
for (const hit of hits) {
  console.error(`${hit.file}: invalid setting id ${hit.id}, reserved prefix ${hit.prefix}`);
}
process.exit(1);
