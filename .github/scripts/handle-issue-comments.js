'use strict';

/**
 * handle-issue-comments.js — P2394 humanize
 *
 * WHY: Auto "Thank you / escalated / Great to hear" replies read as AI slop
 * and get maintainers grilled. Default = LABEL ONLY, never auto-comment.
 * Set GITHUB_ISSUE_AUTO_COMMENT=1 only for rare emergency unblock (still short).
 */

async function handleComment(context) {
  const { comment, issue } = context.payload;

  if (comment.user?.type === 'Bot') {return;}
  if (String(comment.user?.login || '').toLowerCase() === 'dlnraja') {return;}

  const text = String(comment.body || '').toLowerCase();
  const labels = [];

  if (/diagnostic|report id|diag\b|[0-9a-f]{8}-[0-9a-f]{4}/i.test(comment.body || '')) {
    labels.push('diagnostics-provided');
  }
  if (/\b(fixed|working|solved|works now)\b/i.test(text) && !/\bstill\b/.test(text)) {
    labels.push('verified-fixed');
  }
  if (/\bstill\b/.test(text) && /\b(not working|broken|fail|same)\b/.test(text)) {
    labels.push('needs-investigation');
  }

  if (labels.length) {
    try {
      await context.octokit.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issue.number,
        labels: [...new Set(labels)],
      });
    } catch (_e) { /* soft */ }
  }

  // WHY(P2394): never auto-post — Dylan replies manually (human voice).
  if (process.env.GITHUB_ISSUE_AUTO_COMMENT !== '1') {
    console.log(`[P2394] labels only on #${issue.number}; no auto-comment`);
    return;
  }
}

function analyzeCommentForDiagnostics() {
  // Deprecated auto-reply templates removed (P2394). Keep stub for callers.
  return null;
}

module.exports = { handleComment, analyzeCommentForDiagnostics };
