
const fs = require('fs');
const file = process.argv[2];
if (!file) process.exit(1);
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  depth += opens;
  depth -= closes;
  if (depth < 0) {
    console.log(`ERROR: Negative depth at line ${i+1}: ${line.trim()}`);
    process.exit(0);
  }
}
console.log(`Final depth: ${depth}`);
