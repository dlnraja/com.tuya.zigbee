
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
  if (opens !== closes) {
    console.log(`Line ${i+1} (${opens} vs ${closes} | diff ${opens-closes}): ${line.trim()}`);
  }
  depth += (opens - closes);
}
console.log(`Final depth: ${depth}`);
