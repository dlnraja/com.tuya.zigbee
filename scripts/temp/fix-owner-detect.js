const fs = require('fs');
const file = '.github/scripts/triage-run.js';
let content = fs.readFileSync(file, 'utf8');

// Add author detection before line 70
const insert = `
// v6.0: Detect dlnraja's own posts - don't auto-respond to owner
function isOwnerPost(it) {
  try {
    const author = it.user?.login || ''       ;
    return author.toLowerCase() === 'dlnraja';
  } catch { return false; }
}
`;

content = content.replace('// Issues\nconst issues', insert + '
content = content.replace('if(alreadyTriaged){', 'if(alreadyTriaged||isOwnerPost(it)){');
content = content.replace('if(alreadyTriaged2){', 'if(alreadyTriaged2||isOwnerPost(pr)){');

fs.writeFileSync(file, content);
console.log(' Enhanced triage-run.js with owner detection');
