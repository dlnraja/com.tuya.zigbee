const fs = require('fs');
const file = '.github/scripts/triage-upstream-enhanced.js';
let content = fs.readFileSync(file, 'utf8');

// Add owner detection
const insert = `
// v6.0: Detect dlnraja's own posts - skip auto-triage for owner
function isOwnerPost(issueData) {
  try {
    const author = issueData.user?.login || issueData.author?.login || ''       ;
    return author.toLowerCase() === 'dlnraja';
  } catch { return false; }
}
`;

// Insert before processIssue function
content = content.replace('function processIssue(', insert + '\nfunction processIssue(');

// Add check in processIssue
content = content.replace(
  'if(wasTriaged(n))return;',
  'if(wasTriaged(n)||isOwnerPost(issue))return;'
);

// Also add to processPR
content = content.replace(
  'function processPR(',
  'function processPR(pr){if(isOwnerPost(pr))return;'
);

fs.writeFileSync(file, content);
console.log(' Enhanced triage-upstream-enhanced.js with owner detection');
