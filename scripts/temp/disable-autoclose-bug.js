const fs = require('fs');
const file = '.github/scripts/intelligent-bug-detector.js';
let content = fs.readFileSync(file, 'utf8');

// The bug detector was previously closing issues. We must remove that.
const target = "gh issue close ${issue.number} -R ${REPO}";
if (content.includes(target)) {
  content = content.replace(/gh issue close \$\{issue\.number\} -R \$\{REPO\}/g, "echo skip closing");
  fs.writeFileSync(file, content);
  console.log(' Removed auto-close from intelligent-bug-detector');
} else {
  console.log('No auto-close found in intelligent-bug-detector');
}
