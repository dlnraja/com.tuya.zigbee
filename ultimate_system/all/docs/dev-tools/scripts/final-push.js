#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 PUBLICATION FINALE v1.1.9');

// Ensure app.json is correct
const appData = JSON.parse(fs.readFileSync('app.json', 'utf8'));
console.log(`📱 Version actuelle: ${appData.version}`);

// Create input file with correct responses
const responses = `y
n
Ultimate Zigbee Hub v1.1.9 - Complete automation achieved. 1500+ Zigbee devices from 80+ manufacturers. Full SDK3 compliance.
`;

fs.writeFileSync('final-input.txt', responses);

console.log('📤 Publication avec réponses automatiques...');

try {
    // Method 1: Direct piping
    execSync('type final-input.txt | homey app publish', {
        stdio: 'inherit',
        shell: true,
        timeout: 120000
    });
    console.log('🎉 SUCCÈS!');
} catch (error) {
    console.log('⚠️ Méthode 1 échouée, essai alternatif...');
    
    // Method 2: Echo commands
    try {
        const cmd = 'echo y& echo n& echo Ultimate Zigbee Hub v1.1.9 - Automated. 1500+ devices. SDK3. | homey app publish';
        execSync(cmd, {
            stdio: 'inherit',
            shell: true,
            timeout: 120000
        });
        console.log('🎉 SUCCÈS via echo!');
    } catch (e2) {
        console.log('❌ Publication échouée');
        console.log('📝 Exécutez manuellement:');
        console.log('   homey app publish');
        console.log('   Réponses: y (uncommitted), n (pas de version update), changelog');
    }
} finally {
    // Cleanup
    if (fs.existsSync('final-input.txt')) {
        fs.unlinkSync('final-input.txt');
    }
}

console.log('\n🔗 Vérifier: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
console.log('📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
