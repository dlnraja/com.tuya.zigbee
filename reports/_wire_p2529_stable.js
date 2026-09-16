'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(ROOT, p), s);

// dual-app-tracks
const dualPath = 'config/architecture/dual-app-tracks.json';
if (fs.existsSync(dualPath)) {
  const j = JSON.parse(read(dualPath));
  const bucket = j.reliability || j.patches || j.classifications || j;
  if (bucket && typeof bucket === 'object' && !bucket.p2529_deep_functional_enrich) {
    // Prefer same shape as master: look for p2520 key parent
    const parent = j.reliability || (j.patches && j.patches) || null;
    const target = parent || (Object.prototype.hasOwnProperty.call(j, 'p2520_complementary_variant_enrich') ? j : null)
      || (j.classifications && !j.classifications.classifications ? j.classifications : null);
    const t = target || j;
    if (!t.p2529_deep_functional_enrich) {
      t.p2529_deep_functional_enrich = {
        tag: 'BOTH',
        note: 'Inbox/cron audit DP/cluster/flow/RX-TX beyond mfr+pid',
      };
      write(dualPath, `${JSON.stringify(j, null, 2)}\n`);
      console.log('dual-app: tagged p2529');
    }
  }
}

const STEP = `
      - name: "P2529 Deep functional enrich (beyond mfr+pid)"
        if: always()
        continue-on-error: true
        timeout-minutes: 8
        env:
          FORUM_AUTO_POST: "0"
          SHADOW_FORUM: "1"
        run: |
          if [ -f tools/ci/deep-functional-enrich-pass.js ]; then
            npm run enrich:functional -- --skip-gates 2>&1 | tee deep-functional-soft.log || echo "P2529_SOFT_WARN"
            npm run check:p2529 || echo "P2529_GATE_WARN"
          fi
`;

function ensureHook(ymlRel) {
  const p = path.join(ROOT, ymlRel);
  if (!fs.existsSync(p)) {
    console.log('skip missing', ymlRel);
    return;
  }
  let s = read(ymlRel);
  if (/P2529|enrich:functional/.test(s)) {
    console.log('already hooked', ymlRel);
    return;
  }
  // Insert before Commit / Upload / Summary if possible
  const markers = [
    '      - name: Commit',
    '      - name: Upload',
    '      - name: Summary',
    '      - name: Print Summary',
    '      - name: Compensate incomplete',
  ];
  let inserted = false;
  for (const m of markers) {
    if (s.includes(m)) {
      s = s.replace(m, `${STEP}\n${m}`);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    // append near end of first job — soft fallback: before last `permissions` unused
    s += `\n${STEP}\n`;
  }
  write(ymlRel, s);
  console.log('hooked', ymlRel);
}

for (const y of [
  '.github/workflows/l99-inbox-intelligence.yml',
  '.github/workflows/forum-poll.yml',
  '.github/workflows/auto-enrich-closed-loop.yml',
  '.github/workflows/gmail-diagnostics.yml',
  '.github/workflows/fetch-diags.yml',
  '.github/workflows/recurrent-orchestrator.yml',
  '.github/workflows/auto-bot-issue-triage.yml',
]) ensureHook(y);

// L99 orchestrator soft mention
const orch = 'tools/ci/l99-inbox-intelligence-orchestrator.js';
if (fs.existsSync(orch)) {
  let s = read(orch);
  if (!/functionalDeep|P2529|deep-functional/.test(s)) {
    // Add a soft require path comment + helper invocation at end of known phase list if present
    s = s.replace(
      /('use strict';)/,
      "$1\n// P2529: deep functional enrich (DP/cluster/flow/RX-TX) — see tools/ci/deep-functional-enrich-pass.js",
    );
    if (/phases\s*=/.test(s) && !/functionalDeep/.test(s)) {
      s = s.replace(/(\bphases\s*=\s*\{[^}]*)(full\s*:\s*\[[^\]]*)/, (m) => {
        if (m.includes('functionalDeep')) return m;
        return m.replace(/\]/, ", 'functionalDeep']");
      });
    }
    // Ensure bodySnippet length for couple extract
    s = s.replace(/\.slice\(0,\s*280\)/, '.slice(0, 4500)');
    write(orch, s);
    console.log('patched orchestrator P2529 markers');
  } else {
    s = s.replace(/\.slice\(0,\s*280\)/, '.slice(0, 4500)');
    write(orch, s);
    console.log('orchestrator already has P2529 / expanded snippet');
  }
}

// L99 config
const cfgPath = 'config/enrichment/l99-inbox-intelligence.json';
if (fs.existsSync(cfgPath)) {
  const cfg = JSON.parse(read(cfgPath));
  cfg.phases = cfg.phases || {};
  cfg.phases.full = cfg.phases.full || [];
  if (!cfg.phases.full.includes('functionalDeep')) cfg.phases.full.push('functionalDeep');
  cfg.scripts = cfg.scripts || {};
  cfg.scripts.functionalDeep = cfg.scripts.functionalDeep || 'node tools/ci/deep-functional-enrich-pass.js --skip-gates';
  write(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
  console.log('l99 config functionalDeep');
}

console.log('stable P2529 wire done');
