#!/usr/bin/env node
// 📊 MONITOR v2.0.0 - Suivi publication
const fs = require('fs');
const { execSync } = require('child_process');

console.log('📊 MONITOR v2.0.0');

// Amélioration workflow GitHub Actions
const workflow = `name: Publish Homey App
on: [push, workflow_dispatch]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: '18'}
      - run: npm install -g homey
      - run: homey app validate
      - run: homey app publish
        env:
          HOMEY_TOKEN: \${{ secrets.HOMEY_TOKEN }}`;

fs.writeFileSync('./.github/workflows/publish.yml', workflow);

// Status final
try {
  execSync('homey app validate', {stdio: 'inherit'});
  execSync('git add -A && git commit -m "📊 Monitor v2.0.0" && git push', {stdio: 'inherit'});
  console.log('🎉 READY FOR GITHUB ACTIONS PUBLICATION');
} catch (e) {
  console.log('❌', e.message);
}
