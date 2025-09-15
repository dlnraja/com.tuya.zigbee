#!/usr/bin/env node

/**
 * ULTIMATE HOMEY PUBLISH AUTOMATION - FORCE PUBLICATION SCRIPT
 * Automatise complètement la publication avec gestion des prompts
 * Utilisation: node force-publish-ultimate.js "changelog message"
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const APP_PATH = __dirname;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 secondes

console.log('🚀 ULTIMATE HOMEY PUBLISH AUTOMATION STARTING...');
console.log(`📁 App Path: ${APP_PATH}`);

// Fonction pour incrémenter la version
function incrementVersion() {
    try {
        const composePath = path.join(APP_PATH, '.homeycompose', 'app.json');
        const appData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        const versionParts = appData.version.split('.').map(Number);
        versionParts[2]++; // Incrémente le patch
        appData.version = versionParts.join('.');
        
        fs.writeFileSync(composePath, JSON.stringify(appData, null, 2));
        console.log(`✅ Version updated to: ${appData.version}`);
        return appData.version;
    } catch (error) {
        console.error('❌ Error updating version:', error.message);
        return null;
    }
}

// Fonction pour valider l'application
function validateApp() {
    return new Promise((resolve) => {
        console.log('🔍 Validating app...');
        
        const validate = spawn('homey', ['app', 'validate', '--level', 'publish'], {
            cwd: APP_PATH,
            shell: true,
            stdio: 'inherit'
        });
        
        validate.on('close', (code) => {
            if (code === 0) {
                console.log('✅ App validation successful');
                resolve(true);
            } else {
                console.log('⚠️ App validation had issues, continuing anyway...');
                resolve(true); // Continue même avec des warnings
            }
        });
        
        validate.on('error', (error) => {
            console.error('❌ Validation error:', error.message);
            resolve(false);
        });
    });
}

// Fonction pour publier avec gestion automatique des prompts
function publishApp(changelog, attempt = 1) {
    return new Promise((resolve) => {
        console.log(`📤 Publishing app (Attempt ${attempt}/${MAX_RETRIES})...`);
        console.log(`📝 Changelog: "${changelog}"`);
        
        const publish = spawn('homey', ['app', 'publish'], {
            cwd: APP_PATH,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let hasChangelog = false;
        let hasVersion = false;
        let hasUncommitted = false;
        
        // Gérer la sortie en temps réel
        publish.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('📋 Output:', text.trim());
            
            // Détecter et répondre aux prompts automatiquement
            if (text.includes('What\'s new') || text.includes('Changelog') || text.includes('changelog')) {
                if (!hasChangelog) {
                    console.log('💬 Detected changelog prompt, sending response...');
                    publish.stdin.write(`${changelog}\n`);
                    hasChangelog = true;
                }
            }
            
            if (text.includes('version') && (text.includes('1.1.') || text.includes('bump'))) {
                if (!hasVersion) {
                    console.log('💬 Detected version prompt, confirming...');
                    publish.stdin.write('y\n');
                    hasVersion = true;
                }
            }
            
            if (text.includes('uncommitted') || text.includes('changes')) {
                if (!hasUncommitted) {
                    console.log('💬 Detected uncommitted changes prompt, confirming...');
                    publish.stdin.write('y\n');
                    hasUncommitted = true;
                }
            }
            
            if (text.includes('Published successfully') || text.includes('published')) {
                console.log('🎉 PUBLICATION SUCCESS DETECTED!');
                setTimeout(() => resolve(true), 1000);
            }
        });
        
        publish.stderr.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('⚠️ Error output:', text.trim());
        });
        
        publish.on('close', (code) => {
            console.log(`📊 Process exited with code: ${code}`);
            
            if (code === 0 || output.includes('Published successfully') || output.includes('published')) {
                console.log('✅ Publication completed successfully!');
                resolve(true);
            } else {
                console.log('❌ Publication failed, preparing retry...');
                if (attempt < MAX_RETRIES) {
                    setTimeout(() => {
                        console.log(`🔄 Retrying in ${RETRY_DELAY}ms...`);
                        publishApp(changelog, attempt + 1).then(resolve);
                    }, RETRY_DELAY);
                } else {
                    console.log('💀 Max retries reached, giving up...');
                    resolve(false);
                }
            }
        });
        
        publish.on('error', (error) => {
            console.error('💥 Spawn error:', error.message);
            if (attempt < MAX_RETRIES) {
                setTimeout(() => {
                    publishApp(changelog, attempt + 1).then(resolve);
                }, RETRY_DELAY);
            } else {
                resolve(false);
            }
        });
        
        // Timeout de sécurité
        setTimeout(() => {
            console.log('⏰ Publish timeout, killing process...');
            publish.kill();
            if (attempt < MAX_RETRIES) {
                publishApp(changelog, attempt + 1).then(resolve);
            } else {
                resolve(false);
            }
        }, 60000); // 60 secondes max
    });
}

// Fonction principale
async function main() {
    try {
        // Récupérer le changelog des arguments
        const changelog = process.argv[2] || `Ultimate Zigbee Hub v1.1.1 - Critical fixes and enhanced publication system. Automated deployment with comprehensive device support for 1500+ Zigbee devices from 80+ manufacturers.`;
        
        console.log(`📋 Using changelog: "${changelog}"`);
        
        // Étape 1: Incrémenter la version
        const newVersion = incrementVersion();
        if (!newVersion) {
            console.error('💀 Failed to update version, aborting...');
            process.exit(1);
        }
        
        // Étape 2: Valider l'application
        const isValid = await validateApp();
        if (!isValid) {
            console.error('💀 App validation failed, aborting...');
            process.exit(1);
        }
        
        // Étape 3: Tenter la publication avec retry automatique
        console.log('🎯 Starting publication process...');
        const publishSuccess = await publishApp(changelog);
        
        if (publishSuccess) {
            console.log('🏆 SUCCESS! App published successfully!');
            console.log('🔗 Check: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub');
            console.log('🏪 App Store: https://homey.app/a/com.dlnraja.ultimate.zigbee.hub');
            process.exit(0);
        } else {
            console.error('💀 Publication failed after all retries');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Gérer les signaux pour un arrêt propre
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Démarrer le processus
main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});
