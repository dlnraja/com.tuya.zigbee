#!/usr/bin/env node
'use strict';

/**
 * P2800 — agent-config hidden-text gate (free, no AI).
 *
 * WHY: AI agent instruction files (AGENTS.md, skills/, .cursor/rules, .github AI
 * rules) are read and obeyed by coding agents. Invisible or bidirectional
 * Unicode characters can hide instructions a human reviewer never sees
 * ("rules file backdoor"). Idea from the "scan the agent config for injection"
 * step of community Claude Code setups (see CREDITS); implementation is ours.
 *
 * Blocking: zero-width / bidi-override / tag characters in agent config files.
 * Report only: prompt-injection phrases (docs legitimately quote them).
 * Contre quoi: hidden instructions slipped into agent rules via a PR or a bot.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const TARGETS = [
  'AGENTS.md', 'AI_CONTEXT_MANDATE.md', 'AI_INSTRUCTIONS.md', 'CORE_RULES.md', 'CLAUDE.md',
  '.github/AI_RULES.md', '.github/copilot-instructions.md',
  'skills', '.cursor/rules',
];

// U+200B..U+200F zero-width + LRM/RLM, U+202A..U+202E bidi embed/override,
// U+2060..U+2064 word joiner/invisible operators, U+2066..U+2069 bidi isolates,
// U+FEFF BOM inside text, U+E0000..U+E007F tag characters.
const HIDDEN_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|\uDB40[\uDC00-\uDC7F]/g;

const PHRASE_RES = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?\b/i,
  /\bdisregard\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions?|prompts?)\b/i,
  /\breveal\s+(?:your\s+)?system\s+prompt\b/i,
  /\bexfiltrat\w*/i,
];

function listFiles(rel, maxFiles = 2000) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {return [];}
  const st = fs.statSync(abs);
  if (st.isFile()) {return [rel];}
  const out = [];
  const stack = [rel];
  while (stack.length && out.length < maxFiles) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      const r = path.join(dir, name);
      const s = fs.statSync(path.join(ROOT, r));
      if (s.isDirectory()) {stack.push(r);} else if (/\.(md|mdc|txt|json|ya?ml)$/i.test(name)) {out.push(r);}
    }
  }
  return out;
}

/** Scan one text; returns { hidden: [{line, code}], phrases: [{line, re}] } */
function scanText(text) {
  const hidden = [];
  const phrases = [];
  const lines = String(text).split('\n');
  lines.forEach((ln, i) => {
    const body = i === 0 ? ln.replace(/^\uFEFF/, '') : ln; // leading BOM is harmless
    let m;
    HIDDEN_RE.lastIndex = 0;
    while ((m = HIDDEN_RE.exec(body)) !== null) {
      hidden.push({ line: i + 1, code: `U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}` });
      if (hidden.length > 50) {break;}
    }
    for (const re of PHRASE_RES) {
      if (re.test(body)) {phrases.push({ line: i + 1, re: String(re).slice(0, 60) });}
    }
  });
  return { hidden, phrases };
}

function run() {
  const files = [...new Set(TARGETS.flatMap((t) => listFiles(t)))];
  let blocking = 0;
  for (const f of files) {
    const size = fs.statSync(path.join(ROOT, f)).size;
    if (size > 2 * 1024 * 1024) {continue;}
    const { hidden, phrases } = scanText(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    for (const h of hidden) {
      blocking++;
      console.error(`::error file=${f},line=${h.line}::hidden/bidi character ${h.code} in agent config`);
    }
    for (const p of phrases) {
      console.log(`::warning file=${f},line=${p.line}::injection-like phrase (review): ${p.re}`);
    }
  }
  console.log(`[P2800] scanned ${files.length} agent-config files, ${blocking} hidden character(s)`);
  return blocking === 0;
}

if (require.main === module) {
  process.exit(run() ? 0 : 1);
}

module.exports = { scanText, listFiles, TARGETS };
