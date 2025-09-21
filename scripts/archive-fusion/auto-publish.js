const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 AUTO PUBLISH HOMEY v1.0.32');
console.log('🤖 Gestion automatique des prompts\n');

// Cleanup préalable
try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}

const publish = spawn('homey', ['app', 'publish'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
});

// Réponses automatiques aux prompts
const responses = {
    'uncommitted changes': 'y\n',
    'update your app\'s version': 'y\n', 
    'Select the desired version': '\n',
    'Are you sure': 'y\n'
};

publish.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Détecter et répondre aux prompts
    Object.entries(responses).forEach(([prompt, response]) => {
        if (output.toLowerCase().includes(prompt.toLowerCase())) {
            console.log(`🤖 Auto-réponse: ${response.trim()}`);
            publish.stdin.write(response);
        }
    });
});

publish.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
});

publish.on('close', (code) => {
    console.log(`\n🎯 Publication terminée avec code: ${code}`);
    if (code === 0) {
        console.log('🎉 PUBLICATION RÉUSSIE !');
    } else {
        console.log('⚠️ Erreur - GitHub Actions prend le relais');
    }
});
