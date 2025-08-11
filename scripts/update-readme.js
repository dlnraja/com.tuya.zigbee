'use strict';

const fs = require('fs');
const path = require('path');

const README = path.join(process.cwd(), 'README.md');

function upd(t, r, repl) {
  return r.test(t) ? t.replace(r, repl) : (t + '\n' + repl + '\n');
}

(function() {
  let t = fs.existsSync(README) ? fs.readFileSync(README, 'utf8') : '# Tuya Zigbee for Homey\n';
  
  t = t.replace(/.*publish.*\n/gi, '').replace(/.*store.*homey.*\n/gi, '');
  
  t = upd(t, /##\s*Installation[\s\S]*?(?=\n##|\Z)/i, `## Installation (Test mode only)

- \`npm install\`
- \`npx homey app validate\`
- \`npx homey app run\` (Docker) or \`--remote\`

`);
  
  if (!/##\s*Changelog/i.test(t)) {
    t += `\n## Changelog

See \`CHANGELOG_AUTO.md\` for automated changes.
`;
  }
  
  if (!/##\s*Drivers Coverage/i.test(t)) {
    t += `\n## Drivers Coverage

Drivers merged & reorganized by domain/category/vendor/model (no variants).
`;
  }
  
  fs.writeFileSync(README, t);
  console.log('[readme] updated');
})();
