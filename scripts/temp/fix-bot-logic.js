const fs = require('fs');
const filesToUpdate = [
  '.github/scripts/triage-run.js',
  '.github/scripts/triage-upstream-enhanced.js',
  '.github/scripts/intelligent-bug-detector.js',
  '.github/scripts/handle-issue-comments.js'
];

for (const file of filesToUpdate) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Remove "Already in the Universal Tuya Zigbee fork"
  content = content.replace(/Already in the \[Universal Tuya Zigbee fork\]/g, "I see these fingerprints are mapped in the Universal Tuya Zigbee app");
  content = content.replace(/Already in/gi, "Mapped in");

  // Modify closing logic: Never auto-close if the user reopened or complained
  // In triage-upstream-enhanced.js, disable auto-closing for issues
  content = content.replace(/await execSync\(`gh issue close \${issue\.number} -R \${REPO} -r completed`\);/g, "// Auto-close disabled: We wait for 100% user confirmation before closing.");
  
  // Update templates to ask for confirmation instead of asserting it's fixed
  content = content.replace(/All fingerprints are already supported — install the test version/g, "These fingerprints are mapped in the test version. Please install it, remove your device, and re-pair. Let us know if it works 100% for you!");
  
  // Specific to triage-run.js closing logic
  if (file.includes('triage-run.js')) {
    content = content.replace(/return \{ close: allSupported, comment \};/g, "return { close: false, comment }; // Never auto-close, wait for user validation");
  }

  fs.writeFileSync(file, content);
  console.log(`Updated empathy/auto-close logic in ${file}`);
}
