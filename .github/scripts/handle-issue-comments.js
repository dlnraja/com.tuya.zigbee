
// .github/scripts/handle-issue-comments.js
// Intelligent response to issue comments with context awareness

const { analyzeAndRespond } = require('./intelligent-bug-detector.js');

async function handleComment(context) {
  const { comment, issue } = context.payload;
  
  // Skip bot comments
  if (comment.user.type === 'Bot') {
    console.log('Skipping bot comment');
    return;
  }
  
  // Skip owner comments
  if (comment.user.login.toLowerCase() === 'dlnraja') {
    console.log('Skipping owner comment');
    return;
  }
  
  // Check if user is providing additional diagnostics
  const commentText = comment.body.toLowerCase();
  
  // User provided diagnostic report
  if (commentText.includes('diagnostic') || commentText.includes('report') || commentText.includes('screenshot')) {
    await context.octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['diagnostics-provided']
    });
    
    await context.octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: '✅ Thank you for providing diagnostics! This helps tremendously. I will review and respond shortly.'
    });
  }
  
  // User confirms fix worked
  if (commentText.includes('fixed') || commentText.includes('working') || commentText.includes('solved')) {
    await context.octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['verified-fixed']
    });
    
    await context.octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: '🎉 Great to hear it\'s working! I\'ll close this issue. Feel free to reopen if you encounter any other problems.'
    });
    
    await context.octokit.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'completed'
    });
  }
  
  // User says still broken
  if (commentText.includes('still') && (commentText.includes('not working') || commentText.includes('broken') || commentText.includes('fail'))) {
    await context.octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['needs-investigation', 'high-priority']
    });
    
    await context.octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: '⚠️ Sorry to hear the issue persists. This has been escalated for deeper investigation. Please ensure you\'ve provided:

- Full diagnostic report
- App version number
- Exact manufacturer name and product ID
- Complete error messages from logs

This will help identify the root cause.'
    });
  }
}

module.exports = { handleComment };
