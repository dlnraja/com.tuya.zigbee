const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 HOMEY INTERACTIVE PUBLISH');
console.log('📊 Responding dynamically to Homey CLI questions\n');

// Read current app configuration for smart answers
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
console.log(`📱 Current version: ${app.version}`);
console.log(`🆔 App ID: ${app.id}`);
console.log(`📝 Name: ${JSON.stringify(app.name)}`);

// Launch interactive publish
const homeyProcess = spawn('homey', ['app', 'publish'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
});

let questionCount = 0;

homeyProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📤 Homey CLI:', output.trim());
    
    // Detect and respond to questions
    if (output.includes('version number')) {
        questionCount++;
        console.log('🔄 Question 1: Version update');
        // Based on Memory 6bf7acba: v2.2.0 optimized
        homeyProcess.stdin.write('n\n'); // Keep current version 2.2.0
        console.log('✅ Answer: n (keep v2.2.0)');
        
    } else if (output.includes('changelog') || output.includes('changes')) {
        questionCount++;
        console.log('🔄 Question 2: Changelog');
        const changelog = 'Complete manufacturer IDs + UNBRANDED structure + 159 drivers optimized';
        homeyProcess.stdin.write(changelog + '\n');
        console.log('✅ Answer: Changelog written');
        
    } else if (output.includes('publish') && output.includes('?')) {
        questionCount++;
        console.log('🔄 Question 3: Confirm publish');
        homeyProcess.stdin.write('y\n'); // Yes, publish
        console.log('✅ Answer: y (confirm publish)');
        
    } else if (output.includes('category') || output.includes('categories')) {
        questionCount++;
        console.log('🔄 Question 4: Category');
        // Based on Memory 6bf7acba: category tools
        homeyProcess.stdin.write('tools\n');
        console.log('✅ Answer: tools');
        
    } else if (output.includes('tags') || output.includes('tag')) {
        questionCount++;
        console.log('🔄 Question 5: Tags');
        const tags = 'zigbee tuya universal unbranded automation';
        homeyProcess.stdin.write(tags + '\n');
        console.log('✅ Answer: Tags set');
        
    } else if (output.includes('description')) {
        questionCount++;
        console.log('🔄 Question 6: Description');
        // Based on Memory 9f7be57a: UNBRANDED approach
        const description = 'Universal Zigbee Hub - Device compatibility organized by function, not brand';
        homeyProcess.stdin.write(description + '\n');
        console.log('✅ Answer: UNBRANDED description');
        
    } else if (output.includes('price') || output.includes('free')) {
        questionCount++;
        console.log('🔄 Question 7: Price');
        homeyProcess.stdin.write('0\n'); // Free app
        console.log('✅ Answer: 0 (free)');
        
    } else if (output.includes('Continue') || output.includes('continue')) {
        questionCount++;
        console.log('🔄 Question: Continue');
        homeyProcess.stdin.write('y\n');
        console.log('✅ Answer: y (continue)');
    }
});

homeyProcess.stderr.on('data', (data) => {
    console.log('⚠️ Error:', data.toString().trim());
});

homeyProcess.on('close', (code) => {
    console.log(`\n🎯 PUBLISH COMPLETED`);
    console.log(`📊 Exit code: ${code}`);
    console.log(`❓ Questions answered: ${questionCount}`);
    
    if (code === 0) {
        console.log('✅ SUCCESS: App published to Homey App Store!');
        console.log('🔗 Check: https://apps.developer.homey.app/app-store/publishing');
    } else {
        console.log('❌ FAILED: Publication incomplete');
        console.log('🔧 May need manual intervention');
    }
});

console.log('⏰ Waiting for Homey CLI questions...\n');
