#!/usr/bin/env node
'use strict';

/**
 * forum-ai-paste-gate.js (P108 / T157628)
 *
 * Detects "unchecked AI paste" patterns in forum drafts / reply templates.
 * Default mode: report-only. Exit 1 if --strict and score exceeds threshold.
 *
 * Also documents project policy: prefer silent code enrichment over forum posts.
 *
 * Usage:
 *   node tools/ci/forum-ai-paste-gate.js
 *   node tools/ci/forum-ai-paste-gate.js path/to/draft.md --strict
 *   node tools/ci/forum-ai-paste-gate.js --scan-defaults --strict
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STRICT = process.argv.includes('--strict');
const SCAN_DEFAULTS = process.argv.includes('--scan-defaults');

const PATTERNS = [
  { id: 'ai-self', re: /\b(?:as an AI|I(?:'m| am) (?:an? )?(?:AI|language model)|ChatGPT|Claude|LLM|GPT-\d)\b/i, w: 5 },
  { id: 'corp-open', re: /^(?:Hi(?:\s+there)?|Hello(?:\s+everyone)?|Greetings)[,!]?\s+(?:I(?:'d| would) be happy|Thank you for (?:reaching|your)|I understand (?:your|that))/im, w: 3 },
  { id: 'corp-close', re: /\b(?:Happy to help|Let me know if you (?:need|have)|Feel free to (?:ask|reach)|Hope this helps|Best regards|Kind regards)\b/i, w: 3 },
  { id: 'md-wall', re: /(?:^#{1,3}\s+.+$[\s\S]{0,40}){3,}/m, w: 4 },
  { id: 'bullet-wall', re: /(?:^\s*[-*•]\s+.+\n){6,}/m, w: 3 },
  { id: 'emoji-wall', re: /(?:[\u{1F300}-\u{1FAFF}].*){8,}/u, w: 2 },
  { id: 'bot-leak', re: /\b(?:auto[- ]?respond|GitHub Actions?|workflow|pipeline|cron|scrap(?:e|ing)|ensemble|Discourse API)\b/i, w: 4 },
  { id: 'script-hallucination', re: /\bHomey\.script\.[a-zA-Z]+\s*\(|await\s+Homey\.(?:flow|devices)\.[a-zA-Z]+/i, w: 2 },
];

const DEFAULT_SCAN = [
  'docs/forum_post_draft.md',
  'docs/responses/forum-p80.md',
  '.github/templates/forum-post-1.md',
  '.github/templates/forum-post-1-rendered.md',
];

function scoreText(text) {
  const hits = [];
  let score = 0;
  for (const p of PATTERNS) {
    if (p.re.test(text)) {
      hits.push(p.id);
      score += p.w;
    }
  }
  // Length heuristic: very long "support article" replies
  if (text.length > 1200) {
    hits.push('too-long');
    score += 2;
  }
  return { score, hits };
}

function scanFile(fp) {
  if (!fs.existsSync(fp)) {return null;}
  const text = fs.readFileSync(fp, 'utf8');
  if (/DEPRECATED FOR AUTO-POST/i.test(text)) {
    return {
      file: path.relative(ROOT, fp),
      score: 0,
      hits: ['archived-not-for-posting'],
      bytes: text.length,
      archived: true,
    };
  }
  const { score, hits } = scoreText(text);
  return { file: path.relative(ROOT, fp), score, hits, bytes: text.length };
}

function main() {
  console.log('=== Forum AI-paste gate (T157628) ===');
  console.log('Policy: prefer silent enrichment; never paste unchecked AI to Discourse.');
  const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targets = files.length
    ? files.map((f) => path.resolve(f))
    : (SCAN_DEFAULTS ? DEFAULT_SCAN.map((f) => path.join(ROOT, f)) : []);

  if (!targets.length) {
    console.log('No files given. Pass draft paths or --scan-defaults.');
    console.log('OK (policy reminder only).');
    process.exit(0);
  }

  let worst = 0;
  for (const fp of targets) {
    const r = scanFile(fp);
    if (!r) {
      console.log('skip missing', path.relative(ROOT, fp));
      continue;
    }
    worst = Math.max(worst, r.score);
    const flag = r.score >= 5 ? 'FAIL' : r.score >= 3 ? 'WARN' : 'OK';
    console.log(`${flag} score=${r.score} ${r.file}` + (r.hits.length ? ` [${r.hits.join(',')}]` : ''));
  }

  if (STRICT && worst >= 5) {
    console.error('Strict gate failed — rewrite in human voice or do not post.');
    process.exit(1);
  }
  console.log('Done. Reminder: auto forum posting remains dry-run / blocked.');
}

main();
