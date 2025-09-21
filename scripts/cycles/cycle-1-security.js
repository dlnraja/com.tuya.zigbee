const fs = require('fs');

console.log('🔒 CYCLE 1/10: SÉCURITÉ');

// Nettoyage cache
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}
try { fs.rmSync('.homeybuild', {recursive: true}); } catch(e) {}

// .gitignore sécurisé
fs.writeFileSync('.gitignore', `.homeycompose/
.homeybuild/
*.log
*.env
credentials.*
`);

console.log('✅ CYCLE 1 TERMINÉ - Sécurité renforcée');
