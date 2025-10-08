const fs = require('fs');
const path = require('path');

console.log('🧹 NETTOYAGE RACINE DU PROJET\n');

// Fichiers ESSENTIELS à garder à la racine
const keepAtRoot = [
    '.git',
    '.github',
    '.gitignore',
    '.homeyignore',
    '.prettierignore',
    '.prettierrc',
    '.homeychangelog.json',
    '.env',
    '.vscode',
    'app.json',
    'package.json',
    'package-lock.json',
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'assets',
    'drivers',
    'node_modules',
    'utils',
    'scripts',
    'reports',
    'docs',
    '.dev'
];

// Créer dossiers de rangement
const docsDir = path.join(__dirname, 'docs');
const projectDataDir = path.join(__dirname, 'project-data');

if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}
if (!fs.existsSync(projectDataDir)) {
    fs.mkdirSync(projectDataDir, { recursive: true });
}

console.log('📁 Dossiers créés:');
console.log('  - docs/ (pour documentation)');
console.log('  - project-data/ (pour fichiers temporaires)\n');

// Lister fichiers racine
const rootFiles = fs.readdirSync(__dirname);

const moved = {
    docs: [],
    projectData: [],
    kept: []
};

rootFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    const stats = fs.statSync(filePath);
    
    // Ignorer ce script
    if (file === 'cleanup_root.js') return;
    
    // Garder les fichiers essentiels
    if (keepAtRoot.includes(file)) {
        moved.kept.push(file);
        return;
    }
    
    // Déplacer vers docs/ : tous les .md et .bat
    if (file.endsWith('.md') || file.endsWith('.bat')) {
        const targetPath = path.join(docsDir, file);
        if (!fs.existsSync(targetPath)) {
            fs.renameSync(filePath, targetPath);
            moved.docs.push(file);
            console.log(`📄 ${file} → docs/`);
        }
    }
    // Déplacer vers project-data/ : archives, scripts, fichiers temporaires
    else if (
        file.endsWith('.tar.gz') ||
        file.endsWith('.js') ||
        file.endsWith('.txt') ||
        file === '.nojekyll'
    ) {
        const targetPath = path.join(projectDataDir, file);
        if (!fs.existsSync(targetPath)) {
            fs.renameSync(filePath, targetPath);
            moved.projectData.push(file);
            console.log(`🗃️  ${file} → project-data/`);
        }
    }
});

console.log('\n' + '='.repeat(60));
console.log('📊 RÉSUMÉ DU NETTOYAGE');
console.log('='.repeat(60));

console.log(`\n✅ Fichiers gardés à la racine (${moved.kept.length}):`);
moved.kept.forEach(f => console.log(`   - ${f}`));

console.log(`\n📄 Fichiers déplacés vers docs/ (${moved.docs.length}):`);
moved.docs.forEach(f => console.log(`   - ${f}`));

console.log(`\n🗃️  Fichiers déplacés vers project-data/ (${moved.projectData.length}):`);
moved.projectData.forEach(f => console.log(`   - ${f}`));

console.log('\n' + '='.repeat(60));
console.log('✅ NETTOYAGE TERMINÉ');
console.log('='.repeat(60));

console.log('\n📁 STRUCTURE FINALE:');
console.log(`
Racine du projet:
├── .github/              (workflows GitHub Actions)
├── .gitignore            (Git config)
├── .homeyignore          (Homey config)
├── .homeychangelog.json  (Homey changelog)
├── app.json              (Configuration Homey)
├── package.json          (Dependencies)
├── README.md             (Documentation principale)
├── CHANGELOG.md          (Historique versions)
├── CONTRIBUTING.md       (Guide contribution)
├── assets/               (Images app)
├── drivers/              (163 drivers)
├── node_modules/         (Dependencies installées)
├── utils/                (Utilitaires)
├── scripts/              (Scripts automatisation)
├── docs/                 (📄 Documentation déplacée)
└── project-data/         (🗃️  Fichiers temporaires)
`);

console.log('🎯 Fichiers essentiels pour Homey App et GitHub Actions préservés!');
console.log('📚 Documentation organisée dans docs/');
console.log('🗄️  Fichiers temporaires dans project-data/\n');
