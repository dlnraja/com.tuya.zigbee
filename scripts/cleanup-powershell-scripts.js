#!/usr/bin/env node

/**
 * Script de nettoyage des scripts PowerShell
 * Basé sur les instructions du dossier fold
 * 
 * Objectifs :
 * - Supprimer les scripts PowerShell restants
 * - Convertir les scripts .ps1 en .js si nécessaire
 * - Nettoyer les dossiers et fichiers obsolètes
 * - Améliorer la cohérence du projet
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = '.';
const SCRIPTS_DIR = 'scripts';
const BACKUP_DIR = '.backup/ps1-scripts';

// Scripts PowerShell à supprimer ou convertir
const PS1_SCRIPTS_TO_REMOVE = [
  'reorganize-drivers.ps1',
  'run-mega-prompt.ps1',
  'update-mega-final.ps1',
  'enrich-drivers-simple.ps1',
  'enrich-drivers-final.ps1',
  'run-simple-reorganize.ps1',
  'fix-drivers-structure.ps1',
  'run-mega.ps1',
  'MEGA-COMMANDS.ps1'
];

const PS1_SCRIPTS_TO_CONVERT = [
  'RestoreAndRebuild.ps1' // Garder mais créer une version JS
];

// Fonction principale
async function cleanupPowerShellScripts() {
  console.log('🚀 Début du nettoyage des scripts PowerShell...');
  
  try {
    // 1. Créer le dossier de backup
    await createBackupDirectory();
    
    // 2. Supprimer les scripts PowerShell obsolètes
    await removeObsoletePS1Scripts();
    
    // 3. Convertir les scripts PowerShell utiles
    await convertUsefulPS1Scripts();
    
    // 4. Nettoyer les fichiers .bat
    await cleanupBatchFiles();
    
    // 5. Mettre à jour les références
    await updateReferences();
    
    console.log('✅ Nettoyage des scripts PowerShell terminé!');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
    throw error;
  }
}

// Créer le dossier de backup
async function createBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Dossier de backup créé: ${BACKUP_DIR}/`);
  }
}

// Supprimer les scripts PowerShell obsolètes
async function removeObsoletePS1Scripts() {
  console.log('🗑️ Suppression des scripts PowerShell obsolètes...');
  
  for (const script of PS1_SCRIPTS_TO_REMOVE) {
    const scriptPath = path.join(ROOT_DIR, script);
    
    if (fs.existsSync(scriptPath)) {
      // Backup avant suppression
      const backupPath = path.join(BACKUP_DIR, script);
      fs.copyFileSync(scriptPath, backupPath);
      
      // Suppression
      fs.unlinkSync(scriptPath);
      console.log(`🗑️ Supprimé: ${script} (backup: ${backupPath})`);
    }
  }
}

// Convertir les scripts PowerShell utiles
async function convertUsefulPS1Scripts() {
  console.log('🔄 Conversion des scripts PowerShell utiles...');
  
  for (const script of PS1_SCRIPTS_TO_CONVERT) {
    const ps1Path = path.join(ROOT_DIR, script);
    
    if (fs.existsSync(ps1Path)) {
      // Backup
      const backupPath = path.join(BACKUP_DIR, script);
      fs.copyFileSync(ps1Path, backupPath);
      
      // Créer la version JS
      await createJavaScriptVersion(script);
      
      console.log(`🔄 Converti: ${script} → ${script.replace('.ps1', '.js')}`);
    }
  }
}

// Créer la version JavaScript d'un script PowerShell
async function createJavaScriptVersion(ps1Script) {
  const scriptName = ps1Script.replace('.ps1', '');
  const jsPath = path.join(SCRIPTS_DIR, `${scriptName}.js`);
  
  let jsContent = '';
  
  switch (scriptName) {
    case 'RestoreAndRebuild':
      jsContent = `#!/usr/bin/env node

/**
 * Script de restauration et reconstruction du projet
 * Version JavaScript du script PowerShell RestoreAndRebuild.ps1
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const FORK = "https://github.com/dlnraja/com.tuya.zigbee.git";
const BRANCH = "master";
const WORK_DIR = path.join(process.env.HOME || process.env.USERPROFILE, "Desktop", "tuya-repair");

async function restoreAndRebuild() {
  console.log('🚀 Début de la restauration et reconstruction...');
  
  try {
    // 1. Préparation
    if (!fs.existsSync(WORK_DIR)) {
      fs.mkdirSync(WORK_DIR, { recursive: true });
    }
    
    process.chdir(WORK_DIR);
    console.log(\`📁 Répertoire de travail: \${WORK_DIR}\`);
    
    // 2. Backup + suppression de l'ancien repo
    if (fs.existsSync('repo')) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5);
      const backupPath = \`repo_backup_\${stamp}.zip\`;
      
      console.log(\`💾 Sauvegarde repo → \${backupPath}\`);
      
      // Utiliser 7z ou zip pour la compression
      try {
        execSync(\`7z a "\${backupPath}" repo\`, { stdio: 'inherit' });
      } catch (error) {
        console.log('⚠️ 7z non disponible, utilisation de zip...');
        execSync(\`zip -r "\${backupPath}" repo\`, { stdio: 'inherit' });
      }
      
      fs.rmSync('repo', { recursive: true, force: true });
    }
    
    // 3. Re-clone
    console.log(\`🔄 Clonage propre de \${FORK}@\${BRANCH}\`);
    execSync(\`git clone --branch \${BRANCH} \${FORK} repo\`, { stdio: 'inherit' });
    
    // 4. Génération du manifest
    process.chdir('repo');
    console.log('📦 npm install...');
    execSync('npm install', { stdio: 'inherit' });
    
    if (fs.existsSync('scripts/update-manifest.js')) {
      console.log('📄 node scripts/update-manifest.js...');
      execSync('node scripts/update-manifest.js', { stdio: 'inherit' });
    }
    
    // 5. Regénération des workflows (CI & Dependabot)
    await regenerateWorkflows();
    
    // 6. Nettoyage package.json & badge README
    await cleanupPackageAndReadme();
    
    // 7. Commit & force-push
    console.log('🚀 Commit et push des améliorations...');
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "feat: RestoreAndRebuild - Restauration complète du projet"', { stdio: 'inherit' });
    execSync(\`git push origin \${BRANCH} --force\`, { stdio: 'inherit' });
    
    console.log('✅ Projet restauré et reconstruit avec succès!');
    console.log(\`📍 Localisation: \${WORK_DIR}/repo\`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error.message);
    throw error;
  }
}

// Regénérer les workflows GitHub Actions
async function regenerateWorkflows() {
  const workflowsDir = '.github/workflows';
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }
  
  // CI workflow
  const ciYaml = \`name: CI & Manifest Sync
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
      - run: npm run test\`;
  
  fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), ciYaml, 'utf8');
  
  // Dependabot
  const dependabotDir = '.github';
  if (!fs.existsSync(dependabotDir)) {
    fs.mkdirSync(dependabotDir, { recursive: true });
  }
  
  const dependabotYaml = \`version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly\`;
  
  fs.writeFileSync(path.join(dependabotDir, 'dependabot.yml'), dependabotYaml, 'utf8');
  
  console.log('📋 Workflows GitHub Actions régénérés');
}

// Nettoyer package.json et README
async function cleanupPackageAndReadme() {
  // Nettoyer package.json
  if (fs.existsSync('package.json')) {
    let packageContent = fs.readFileSync('package.json', 'utf8');
    packageContent = packageContent.replace(/"main":\s*"[^"]*",?/g, '');
    fs.writeFileSync('package.json', packageContent, 'utf8');
  }
  
  // Ajouter badge CI dans README
  if (fs.existsSync('README.md')) {
    let readmeContent = fs.readFileSync('README.md', 'utf8');
    const badge = '![CI](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci.yml/badge.svg)';
    
    if (!readmeContent.includes('![CI]')) {
      readmeContent += \`\\n\${badge}\\n\`;
      fs.writeFileSync('README.md', readmeContent, 'utf8');
    }
  }
  
  console.log('📄 package.json et README nettoyés');
}

// Exécution si appelé directement
if (require.main === module) {
  restoreAndRebuild().catch(console.error);
}

module.exports = { restoreAndRebuild };
`;
      break;
      
    default:
      jsContent = `#!/usr/bin/env node

/**
 * Script converti depuis ${ps1Script}
 * Version JavaScript - à implémenter selon les besoins
 */

console.log('🚧 Script en cours de conversion depuis ${ps1Script}');
console.log('📝 Implémentation à compléter selon les besoins spécifiques');

// TODO: Implémenter la logique du script PowerShell
`;
  }
  
  fs.writeFileSync(jsPath, jsContent, 'utf8');
}

// Nettoyer les fichiers .bat
async function cleanupBatchFiles() {
  console.log('🗑️ Nettoyage des fichiers .bat...');
  
  const batchFiles = [
    'run-simple-reorganize.bat',
    'fix-drivers-structure.bat'
  ];
  
  for (const batchFile of batchFiles) {
    const batchPath = path.join(ROOT_DIR, batchFile);
    
    if (fs.existsSync(batchPath)) {
      // Backup
      const backupPath = path.join(BACKUP_DIR, batchFile);
      fs.copyFileSync(batchPath, backupPath);
      
      // Suppression
      fs.unlinkSync(batchPath);
      console.log(`🗑️ Supprimé: ${batchFile} (backup: ${backupPath})`);
    }
  }
}

// Mettre à jour les références
async function updateReferences() {
  console.log('📝 Mise à jour des références...');
  
  // Mettre à jour MEGA-COMMANDS.ps1 en MEGA-COMMANDS.md
  const megaCommandsPath = path.join(ROOT_DIR, 'MEGA-COMMANDS.ps1');
  if (fs.existsSync(megaCommandsPath)) {
    const backupPath = path.join(BACKUP_DIR, 'MEGA-COMMANDS.ps1');
    fs.copyFileSync(megaCommandsPath, backupPath);
    
    // Convertir en markdown
    const mdContent = `# 🚀 Commandes MEGA - Tuya Zigbee

## 📋 Commandes principales

### Pipeline Progressive
\`\`\`bash
node scripts/mega-progressive.js
\`\`\`

### Sources Wildcard
\`\`\`bash
node scripts/sources-wildcard.js
\`\`\`

### Pipeline Complète
\`\`\`bash
node scripts/mega-sources-complete.js
\`\`\`

## 🔧 Scripts de maintenance

### Complétion app.js
\`\`\`bash
node scripts/complete-app-js.js
\`\`\`

### Création fichiers manquants
\`\`\`bash
node scripts/create-missing-files.js
\`\`\`

### Nettoyage PowerShell
\`\`\`bash
node scripts/cleanup-powershell-scripts.js
\`\`\`

## 📁 Structure du projet
- \`scripts/\` - Scripts Node.js d'automatisation
- \`drivers/\` - Drivers Tuya et Zigbee organisés
- \`docs/\` - Documentation et guides
- \`.github/workflows/\` - Actions GitHub automatisées

## 🎯 Mode YOLO activé
- Exécution automatique de toutes les commandes
- Mode non-interactif
- Pushes automatiques après chaque étape
- Récupération automatique en cas d'erreur
`;
    
    fs.writeFileSync('MEGA-COMMANDS.md', mdContent, 'utf8');
    fs.unlinkSync(megaCommandsPath);
    
    console.log('📄 MEGA-COMMANDS.ps1 converti en MEGA-COMMANDS.md');
  }
  
  // Mettre à jour le README principal
  await updateMainReadme();
}

// Mettre à jour le README principal
async function updateMainReadme() {
  const readmePath = 'README.md';
  
  if (fs.existsSync(readmePath)) {
    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    
    // Ajouter section sur le nettoyage PowerShell
    if (!readmeContent.includes('PowerShell')) {
      const cleanupSection = `

## 🧹 Nettoyage et maintenance

### Scripts PowerShell
Les scripts PowerShell ont été supprimés et convertis en JavaScript pour améliorer la cohérence du projet.

- **Supprimés** : Scripts obsolètes et redondants
- **Convertis** : Scripts utiles convertis en JavaScript
- **Backup** : Sauvegarde dans \`.backup/ps1-scripts/\`

### Commandes de maintenance
\`\`\`bash
# Nettoyage PowerShell
node scripts/cleanup-powershell-scripts.js

# Complétion app.js
node scripts/complete-app-js.js

# Création fichiers manquants
node scripts/create-missing-files.js
\`\`\`
`;
      
      readmeContent += cleanupSection;
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
      
      console.log('📖 README.md mis à jour avec la section nettoyage');
    }
  }
}

// Exécution si appelé directement
if (require.main === module) {
  cleanupPowerShellScripts().catch(console.error);
}

module.exports = { cleanupPowerShellScripts };
