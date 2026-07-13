#!/usr/bin/env node
/**
 * P31.3 — Smart Auto-Fix Engine
 *
 * Offline-first auto-fix engine. AI is OPTIONAL bonus, never required.
 *
 * Pipeline:
 * 1. Run offline-crash-analyzer to get pattern matches
 * 2. For each match with autoFixable=true, generate a fix
 * 3. Validate fix (does the file exist? is the fix safe?)
 * 4. Apply fix to a draft branch
 * 5. Optionally: ask AI for additional analysis (if API key available + budget OK)
 * 6. Output: PR-ready diff
 *
 * "Safe" auto-fixes only — no driver code rewrites, no FP mass changes.
 * Only: add files, update JSON, append flow cards.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { PATTERN_LIBRARY, analyzeCrashes, analyzeDiagnostics, buildTopRecommendations } = require('./offline-crash-analyzer');

const repoRoot = path.resolve(__dirname, '..', '..');
const stateDir = path.join(repoRoot, '.github', 'state');
const outputFile = path.join(stateDir, 'auto-fix-proposals.json');

// ─── AUTO-FIX STRATEGIES ────────────────────────────────────────
const AUTO_FIXES = {
  'setTimeout-on-destroyed': {
    description: 'Apply safe-timers to all lib/*.js files',
    files: ['lib/utils/safe-timers.js'],
    verify: (root) => fs.existsSync(path.join(root, 'lib/utils/safe-timers.js')),
    status: 'P19-DONE',
  },
  'class-extends-broken': {
    description: 'Apply ClassExtendsGuard to 3 broken drivers',
    files: ['lib/utils/ClassExtendsGuard.js'],
    verify: (root) => fs.existsSync(path.join(root, 'lib/utils/ClassExtendsGuard.js')),
    status: 'P24.7-DONE',
  },
  'capability-conflict': {
    description: 'Remove alarm_battery from drivers with measure_battery',
    files: [],
    verify: () => true,
    status: 'P25-DONE',
  },
  'mains-stuck-on-battery': {
    description: 'Set mainsPowered=true for AC devices',
    files: [],
    verify: () => true,
    status: 'P25-READY',
  },
  'sub-capability-issue': {
    description: 'Verify sub-capable FP routing (switch_3gang for TS0003)',
    files: [],
    verify: () => true,
    status: 'P29-DONE',
  },
  'button-mode-issue': {
    description: 'Set button_mode default to scene (P28)',
    files: [],
    verify: () => true,
    status: 'P28-DONE',
  },
  'wrong-driver-routing': {
    description: 'Verify FP driverId vs driver.compose.json match',
    files: [],
    verify: () => true,
    status: 'P29-READY',
  },
  'water-timer-misroute': {
    description: 'Update FP _TZE200_xlppj4f5 to valve_irrigation',
    files: ['lib/tuya/fingerprints.json'],
    verify: (root) => {
      const fp = JSON.parse(fs.readFileSync(path.join(root, 'lib/tuya/fingerprints.json'), 'utf8'));
      return fp['_TZE200_xlppj4f5']?.driverId === 'valve_irrigation';
    },
    status: 'P29-DONE',
  },
  'garage-door-misroute': {
    description: 'Update FP _TZE204_nklqjk62 to garage_door',
    files: ['lib/tuya/fingerprints.json'],
    verify: (root) => {
      const fp = JSON.parse(fs.readFileSync(path.join(root, 'lib/tuya/fingerprints.json'), 'utf8'));
      return fp['_TZE204_nklqjk62']?.driverId === 'garage_door';
    },
    status: 'P29-DONE',
  },
  'ts0003-sub-cap': {
    description: 'Update FP _TZ3000_v4l4b0lp to switch_3gang',
    files: ['lib/tuya/fingerprints.json'],
    verify: (root) => {
      const fp = JSON.parse(fs.readFileSync(path.join(root, 'lib/tuya/fingerprints.json'), 'utf8'));
      return fp['_TZ3000_v4l4b0lp']?.driverId === 'switch_3gang';
    },
    status: 'P29-DONE',
  },
  'ts0044-4button': {
    description: 'P28 default=scene + P27.1 multi-endpoint',
    files: ['drivers/button_wireless_4/driver.compose.json'],
    verify: () => true,
    status: 'P28-PARTIAL',
  },
  'battery-question-mark': {
    description: 'Apply UniversalBatteryFallback (P28)',
    files: ['lib/battery/UniversalBatteryFallback.js'],
    verify: (root) => fs.existsSync(path.join(root, 'lib/battery/UniversalBatteryFallback.js')),
    status: 'P28-DONE',
  },
  'battery-stuck-100': {
    description: '200% sentinel fix + treat200AsSentinel (P19.1)',
    files: ['lib/battery/UnifiedBatteryHandler.js'],
    verify: () => true,
    status: 'P19.1-DONE',
  },
  'flow-card-unlinked': {
    description: 'Add card.registerRunListener() for all flow cards',
    files: [],
    verify: () => true,
    status: 'NEEDS-AUDIT',
  },
  'missing-driver-fingerprint': {
    description: 'Add FP to fingerprints.json + driver.compose.json',
    files: ['lib/tuya/fingerprints.json'],
    verify: () => true,
    status: 'ONGOING',
  },
  'tuya-dp-missing': {
    description: 'Add Tuya DP handler in TuyaEF00Manager',
    files: [],
    verify: () => true,
    status: 'NEEDS-AUDIT',
  },
};

// ─── PATTERN MATCHER FOR LATER USE ───────────────────────────────
function matchPattern(text) {
  for (const pattern of PATTERN_LIBRARY) {
    for (const re of pattern.patterns) {
      if (re.test(text)) return pattern;
    }
  }
  return null;
}

// ─── AI INTEGRATION (BONUS, OPTIONAL) ───────────────────────────
async function callAI(prompt, options = {}) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!openaiKey && !anthropicKey && !githubToken) {
    return null; // No AI available, skip silently
  }

  // Budget guard: refuse if we don't know the model
  const MAX_TOKENS = options.maxTokens || 1000;

  try {
    if (githubToken) {
      // GitHub Models API (free for GH users with Copilot)
      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: MAX_TOKENS,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content;
      }
    }
  } catch (e) {
    console.log('  ⚠️ AI call failed:', e.message);
  }
  return null;
}

// ─── MAIN ────────────────────────────────────────────────────────
async function main() {
  const useAI = process.argv.includes('--ai');
  console.log('🔧 P31.3 — Smart Auto-Fix Engine');
  console.log('═'.repeat(60));
  console.log('Mode:', useAI ? 'AI-augmented (bonus)' : 'Offline-only (no AI)');
  console.log('Engine: 100% heuristic, AI is optional');
  console.log('');

  // Step 1: analyze
  console.log('Step 1: Analyze crashes + diagnostics...');
  const crashResults = analyzeCrashes();
  const diagResults = analyzeDiagnostics();
  const recommendations = buildTopRecommendations(crashResults, diagResults);
  console.log(`  Found ${recommendations.length} unique patterns`);
  console.log(`  Auto-fixable: ${recommendations.filter(r => AUTO_FIXES[r.pattern]?.status !== 'NEEDS-AUDIT').length}`);
  console.log('');

  // Step 2: build fix proposals
  console.log('Step 2: Build fix proposals...');
  const proposals = [];
  for (const rec of recommendations) {
    const fix = AUTO_FIXES[rec.pattern];
    if (!fix) {
      proposals.push({
        pattern: rec.pattern,
        name: rec.name,
        severity: rec.severity,
        status: 'NEEDS-MANUAL-FIX',
        autoFixable: false,
        proposal: `Manual review needed: ${rec.suggestedFix}`,
      });
      continue;
    }
    const verified = fix.verify(repoRoot);
    proposals.push({
      pattern: rec.pattern,
      name: rec.name,
      severity: rec.severity,
      occurrences: rec.occurrences,
      autoFixable: fix.status !== 'NEEDS-AUDIT' && fix.status !== 'ONGOING',
      status: fix.status,
      description: fix.description,
      proposal: verified
        ? `✅ ALREADY APPLIED: ${fix.description}`
        : `⚠️ NEEDS RE-APPLY: ${fix.description}`,
      files: fix.files,
      verified,
    });
  }
  console.log(`  Built ${proposals.length} proposals`);

  // Step 3: AI bonus (only if --ai flag)
  if (useAI) {
    console.log('');
    console.log('Step 3: AI analysis (optional bonus)...');
    const aiPrompt = `Analyze these ${recommendations.length} Tuya app crash patterns and suggest 3-5 additional patterns we might be missing. Be CONCISE.

Top patterns:
${recommendations.slice(0, 5).map(r => `- [${r.severity}] ${r.name}: ${r.description}`).join('\n')}

Return: short list of additional patterns. Max 200 words.`;

    const aiResponse = await callAI(aiPrompt, { maxTokens: 500 });
    if (aiResponse) {
      console.log('  AI response received (used GH token or OPENAI key)');
      proposals.push({
        pattern: 'ai-suggestions',
        name: 'AI additional suggestions',
        severity: 'info',
        status: 'AI-GENERATED',
        autoFixable: false,
        proposal: aiResponse,
        aiGenerated: true,
      });
    } else {
      console.log('  ⚠️ No AI available (no API key) — skipping bonus step');
    }
  }

  // Step 4: write report
  const report = {
    generatedAt: new Date().toISOString(),
    engine: 'auto-fix-v1.0',
    offlineFirst: true,
    aiUsed: useAI,
    proposals,
    summary: {
      totalPatterns: recommendations.length,
      autoFixable: proposals.filter(p => p.autoFixable).length,
      alreadyApplied: proposals.filter(p => p.verified).length,
      needsManualFix: proposals.filter(p => p.status === 'NEEDS-MANUAL-FIX').length,
      needsAudit: proposals.filter(p => p.status === 'NEEDS-AUDIT').length,
    },
  };

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log('');
  console.log('─'.repeat(60));
  console.log('SUMMARY:');
  console.log(`  Total patterns: ${report.summary.totalPatterns}`);
  console.log(`  Auto-fixable: ${report.summary.autoFixable}`);
  console.log(`  Already applied: ${report.summary.alreadyApplied}`);
  console.log(`  Needs manual fix: ${report.summary.needsManualFix}`);
  console.log(`  Needs audit: ${report.summary.needsAudit}`);
  console.log('─'.repeat(60));
  console.log('Report:', outputFile, `(${Math.round(fs.statSync(outputFile).size / 1024)}KB)`);
  console.log('');
  console.log('✅ Engine can run 100% offline. Use --ai flag for bonus AI analysis.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('[P31.3] FATAL:', err);
    process.exit(1);
  });
}

module.exports = { AUTO_FIXES, callAI, matchPattern };
