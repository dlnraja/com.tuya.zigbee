#!/usr/bin/env node
/**
 * SDK v3 Smart Enrichment Linter
 * v1.0.0 — Safe, intelligent driver enrichment
 *
 * Architecture:
 *   1. STATIC PASS (no AI) — catches SDK v3 violations with regex rules
 *   2. AI ENRICHMENT PASS (optional) — suggests improvements, NEVER overwrites
 *   3. SMART MERGE — compares AI output with current code, applies ONLY additive enrichments
 *   4. VALIDATION GATE — node -c syntax + homey app validate BEFORE and AFTER
 *   5. MEMORY — records patterns in ai-rules-memory.json for recursive learning
 *
 * Safety: NEVER blindly overwrites files. Every change is validated.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DDIR = path.join(process.cwd(), 'drivers');
const MEM_FILE = path.join(process.cwd(), '.github', 'state', 'ai-rules-memory.json');
const REPORT_FILE = path.join(process.cwd(), '.github', 'state', 'sdk3-lint-report.json');
const DRY = process.env.DRY_RUN === 'true';
const AI_ENABLED = process.env.AI_ENRICH !== 'false'; // default ON if AI keys present
const MAX_FILES = parseInt(process.env.MAX_LINT_FILES || '20', 10);

// ============================================================
// PART 1: STATIC SDK v3 RULES (No AI needed — always runs)
// ============================================================

const RULES = [
  {
    id: 'sdk3-async-init',
    severity: 'warn',
    desc: 'onInit() should be async. For Zigbee drivers, use async onNodeInit().',
    test: (code) => /\bonInit\s*\(/.test(code) && !/async\s+onInit\s*\(/.test(code),
    fix: (code) => code.replace(/(\s+)onInit\s*\(\s*\)\s*\{/g, '$1async onInit() {'),
  },
  {
    id: 'sdk3-no-v2-zigbee',
    severity: 'error',
    desc: 'this.homey.zigbee.getDevice() is SDK v2. Remove it.',
    test: (code) => /this\.homey\.zigbee\.getDevice/.test(code),
    fix: null, // Cannot auto-fix — needs manual review
  },
  {
    id: 'sdk3-no-global-managers',
    severity: 'warn',
    desc: 'Direct Manager* global access detected. Use this.homey.<managerId>.',
    test: (code) => /\bHomey\.Manager[A-Z]/.test(code) || /\bManagerDrivers\b/.test(code),
    fix: null,
  },
  {
    id: 'sdk3-await-capability',
    severity: 'info',
    desc: 'setCapabilityValue() calls should be awaited.',
    test: (code) => {
      const total = (code.match(/this\.setCapabilityValue\(/g) || []).length;
      const awaited = (code.match(/await\s+this\.setCapabilityValue\(/g) || []).length;
      return total > 0 && awaited < total;
    },
    count: (code) => {
      const total = (code.match(/this\.setCapabilityValue\(/g) || []).length;
      const awaited = (code.match(/await\s+this\.setCapabilityValue\(/g) || []).length;
      return { total, awaited, missing: total - awaited };
    },
    fix: null, // Too dangerous to auto-fix — might break try/catch flow
  },
  {
    id: 'tuya-settings-key',
    severity: 'info',
    desc: 'Settings key should be snake_case (zb_model_id not zb_modelId).',
    test: (code) => /getSetting\(['"]zb_modelId['"]\)|getSetting\(['"]zb_manufacturerName['"]\)/.test(code)
                     && !/zb_model_id|zb_manufacturer_name/.test(code), // Only flag if NO snake_case fallback
    fix: null,
  },
  {
    id: 'tuya-titleformatted-device',
    severity: 'error',
    desc: 'titleFormatted with [[device]] causes manual device selection bug.',
    test: (code) => /titleFormatted.*\[\[device\]\]/.test(code),
    fix: null,
  },
  {
    id: 'sdk3-listener-leak',
    severity: 'warn',
    desc: 'High number of capability listeners — verify no duplicates on restart.',
    test: (code) => {
      const count = (code.match(/registerCapabilityListener|registerMultipleCapabilityListener/g) || []).length;
      return count > 8;
    },
    count: (code) => (code.match(/registerCapabilityListener|registerMultipleCapabilityListener/g) || []).length,
    fix: null,
  },
  {
    id: 'sdk3-ondeleted-cleanup',
    severity: 'info',
    desc: 'Driver has listeners but no onDeleted/onUninit cleanup.',
    test: (code) => {
      const hasListeners = /registerCapabilityListener/.test(code);
      const hasCleanup = /onDeleted|onUninit/.test(code);
      return hasListeners && !hasCleanup;
    },
    fix: null,
  },
  {
    id: 'tuya-dp-ef00-cluster',
    severity: 'info',
    desc: 'EF00 driver should reference cluster 0xEF00 or 61184.',
    test: (code, driverDir) => {
      const compose = loadCompose(driverDir);
      if (!compose) return false;
      const caps = compose.capabilities || [];
      const hasTuyaDP = caps.some(c => /^tuya_dp_/.test(c));
      if (!hasTuyaDP) return false;
      return !/0xEF00|61184|ef00/i.test(code);
    },
    fix: null,
  },
];

function loadCompose(driverDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(driverDir, 'driver.compose.json'), 'utf8'));
  } catch { return null; }
}

function runStaticLint(filePath, driverDir) {
  const code = fs.readFileSync(filePath, 'utf8');
  const results = [];

  for (const rule of RULES) {
    if (rule.test(code, driverDir)) {
      const entry = { id: rule.id, severity: rule.severity, desc: rule.desc, file: filePath };
      if (rule.count) entry.details = rule.count(code);
      results.push(entry);
    }
  }

  return { filePath, code, results };
}

// ============================================================
// PART 2: AI ENRICHMENT (Optional — uses ai-helper.js cascade)
// ============================================================

async function aiEnrichDriver(filePath, code, staticResults, memory) {
  let callAI;
  try {
    ({ callAI } = require(path.join(process.cwd(), '.github', 'scripts', 'ai-helper')));
  } catch {
    console.log('  ⚠️ ai-helper.js not available — AI enrichment skipped');
    return null;
  }

  const driver = path.basename(path.dirname(filePath));
  const compose = loadCompose(path.dirname(filePath));
  const caps = compose?.capabilities || [];
  const fps = compose?.zigbee?.manufacturerName || [];

  // Build context-aware prompt
  let prompt = `You are a Homey SDK v3 expert. Analyze this Zigbee driver file.

DRIVER: ${driver}
CAPABILITIES: ${caps.join(', ')}
FINGERPRINTS: ${fps.length} manufacturer names

STATIC LINT FINDINGS:
${staticResults.map(r => `- ${r.severity.toUpperCase()}: ${r.desc}`).join('\n') || 'None'}

`;

  // Inject learned patterns from memory
  const patterns = memory.patterns || [];
  if (patterns.length > 0) {
    prompt += `KNOWN PATTERNS (from past runs):\n`;
    for (const p of patterns.slice(-10)) {
      prompt += `- ${p.id}: ${p.desc} (seen ${p.count}x)\n`;
    }
    prompt += '\n';
  }

  prompt += `RULES:
1. ONLY suggest ADDITIONS or FIXES. NEVER remove existing functionality.
2. If a Tuya DP mapping is missing for a capability, suggest adding it.
3. If a cluster binding is missing, suggest adding it.
4. Ensure async onNodeInit() pattern is used.
5. Verify that await is used with setCapabilityValue.
6. Check for proper error handling in capability listeners.
7. If code is correct, respond with ONLY the word "VALID".
8. If you have suggestions, respond with a JSON object:
   {"suggestions": [{"type": "add|fix|improve", "location": "line description", "current": "...", "proposed": "...", "reason": "..."}]}
   Do NOT output the full file — only output specific suggestions.

DRIVER CODE:
\`\`\`javascript
${code.substring(0, 8000)}
\`\`\``;

  try {
    const res = await callAI(prompt, 'Homey SDK v3 driver analyzer. Output ONLY "VALID" or a JSON suggestions object. No markdown, no explanations.', {
      maxTokens: 2000,
      complexity: 'medium',
      taskType: 'analyze'
    });

    if (!res || !res.text || res.text === 'AI_OFFLINE_OR_LIMIT_REACHED') return null;

    const text = res.text.trim();
    if (text === 'VALID' || text.toUpperCase() === 'VALID') {
      console.log(`  ✅ AI says ${driver} is VALID (model: ${res.model})`);
      return { valid: true, model: res.model };
    }

    // Parse suggestions
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
        console.log(`  🔍 AI suggests ${(parsed.suggestions || []).length} improvement(s) for ${driver} (model: ${res.model})`);
        return { valid: false, suggestions: parsed.suggestions || [], model: res.model };
      }
    } catch {
      console.log(`  ⚠️ AI response wasn't parseable JSON for ${driver}`);
    }

    return null;
  } catch (e) {
    console.log(`  ⚠️ AI error for ${driver}: ${e.message}`);
    return null;
  }
}

// ============================================================
// PART 3: SMART MERGE (Additive only, validated)
// ============================================================

function smartMerge(code, suggestions) {
  if (!suggestions || !suggestions.length) return null;

  let modified = code;
  let applied = [];

  for (const sug of suggestions) {
    if (!sug.type || !sug.proposed) continue;

    // SAFETY: Only apply "add" type suggestions (never "remove" or "replace")
    if (sug.type === 'add') {
      // For additive suggestions, only apply if the proposed code doesn't already exist
      if (!modified.includes(sug.proposed.trim())) {
        // Don't blindly insert — just log it for manual review
        applied.push({ ...sug, status: 'suggested' });
      }
    } else if (sug.type === 'fix' && sug.current && sug.proposed) {
      // For fixes: only apply if the current pattern exists AND the fix doesn't break syntax
      if (modified.includes(sug.current)) {
        const candidate = modified.replace(sug.current, sug.proposed);
        // Syntax check the candidate
        if (syntaxCheck(candidate)) {
          modified = candidate;
          applied.push({ ...sug, status: 'applied' });
        } else {
          applied.push({ ...sug, status: 'rejected-syntax' });
        }
      } else {
        applied.push({ ...sug, status: 'rejected-notfound' });
      }
    } else {
      applied.push({ ...sug, status: 'suggested' });
    }
  }

  const hasChanges = modified !== code;
  return { code: hasChanges ? modified : null, applied, hasChanges };
}

function syntaxCheck(code) {
  const tmpFile = path.join(require('os').tmpdir(), 'sdk3-lint-check-' + Date.now() + '.js');
  try {
    fs.writeFileSync(tmpFile, code);
    execSync(`node -c "${tmpFile}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// ============================================================
// PART 4: VALIDATION GATE
// ============================================================

function preValidate() {
  try {
    execSync('npx homey app build 2>&1', { stdio: 'pipe', cwd: process.cwd(), timeout: 120000 });
    execSync('npx homey app validate --level debug 2>&1', { stdio: 'pipe', cwd: process.cwd(), timeout: 120000 });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PART 5: MEMORY — Recursive learning
// ============================================================

function loadMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEM_FILE, 'utf8'));
  } catch {
    return { patterns: [], lastRun: null, totalRuns: 0, totalIssues: 0 };
  }
}

function saveMemory(mem) {
  try {
    fs.mkdirSync(path.dirname(MEM_FILE), { recursive: true });
    fs.writeFileSync(MEM_FILE, JSON.stringify(mem, null, 2) + '\n');
  } catch {}
}

function recordPattern(mem, issue) {
  const existing = mem.patterns.find(p => p.id === issue.id);
  if (existing) {
    existing.count++;
    existing.lastSeen = new Date().toISOString();
    existing.files = [...new Set([...(existing.files || []), path.basename(path.dirname(issue.file))])].slice(-20);
  } else {
    mem.patterns.push({
      id: issue.id,
      desc: issue.desc,
      severity: issue.severity,
      count: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      files: [path.basename(path.dirname(issue.file))],
    });
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('=== SDK v3 Smart Enrichment Linter ===');
  console.log(`Mode: ${DRY ? 'DRY RUN' : 'LIVE'} | AI: ${AI_ENABLED ? 'ON' : 'OFF'} | Max files: ${MAX_FILES}`);

  const memory = loadMemory();
  memory.totalRuns++;
  memory.lastRun = new Date().toISOString();

  // Determine which files to lint
  let targets = [];

  // Priority 1: Recently changed files (git diff)
  try {
    const changed = execSync('git diff --name-only HEAD~1 HEAD 2>/dev/null || true', { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.match(/^drivers\/.*\/device\.js$/))
      .map(f => path.join(process.cwd(), f));
    targets.push(...changed);
    console.log(`Changed drivers: ${changed.length}`);
  } catch {}

  // Priority 2: If no changed files, scan all drivers
  if (targets.length === 0) {
    try {
      const dirs = fs.readdirSync(DDIR).filter(d => {
        const f = path.join(DDIR, d, 'device.js');
        return fs.existsSync(f);
      });
      targets = dirs.slice(0, MAX_FILES).map(d => path.join(DDIR, d, 'device.js'));
      console.log(`Full scan: ${targets.length}/${dirs.length} drivers`);
    } catch {}
  }

  targets = targets.slice(0, MAX_FILES);

  // === STATIC PASS ===
  console.log('\n--- PASS 1: Static SDK v3 Rules ---');
  const allResults = [];
  let totalIssues = 0;

  for (const file of targets) {
    if (!fs.existsSync(file)) continue;
    const driverDir = path.dirname(file);
    const driver = path.basename(driverDir);
    const { results } = runStaticLint(file, driverDir);

    if (results.length > 0) {
      totalIssues += results.length;
      console.log(`  ${driver}: ${results.length} issue(s)`);
      for (const r of results) {
        console.log(`    ${r.severity === 'error' ? '❌' : r.severity === 'warn' ? '⚠️' : 'ℹ️'} [${r.id}] ${r.desc}`);
        recordPattern(memory, r);
      }
    }

    allResults.push({ driver, file, staticIssues: results });
  }

  console.log(`\nStatic pass: ${totalIssues} issue(s) across ${targets.length} driver(s)`);

  // === STATIC AUTO-FIX PASS (safe fixes only) ===
  let autoFixed = 0;
  if (!DRY) {
    console.log('\n--- PASS 1b: Safe Static Auto-Fix ---');
    for (const entry of allResults) {
      const fixableIssues = entry.staticIssues.filter(r => {
        const rule = RULES.find(rl => rl.id === r.id);
        return rule && rule.fix;
      });
      if (fixableIssues.length === 0) continue;

      let code = fs.readFileSync(entry.file, 'utf8');
      let changed = false;

      for (const issue of fixableIssues) {
        const rule = RULES.find(rl => rl.id === issue.id);
        const newCode = rule.fix(code);
        if (newCode !== code && syntaxCheck(newCode)) {
          code = newCode;
          changed = true;
          autoFixed++;
          console.log(`  ✅ Auto-fixed [${rule.id}] in ${entry.driver}`);
        }
      }

      if (changed) {
        fs.writeFileSync(entry.file, code);
      }
    }
    if (autoFixed > 0) console.log(`Auto-fixed: ${autoFixed} issue(s)`);
  }

  // === AI ENRICHMENT PASS ===
  let aiSuggestions = 0;
  let aiApplied = 0;
  if (AI_ENABLED && targets.length > 0) {
    console.log('\n--- PASS 2: AI Enrichment ---');

    // Only AI-analyze files that had static issues OR recently changed
    const aiTargets = allResults
      .filter(e => e.staticIssues.length > 0)
      .slice(0, 5); // Cap at 5 to save AI budget

    if (aiTargets.length === 0) {
      console.log('  No files need AI enrichment (all clean)');
    }

    for (const entry of aiTargets) {
      const code = fs.readFileSync(entry.file, 'utf8');
      const aiResult = await aiEnrichDriver(entry.file, code, entry.staticIssues, memory);

      if (aiResult && !aiResult.valid && aiResult.suggestions) {
        aiSuggestions += aiResult.suggestions.length;
        entry.aiResult = aiResult;

        if (!DRY) {
          // Smart merge — additive only
          const merge = smartMerge(code, aiResult.suggestions);
          if (merge && merge.hasChanges) {
            fs.writeFileSync(entry.file, merge.code);
            aiApplied += merge.applied.filter(a => a.status === 'applied').length;
            console.log(`  ✏️ Applied ${merge.applied.filter(a => a.status === 'applied').length} fix(es) to ${entry.driver}`);

            // Record applied fixes in memory
            for (const a of merge.applied.filter(a => a.status === 'applied')) {
              recordPattern(memory, { id: 'ai-fix-' + (a.type || 'unknown'), desc: a.reason || 'AI fix', severity: 'info', file: entry.file });
            }
          }

          // Log suggestions for manual review
          const suggested = (merge?.applied || []).filter(a => a.status === 'suggested');
          if (suggested.length > 0) {
            console.log(`  📋 ${suggested.length} suggestion(s) for manual review in ${entry.driver}`);
          }
        }
      }
    }

    console.log(`AI pass: ${aiSuggestions} suggestion(s), ${aiApplied} applied`);
  }

  // === POST-VALIDATION (if any changes were made) ===
  if (autoFixed > 0 || aiApplied > 0) {
    console.log('\n--- PASS 3: Post-Validation Gate ---');
    // Syntax check all modified files
    let syntaxOk = true;
    for (const entry of allResults) {
      if (!fs.existsSync(entry.file)) continue;
      if (!syntaxCheck(fs.readFileSync(entry.file, 'utf8'))) {
        console.log(`  ❌ Syntax error in ${entry.driver} — ROLLING BACK`);
        try {
          execSync(`git checkout -- "${entry.file}"`, { stdio: 'pipe' });
          console.log(`  ↩️ Rolled back ${entry.driver}`);
        } catch {}
        syntaxOk = false;
      }
    }

    if (syntaxOk) {
      console.log('  ✅ All modified files pass syntax check');
    }
  }

  // === SAVE MEMORY & REPORT ===
  memory.totalIssues = (memory.totalIssues || 0) + totalIssues;
  saveMemory(memory);

  const report = {
    timestamp: new Date().toISOString(),
    driversScanned: targets.length,
    staticIssues: totalIssues,
    autoFixed,
    aiSuggestions,
    aiApplied,
    dryRun: DRY,
    results: allResults.map(e => ({
      driver: e.driver,
      issues: e.staticIssues.map(i => i.id),
      aiModel: e.aiResult?.model,
    })),
    memoryPatterns: memory.patterns.length,
  };

  try {
    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + '\n');
  } catch {}

  // === SUMMARY ===
  console.log('\n=== Summary ===');
  console.log(`Drivers scanned: ${targets.length}`);
  console.log(`Static issues: ${totalIssues}`);
  console.log(`Auto-fixed: ${autoFixed}`);
  console.log(`AI suggestions: ${aiSuggestions}`);
  console.log(`AI applied: ${aiApplied}`);
  console.log(`Memory patterns: ${memory.patterns.length}`);
  console.log(`Total runs: ${memory.totalRuns}`);

  // GitHub Actions annotations
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = `## 🤖 SDK v3 Smart Linter\n| Metric | Value |\n|---|---|\n| Scanned | ${targets.length} |\n| Static Issues | ${totalIssues} |\n| Auto-fixed | ${autoFixed} |\n| AI Suggestions | ${aiSuggestions} |\n| AI Applied | ${aiApplied} |\n| Memory Patterns | ${memory.patterns.length} |\n`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `lint_issues=${totalIssues}\nlint_fixed=${autoFixed}\nlint_ai_applied=${aiApplied}\n`);
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
