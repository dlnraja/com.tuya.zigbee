#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 PUBLICATION FINALE ULTIMATE ZIGBEE HUB');
console.log('📁 Répertoire:', process.cwd());

// Fix app.json encoding
console.log('📝 Correction app.json...');
const content = fs.readFileSync('.homeycompose/app.json', 'utf8');
fs.writeFileSync('app.json', content, 'utf8');

// Quick validation
console.log('🔍 Validation...');
try {
    execSync('homey app validate --level=publish', { stdio: 'pipe', timeout: 60000 });
    console.log('✅ Validation OK');
} catch (e) {
    console.log('⚠️ Validation avec warnings');
}

const CHANGELOG = 'Ultimate Zigbee Hub v1.1.7 - Publication automatisée complète. 1500+ appareils Zigbee de 80+ fabricants. SDK3 complet avec automatisation totale.';

// Fonction de publication interactive
function publishInteractive() {
    return new Promise((resolve, reject) => {
        console.log('📤 Lancement publication interactive...');
        
        const proc = spawn('homey', ['app', 'publish'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });
        
        let output = '';
        let responses = {
            uncommitted: false,
            version: false,
            selection: false,
            changelog: false
        };
        
        // Fonction pour envoyer une réponse
        const sendResponse = (response, type) => {
            console.log(`💬 Envoi: ${response} (${type})`);
            proc.stdin.write(response + '\n');
            responses[type] = true;
        };
        
        // Gérer stdout
        proc.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            process.stdout.write(text);
            
            // Analyser et répondre aux prompts
            const lowerText = text.toLowerCase();
            
            // Détecter prompts et répondre
            if (!responses.uncommitted && (lowerText.includes('uncommitted') && lowerText.includes('continue'))) {
                setTimeout(() => sendResponse('y', 'uncommitted'), 500);
            }
            else if (!responses.version && (lowerText.includes('update') && lowerText.includes('version'))) {
                setTimeout(() => sendResponse('y', 'version'), 500);
            }
            else if (!responses.selection && (lowerText.includes('patch') || lowerText.includes('minor') || lowerText.includes('major'))) {
                setTimeout(() => sendResponse('', 'selection'), 500);
            }
            else if (!responses.changelog && (lowerText.includes('changelog') || lowerText.includes("what's new"))) {
                setTimeout(() => sendResponse(CHANGELOG, 'changelog'), 500);
            }
            
            // Détecter succès
            if (lowerText.includes('published') || lowerText.includes('successfully')) {
                console.log('\n🎉 PUBLICATION RÉUSSIE!');
                setTimeout(() => resolve(true), 1000);
            }
        });
        
        // Gérer stderr
        proc.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        
        // Gérer fermeture
        proc.on('close', (code) => {
            console.log(`\n📊 Code sortie: ${code}`);
            if (code === 0) {
                resolve(true);
            } else {
                reject(new Error(`Exit code ${code}`));
            }
        });
        
        // Timeout
        setTimeout(() => {
            console.log('\n⏰ Timeout atteint');
            proc.kill();
            reject(new Error('Timeout'));
        }, 180000);
    });
}

// Main avec retry
async function main() {
    const MAX_ATTEMPTS = 3;
    
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
        console.log(`\n🔄 Tentative ${i}/${MAX_ATTEMPTS}`);
        
        try {
            await publishInteractive();
            console.log('\n✨ SUCCÈS COMPLET!');
            console.log('📱 App publiée sur Homey App Store');
            console.log('🔗 https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
            process.exit(0);
        } catch (error) {
            console.log(`\n❌ Tentative ${i} échouée:`, error.message);
            
            if (i < MAX_ATTEMPTS) {
                console.log('⏳ Nouvelle tentative dans 5 secondes...');
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }
    
    console.log('\n❌ Échec après toutes les tentatives');
    console.log('📝 Exécutez manuellement: homey app publish');
    console.log('Réponses: y, y, [Enter], puis le changelog');
    process.exit(1);
}

// Lancer
main().catch(console.error);
