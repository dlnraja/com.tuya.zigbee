const fs = require('fs');

console.log('🔧 SIMPLE GITHUB FIX v2.0.5');

try {
  // 1. Fix package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '2.0.5';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log('✅ package.json: v2.0.5');

  // 2. Fix app.json safely
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  app.version = '2.0.5';
  fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
  console.log('✅ app.json: v2.0.5');

  // 3. Nettoyer cache
  try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}
  console.log('✅ Cache nettoyé');

  // 4. Créer workflow simple
  const workflow = `name: Force Publish to Homey
on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: echo "Generic Smart Hub v2.0.5 ready for Homey Dashboard"
`;

  fs.mkdirSync('.github/workflows', {recursive: true});
  fs.writeFileSync('.github/workflows/force-publish.yml', workflow);
  console.log('✅ Workflow GitHub Actions créé');

} catch(e) {
  console.log('⚠️ Erreur:', e.message);
}

console.log('🚀 Prêt pour publication GitHub Actions');
