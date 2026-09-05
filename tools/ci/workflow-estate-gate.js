#!/usr/bin/env node
'use strict';

/**
 * workflow-estate-gate.js (P193)
 *
 * Machine-check the Homey CI estate against WORKFLOW_GUIDELINES.md:
 *   - defaults.run.shell: bash
 *   - permissions + concurrency + per-job timeout
 *   - publish pipelines must not cancel mid-Athom upload
 *   - auto-commits must carry [skip ci]
 *   - workflow_run must name a real workflow
 *   - self-heal must never re-trigger Publish Stable→Test
 *   - cron collisions (same UTC hour:minute)
 *
 * Usage:
 *   node tools/ci/workflow-estate-gate.js
 *   node tools/ci/workflow-estate-gate.js --json
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');
const JSON_MODE = process.argv.includes('--json');

const ATHOM_UPLOAD_RE = /homey app publish|direct-api-publish\.js|auto-publish-draft\.js|auto-promote-puppeteer/;
const STABLE_TEST_TRIGGER_RE = /gh\s+workflow\s+run\s+["']🚀 Publish Stable to Test["']/;
const SKIP_CI_RE = /\[skip ci\]/;

const errors = [];
const warnings = [];

function add(list, file, message) {
  list.push(`${file}: ${message}`);
}

function workflowFiles() {
  return fs.readdirSync(WF_DIR)
    .filter((n) => /\.ya?ml$/i.test(n) && !n.startsWith('.'))
    .sort();
}

function loadDoc(file, content) {
  try {
    return yaml.load(content);
  } catch (err) {
    add(errors, file, `YAML parse failed: ${err.message}`);
    return null;
  }
}

function collectNames(files) {
  const names = new Set();
  for (const file of files) {
    const content = fs.readFileSync(path.join(WF_DIR, file), 'utf8');
    const doc = loadDoc(file, content);
    if (doc && doc.name) names.add(String(doc.name));
  }
  return names;
}

function walkOn(on) {
  if (!on) return [];
  if (Array.isArray(on)) return on.map((x) => ({ type: String(x) }));
  if (typeof on === 'string') return [{ type: on }];
  return Object.entries(on).map(([type, value]) => ({ type, value }));
}

function cronKeys(expr) {
  const parts = String(expr || '').trim().split(/\s+/);
  if (parts.length < 2) return [];
  return [`${parts[1]}:${parts[0]}`];
}

function main() {
  const files = workflowFiles();
  const names = collectNames(files);
  const crons = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(WF_DIR, file), 'utf8');
    const doc = loadDoc(file, content);
    if (!doc) continue;

    if (!doc.name) add(errors, file, 'missing top-level name');
    if (!doc.on) add(errors, file, 'missing on:');
    if (!doc.jobs || typeof doc.jobs !== 'object') add(errors, file, 'missing jobs:');

    const shell = doc.defaults && doc.defaults.run && doc.defaults.run.shell;
    if (shell !== 'bash') {
      add(errors, file, 'defaults.run.shell must be bash (PowerShell breaks >> / << on windows runners)');
    }
    if (!doc.permissions) add(errors, file, 'missing permissions:');
    if (!doc.concurrency) add(warnings, file, 'missing concurrency:');

    const conc = doc.concurrency && typeof doc.concurrency === 'object' ? doc.concurrency : {};
    const uploads = content.split('\n').some((line) => ATHOM_UPLOAD_RE.test(line.replace(/#.*$/, '')));
    if (uploads && conc['cancel-in-progress'] === true) {
      add(errors, file, 'Athom upload/promote pipeline must set concurrency.cancel-in-progress: false (P139)');
    }

    if (STABLE_TEST_TRIGGER_RE.test(content)) {
      add(errors, file, 'must not re-trigger "Publish Stable to Test" (shared App ID overwrites master Test)');
    }

    const jobs = doc.jobs && typeof doc.jobs === 'object' ? doc.jobs : {};
    for (const [jobName, job] of Object.entries(jobs)) {
      if (!job || typeof job !== 'object') continue;
      if (job['timeout-minutes'] == null) {
        add(errors, file, `job ${jobName} missing timeout-minutes`);
      }
    }

    let commit;
    const commitRe = /git\s+commit\s+-m\s+["']([^"']+)["']/g;
    while ((commit = commitRe.exec(content))) {
      if (!SKIP_CI_RE.test(commit[1]) && !/skip ci/.test(commit[1])) {
        add(errors, file, `git commit without [skip ci]: ${commit[1].slice(0, 80)}`);
      }
    }

    for (const trigger of walkOn(doc.on)) {
      if (trigger.type !== 'workflow_run' || !trigger.value) continue;
      const wanted = [].concat(trigger.value.workflows || []);
      for (const want of wanted) {
        if (!names.has(String(want))) {
          add(errors, file, `workflow_run references missing workflow name "${want}"`);
        }
      }
      if (trigger.value.schedule) {
        for (const row of [].concat(trigger.value.schedule)) {
          if (row && row.cron) crons.push({ file, cron: row.cron });
        }
      }
    }

    const on = doc.on && typeof doc.on === 'object' ? doc.on : {};
    for (const row of [].concat(on.schedule || [])) {
      if (row && row.cron) crons.push({ file, cron: row.cron });
    }
  }

  const bySlot = new Map();
  for (const row of crons) {
    for (const key of cronKeys(row.cron)) {
      if (!bySlot.has(key)) bySlot.set(key, []);
      bySlot.get(key).push(`${row.file} (${row.cron})`);
    }
  }
  for (const [slot, list] of bySlot) {
    if (list.length > 1) {
      add(warnings, 'cron', `${list.length} workflows at ${slot} UTC: ${list.join('; ')}`);
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    workflows: files.length,
    errors: errors.length,
    warnings: warnings.length,
    errorDetails: errors,
    warningDetails: warnings,
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('═══════════════════════════════════════════════');
    console.log('  Workflow estate gate (P193)');
    console.log(`  workflows: ${files.length}`);
    console.log('═══════════════════════════════════════════════');
    for (const w of warnings) console.log(`  ~ ${w}`);
    if (errors.length) {
      for (const e of errors) console.log(`  ❌ ${e}`);
      console.log(`\nFAILED: ${errors.length} defect(s)`);
    } else {
      console.log('  ✅ Estate checks passed');
    }
  }

  if (errors.length) process.exit(1);
}

main();
