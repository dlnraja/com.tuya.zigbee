const fs = require('fs');
const file = '.github/scripts/triage-upstream-enhanced.js';
let content = fs.readFileSync(file, 'utf8');

// The bot shouldn't auto-close anything
content = content.replace(/await execSync\(`gh issue close \${issue\.number} -R \${REPO} -r completed`\);/g, "// We never auto-close anymore. We wait for user confirmation.");

fs.writeFileSync(file, content);
console.log('✅ Disabled auto-close in triage-upstream-enhanced.js');
