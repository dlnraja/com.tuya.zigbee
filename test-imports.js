// Test des imports du projet
console.log('=== Test des imports ===');

async function testImports() {
  try {
    console.log('1. Test de fs-extra...');
    const fs = await import('fs-extra');
    console.log('✅ fs-extra importé avec succès');
    
    console.log('\n2. Test de axios...');
    const axios = await import('axios');
    console.log('✅ axios importé avec succès');
    
    console.log('\n3. Test de chalk...');
    const chalk = await import('chalk');
    console.log('✅ chalk importé avec succès');
    
    console.log('\n4. Test de path...');
    const path = await import('path');
    console.log('✅ path importé avec succès');
    
    console.log('\n5. Test de fs-extra (opération de lecture)...');
    const files = await fs.readdir('.');
    console.log(`✅ Répertoire lu avec succès (${files.length} fichiers)`);
    
    console.log('\n=== Tous les tests d\'importation ont réussi ===');
  } catch (error) {
    console.error('\n❌ Erreur lors des tests d\'importation:');
    console.error(error);
    console.error('\nDétails de l\'erreur:');
    console.error('- Message:', error.message);
    console.error('- Code:', error.code);
    console.error('- Stack:', error.stack);
  }
}

testImports();
