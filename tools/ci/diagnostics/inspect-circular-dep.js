// Inspect circular dep files
const fs = require('fs');
function getRequires(file) {
  const content = fs.readFileSync(file, 'utf8');
  const requires = [];
  const re = /require\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(content))) requires.push(m[1]);
  return requires;
}

const files = [
  'lib/helpers/device_helpers.js',
  'lib/utils/safe-auto-migrate.js',
];
for (const f of files) {
  console.log(`=== ${f} requires ===`);
  for (const r of getRequires(f)) console.log(' ', r);
  console.log('');
}

// Also check sizes
for (const f of files) {
  const stat = fs.statSync(f);
  console.log(`${f}: ${stat.size} bytes`);
}
