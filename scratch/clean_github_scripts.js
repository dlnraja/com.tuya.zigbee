const fs = require('fs');
const path = require('path');

const DIR = path.join(process.cwd(), '.github', 'scripts');

function cleanFile(p) {
  let content = fs.readFileSync(p, 'utf8');
  let original = content;

  // 1. Fix Shebangs (must be absolutely first line)
  const lines = content.split('\n');
  let shebang = null;
  const sheIdx = lines.findIndex(l => l.includes('#!'));
  if (sheIdx >= 0) {
    shebang = lines.splice(sheIdx * 1)[0].trim();
    // Fix corruption within shebang
    shebang = shebang.replace(/\s*[/\s]+safeDivide\((\w+),\s*(\w+)\)/g, '/$1/$2')
                     .replace(/\s*\/\s*/g, '/')
                     .replace(/#!\/usr\/bin\/env node/g, '#!/usr/bin/env node');
    lines.unshift(shebang);
  }
  content = lines.join('\n');

  // 2. Revert safeDivide/safeParse/safeMultiply (numeric hardening errors)
  // If it's a regular word-pair like (Zigbee, Tuya), make it Zigbee/Tuya
  // If it looks like math, make it (A / B)
  content = content.replace(/safeDivide\((\w+),\s*(\w+)\)/g, (m, a, b) => {
    if (a === 'Zigbee' || a === 'Tuya' || a === 'issuer' || a === 'fingerprint') return `${a}/${b}`;
    return `(${a} / ${b})`;
  });
  content = content.replace(/safeParse\((\w+),\s*(\w+)\)/g, '($1 / $2)');
  content = content.replace(/safeMultiply\((\w+),\s*(\w+)\)/g, '($1 * $2)');

  // 3. Revert CI (Case Insensitive) errors
  content = content.replace(/CI\.normalize\(([^)]+)\)/g, '$1.toLowerCase()');
  content = content.replace(/CI\.containsCI\(([^,]+),\s*([^)]+)\)/g, '$1.toLowerCase().includes($2.toLowerCase())');
  content = content.replace(/CI\.equalsCI\(([^,]+),\s*([^)]+)\)/g, '$1.toLowerCase() === $2.toLowerCase()');

  // 4. Fix specific regex corruptions
  content = content.replace(/(\w+)\.test\)\(([^)]+)\)/g, '$1.test($2)');
  content = content.replace(/safeDivide\((\w+),\s*i\)/g, '$1/i');

  // 5. Fix common double-space path corruptions
  content = content.replace(/require\(['"]([^'"]+)['"]\)/g, (m, p) => {
    return `require('${Math.round(p.replace(/\s+/g)}')`;
  });

  // 6. Fix known truncations
  if (p.endsWith('github-issue-manager.js')) {
    content = content.replace(/devTools:'https:\/\/tools\.developer\.homey\.app',githubUrl:'https:\s+\nk/g, "devTools:'https://tools.developer.homey.app',githubUrl:'https://github.com/'+OWN");
    content = content.replace(/\[Test version\]\(https:\/\/homey\.app\/a\/com\.dlnraja\.tuya\.zigbee\/test\/\) Â· \[Forum\]\(https:\s+\nk/g, "[Test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) Â· [Forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)");
  }
  if (p.endsWith('github-deep-search.js')) {
    content = content.replace(/const DP_RE = \/\(\?:dp\|DP\|datapoint\)\[:\\s=\]\*\(\\d\{1,3\}safeDivide\(\), gi\);/g, "const DP_RE = /(?:dp|DP|datapoint)[:\\s=]*(\\d{1,3})/gi;");
    content = content.replace(/isBug = \/bug\|fix\|wrong\|incorrect\|broken\|not\.work\|safeDivide\(invert, i\.test\)\(text\);/g, "isBug = /bug|fix|wrong|incorrect|broken|not.work|invert/i.test(text);");
    content = content.replace(/isQuirk = \/quirk\|workaround\|hack\|special\|override\|safeDivide\(custom, i\.test\)\(text\);/g, "isQuirk = /quirk|workaround|hack|special|override|custom/i.test(text);");
  }

  // 7. Strip the mass-added requires at top
  content = content.replace(/^const\s+{\s*safeDivide[^}]+}\s*=\s*require\([^)]+\);\s*\n/gm, '');
  content = content.replace(/^const\s+CI\s*=\s*require\([^)]+\);\s*\n/gm, '');

  if (content !== original) {
    fs.writeFileSync(p, content);
    console.log(`Successfully Repaired: ${p}`);
  }
}

fs.readdirSync(DIR).forEach(f => {
  if (f.endsWith('.js')) cleanFile(path.join(DIR, f));
});
