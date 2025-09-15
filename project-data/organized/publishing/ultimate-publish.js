#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ULTIMATE PUBLISH - AUTOMATISATION COMPLÈTE');

// Changelog message
const CHANGELOG = "Ultimate Zigbee Hub v1.1.5 - Publication automatisée avec support pour 1500+ appareils Zigbee de 80+ fabricants. SDK3 complet.";

// Fonction pour mettre à jour la version
function updateVersion() {
    try {
        const composePath = path.join(__dirname, '.homeycompose', 'app.json');
        const appData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        const versionParts = appData.version.split('.').map(Number);
        versionParts[2]++; 
        appData.version = versionParts.join('.');
        
        fs.writeFileSync(composePath, JSON.stringify(appData, null, 2), 'utf8');
        fs.writeFileSync('app.json', JSON.stringify(appData, null, 2), 'utf8');
        
        console.log(`✅ Version: ${appData.version}`);
        return appData.version;
    } catch (error) {
        console.error('❌ Erreur version:', error.message);
        return null;
    }
}

// Fonction principale de publication
function publish() {
    return new Promise((resolve, reject) => {
        console.log('📤 Lancement de la publication...');
        console.log(`📋 Changelog: ${CHANGELOG}`);
        
        const homeyProcess = spawn('homey', ['app', 'publish'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });
        
        let output = '';
        let promptsHandled = [];
        
        // Gérer stdout
        homeyProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('Output:', text);
            
            // Détecter et répondre aux prompts
            setTimeout(() => {
                const currentOutput = output.toLowerCase();
                
                // Premier prompt: uncommitted changes
                if (currentOutput.includes('uncommitted') && currentOutput.includes('continue') && !promptsHandled.includes('uncommitted')) {
                    console.log('💬 Réponse: y (uncommitted changes)');
                    homeyProcess.stdin.write('y\n');
                    promptsHandled.push('uncommitted');
                }
                // Deuxième prompt: version update
                else if (currentOutput.includes('update') && currentOutput.includes('version') && !promptsHandled.includes('version')) {
                    console.log('💬 Réponse: y (version update)');
                    homeyProcess.stdin.write('y\n');
                    promptsHandled.push('version');
                }
                // Troisième prompt: selection (Patch/Minor/Major)
                else if ((currentOutput.includes('patch') || currentOutput.includes('minor') || currentOutput.includes('major')) && !promptsHandled.includes('selection')) {
                    console.log('💬 Réponse: [Enter] (Patch)');
                    homeyProcess.stdin.write('\n');
                    promptsHandled.push('selection');
                }
                // Quatrième prompt: changelog
                else if ((currentOutput.includes('changelog') || currentOutput.includes("what's new")) && !promptsHandled.includes('changelog')) {
                    console.log('💬 Réponse: Changelog');
                    homeyProcess.stdin.write(CHANGELOG + '\n');
                    promptsHandled.push('changelog');
                }
            }, 100);
        });
        
        // Gérer stderr
        homeyProcess.stderr.on('data', (data) => {
            console.log('Stderr:', data.toString());
        });
        
        // Gérer la fermeture
        homeyProcess.on('close', (code) => {
            console.log(`📊 Code de sortie: ${code}`);
            if (code === 0 || output.includes('published')) {
                console.log('🎉 SUCCÈS!');
                resolve(true);
            } else {
                console.log('❌ Échec');
                reject(new Error('Publication failed'));
            }
        });
        
        // Timeout de sécurité
        setTimeout(() => {
            console.log('⏰ Timeout - arrêt du processus');
            homeyProcess.kill();
            reject(new Error('Timeout'));
        }, 180000); // 3 minutes
    });
}

// Main
async function main() {
    const MAX_ATTEMPTS = 5;
    
    // Mise à jour version
    const version = updateVersion();
    if (!version) {
        console.log('❌ Impossible de mettre à jour la version');
        process.exit(1);
    }
    
    // Tentatives de publication
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
        console.log(`\n🔄 Tentative ${i}/${MAX_ATTEMPTS}`);
        try {
            await publish();
            console.log('✨ Publication réussie!');
            console.log('🔗 https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
            process.exit(0);
        } catch (error) {
            console.log(`❌ Tentative ${i} échouée:`, error.message);
            if (i < MAX_ATTEMPTS) {
                console.log('⏳ Nouvelle tentative dans 5 secondes...');
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }
    
    console.log('❌ Toutes les tentatives ont échoué');
    process.exit(1);
}

main();
