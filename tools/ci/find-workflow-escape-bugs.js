#!/usr/bin/env node
// P76.6: Find workflows with potential escape bugs (trailing \n in heredocs)
const fs = require('fs');
const path = require('path');
const WF_DIR = path.join(process.cwd(), '.github/workflows');
const files = fs.readdirSync(WF_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

let totalBugs = 0;
for (const f of files) {
  const content = fs.readFileSync(path.join(WF_DIR, f), 'utf8');
  const lines = content.split('\n');
  // Check for lines containing literal "\n" that might escape into the shell
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\\n["']?\s*$/.test(line.trim())) {
      // Check if previous line is a closing quote of node -e
      if (i > 0 && /\s+"\s*$/.test(lines[i - 1])) {
        console.log(`${f}:${i + 1}: POSSIBLE ESCAPE BUG - trailing \\n in node -e block:`);
        console.log(`  ${lines[i - 1]}`);
        console.log(`  ${line}`);
        totalBugs++;
      }
    }
  }
}
console.log(`\nTotal potential escape bugs: ${totalBugs}`);
