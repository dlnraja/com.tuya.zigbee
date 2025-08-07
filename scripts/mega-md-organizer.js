// MEGA ULTIMATE ENHANCED - 2025-08-07T16:33:44.731Z
// Script amélioré avec liens corrigés et fonctionnalités étendues

const fs = require('fs');
const path = require('path');

console.log('🚀 MEGA MD ORGANIZER - ORGANISATION AUTOMATIQUE DES FICHIERS MD');

// Configuration de l'organisation
const ORGANIZATION_CONFIG = {
    // Fichiers à garder à la racine
    keepInRoot: [
        'README.md',
        'CHANGELOG.md',
        'CONTRIBUTING.md',
        'FAQ.md',
        'LICENSE.md'
    ],
    
    // Structure des dossiers de documentation
    docsStructure: {
        'reports': {
            'mega-reports': [],
            'driver-reports': [],
            'fix-reports': [],
            'test-reports': [],
            'processing-reports': []
        },
        'guides': {
            'development': [],
            'installation': [],
            'api': [],
            'troubleshooting': []
        },
        'roadmaps': {
            'future': [],
            'quantum': []
        },
        'ai': {
            'neural-networks': [],
            'predictive-analytics': [],
            'machine-learning': [],
            'intelligent-systems': []
        },
        'quantum': {
            'computing': [],
            'development': [],
            'completion': []
        }
    }
};

// Fonction pour créer un dossier
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Créé: ${dir}`);
    }
}

// Fonction pour déplacer un fichier
function moveFile(source, destination) {
    try {
        if (fs.existsSync(source)) {
            ensureDir(path.dirname(destination));
            fs.renameSync(source, destination);
            console.log(`🔄 Déplacé: ${source} -> ${destination}`);
            return true;
        }
    } catch (error) {
        console.log(`⚠️ Erreur déplacement ${source}:`, error.message);
    }
    return false;
}

// Fonction pour classer un fichier MD
function classifyMdFile(filename) {
    const lowerName = filename.toLowerCase();
    
    // Mega reports
    if (lowerName.includes('mega') && lowerName.includes('report')) {
        return 'docs/reports/mega-reports';
    }
    
    // Driver reports
    if (lowerName.includes('driver') && lowerName.includes('report')) {
        return 'docs/reports/driver-reports';
    }
    
    // Fix reports
    if (lowerName.includes('fix') && lowerName.includes('report')) {
        return 'docs/reports/fix-reports';
    }
    
    // Test reports
    if (lowerName.includes('test') && lowerName.includes('report')) {
        return 'docs/reports/test-reports';
    }
    
    // Processing reports
    if (lowerName.includes('processing') && lowerName.includes('report')) {
        return 'docs/reports/processing-reports';
    }
    
    // Development guides
    if (lowerName.includes('development') || lowerName.includes('guide')) {
        return 'docs/guides/development';
    }
    
    // Installation guides
    if (lowerName.includes('installation')) {
        return 'docs/guides/installation';
    }
    
    // API guides
    if (lowerName.includes('api')) {
        return 'docs/guides/api';
    }
    
    // Troubleshooting guides
    if (lowerName.includes('troubleshooting')) {
        return 'docs/guides/troubleshooting';
    }
    
    // Future roadmaps
    if (lowerName.includes('future') && lowerName.includes('roadmap')) {
        return 'docs/roadmaps/future';
    }
    
    // Quantum roadmaps
    if (lowerName.includes('quantum') && lowerName.includes('roadmap')) {
        return 'docs/roadmaps/quantum';
    }
    
    // Neural networks
    if (lowerName.includes('neural')) {
        return 'docs/ai/neural-networks';
    }
    
    // Predictive analytics
    if (lowerName.includes('predictive')) {
        return 'docs/ai/predictive-analytics';
    }
    
    // Machine learning
    if (lowerName.includes('machine') && lowerName.includes('learning')) {
        return 'docs/ai/machine-learning';
    }
    
    // Intelligent systems
    if (lowerName.includes('intelligent')) {
        return 'docs/ai/intelligent-systems';
    }
    
    // Quantum computing
    if (lowerName.includes('quantum') && lowerName.includes('computing')) {
        return 'docs/quantum/computing';
    }
    
    // Quantum development
    if (lowerName.includes('quantum') && lowerName.includes('development')) {
        return 'docs/quantum/development';
    }
    
    // Quantum completion
    if (lowerName.includes('quantum') && lowerName.includes('completion')) {
        return 'docs/quantum/completion';
    }
    
    // Par défaut, mettre dans reports
    return 'docs/reports/mega-reports';
}

// Fonction pour nettoyer les fichiers MD
function cleanMdFiles() {
    console.log('🧹 NETTOYAGE DES FICHIERS MD...');
    
    const files = fs.readdirSync('.');
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    console.log(`📊 Trouvé ${mdFiles.length} fichiers MD à organiser`);
    
    let movedCount = 0;
    let keptCount = 0;
    let deletedCount = 0;
    
    for (const file of mdFiles) {
        // Vérifier si le fichier doit rester à la racine
        if (ORGANIZATION_CONFIG.keepInRoot.includes(file)) {
            console.log(`✅ Gardé à la racine: ${file}`);
            keptCount++;
            continue;
        }
        
        // Classer et déplacer le fichier
        const destination = classifyMdFile(file);
        const destinationPath = path.join(destination, file);
        
        if (moveFile(file, destinationPath)) {
            movedCount++;
        } else {
            // Si le déplacement échoue, supprimer le fichier
            try {
                fs.unlinkSync(file);
                console.log(`🗑️ Supprimé: ${file}`);
                deletedCount++;
            } catch (error) {
                console.log(`⚠️ Erreur suppression ${file}:`, error.message);
            }
        }
    }
    
    console.log(`\n📊 RÉSULTATS DU NETTOYAGE:`);
    console.log(`✅ Gardés à la racine: ${keptCount}`);
    console.log(`🔄 Déplacés: ${movedCount}`);
    console.log(`🗑️ Supprimés: ${deletedCount}`);
}

// Fonction pour créer la structure de documentation
function createDocsStructure() {
    console.log('📁 CRÉATION DE LA STRUCTURE DE DOCUMENTATION...');
    
    // Créer la structure principale
    ensureDir('docs');
    
    // Créer les sous-dossiers
    for (const [mainCategory, subCategories] of Object.entries(ORGANIZATION_CONFIG.docsStructure)) {
        ensureDir(`docs/${mainCategory}`);
        
        for (const [subCategory, files] of Object.entries(subCategories)) {
            ensureDir(`docs/${mainCategory}/${subCategory}`);
        }
    }
    
    console.log('✅ Structure de documentation créée');
}

// Fonction pour créer un index des fichiers déplacés
function createDocsIndex() {
    console.log('📋 CRÉATION DE L\'INDEX DE DOCUMENTATION...');
    
    const indexContent = `# 📚 Documentation Index

## 📊 Reports

### 🔥 Mega Reports
- \`reports/mega-reports/\` - Rapports MEGA et analyses complètes

### 🔧 Driver Reports  
- \`reports/driver-reports/\` - Rapports sur les drivers et leur état

### 🛠️ Fix Reports
- \`reports/fix-reports/\` - Rapports de corrections et résolutions de bugs

### 🧪 Test Reports
- \`reports/test-reports/\` - Rapports de tests et validations

### ⚙️ Processing Reports
- \`reports/processing-reports/\` - Rapports de traitement et automatisation

## 📖 Guides

### 💻 Development
- \`guides/development/\` - Guides de développement et bonnes pratiques

### 📦 Installation
- \`guides/installation/\` - Guides d'installation et configuration

### 🔌 API
- \`guides/api/\` - Documentation de l'API et références

### 🔧 Troubleshooting
- \`guides/troubleshooting/\` - Guides de dépannage et résolution de problèmes

## 🗺️ Roadmaps

### 🔮 Future
- \`roadmaps/future/\` - Roadmaps futures et plans de développement

### ⚛️ Quantum
- \`roadmaps/quantum/\` - Roadmaps quantiques et innovations

## 🤖 AI

### 🧠 Neural Networks
- \`ai/neural-networks/\` - Documentation sur les réseaux de neurones

### 📊 Predictive Analytics
- \`ai/predictive-analytics/\` - Documentation sur l'analyse prédictive

### 🤖 Machine Learning
- \`ai/machine-learning/\` - Documentation sur le machine learning

### 🧠 Intelligent Systems
- \`ai/intelligent-systems/\` - Documentation sur les systèmes intelligents

## ⚛️ Quantum

### 💻 Computing
- \`quantum/computing/\` - Documentation sur l'informatique quantique

### 💻 Development
- \`quantum/development/\` - Guides de développement quantique

### ✅ Completion
- \`quantum/completion/\` - Documentation sur la complétion quantique

---

*Généré automatiquement par MEGA MD Organizer*
`;

    fs.writeFileSync('docs/README.md', indexContent);
    console.log('✅ Index de documentation créé');
}

// Fonction pour créer un script de maintenance automatique
function createMaintenanceScript() {
    console.log('🔧 CRÉATION DU SCRIPT DE MAINTENANCE AUTOMATIQUE...');
    
    const maintenanceScript = `const fs = require('fs');
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
            console.log(\`✅ Déplacé: \${source} -> \${destPath}\`);
        }
    } catch (error) {
        console.log(\`⚠️ Erreur: \${source}\`, error.message);
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
`;

    fs.writeFileSync('scripts/md-maintenance-auto.js', maintenanceScript);
    console.log('✅ Script de maintenance automatique créé');
}

// Fonction pour nettoyer les fichiers JSON de rapports
function cleanJsonReports() {
    console.log('🧹 NETTOYAGE DES RAPPORTS JSON...');
    
    const files = fs.readdirSync('.');
    const jsonFiles = files.filter(file => file.endsWith('.json') && file.includes('REPORT'));
    
    for (const file of jsonFiles) {
        try {
            fs.unlinkSync(file);
            console.log(`🗑️ Supprimé: ${file}`);
        } catch (error) {
            console.log(`⚠️ Erreur suppression ${file}:`, error.message);
        }
    }
    
    console.log('✅ Rapports JSON nettoyés');
}

// Fonction principale
function main() {
    console.log('🚀 DÉBUT DE L\'ORGANISATION MEGA MD');
    
    try {
        // 1. Créer la structure de documentation
        createDocsStructure();
        
        // 2. Nettoyer les fichiers MD
        cleanMdFiles();
        
        // 3. Créer l'index de documentation
        createDocsIndex();
        
        // 4. Créer le script de maintenance automatique
        createMaintenanceScript();
        
        // 5. Nettoyer les rapports JSON
        cleanJsonReports();
        
        console.log('\n🎉 ORGANISATION MEGA MD TERMINÉE !');
        console.log('✅ Structure de documentation créée');
        console.log('✅ Fichiers MD organisés');
        console.log('✅ Index de documentation généré');
        console.log('✅ Script de maintenance automatique créé');
        console.log('✅ Rapports JSON nettoyés');
        
    } catch (error) {
        console.error('❌ ERREUR LORS DE L\'ORGANISATION:', error);
        process.exit(1);
    }
}

// Exécuter l'organisation
main(); 