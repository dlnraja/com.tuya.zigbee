#!/usr/bin/env node
'use strict';
// P3097: one tracking issue per crash signature in this repo; updates only when counts change; max 5 new/run.
const fs = require('fs');
const { execFileSync } = require('child_process');

const gh = (a, input) => execFileSync('gh', a, { encoding: 'utf8', input });
function body(c) {
  return [`Crash signature \`${c.id}\` (normalized, no user data):`, '', '```', c.signature, '```', '',
    `- Occurrences: ${c.count}, distinct installs: ${c.users}, impact: ${c.impact}`,
    `- Versions: ${c.versions.join(', ') || 'n/a'}; apps: ${c.apps.join(', ') || 'n/a'}`,
    `- Proposed fix: ${c.proposal}${c.safePattern ? ` (safe pattern \`${c.safePattern}\`, still gated by the full tests)` : ''}`].join('\n');
}
function main() {
  if (!fs.existsSync('crash-triage.json')) return;
  const list = JSON.parse(fs.readFileSync('crash-triage.json', 'utf8'));
  const open = JSON.parse(gh(['issue', 'list', '--state', 'open', '--label', 'crash-triage', '--limit', '200', '--json', 'number,title,body']));
  let created = 0;
  try { gh(['label', 'create', 'crash-triage', '--color', 'B60205', '--description', 'P3097 crash signature']); } catch { /* exists */ }
  for (const c of list) {
    const title = `[crash] ${c.id}`;
    const ex = open.find((i) => i.title.startsWith(title));
    const b = body(c);
    if (ex) { if (ex.body.trim() !== b.trim()) gh(['issue', 'edit', String(ex.number), '--body-file', '-'], b); }
    else if (created < 5) { gh(['issue', 'create', '--title', `${title} (${c.safePattern || 'review'})`, '--label', 'crash-triage', '--body-file', '-'], b); created++; }
  }
  console.log(`signatures ${list.length}, new issues ${created}`);
}
if (require.main === module) main();
module.exports = { body };
