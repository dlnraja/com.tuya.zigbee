#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 NETTOYAGE COMPLET & VALIDATION');
console.log('='.repeat(70));

// 1. Note: Ne pas tuer le processus actuel
console.log('\n1. Préparation...');
console.log('   ✅ Script prêt');

// 2. Supprimer fichiers problématiques
console.log('\n2. Suppression fichiers problématiques...');
const driversDir = path.join(process.cwd(), 'drivers');

function deleteRecursive(dir, pattern) {
    let count = 0;
    if (!fs.existsSync(dir)) return count;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            count += deleteRecursive(fullPath, pattern);
        } else if (pattern(item.name)) {
            try {
                fs.unlinkSync(fullPath);
                count++;
            } catch (e) {
                console.log(`   ⚠️ Erreur suppression: ${fullPath}`);
            }
        }
    }
    return count;
}

const placeholders = deleteRecursive(driversDir, name => name.endsWith('.placeholder'));
const specs = deleteRecursive(driversDir, name => name.endsWith('-spec.json'));
const svgs = deleteRecursive(driversDir, name => name.endsWith('.svg') && name !== 'icon.svg');

console.log(`   ✅ Supprimés: ${placeholders} placeholders, ${specs} specs, ${svgs} SVG`);

// 3. Supprimer caches
console.log('\n3. Suppression caches...');
function deleteDirRecursive(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                deleteDirRecursive(fullPath);
            } else {
                fs.unlinkSync(fullPath);
            }
        }
        fs.rmdirSync(dirPath);
    } catch (e) {
        console.log(`   ⚠️ Erreur: ${e.message}`);
    }
}

deleteDirRecursive('.homeybuild');
deleteDirRecursive('.homeycompose');
console.log('   ✅ Caches supprimés');

// Attendre
console.log('\n4. Attente stabilisation...');
setTimeout(() => {
    // 5. Validation JSON
    console.log('\n5. Validation JSON...');
    try {
        execSync('node tools/validate_all_json.js', { stdio: 'inherit' });
    } catch (e) {
        console.log('   ❌ Validation JSON échouée');
        process.exit(1);
    }

    // 6. Vérification assets
    console.log('\n6. Vérification assets...');
    try {
        execSync('node tools/verify_driver_assets_v38.js', { stdio: 'inherit' });
    } catch (e) {
        console.log('   ⚠️ Vérification assets avec avertissements');
    }

    // 7. Build
    console.log('\n7. Build Homey...');
    try {
        execSync('homey app build', { stdio: 'inherit' });
        console.log('   ✅ Build réussi');
    } catch (e) {
        console.log('   ❌ Build échoué');
        process.exit(1);
    }

    // 8. Validation publish
    console.log('\n8. Validation publish-level...');
    try {
        execSync('homey app validate --level publish', { stdio: 'inherit' });
        console.log('   ✅ Validation réussie');
    } catch (e) {
        console.log('   ❌ Validation échouée');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TOUT VALIDÉ - PRÊT POUR PUBLICATION');
    console.log('\nCommandes suivantes:');
    console.log('  git add -A');
    console.log('  git commit -m "Clean: Validation complète OK"');
    console.log('  git push origin master');
    console.log('  homey login');
    console.log('  homey app publish');

}, 3000);
