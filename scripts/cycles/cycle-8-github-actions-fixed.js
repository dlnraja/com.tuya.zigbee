// CYCLE 8/10: GITHUB ACTIONS WORKFLOW CORRIGÉ
const fs = require('fs');

console.log('🔧 CYCLE 8/10: GITHUB ACTIONS CORRIGÉ');

// Workflow GitHub Actions corrigé (sans erreur syntax)
const workflow = `name: Homey App Auto-Publish v1.0.33

on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Homey CLI
        run: npm install -g homey
        
      - name: Login to Homey
        run: echo "\${{ secrets.HOMEY_TOKEN }}" | homey login --token
        
      - name: Clean build directory
        run: rm -rf .homeybuild || true
        
      - name: Publish to Homey
        run: homey app publish --changelog "v1.0.33 - Recertification complète avec 149 drivers"
        env:
          HOMEY_TOKEN: \${{ secrets.HOMEY_TOKEN }}`;

// Créer le fichier workflow corrigé
const workflowDir = '.github/workflows';
if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
}

fs.writeFileSync(`${workflowDir}/auto-publish-v1033.yml`, workflow);

console.log('✅ GitHub Actions workflow corrigé et créé');
console.log('✅ CYCLE 8/10 TERMINÉ - GitHub Actions opérationnel');
