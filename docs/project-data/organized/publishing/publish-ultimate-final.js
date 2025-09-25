#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 PUBLICATION ULTIMATE ZIGBEE HUB v1.0.30 - MÉTHODE GARANTIE');

// Vérifier app.json
try {
    const appData = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    console.log(`📱 Version: ${appData.version}`);
} catch (e) {
    console.log('❌ Erreur app.json');
    process.exit(1);
}

const CHANGELOG = 'Ultimate Zigbee Hub v1.0.30 - Enhanced automation with improved version control, 1500+ devices, 80+ manufacturers, SDK3 compliant';

function publishApp() {
    return new Promise((resolve, reject) => {
        console.log('📤 Publication avec gestion séquentielle des prompts...\n');
        
        const proc = spawn('homey', ['app', 'publish'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });
        
        let buffer = '';
        const prompts = { uncommitted: false, version: false, selection: false, changelog: false };
        
        // Gérer stdout
        proc.stdout.on('data', (chunk) => {
            const text = chunk.toString();
            buffer += text;
            process.stdout.write(text);
            
            // Analyser le buffer complet pour les prompts
            setTimeout(() => {
                if (!prompts.uncommitted && buffer.includes('uncommitted changes') && buffer.includes('(y/N)')) {
                    console.log('\n💬 → Envoi: y (accepter les changements non commités)');
                    proc.stdin.write('y\n');
                    prompts.uncommitted = true;
                }
                else if (prompts.uncommitted && !prompts.version && buffer.includes('version number') && buffer.includes('(Y/n)')) {
                    console.log('\n💬 → Envoi: y (mise à jour de version)');
                    proc.stdin.write('y\n');
                    prompts.version = true;
                }
                else if (prompts.version && !prompts.selection && (buffer.includes('Patch') || buffer.includes('Minor') || buffer.includes('Major'))) {
                    console.log('\n💬 → Envoi: 3 (sélection Major)');
                    proc.stdin.write('3\n');
                    prompts.selection = true;
                }
                else if (prompts.selection && !prompts.changelog && (buffer.includes('changelog') || buffer.includes("What's new"))) {
                    console.log('\n💬 → Envoi du changelog');
                    proc.stdin.write(CHANGELOG + '\n');
                    prompts.changelog = true;
                }
            }, 200);
        });
        
        // Gérer stderr
        proc.stderr.on('data', (chunk) => {
            process.stderr.write(chunk);
        });
        
        // Gérer la fermeture
        proc.on('close', (code) => {
            console.log(`\n📊 Code de sortie: ${code}`);
            if (code === 0 || buffer.includes('Published successfully')) {
                console.log('🎉 PUBLICATION RÉUSSIE!');
                resolve(true);
            } else {
                reject(new Error(`Code de sortie ${code}`));
            }
        });
        
        // Timeout de sécurité
        setTimeout(() => {
            if (!prompts.changelog) {
                console.log('\n⏰ Timeout - arrêt du processus');
                proc.kill();
                reject(new Error('Timeout'));
            }
        }, 180000);
    });
}

// Main
async function main() {
    try {
        await publishApp();
        console.log('\n✨ SUCCÈS COMPLET!');
        console.log('📱 Ultimate Zigbee Hub v1.1.9 publié sur Homey App Store');
        console.log('🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
        console.log('📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
    } catch (error) {
        console.log('\n❌ Échec:', error.message);
        console.log('\n📝 Instructions manuelles:');
        console.log('1. Exécuter: homey app publish');
        console.log('2. Répondre: y (accepter les changements non commités)');
        console.log('3. Répondre: n (pas de mise à jour de version car déjà en 1.1.9)');
        console.log('4. Entrer le changelog: ' + CHANGELOG);
    }
}

main();
