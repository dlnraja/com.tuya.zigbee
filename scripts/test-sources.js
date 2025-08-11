'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'scripts', 'sources');

console.log('🧪 === TEST DES MODULES DE SOURCES ===');

// Test 1: Vérification de la structure des dossiers
console.log('\n📁 Test 1: Structure des dossiers');
const requiredDirs = [
    'scripts/sources',
    'scripts/sources/external',
    'scripts/sources/local',
    'scripts/sources/parsers',
    'scripts/sources/enrichers',
    'scripts/sources/databases',
    'scripts/sources/validators',
    'scripts/sources/exporters'
];

let dirTestPassed = true;
for (const dir of requiredDirs) {
    const fullPath = path.join(ROOT, dir);
    if (fs.existsSync(fullPath)) {
        console.log(`  ✅ ${dir} - OK`);
    } else {
        console.log(`  ❌ ${dir} - MANQUANT`);
        dirTestPassed = false;
    }
}

// Test 2: Vérification des fichiers de scripts
console.log('\n📄 Test 2: Fichiers de scripts');
const requiredScripts = [
    'scripts/sources/external/github-scraper.js',
    'scripts/sources/external/forum-scraper.js',
    'scripts/sources/local/backup-analyzer.js',
    'scripts/sources/parsers/driver-metadata-parser.js',
    'scripts/sources/enrichers/ai-enrichment-engine.js',
    'scripts/sources/sources-orchestrator.js',
    'scripts/mega-sources-complete.js'
];

let scriptTestPassed = true;
for (const script of requiredScripts) {
    const fullPath = path.join(ROOT, script);
    if (fs.existsSync(fullPath)) {
        console.log(`  ✅ ${script} - OK`);
    } else {
        console.log(`  ❌ ${script} - MANQUANT`);
        scriptTestPassed = false;
    }
}

// Test 3: Vérification des modules Node.js
console.log('\n🔧 Test 3: Modules Node.js');
let moduleTestPassed = true;

try {
    const githubScraper = require('./sources/external/github-scraper');
    console.log('  ✅ github-scraper - OK');
} catch (error) {
    console.log(`  ❌ github-scraper - ERREUR: ${error.message}`);
    moduleTestPassed = false;
}

try {
    const forumScraper = require('./sources/external/forum-scraper');
    console.log('  ✅ forum-scraper - OK');
} catch (error) {
    console.log(`  ❌ forum-scraper - ERREUR: ${error.message}`);
    moduleTestPassed = false;
}

try {
    const backupAnalyzer = require('./sources/local/backup-analyzer');
    console.log('  ✅ backup-analyzer - OK');
} catch (error) {
    console.log(`  ❌ backup-analyzer - ERREUR: ${error.message}`);
    moduleTestPassed = false;
}

try {
    const driverParser = require('./sources/parsers/driver-metadata-parser');
    console.log('  ✅ driver-metadata-parser - OK');
} catch (error) {
    console.log(`  ❌ driver-metadata-parser - ERREUR: ${error.message}`);
    moduleTestPassed = false;
}

try {
    const aiEnricher = require('./sources/enrichers/ai-enrichment-engine');
    console.log('  ✅ ai-enrichment-engine - OK');
} catch (error) {
    console.log(`  ❌ ai-enrichment-engine - ERREUR: ${error.message}`);
    moduleTestPassed = false;
}

try {
    const sourcesOrchestrator = require('./sources/sources-orchestrator');
    console.log('  ✅ sources-orchestrator - OK');
} catch (error) {
    console.log(`  ❌ sources-orchestrator - ERREUR: ${error.message}`);
    moduleTestPassed = false;
}

// Test 4: Vérification du package.json
console.log('\n📦 Test 4: Package.json');
let packageTestPassed = true;

try {
    const packagePath = path.join(ROOT, 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (packageContent.scripts.mega === 'node scripts/mega-sources-complete.js') {
        console.log('  ✅ Script mega - OK');
    } else {
        console.log('  ❌ Script mega - INCORRECT');
        packageTestPassed = false;
    }
    
    const newScripts = ['sources-extract', 'sources-parse', 'sources-enrich', 'sources-report'];
    for (const script of newScripts) {
        if (packageContent.scripts[script]) {
            console.log(`  ✅ Script ${script} - OK`);
        } else {
            console.log(`  ❌ Script ${script} - MANQUANT`);
            packageTestPassed = false;
        }
    }
    
} catch (error) {
    console.log(`  ❌ Package.json - ERREUR: ${error.message}`);
    packageTestPassed = false;
}

// Résumé des tests
console.log('\n📊 === RÉSUMÉ DES TESTS ===');
console.log(`📁 Structure des dossiers: ${dirTestPassed ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}`);
console.log(`📄 Fichiers de scripts: ${scriptTestPassed ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}`);
console.log(`🔧 Modules Node.js: ${moduleTestPassed ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}`);
console.log(`📦 Package.json: ${packageTestPassed ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}`);

const allTestsPassed = dirTestPassed && scriptTestPassed && moduleTestPassed && packageTestPassed;

if (allTestsPassed) {
    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('🚀 Le système de sources est prêt à être utilisé.');
    console.log('\n📋 Commandes disponibles:');
    console.log('  npm run mega                    - Script mega complet');
    console.log('  npm run sources-extract         - Extraction des sources');
    console.log('  npm run sources-parse          - Parsing des drivers');
    console.log('  npm run sources-enrich         - Enrichissement IA');
    console.log('  npm run sources-report         - Rapport des sources');
} else {
    console.log('\n❌ Certains tests ont échoué.');
    console.log('🔧 Veuillez corriger les erreurs avant de continuer.');
    process.exit(1);
}
