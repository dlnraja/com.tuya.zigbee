// tools/ci/flow-coherence-audit.js
'use strict';

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const dirs = fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory());

const issues = [];
let withArgs = 0;
let withTokens = 0;
let brokenTokens = 0;

dirs.forEach(d => {
  const fcp = path.join(driversDir, d, 'driver.flow.compose.json');
  if (!fs.existsSync(fcp)) return;
  const fc = JSON.parse(fs.readFileSync(fcp, 'utf8'));
  const cards = [...(fc.triggers||[]), ...(fc.actions||[]), ...(fc.conditions||[])];
  cards.forEach(card => {
    if (!card.id) return;
    const hasArgs = card.args && card.args.length > 0;
    const hasTokens = card.tokens && card.tokens.length > 0;
    if (hasArgs) withArgs++;
    if (hasTokens) withTokens++;
    if (hasTokens) {
      // Real orphan: token name is not in args AND not in title (any locale)
      const argsStr = JSON.stringify(card.args || []);
      const titleStr = JSON.stringify(card.title || {});
      const missing = card.tokens.filter(t => {
        const inArgs = argsStr.includes('"' + t.name + '"') || argsStr.includes("'" + t.name + "'");
        // Check for {name} placeholder in any locale
        const placeholderPatterns = ['{' + t.name + '}', '${' + t.name + '}'];
        const inTitle = placeholderPatterns.some(p => titleStr.includes(p));
        return !inArgs && !inTitle;
      });
      if (missing.length > 0) {
        brokenTokens++;
        issues.push({ d, id: card.id, missing: missing.map(t => t.name) });
      }
    }
  });
});

console.log('=== FLOW CARD COHERENCE AUDIT ===');
console.log('Drivers scanned:', dirs.length);
console.log('Cards with args:', withArgs);
console.log('Cards with tokens:', withTokens);
console.log('Cards with orphan tokens (declared but not used in args/title):', brokenTokens);
if (issues.length > 0) {
  console.log('\nFirst 20 issues:');
  issues.slice(0, 20).forEach(i => console.log('  -', i.d, ':', i.id, '→ orphan tokens:', i.missing.join(', ')));
}
