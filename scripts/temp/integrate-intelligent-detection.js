const fs = require('fs');
const path = require('path');

// Integration script for auto-respond.yml to use intelligent bug detection
const integrationCode = `
// .github/scripts/auto-respond-intelligent.js
// Integrates intelligent bug pattern detection with auto-respond workflow

const { analyzeAndRespond } = require('./intelligent-bug-detector.js');

async function processIssue(context) {
  const { issue } = context.payload;
  
  // Skip if owner posted (already handled by isOwnerPost in triage-run.js)
  if (issue.user.login.toLowerCase() === 'dlnraja') {
    console.log('Skipping owner post');
    return;
  }
  
  // Skip if already has auto-response label
  const labels = issue.labels.map(l => l.name);
  if (labels.includes('auto-responded')) {
    console.log('Already auto-responded');
    return;
  }
  
  // Analyze issue
  const analysis = analyzeAndRespond(issue.title, issue.body);
  
  if (analysis.shouldRespond && analysis.confidence >= 50) {
    console.log(\` Detected pattern: \${analysis.pattern} (confidence: \${analysis.confidence}%)\`);
    
    // Post intelligent response
    await context.octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: analysis.response
    });
    
    // Add auto-responded label
    await context.octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['auto-responded', 'awaiting-verification']
    });
    
    console.log(' Intelligent auto-response posted');
  } else {
    console.log('No high-confidence pattern match');
  }
}

async function processPullRequest(context) {
  const { pull_request } = context.payload;
  
  // Skip owner PRs
  if (pull_request.user.login.toLowerCase() === 'dlnraja') {
    console.log('Skipping owner PR');
    return;
  }
  
  // Analyze PR description for bug fixes
  const analysis = analyzeAndRespond(pull_request.title, pull_request.body);
  
  if (analysis.shouldRespond && analysis.confidence >= 60) {
    console.log(\` PR relates to known bug pattern: \${analysis.pattern}\`);
    
    // Comment with context about the bug
    await context.octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pull_request.number,
      body: \` This PR appears to address a known issue pattern: **\${analysis.pattern}**

\${analysis.response}

Thank you for the contribution! I'll review this carefully.\`
    });
  }
}

module.exports = { processIssue, processPullRequest };
`;

fs.writeFileSync('.github/scripts/auto-respond-intelligent.js', integrationCode);
console.log(' Created intelligent auto-respond integration');

// Update triage-run.js to include bug pattern detection
const triageRunFile = '.github/scripts/triage-run.js';
const triageContent = fs.readFileSync(triageRunFile, 'utf8');

// Add import at top
if (!triageContent.includes('intelligent-bug-detector')) {
  const importLine = "const { analyzeAndRespond } = require('./intelligent-bug-detector.js');\n";
  const updatedContent = triageContent.replace(
    /(const.*require.*\n)+/,
    match => match + importLine
  );
  
  fs.writeFileSync(triageRunFile, updatedContent);
  console.log(' Added intelligent detection to triage-run.js');
}

// Update triage-upstream-enhanced.js
const upstreamFile = '.github/scripts/triage-upstream-enhanced.js';
const upstreamContent = fs.readFileSync(upstreamFile, 'utf8');

if (!upstreamContent.includes('intelligent-bug-detector')) {
  const importLine = "const { analyzeAndRespond } = require('./intelligent-bug-detector.js');\n";
  const updatedUpstream = upstreamContent.replace(
    /(const.*require.*\n)+/,
    match => match + importLine
  );
  
  fs.writeFileSync(upstreamFile, updatedUpstream);
  console.log(' Added intelligent detection to triage-upstream-enhanced.js');
}

console.log('\n All GitHub Actions enhanced with intelligent bug detection');
