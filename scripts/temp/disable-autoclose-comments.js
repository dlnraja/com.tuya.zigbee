const fs = require('fs');
const file = '.github/scripts/triage-run.js';
let content = fs.readFileSync(file, 'utf8');

// Also check and remove auto-close from handle-issue-comments
const file2 = '.github/scripts/handle-issue-comments.js';
if (fs.existsSync(file2)) {
  let content2 = fs.readFileSync(file2, 'utf8');
  if (content2.includes('gh issue close')) {
    content2 = content2.replace(/gh issue close[^\n]+/g, "// Auto-close disabled");
    fs.writeFileSync(file2, content2);
    console.log(' Removed auto-close from handle-issue-comments');
  }
}
