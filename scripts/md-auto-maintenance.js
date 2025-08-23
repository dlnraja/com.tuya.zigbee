// MEGA ULTIMATE ENHANCED - 2025-08-07T16:33:44.714Z
// Script amélioré avec liens corrigés et fonctionnalités étendues

const fs = require('fs');
const path = require('path');

console.log('🚀 MEGA MD AUTO MAINTENANCE');

// Configuration
const CONFIG = {
    autoCleanup: true,
    keepInRoot: [
        'README.md',
        'CHANGELOG.md',
        'CONTRIBUTING.md',
        'FAQ.md',
        'LICENSE.md'
    ],
    deletePatterns: [
        'README_*.md',
        '*_REPORT.md',
        '*_REPORT.json',
        'TODO_*.md',
        'cursor_*.md'
    ]
};

// Fonction pour nettoyer automatiquement
function autoCleanup() {
    console.log('🔄 Nettoyage automatique...');
    
    const files = fs.readdirSync('.');
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    for (const file of mdFiles) {
        if (!CONFIG.keepInRoot.includes(file)) {
            // Vérifier les patterns de suppression
            const shouldDelete = CONFIG.deletePatterns.some(pattern => {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(file);
            });
            
            if (shouldDelete) {
                try {
                    fs.unlinkSync(file);
                    console.log(`🗑️ Supprimé: ${file}`);
                } catch (error) {
                    console.log(`⚠️ Erreur: ${file}`, error.message);
                }
            } else {
                // Déplacer vers docs/reports/mega-reports
                const destination = path.join('docs/reports/mega-reports', file);
                try {
                    ensureDir(path.dirname(destination));
                    fs.renameSync(file, destination);
                    console.log(`🔄 Déplacé: ${file} -> ${destination}`);
                } catch (error) {
                    console.log(`⚠️ Erreur déplacement: ${file}`, error.message);
                }
            }
        }
    }
}

// Fonction pour créer un dossier
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Exécution automatique
if (CONFIG.autoCleanup) {
    autoCleanup();
}

console.log('✅ Maintenance automatique terminée');
