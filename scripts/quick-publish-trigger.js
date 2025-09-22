const { execSync } = require('child_process');

console.log('🚀 DÉCLENCHEMENT PUBLICATION RAPIDE');

try {
    // 1. Ajouter tous les changements
    execSync('git add -A');
    console.log('✅ Fichiers ajoutés');

    // 2. Commit avec trigger de déploiement
    const commitMsg = '🚀 DEPLOY v2.0.5: Publication finale - GitHub Actions trigger';
    execSync(`git commit -m "${commitMsg}"`);
    console.log('✅ Commit créé');

    // 3. Push pour déclencher workflow
    execSync('git push origin master');
    console.log('✅ Push effectué - GitHub Actions déclenché');

    console.log('\n🎉 PUBLICATION DÉCLENCHÉE!');
    console.log('📊 Vérifiez: https://github.com/dlnraja/com.tuya.zigbee/actions');

} catch (error) {
    if (error.message.includes('nothing to commit')) {
        console.log('ℹ️  Pas de changements, déclenchement manuel...');
        execSync('git push origin master');
        console.log('✅ Workflow déclenché');
    } else {
        console.log(`❌ Erreur: ${error.message}`);
    }
}
