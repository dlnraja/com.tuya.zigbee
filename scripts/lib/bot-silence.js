'use strict';
/**
 * P3255 — bot silence (t823u/t824u). Automation must stay invisible: no new issues, PRs, issue/PR
 * comments, edits, closes or labels written by bots (they mail the owner). Any non-GET call to
 * /repos/<o>/<r>/issues|pulls is diverted to the job summary instead. Reads are untouched.
 * Opt back in with BOT_PUBLIC=1 (env, e.g. from repo variable vars.BOT_PUBLIC).
 */
const fs = require('fs');
const path = require('path');

let cfg = { silent: true, silencedPathRe: '/repos/[^/]+/[^/]+/(issues|pulls)(/|$|\\?)' };
try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'ci', 'bot-silence.json'), 'utf8')) }; } catch (_) { /* defaults */ }
const RE = new RegExp(cfg.silencedPathRe);

function isSilenced(method, url) {
  if (process.env.BOT_PUBLIC === '1') return false;
  if (!cfg.silent) return false;
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD') return false;
  return RE.test(String(url || '').replace(/^https:\/\/api\.github\.com/, ''));
}

function divert(method, url, body) {
  const line = `- 🔇 bot-silence: skipped \`${String(method).toUpperCase()} ${String(url).replace(/^https:\/\/api\.github\.com/, '')}\``;
  const text = body && typeof body === 'object' ? (body.body || body.title || '') : '';
  const out = `${line}\n${text ? `\n<details><summary>content</summary>\n\n${String(text).slice(0, 6000)}\n\n</details>\n` : ''}\n`;
  try { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out); } catch (_) { /* ignore */ }
  console.error(line);
  return {};
}

module.exports = { isSilenced, divert };
