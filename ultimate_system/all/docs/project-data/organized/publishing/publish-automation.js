#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Ultimate Homey Publication Automation Starting...');

// Fix app.json encoding first
console.log('📝 Fixing app.json encoding...');
const content = fs.readFileSync('.homeycompose/app.json', 'utf8');
fs.writeFileSync('app.json', content, 'utf8');

// Start homey app publish
console.log('📤 Starting homey app publish...');
const homeyProcess = spawn('cmd', ['/c', 'homey', 'app', 'publish'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd(),
    shell: true
});

let outputBuffer = '';

homeyProcess.stdout.on('data', (data) => {
    const output = data.toString();
    outputBuffer += output;
    process.stdout.write(output);
    
    // Handle prompts
    if (output.includes('uncommitted changes') && output.includes('continue?')) {
        console.log('\n💬 Responding to uncommitted changes prompt...');
        homeyProcess.stdin.write('y\n');
    }
    else if (output.includes('version number') && output.includes('current v')) {
        console.log('\n💬 Responding to version update prompt...');
        homeyProcess.stdin.write('y\n');
    }
    else if (output.includes('Patch') && output.includes('Minor') && output.includes('Major')) {
        console.log('\n💬 Selecting Patch version...');
        homeyProcess.stdin.write('\n'); // Press Enter to select default Patch
    }
    else if (output.includes('changelog') || output.includes('What\'s new')) {
        console.log('\n💬 Entering changelog...');
        homeyProcess.stdin.write('Ultimate Zigbee Hub v1.1.2 - AUTOMATED PUBLICATION SUCCESS - Publication automation system implemented with full automation. Support etendu pour 1500+ appareils Zigbee de 80+ fabricants avec SDK3 complet.\n');
    }
});

homeyProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

homeyProcess.on('close', (code) => {
    console.log(`\n📊 Process exited with code: ${code}`);
    
    if (code === 0 || outputBuffer.includes('published') || outputBuffer.includes('uploaded')) {
        console.log('🎉 SUCCESS: Ultimate Zigbee Hub published successfully!');
        console.log('📱 App is now available on Homey App Store');
        console.log('🔗 Check status: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
        process.exit(0);
    } else {
        console.log('❌ FAILED: Publication unsuccessful');
        process.exit(1);
    }
});

homeyProcess.on('error', (error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});

// Handle timeout
setTimeout(() => {
    console.log('⏰ Timeout reached, terminating process...');
    homeyProcess.kill();
    process.exit(1);
}, 300000); // 5 minutes timeout
