'use strict';
/**
 * P3255 — bot noise guard (t823u/t824u, refined by t834u).
 * Modes (env BOT_MODE, else config/ci/bot-silence.json "mode"; env BOT_PUBLIC=1 forces "public"):
 *  - "public": no filtering.
 *  - "quiet" (default): automation keeps triaging, without notification spam. Allowed writes:
 *      PATCH an issue/PR (labels, state=closed, title/body edit: no mail), label add/remove,
 *      PATCH an existing comment (edit instead of adding), PR merge, and ONE consolidated reply per
 *      issue: a new comment only when its body carries REPLY_MARKER (use upsertReply(), which edits
 *      the existing marked comment if there is one). Still diverted: new issues, new PRs, any other
 *      new comment or review (status spam).
 *  - "silent": every non-GET call to /issues|/pulls is diverted.
 * Diverted calls go to $GITHUB_STEP_SUMMARY (Actions tab only) and return {}.
 */
const fs = require('fs');
const path = require('path');

const REPLY_MARKER = '<!-- bot-reply:consolidated -->';
let cfg = { mode: 'quiet', silencedPathRe: '/repos/[^/]+/[^/]+/(issues|pulls)(/|$|\\?)' };
try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'ci', 'bot-silence.json'), 'utf8')) }; } catch (_) { /* defaults */ }
const RE = new RegExp(cfg.silencedPathRe);
const QUIET_OK = [
  ['PATCH', /\/(issues|pulls)\/\d+$/],
  ['POST', /\/issues\/\d+\/labels$/], ['PUT', /\/issues\/\d+\/labels$/], ['DELETE', /\/issues\/\d+\/labels(\/[^/]+)?$/],
  ['PATCH', /\/issues\/comments\/\d+$/], ['DELETE', /\/issues\/comments\/\d+$/],
  ['PUT', /\/pulls\/\d+\/merge$/], ['PUT', /\/issues\/\d+\/lock$/],
];

function mode() {
  if (process.env.BOT_PUBLIC === '1') return 'public';
  const m = process.env.BOT_MODE || cfg.mode || (cfg.silent === false ? 'public' : 'quiet');
  return ['public', 'quiet', 'silent'].includes(m) ? m : 'quiet';
}
function bodyText(b) { if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { return b; } } return b && typeof b === 'object' ? String(b.body || '') : ''; }

function isSilenced(method, url, body) {
  const md = mode();
  if (md === 'public') return false;
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD') return false;
  const p = String(url || '').replace(/^https:\/\/api\.github\.com/, '').replace(/\?.*$/, '');
  if (!RE.test(p)) return false;
  if (md === 'silent') return true;
  if (QUIET_OK.some(([mm, re]) => mm === m && re.test(p))) return false;
  if (m === 'POST' && /\/issues\/\d+\/comments$/.test(p) && bodyText(body).includes(REPLY_MARKER)) return false;
  return true;
}

function divert(method, url, body) {
  const line = `- 🔇 bot-silence (${mode()}): skipped \`${String(method).toUpperCase()} ${String(url).replace(/^https:\/\/api\.github\.com/, '')}\``;
  const b = typeof body === 'string' ? (() => { try { return JSON.parse(body); } catch (_) { return { body }; } })() : body;
  const text = b && typeof b === 'object' ? (b.body || b.title || '') : '';
  const out = `${line}\n${text ? `\n<details><summary>content</summary>\n\n${String(text).slice(0, 6000)}\n\n</details>\n` : ''}\n`;
  try { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out); } catch (_) { /* ignore */ }
  console.error(line);
  return {};
}

/** One consolidated English reply per issue: edit the marked bot comment, else add it once. gh(method, path, body). */
async function upsertReply(gh, repo, num, text, opts = {}) {
  const marks = [REPLY_MARKER, ...(opts.legacyMarkers || [])];
  const body = `${REPLY_MARKER}\n${(opts.legacyMarkers || []).join('\n')}${opts.legacyMarkers && opts.legacyMarkers.length ? '\n' : ''}${text}`;
  const list = await gh('GET', `/repos/${repo}/issues/${num}/comments?per_page=100`);
  const mine = (Array.isArray(list) ? list : []).find((c) => marks.some((mk) => String(c.body || '').includes(mk)));
  if (mine) { if (String(mine.body) === body) return mine; return gh('PATCH', `/repos/${repo}/issues/comments/${mine.id}`, { body }); }
  return gh('POST', `/repos/${repo}/issues/${num}/comments`, { body });
}

module.exports = { isSilenced, divert, upsertReply, mode, REPLY_MARKER };
