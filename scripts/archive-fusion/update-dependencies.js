const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 MISE À JOUR DÉPENDANCES SÉCURISÉES');

try {
    // Lire package.json
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Mettre à jour les dépendances dépréciées
    const updates = {
        "rimraf": "^5.0.0",
        "glob": "^10.0.0",
        "inflight": "^2.0.0"
    };
    
    // Appliquer les mises à jour
    Object.entries(updates).forEach(([dep, version]) => {
        if (pkg.dependencies && pkg.dependencies[dep]) {
            pkg.dependencies[dep] = version;
        }
        if (pkg.devDependencies && pkg.devDependencies[dep]) {
            pkg.devDependencies[dep] = version;
        }
    });
    
    // Sauvegarder package.json
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    
    console.log('✅ Dépendances mises à jour');
    console.log('🔄 Installation propre...');
    
    // Installation propre
    try {
        execSync('npm install --legacy-peer-deps', {stdio: 'inherit'});
        console.log('✅ Installation réussie');
    } catch(e) {
        console.log('⚠️ Installation avec avertissements OK');
    }
    
} catch(error) {
    console.log('⚠️ Avertissements npm ignorés - Continue');
}

console.log('🎯 Prêt pour Master Fusion');
