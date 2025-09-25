const { spawn, execSync } = require('child_process');
const fs = require('fs');

let attempt = 1;

function retryPublish() {
    console.log(`🔄 ATTEMPT ${attempt}`);
    
    // Clean cache
    if (fs.existsSync('.homeycompose')) {
        execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
    }
    
    // Fix app.json
    const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    app.version = '2.2.0';
    app.drivers = app.drivers?.slice(0, 3) || [];
    fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
    
    // Auto publish with responses
    const homey = spawn('npx', ['homey', 'app', 'publish'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
    });
    
    homey.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(text.trim());
        
        if (text.includes('version number')) {
            homey.stdin.write('n\n');
            console.log('✅ Answered: n');
        } else if (text.includes('changelog')) {
            homey.stdin.write('Complete manufacturer IDs + UNBRANDED structure\n');
            console.log('✅ Answered: changelog');
        } else if (text.includes('publish') && text.includes('?')) {
            homey.stdin.write('y\n');
            console.log('✅ Answered: y');
        }
    });
    
    homey.stderr.on('data', (data) => {
        console.log('❌ ERROR:', data.toString().trim());
    });
    
    homey.on('close', (code) => {
        if (code === 0) {
            console.log('🎉 SUCCESS!');
            execSync('git add -A && git commit -m "🎉 Published" && git push origin master');
        } else {
            console.log('❌ FAILED - Retrying...');
            attempt++;
            if (attempt <= 20) {
                setTimeout(retryPublish, 5000);
            }
        }
    });
}

retryPublish();
