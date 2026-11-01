#!/usr/bin/env node
'use strict';
// P3105: decide whether a red CI run on master was caused by a bot self-commit, and if so revert it.
// Conditions (all): head commit authored by a bot / [auto:...] tag; the same workflow was green on its
// parent; commit not already reverted; ledger allows (3 per signature / 24 h); kill switch 'revert' off.
// Never reverts human commits, merges, or commits touching protected paths (bots cannot write those anyway).
const { execFileSync } = require('child_process');
const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: 'utf8', ...o }).trim();

function isBotCommit({ author, subject }) { return /\[bot\]$|^github-actions/i.test(author) || /\[auto:[^\]]+\]/.test(subject); }
function shouldRevert({ commit, parentGreen, alreadyReverted, isMerge, paused, ledgerOk }) {
  if (paused) return 'paused';
  if (!isBotCommit(commit)) return 'human-commit';
  if (isMerge) return 'merge';
  if (alreadyReverted) return 'already-reverted';
  if (!parentGreen) return 'parent-not-green';
  if (!ledgerOk) return 'ledger-limit';
  return 'revert';
}
module.exports = { isBotCommit, shouldRevert };

if (require.main === module) {
  const { HEAD_SHA: sha, WF_ID: wf } = process.env;
  const commit = { author: sh('git', ['log', '-1', '--format=%an', sha]), subject: sh('git', ['log', '-1', '--format=%s', sha]) };
  const parents = sh('git', ['log', '-1', '--format=%P', sha]).split(' ').filter(Boolean);
  let parentGreen = false;
  try { parentGreen = sh('gh', ['api', `repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/${wf}/runs?head_sha=${parents[0]}&status=success&per_page=1`, '-q', '.total_count']) !== '0'; } catch { /* unknown = no */ }
  const alreadyReverted = sh('git', ['log', 'origin/master', '-200', '--format=%s']).includes(`auto-revert ${sha.slice(0, 10)}`);
  let paused = false; try { sh('node', ['scripts/ci/autonomy-learn.js', 'paused', 'revert']); } catch { paused = true; }
  let ledgerOk = true; try { sh('node', ['scripts/ci/autonomy-learn.js', 'may', `revert:${commit.subject.replace(/[^\w:-]/g, '').slice(0, 60)}`], { env: { ...process.env, AUTONOMY_FEATURE: 'revert' } }); } catch { ledgerOk = false; }
  const verdict = shouldRevert({ commit, parentGreen, alreadyReverted, isMerge: parents.length > 1, paused, ledgerOk });
  console.log(`verdict=${verdict} sha=${sha.slice(0, 10)} author=${commit.author}`);
  if (process.env.GITHUB_OUTPUT) require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `verdict=${verdict}\n`);
}
