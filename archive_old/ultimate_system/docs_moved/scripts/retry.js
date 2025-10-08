const { spawn, execSync } = require('child_process');
const fs = require('fs');

let attempt = 1;

function retry() {
    console.log(`🔄 ${attempt}`);
    
    // Clean cache
    if (fs.existsSync('.homeycompose')) {
        execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
    }
    
    // Auto publish
    const homey = spawn('npx', ['homey', 'app', 'publish'], {stdio: ['pipe', 'pipe', 'pipe'], shell: true});
    
    homey.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(text.trim());
        
        if (text.includes('version')) homey.stdin.write('n\n');
        if (text.includes('changelog')) homey.stdin.write('Complete IDs + UNBRANDED\n');
        if (text.includes('publish')) homey.stdin.write('y\n');
    });
    
    homey.on('close', (code) => {
        if (code === 0) {
            execSync('git add -A && git commit -m "Published" && git push origin master');
            console.log('✅ SUCCESS');
        } else {
            attempt++;
            if (attempt <= 20) setTimeout(retry, 60000);
        }
    });
}

retry();
