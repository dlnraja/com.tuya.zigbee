// Test minimaliste de Node.js
console.log('=== Test Node.js de base ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('Current directory:', process.cwd());

// Tester l'accès au système de fichiers
const fs = require('fs');
try {
  const files = fs.readdirSync('.');
  console.log('\nFichiers dans le répertoire courant:');
  console.log(files.slice(0, 10).join('\n'));
  if (files.length > 10) console.log(`...et ${files.length - 10} autres`);
} catch (err) {
  console.error('Erreur de lecture du répertoire:', err.message);
}

console.log('\n=== Fin du test ===');
