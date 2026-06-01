const fs = require('fs');
const glob = require('glob');

const yamlFiles = glob.sync('.github/workflows/*.{yml,yaml}');

let fixed = 0;
yamlFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Upgrade actions
  content = content.replace(/actions\/checkout@v[1-4]\b/g, 'actions/checkout@v5');
  content = content.replace(/actions\/setup-node@v[1-4]\b/g, 'actions/setup-node@v5');
  content = content.replace(/actions\/cache@v[1-4]\b/g, 'actions/cache@v5');

  // Inject timeout-minutes if missing
  if (content.includes('jobs:') && !content.includes('timeout-minutes:')) {
    // Basic injection after jobs: or job name
    // A more complex parser would be ideal, but for now we can regex it
    content = content.replace(/runs-on:\s*ubuntu-latest\s*\n/g, "runs-on: ubuntu-latest\n    timeout-minutes: 15\n");
  }

  // Inject shell: bash if missing
  if (!content.includes('shell: bash') && content.includes('defaults:')) {
    content = content.replace(/run:\n/g, "run:\n      shell: bash\n");
  } else if (!content.includes('shell: bash') && !content.includes('defaults:')) {
    // Add defaults
    content = content.replace(/jobs:\n/g, "defaults:\n  run:\n    shell: bash\n\njobs:\n");
  }

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed YAML:', f);
    fixed++;
  }
});

console.log(`Fixed ${fixed} YAML files.`);
