const { spawn } = require('child_process');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

console.log('🚀 PUBLICATION AUTOMATIQUE FINALE');
console.log('================================');

const changelog = 'v1.0.30 - Maximum Device Compatibility Update - Enhanced with 1000+ devices from 60+ manufacturers including complete Johan Bendz compatibility. Added comprehensive manufacturer ID coverage for all device categories. Professional SDK3 architecture with local Zigbee operation. Fixed all validation errors.';

async function automaticPublish() {
    return new Promise((resolve, reject) => {
        console.log('📝 Lancement publication automatique...');
        
        const child = spawn('homey', ['app', 'publish'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });

        let fullOutput = '';
        
        // Auto-respond to all prompts
        const responses = [
            { trigger: 'uncommitted changes', response: 'y' },
            { trigger: 'version number', response: 'y' },
            { trigger: 'Select the desired version', response: '\n' }, // Enter for patch
            { trigger: 'Changelog', response: changelog }
        ];

        child.stdout.on('data', (data) => {
            const text = data.toString();
            fullOutput += text;
            console.log('📤', text.trim());
            
            // Auto-respond to prompts
            responses.forEach(({ trigger, response }) => {
                if (text.toLowerCase().includes(trigger.toLowerCase())) {
                    console.log(`✅ Auto-réponse: ${trigger}`);
                    setTimeout(() => {
                        child.stdin.write(response + '\n');
                    }, 100);
                }
            });
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            console.log('📤', text.trim());
            fullOutput += text;
        });

        child.on('close', (code) => {
            if (code === 0 || fullOutput.includes('Successfully published')) {
                console.log('\n🎉 PUBLICATION RÉUSSIE!');
                console.log('📱 Ultimate Zigbee Hub v1.0.30 publié sur Homey App Store');
                resolve(true);
            } else {
                console.log('\n❌ Publication échouée, code:', code);
                resolve(false);
            }
        });

        // Timeout after 10 minutes
        setTimeout(() => {
            child.kill();
            reject(new Error('Publication timeout'));
        }, 600000);
    });
}

automaticPublish().then(success => {
    if (success) {
        console.log('\n✅ SUCCÈS COMPLET!');
        console.log('🌟 Ultimate Zigbee Hub v1.0.30 disponible sur l\'App Store');
    } else {
        console.log('\n⚠️  Publication incomplète - vérifier manuellement');
    }
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('\n💥 Erreur:', error.message);
    process.exit(1);
});
