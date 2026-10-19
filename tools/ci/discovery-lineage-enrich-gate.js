'use strict';
/**
 * P2281 — Discovery lineage enrich gate
 * WHY: Workflows must carry past (P102–P2266), recent (P2267 E002, P2268 parallel),
 * and present (P2269+) discoveries — SHADOW, mfr+pid only, never invent pid.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// P2884: a rules-gates step counts only if it is hard (no soft: true, no
// continue-on-error: true) and selects the gate id via only: or a profile.
function hardRulesGatesSelects(yaml, id) {
  const lines = String(yaml).split(/\r?\n/);
  const RG = require(path.join(ROOT, 'scripts', 'ci', 'rules-gates.js'));
  const gates = (RG && RG.RULES_GATES) || [];
  for (let i = 0; i < lines.length; i++) {
    if (!/uses:\s*\.\/\.github\/actions\/rules-gates\b/.test(lines[i])) continue;
    // step block: from the previous '- ' at step indent to the next one
    let start = i;
    while (start > 0 && !/^\s*-\s+(name|uses|id|if):/.test(lines[start])) start--;
    const indent = (lines[start].match(/^(\s*)-/) || ['', ''])[1].length;
    let end = i + 1;
    while (end < lines.length) {
      const m = lines[end].match(/^(\s*)-\s/);
      if (m && m[1].length <= indent) break;
      if (lines[end].trim() && (lines[end].match(/^(\s*)/)[1].length < indent)) break;
      end++;
    }
    const block = lines.slice(start, end).join('\n');
    if (/^\s*soft:\s*['"]?true/m.test(block)) continue;
    if (/^\s*continue-on-error:\s*['"]?true/m.test(block)) continue;
    const only = block.match(/^\s*only:\s*['"]?([^'"\n#]+)/m);
    if (only) {
      if (only[1].split(',').map((x) => x.trim()).includes(id)) return true;
      continue;
    }
    const prof = (block.match(/^\s*profile:\s*['"]?([\w-]+)/m) || [null, 'core'])[1];
    const g = gates.find((x) => x.id === id);
    if (g && g.profiles.includes(prof)) return true;
  }
  return false;
}

function rulesGatesMaps(id, file) {
  try {
    const RG = require(path.join(ROOT, 'scripts', 'ci', 'rules-gates.js'));
    const g = ((RG && RG.RULES_GATES) || []).find((x) => x.id === id);
    return !!g && g.file === file && fs.existsSync(path.join(ROOT, file));
  } catch (_) {
    return false;
  }
}
const LINEAGE = path.join(ROOT, 'config', 'enrichment', 'discovery-lineage.json');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function main() {
  console.log('P2281 discovery-lineage enrich gate\n');
  if (!fs.existsSync(LINEAGE)) {
    fail('missing config/enrichment/discovery-lineage.json');
    return;
  }
  const L = JSON.parse(read(LINEAGE));
  ok('discovery-lineage.json loaded');

  for (const era of ['past', 'recent', 'present']) {
    if (!L.eras?.[era]?.mustRemember?.length) fail(`eras.${era}.mustRemember empty`);
    else ok(`era ${era}: ${L.eras[era].mustRemember.length} memories`);
  }

  // Recent must cite P2267 E002 + P2268
  const recentIds = (L.eras.recent.mustRemember || []).map((x) => x.id);
  if (!recentIds.includes('P2267')) fail('recent missing P2267');
  else ok('recent includes P2267 E002 taxonomy');
  if (!recentIds.includes('P2268')) fail('recent missing P2268');
  else ok('recent includes P2268 parallel');

  // Hooks exist on disk
  const hooks = [
    ...(L.eras.past.workflowHooks || []),
    ...(L.eras.recent.workflowHooks || []),
    ...(L.eras.present.workflowHooks || []),
  ];
  for (const h of hooks) {
    const p = path.isAbsolute(h) ? h : path.join(ROOT, h);
    if (!fs.existsSync(p)) fail(`missing hook path ${h}`);
    else ok(`hook ${h}`);
  }

  // Lexicon E002
  const lex = read(path.join(ROOT, 'lib', 'zigbee', 'ZclClusterLexicon.js'));
  if (!/0xE002/.test(lex) || !/manuSpecificTuya2/.test(lex)) fail('ZclClusterLexicon missing E002/manuSpecificTuya2');
  else ok('ZclClusterLexicon E002=manuSpecificTuya2');

  // phases.json phaseIds
  const phases = JSON.parse(read(path.join(ROOT, 'config', 'enrichment', 'phases.json')));
  const allIds = [];
  for (const block of Object.values(phases.blocks || {})) {
    for (const s of block || []) allIds.push(s.id);
  }
  for (const id of L.ghaWiring?.phaseIds || []) {
    if (!allIds.includes(id)) fail(`phases.json missing step id ${id}`);
    else ok(`phase ${id}`);
  }

  // Soft harvest workflows mention --phase=sync
  for (const wf of L.ghaWiring?.softHarvestSync || []) {
    const p = path.join(ROOT, '.github', 'workflows', wf);
    if (!fs.existsSync(p)) {
      fail(`missing workflow ${wf}`);
      continue;
    }
    const y = read(p);
    if (wf === 'recurrent-orchestrator.yml') {
      // may only call lineage/harvest scripts — accept either
      if (!/--phase=sync|discover:discussions|discovery-lineage|p2270-discussion-harvest/.test(y)) {
        fail(`${wf} must soft-run harvest/lineage`);
      } else ok(`${wf} harvest/lineage wired`);
    } else if (!y.includes('--phase=sync') && !y.includes('discover:discussions') && !y.includes('discovery-lineage')) {
      fail(`${wf} must soft-run --phase=sync or discovery-lineage`);
    } else ok(`${wf} soft harvest wired`);
  }

  // Hard CI must keep p2138
  for (const wf of L.ghaWiring?.hard || []) {
    const p = path.join(ROOT, '.github', 'workflows', wf);
    if (!fs.existsSync(p)) {
      fail(`missing hard workflow ${wf}`);
      continue;
    }
    const y = read(p);
    // P2884: since P2883 the hard workflows run P2138 through the shared
    // .github/actions/rules-gates action (scripts/ci/rules-gates.js). Accept
    // either the direct script or a HARD rules-gates step that selects p2138,
    // and only when the runner really maps p2138 to the same script.
    if (/p2138-sacred-couple-matrix-gate/.test(y)) ok(`${wf} hard P2138`);
    else if (hardRulesGatesSelects(y, 'p2138') && rulesGatesMaps('p2138', 'tools/ci/p2138-sacred-couple-matrix-gate.js')) ok(`${wf} hard P2138 (shared rules-gates)`);
    else fail(`${wf} missing P2138 matrix`);
  }

  // Guidelines lineage section
  const guide = read(path.join(ROOT, '.github', 'WORKFLOW_GUIDELINES.md'));
  if (!/P2267/.test(guide) || !/P2268/.test(guide) || !/Discovery lineage/i.test(guide)) {
    fail('WORKFLOW_GUIDELINES missing Discovery lineage / P2267 / P2268');
  } else ok('WORKFLOW_GUIDELINES discovery lineage');

  if (process.exitCode) {
    console.error('\nFAIL: discovery-lineage enrich gate');
    process.exit(1);
  }
  console.log('\nPASS: discovery-lineage enrich gate');
}

module.exports = { hardRulesGatesSelects, rulesGatesMaps };
if (require.main === module) main();
