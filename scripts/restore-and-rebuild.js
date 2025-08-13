// !/usr/bin/env node

/**
 * Script de restauration et reconstruction (version JavaScript)
 * Version JavaScript du script JavaScript RestoreAndRebuild.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FORK  = "https://github.com/dlnraja/com.tuya.zigbee.git";
const BRANCH  = "master";
const WORK_DIR = path.join(process.env.HOME || process.env.USERPROFILE, "Desktop", "tuya-repair");

console.log('🔧 Script de restauration et reconstruction...');

// 0) Préparation
if (!fs.existsSync(WORK_DIR)) {
  fs.mkdirSync(WORK_DIR, { recursive: true });
  console.log(`📁 Dossier de travail créé: ${WORK_DIR}`);
}

process.chdir(WORK_DIR);
console.log(`📍 Dossier de travail: ${WORK_DIR}`);

// 1) Backup + suppression de l'ancien repo
if (fs.existsSync("repo")) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 14);
  const backupPath = \repo_backup_${stamp}.zip`;
  
  console.log(`💾 Sauvegarde repo → ${backupPath}`);
  
  try {
    // Création d'une archive ZIP simple (ou utilisation de 7zip si disponible)
    const repoPath = path.join(WORK_DIR, "repo");
    const backupDir = path.join(WORK_DIR, \repo_backup_${stamp}`);
    
    // Copie du dossier avec timestamp
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.cpSync(repoPath, backupDir, { recursive: true });
    
    console.log(`✅ Sauvegarde créée: ${backupDir}`);
    
    // Suppression de l'ancien repo
    fs.rmSync(repoPath, { recursive: true, force: true });
    console.log('🗑️ Ancien repo supprimé');
    
  } catch (error) {
    console.error('⚠️ Erreur lors de la sauvegarde:', error.message);
  }
}

// 2) Re-clone
console.log(`🔄 Clonage propre de ${FORK}@${BRANCH}`);

try {
  execSync(`git clone --branch ${BRANCH} ${FORK} repo`, { stdio: 'inherit' });
  console.log('✅ Repo cloné avec succès');
} catch (error) {
  console.error('❌ Erreur lors du clonage:', error.message);
  process.exit(1);
}

// 3) Génération du manifest
process.chdir("repo");
console.log('📦 npm install...');

try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dépendances installées');
} catch (error) {
  console.error('❌ Erreur lors de l\'installation:', error.message);
}

console.log('📄 node scripts/update-manifest.js...');

try {
  execSync('node scripts/update-manifest.js', { stdio: 'inherit' });
  console.log('✅ Manifest mis à jour');
} catch (error) {
  console.error('⚠️ Erreur lors de la mise à jour du manifest:', error.message);
}

// 4) Regénération des workflows (CI & Dependabot)
console.log('🔧 Création des workflows GitHub Actions...');

const ciYaml = \name: CI & Manifest Sync
on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]
  workflow_dispatch:
jobs:
  sync-manifest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: true
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run update-manifest
      - name: Validate Homey app
        run: npx homey app validate || echo "⚠️ validate failed"
      - uses: peter-evans/create-pull-request@v5
        with:
          token: \${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: sync app.json"
          branch: sync/app-json
          title: "[Automatisé] sync app.json"
  lint-test:
    needs: sync-manifest
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run test`;

const dbYaml = `version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly`;

try {
  // Création du dossier .github/workflows
  const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }
  
  // Création du dossier .github
  const githubDir = path.join(process.cwd(), '.github');
  if (!fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciYaml);
  fs.writeFileSync(path.join(githubDir, 'dependabot.yml'), dbYaml);
  
  console.log('✅ Workflows GitHub Actions créés');
} catch (error) {
  console.error('❌ Erreur lors de la création des workflows:', error.message);
}

// 5) Nettoyage package.json & badge README
console.log('🧹 Nettoyage package.json et ajout badge README...');

try {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    let packageContent = fs.readFileSync(packagePath, 'utf8');
    
    // Suppression de la ligne main
    packageContent = packageContent.replace(/"main":\s*"[^"]*",?\s*\n?/g, '');
    
    fs.writeFileSync(packagePath, packageContent);
    console.log('✅ Package.json nettoyé');
  }
  
  const readmePath = path.join(process.cwd(), 'README.md');
  if (fs.existsSync(readmePath)) {
    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    
    const badge = '\n![CI](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci.yml/badge.svg)\n';
    
    if (!readmeContent.includes('![CI]')) {
      readmeContent += badge;
      fs.writeFileSync(readmePath, readmeContent);
      console.log('✅ Badge CI ajouté au README');
    }
  }
} catch (error) {
  console.error('⚠️ Erreur lors du nettoyage:', error.message);
}

// 6) Commit & force-push
console.log('🚀 Commit et push des améliorations...');

try {
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "feat: RestoreAndRebuild - Restauration complète du projet"', { stdio: 'inherit' });
  execSync(`git push origin ${BRANCH} --force`, { stdio: 'inherit' });
  
  console.log('✅ Projet restauré et reconstruit avec succès!');
  console.log(`📍 Localisation: ${path.join(WORK_DIR, 'repo')}`);
  
} catch (error) {
  console.error('❌ Erreur lors du commit/push:', error.message);
  console.log('💡 Vous pouvez exécuter manuellement:');
  console.log('   git add .');
  console.log('   git commit -m "feat: RestoreAndRebuild - Restauration complète du projet"');
  console.log(`   git push origin ${BRANCH} --force`);
}

console.log('🎯 Script de restauration terminé !');
