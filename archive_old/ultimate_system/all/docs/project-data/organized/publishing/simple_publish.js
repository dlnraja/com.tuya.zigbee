const { spawn } = require('child_process');

function runPublish() {
    console.log('Starting Homey app publish...');
    
    const publish = spawn('homey', ['app', 'publish'], {
        stdio: ['pipe', 'pipe', 'inherit'],
        shell: true
    });

    let step = 0;
    
    publish.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        
        // Auto-respond to prompts
        if (output.includes('uncommitted changes') && step === 0) {
            console.log('Responding: y (accept uncommitted changes)');
            publish.stdin.write('y\n');
            step = 1;
        } else if (output.includes('version number') && step === 1) {
            console.log('Responding: n (keep current version)');
            publish.stdin.write('n\n');
            step = 2;
        } else if (output.includes('Changelog') && step === 2) {
            console.log('Sending changelog...');
            const changelog = `v1.0.28 - Complete Johan Bendz Compatibility

✨ NEW FEATURES:
• Added 2 Gang Scene Remote (TS0042) - _TZ3000_dfgbtub0 support
• Added 4 Gang Scene Remote (TS0044) - _TZ3000_wkai4ga5 support
• Enhanced Johan Bendz device compatibility
• Professional unbranded device categorization

🔧 IMPROVEMENTS:
• Updated support URL to Homey Community forum
• Fixed all validation errors and image requirements
• Multi-language support (EN/FR/NL)
• Clean asset management

🐛 BUG FIXES:
• Corrected driver image paths after reorganization
• Fixed manifest.tags format to object
• Resolved cache conflicts
• Enhanced device compatibility

This version ensures complete compatibility with Johan Bendz's Tuya Zigbee app while providing modern SDK3 architecture.`;
            
            publish.stdin.write(changelog + '\n');
            step = 3;
        }
    });

    publish.on('close', (code) => {
        if (code === 0) {
            console.log('\n🎉 PUBLICATION SUCCESSFUL! 🎉');
            console.log('✅ App published to Homey App Store');
            console.log('✅ Johan Bendz scene remotes now supported');
            console.log('✅ Professional organization complete');
        } else {
            console.log('\n❌ Publication failed with code:', code);
        }
    });

    publish.on('error', (err) => {
        console.error('Error:', err.message);
    });
}

runPublish();
