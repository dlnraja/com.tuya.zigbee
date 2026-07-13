// find-invalid-flow-cards.js — find the exact invalid card IDs
const fs = require('fs');
const path = require('path');

function walkJs(d) {
  const out = [];
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walkJs(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = walkJs('lib').concat(walkJs('drivers'));

// Look for all getXxxCard calls
const cards = new Map();
const regex = /get(Action|Trigger|Condition)(?:Device)?Card\(['"]([^'"]+)['"]/g;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = regex.exec(c)) !== null) {
    const type = m[1];
    const id = m[2];
    if (!cards.has(id)) cards.set(id, { type, files: new Set() });
    cards.get(id).files.add(f.replace(/\\/g, '/'));
  }
}

// Now check each card ID against flow.compose
const allFlowFiles = [];
function walkJson(d) {
  const out = [];
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walkJson(p));
    else if (e.name.endsWith('.flow.compose.json')) out.push(p);
  }
  return out;
}
const flowFiles = walkJson('drivers');

const definedIds = new Set();
for (const ff of flowFiles) {
  const d = JSON.parse(fs.readFileSync(ff, 'utf8'));
  for (const a of d.actions || []) definedIds.add(a.id);
  for (const t of d.triggers || []) definedIds.add(t.id);
  for (const c of d.conditions || []) definedIds.add(c.id);
}

// Find cards that are registered but NOT defined
const invalidCards = [];
for (const [id, info] of cards) {
  if (!definedIds.has(id)) {
    invalidCards.push({ id, type: info.type, files: [...info.files] });
  }
}

console.log('=== REGISTERED BUT NOT DEFINED IN flow.compose ===');
console.log('Total:', invalidCards.length);
for (const c of invalidCards) {
  console.log('  ' + c.type + ': ' + c.id);
  for (const f of c.files.slice(0, 2)) console.log('    -> ' + f);
}
