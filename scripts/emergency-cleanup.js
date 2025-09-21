const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY CLEANUP - Suppression fichiers sensibles');

// Fichiers spécifiques à nettoyer
const filesToClean = [
    'project-data/references/enriched-sources.json',
    'project-data/reports/analysis/project-analysis.json',
    'project-data/reports/analysis/quick-driver-restoration-report.json',
    'scripts/security-guardian.js'
];

let cleaned = 0;

filesToClean.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            // Remplacer le contenu par un fichier vide sécurisé
            fs.writeFileSync(file, JSON.stringify({
                "status": "cleaned",
                "timestamp": new Date().toISOString(),
                "note": "Fichier nettoyé pour sécurité"
            }, null, 2));
            console.log(`✅ ${file} nettoyé`);
            cleaned++;
        } catch (e) {
            console.log(`❌ Erreur ${file}: ${e.message}`);
        }
    }
});

// Supprimer complètement node_modules
if (fs.existsSync('node_modules')) {
    fs.rmSync('node_modules', { recursive: true, force: true });
    console.log('✅ node_modules supprimé');
    cleaned++;
}

console.log(`🎉 ${cleaned} éléments nettoyés`);
console.log('🔐 Projet sécurisé!');
