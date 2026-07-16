// Bulk-bump actions/checkout and actions/setup-node from @v4 to @v5
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '.github', 'workflows');
const files = fs.readdirSync(root).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

let totalReplacements = 0;
for (const f of files) {
  const p = path.join(root, f);
  let content = fs.readFileSync(p, 'utf8');
  const before = content;
  // Bump @v4 → @v5 for known action families
  // (don't touch custom @v4 like marocchino/sticky-pull-request-comment@v2 - those are different)
  content = content.replace(/actions\/checkout@v4\b/g, 'actions/checkout@v5');
  content = content.replace(/actions\/setup-node@v4\b/g, 'actions/setup-node@v5');
  if (content !== before) {
    fs.writeFileSync(p, content, 'utf8');
    const diff = (content.match(/@v5/g) || []).length - (before.match(/@v5/g) || []).length;
    console.log(`✓ ${f}: bumped ${diff} actions to @v5`);
    totalReplacements += diff;
  }
}
console.log(`\nTotal replacements: ${totalReplacements}`);
