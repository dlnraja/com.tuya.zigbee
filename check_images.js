const fs = require('fs');
const { exec } = require('child_process');

// Taille fichier local
const localSize = fs.statSync('assets/images/small.png').size;
console.log(`Local small.png: ${localSize} bytes`);

// Taille dans Git
exec('git show HEAD:assets/images/small.png', { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
  if (err) {
    console.error('Erreur Git:', err.message);
    return;
  }
  console.log(`Git HEAD small.png: ${stdout.length} bytes`);
  
  if (localSize !== stdout.length) {
    console.log('\n⚠️  DIFFÉRENCE! Fichier local != Git');
    console.log('   → git add assets/images/small.png nécessaire\n');
  } else {
    console.log('\n✅ Fichiers identiques\n');
  }
});
