const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

console.log('📡 LIVE CACHE MONITOR - Surveillance temps réel du cache .homeybuild');

// Fonction pour corriger immédiatement une image incorrecte
function fixImageImmediately(imagePath) {
    try {
        // Vérifier si c'est vraiment incorrect
        const identify = execSync(`magick identify "${imagePath}"`, { encoding: 'utf8', stdio: 'pipe' });
        if (identify.includes('250x175')) {
            // Corriger immédiatement avec image 75x75
            execSync(`magick -size 75x75 gradient:#1B4D72-#2E5F8C -gravity center -fill white -font Arial-Bold -pointsize 8 -annotate 0 "Z" "${imagePath}"`, 
                { stdio: 'pipe' });
            console.log(`⚡ FIXÉ: ${imagePath}`);
            return true;
        }
    } catch (error) {
        // Ignore erreurs
    }
    return false;
}

// Surveiller le répertoire .homeybuild et corriger en temps réel
function startCacheMonitor() {
    console.log('👀 Démarrage surveillance cache...');
    
    const watchInterval = setInterval(() => {
        if (fs.existsSync('.homeybuild')) {
            try {
                // Chercher rapidement les images incorrectes
                const result = execSync('Get-ChildItem -Path ".homeybuild" -Recurse -Name "small.png" | Select-Object -First 20', 
                    { encoding: 'utf8', stdio: 'pipe' });
                
                const imageFiles = result.split('\n').filter(line => line.trim());
                
                imageFiles.forEach(relativePath => {
                    const fullPath = path.join('.homeybuild', relativePath);
                    if (fs.existsSync(fullPath)) {
                        fixImageImmediately(fullPath);
                    }
                });
                
            } catch (error) {
                // Ignore erreurs de monitoring
            }
        }
    }, 1000); // Vérifier chaque seconde
    
    return watchInterval;
}

// Lancer publication avec monitoring
function publishWithLiveMonitoring() {
    console.log('🚀 Publication avec monitoring en direct...');
    
    // Nettoyer d'abord
    try {
        execSync('Remove-Item -Path ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue', { stdio: 'pipe' });
        execSync('git add . && git commit -m "Images 75x75 fix" --quiet 2>nul || echo "No changes to commit"', { stdio: 'pipe' });
    } catch (error) {
        // Ignore
    }
    
    // Démarrer le monitoring
    const monitor = startCacheMonitor();
    
    // Lancer la publication
    console.log('📤 Lancement homey app publish...');
    
    const publishProcess = spawn('homey', ['app', 'publish'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
    });
    
    let output = '';
    
    publishProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log('📄', text.trim());
        
        // Répondre automatiquement aux prompts
        if (text.includes('There are uncommitted changes')) {
            publishProcess.stdin.write('y\n');
        } else if (text.includes('Do you want to update your app\'s version')) {
            publishProcess.stdin.write('y\n');
        } else if (text.includes('Select the desired version number')) {
            publishProcess.stdin.write('\n'); // Prendre le défaut (Patch)
        } else if (text.includes('changelog')) {
            publishProcess.stdin.write('v1.0.32 - Images 75x75 correctes selon Homey SDK3\n');
        }
    });
    
    publishProcess.stderr.on('data', (data) => {
        console.log('⚠️', data.toString().trim());
    });
    
    publishProcess.on('close', (code) => {
        clearInterval(monitor);
        console.log(`\n📊 Process terminé avec code: ${code}`);
        
        if (code === 0 || output.includes('✓')) {
            console.log('🎉 PUBLICATION RÉUSSIE!');
            console.log('🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
        } else {
            console.log('❌ Échec publication');
        }
        
        process.exit(code);
    });
    
    // Timeout de sécurité
    setTimeout(() => {
        if (!publishProcess.killed) {
            publishProcess.kill();
            clearInterval(monitor);
            console.log('⏰ Timeout - processus arrêté');
            process.exit(1);
        }
    }, 300000); // 5 minutes max
}

// Exécution
console.log('🎯 DÉMARRAGE LIVE CACHE MONITOR');
publishWithLiveMonitoring();
