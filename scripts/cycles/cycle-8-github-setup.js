const fs = require('fs');

console.log('🚀 CYCLE 8/10: GITHUB ACTIONS SETUP');

// Créer workflow pour publication automatique
const workflowDir = '.github/workflows';
if (!fs.existsSync(workflowDir)) {
  fs.mkdirSync(workflowDir, {recursive: true});
}

const workflow = `name: Homey App Publish
on: [push]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx homey app validate
      - run: npx homey app publish --token \${{ secrets.HOMEY_TOKEN }}
`;

fs.writeFileSync(`${workflowDir}/publish.yml`, workflow);

// Pre-commit hook pour nettoyage cache
const preCommit = `#!/bin/bash
rm -rf .homeycompose .homeybuild
echo "Cache Homey nettoyé avant commit"
`;

const hooksDir = '.git/hooks';
if (fs.existsSync(hooksDir)) {
  fs.writeFileSync(`${hooksDir}/pre-commit`, preCommit);
}

console.log('✅ CYCLE 8 TERMINÉ - GitHub Actions configuré');
