const fs = require('fs');
const path = require('path');

console.log('🚀 MEGA MD MAINTENANCE AUTOMATIQUE');

// Configuration
const CONFIG = {
    autoCleanup: true,
    autoOrganize: true,
    keepInRoot: [
        'README.md',
        'CHANGELOG.md', 
        'CONTRIBUTING.md',
        'FAQ.md',
        'LICENSE.md'
    ]
};

// Fonction pour organiser automatiquement
function autoOrganize() {
    console.log('🔄 Organisation automatique des fichiers MD...');
    
    const files = fs.readdirSync('.');
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    for (const file of mdFiles) {
        if (!CONFIG.keepInRoot.includes(file)) {
            // Classer et déplacer automatiquement
            const destination = classifyFile(file);
            if (destination) {
                moveFile(file, destination);
            }
        }
    }
}

// Fonction pour classer un fichier
function classifyFile(filename) {
    const lowerName = filename.toLowerCase();
    
    if (lowerName.includes('mega') && lowerName.includes('report')) {
        return 'docs/reports/mega-reports';
    }
    if (lowerName.includes('driver') && lowerName.includes('report')) {
        return 'docs/reports/driver-reports';
    }
    if (lowerName.includes('fix') && lowerName.includes('report')) {
        return 'docs/reports/fix-reports';
    }
    if (lowerName.includes('test') && lowerName.includes('report')) {
        return 'docs/reports/test-reports';
    }
    if (lowerName.includes('processing') && lowerName.includes('report')) {
        return 'docs/reports/processing-reports';
    }
    
    return 'docs/reports/mega-reports';
}

// Fonction pour déplacer un fichier
function moveFile(source, destination) {
    try {
        if (fs.existsSync(source)) {
            const destPath = path.join(destination, source);
            ensureDir(path.dirname(destPath));
            fs.renameSync(source, destPath);
            console.log(`✅ Déplacé: ${source} -> ${destPath}`);
        }
    } catch (error) {
        console.log(`⚠️ Erreur: ${source}`, error.message);
    }
}

// Fonction pour créer un dossier
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Exécution automatique
if (CONFIG.autoOrganize) {
    autoOrganize();
}

console.log('✅ Maintenance automatique terminée');
