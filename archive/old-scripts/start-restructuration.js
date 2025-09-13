const fs = require('fs');
const path = require('path');

// Créer les dossiers nécessaires
const directories = [
  'reports',
  'logs',
  'backup',
  'src/drivers',
  'src/lib',
  'src/api',
  'test/unit',
  'test/integration'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Dossier créé : ${dirPath}`);
  }
});

// Vérifier et corriger le fichier package.json
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = require(packagePath);
  
  // Mettre à jour les scripts si nécessaire
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.start = pkg.scripts.start || 'node app.js';
  pkg.scripts.test = pkg.scripts.test || 'jest';
  
  // Sauvegarder les modifications
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  console.log('Fichier package.json mis à jour');
}

// Créer un rapport initial
const report = {
  date: new Date().toISOString(),
  actions: [
    'Structure de dossiers initialisée',
    'package.json vérifié et mis à jour'
  ],
  nextSteps: [
    '1. Installer les dépendances avec: npm install',
    '2. Lancer les tests: npm test',
    '3. Vérifier la configuration Homey dans .homeycompose/app.json'
  ]
};

const reportPath = path.join(__dirname, 'reports', 'initial-setup-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('\n=== RESTRUCTURATION INITIALE TERMINÉE ===');
console.log(`Rapport généré: ${reportPath}`);
console.log('Prochaines étapes:');
report.nextSteps.forEach(step => console.log(`- ${step}`));
