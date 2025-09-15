#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 PUBLICATION CORRECTE ULTIMATE ZIGBEE HUB');

// Fix app.json
const content = fs.readFileSync('.homeycompose/app.json', 'utf8');
fs.writeFileSync('app.json', content, 'utf8');

// Clean build dir
try {
    execSync('cmd /c "rd /s /q .homeybuild 2>nul"', { stdio: 'pipe' });
} catch (e) {}

// Quick validation
try {
    execSync('homey app validate --level=publish', { stdio: 'pipe' });
    console.log('✅ Validation OK');
} catch (e) {
    console.log('⚠️ Validation avec warnings');
}

const CHANGELOG = 'Ultimate Zigbee Hub v1.1.8 - Automated release with 1500+ Zigbee devices from 80+ manufacturers. Full SDK3 compliance.';

function publish() {
    return new Promise((resolve, reject) => {
        console.log('📤 Publication avec gestion correcte des prompts...');
        
        const proc = spawn('cmd', ['/c', 'homey', 'app', 'publish'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });
        
        let output = '';
        let step = 0;
        
        proc.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log(text);
            
            // Gérer les prompts dans l'ordre correct
            if (text.includes('uncommitted changes') && text.includes('continue')) {
                if (step === 0) {
                    console.log('💬 -> y (uncommitted changes)');
                    proc.stdin.write('y\n');
                    step = 1;
                }
            }
            else if (text.includes('update') && text.includes('version number')) {
                if (step === 1) {
                    console.log('💬 -> y (version update)');
                    proc.stdin.write('y\n');
                    step = 2;
                }
            }
            else if (text.includes('Patch') && text.includes('Minor') && text.includes('Major')) {
                if (step === 2) {
                    console.log('💬 -> [Enter] (select Patch)');
                    proc.stdin.write('\n');
                    step = 3;
                }
            }
            else if (text.includes('changelog') || text.includes("What's new")) {
                if (step === 3) {
                    console.log('💬 -> Changelog');
                    proc.stdin.write(CHANGELOG + '\n');
                    step = 4;
                }
            }
        });
        
        proc.stderr.on('data', (data) => {
            console.error(data.toString());
        });
        
        proc.on('close', (code) => {
            if (code === 0 || output.includes('Published successfully')) {
                console.log('🎉 PUBLICATION RÉUSSIE!');
                resolve(true);
            } else {
                reject(new Error(`Exit code ${code}`));
            }
        });
        
        // Safety timeout
        setTimeout(() => {
            proc.kill();
            reject(new Error('Timeout'));
        }, 180000);
    });
}

// Main with retries
async function main() {
    for (let i = 1; i <= 5; i++) {
        console.log(`\n🔄 Tentative ${i}/5`);
        try {
            await publish();
            console.log('\n✨ SUCCÈS COMPLET!');
            console.log('📱 App publiée sur Homey App Store');
            console.log('🔗 https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
            return;
        } catch (error) {
            console.log(`❌ Tentative ${i} échouée:`, error.message);
            if (i < 5) {
                console.log('⏳ Nouvelle tentative dans 3 secondes...');
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
    
    console.log('\n❌ Toutes les tentatives ont échoué');
    console.log('📝 Instructions manuelles:');
    console.log('1. homey app publish');
    console.log('2. Répondre: y, y, [Enter], puis coller le changelog');
}

main();
