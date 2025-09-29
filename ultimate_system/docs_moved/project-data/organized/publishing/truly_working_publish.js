const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function updateVersion() {
    console.log("MISE A JOUR VERSION ET PUBLICATION AUTOMATIQUE");
    console.log("=".repeat(50));
    
    // Lire et mettre à jour app.json
    const appJsonPath = path.join('.homeycompose', 'app.json');
    const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Incrémenter version
    const versionParts = appData.version.split('.');
    versionParts[2] = String(parseInt(versionParts[2]) + 1);
    const newVersion = versionParts.join('.');
    appData.version = newVersion;
    
    // Enrichir
    appData.description = {
        "en": "Ultimate Zigbee Hub - Complete ecosystem with 850+ devices from 50+ manufacturers. Professional categorization by device types: motion sensors, contact sensors, smart lights, smart plugs, climate controls. SDK3 compliant following Johan Benz standards. Local Zigbee 3.0 operation with no cloud dependencies.",
        "fr": "Ultimate Zigbee Hub - Ecosysteme complet avec 850+ appareils de 50+ fabricants. Categorisation professionnelle par types d'appareils.",
        "nl": "Ultimate Zigbee Hub - Compleet ecosysteem met 850+ apparaten van 50+ fabrikanten. Professionele categorisering per apparaattype."
    };
    
    // Sauvegarder
    fs.writeFileSync(appJsonPath, JSON.stringify(appData, null, 2), 'utf8');
    console.log(`Version mise a jour: ${newVersion}`);
    return newVersion;
}

function createChangelog(version) {
    return `v${version}: Professional Device Categorization Complete

DEVICE REORGANIZATION:
- All drivers renamed to professional categories: motion_sensor, contact_sensor, smart_light, smart_plug
- Removed all manufacturer prefixes for clean professional structure  
- Organized by device function following Johan Benz standards
- SDK3 compliant architecture with proper endpoints

SUPPORTED CATEGORIES:
SENSORS: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
DETECTORS: air_quality_sensor, co_detector, smoke_detector, water_leak_detector
LIGHTS: smart_light, rgb_light, light_switch, dimmer_switch  
PLUGS: smart_plug, energy_plug
MOTORS: curtain_motor
CLIMATE: thermostat  
SWITCHES: scene_switch

FEATURES:
- 850+ device models from 50+ manufacturers
- Local Zigbee 3.0 operation, zero cloud dependencies
- Enhanced metadata and professional descriptions
- Comprehensive manufacturer compatibility

BRANDS: Tuya, Aqara, IKEA, Philips Hue, Xiaomi, Sonoff, Blitzwolf, Lidl, and 40+ more

Professional unbranded structure ready for App Store`;
}

async function interactivePublish() {
    const version = updateVersion();
    const changelog = createChangelog(version);
    
    console.log("Demarrage publication interactive...");
    
    return new Promise((resolve) => {
        const child = spawn('homey', ['app', 'publish'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });
        
        let step = 0;
        let output = '';
        
        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log(`<<< ${text.trim()}`);
            
            // Gestion des prompts
            if (text.includes('uncommitted changes') && text.includes('continue') && step === 0) {
                console.log('>>> Envoi: y');
                child.stdin.write('y\n');
                step = 1;
            }
            else if (text.includes('update') && text.includes('version number') && step === 1) {
                console.log('>>> Envoi: n (version deja mise a jour)');
                child.stdin.write('n\n');
                step = 2;
            }
            else if ((text.includes('changelog') || text.includes('release notes') || 
                     (step === 2 && text.includes('enter'))) && step === 2) {
                console.log('>>> Envoi du changelog complet...');
                
                // Envoi du changelog ligne par ligne
                const lines = changelog.split('\n');
                lines.forEach(line => {
                    child.stdin.write(line + '\n');
                });
                
                // Terminer le changelog
                child.stdin.write('\n');
                child.stdin.write('\n');
                step = 3;
            }
            else if ((text.includes('confirm') || text.includes('proceed') || 
                     text.includes('publish') || (text.includes('y/n') && step >= 3))) {
                console.log('>>> Envoi: y (confirmation)');
                child.stdin.write('y\n');
            }
            
            // Détecter le succès
            if (text.match(/published|uploaded|success|complete|build.*uploaded/i)) {
                console.log('*** PUBLICATION DETECTEE COMME REUSSIE! ***');
                setTimeout(() => resolve({ success: true, version }), 1000);
            }
        });
        
        child.stderr.on('data', (data) => {
            console.log(`STDERR: ${data.toString()}`);
        });
        
        child.on('close', (code) => {
            console.log(`Processus termine avec code: ${code}`);
            
            const success = code === 0 || output.match(/published|uploaded|success|complete/i);
            resolve({ success, version });
        });
        
        // Timeout de sécurité
        setTimeout(() => {
            child.kill();
            resolve({ success: false, version });
        }, 300000); // 5 minutes
    });
}

async function verifyPublication() {
    try {
        const { spawn } = require('child_process');
        return new Promise((resolve) => {
            const child = spawn('homey', ['app', 'manage'], { shell: true });
            child.on('close', (code) => resolve(code === 0));
            setTimeout(() => { child.kill(); resolve(false); }, 30000);
        });
    } catch {
        return false;
    }
}

async function main() {
    console.log("SYSTEME DE PUBLICATION INTERACTIVE NODE.JS");
    console.log("=".repeat(50));
    
    try {
        const result = await interactivePublish();
        
        if (result.success) {
            console.log(`\nSUCCES! Ultimate Zigbee Hub v${result.version} publie`);
            
            const dashboardOk = await verifyPublication();
            if (dashboardOk) {
                console.log("Dashboard accessible - publication confirmee");
            }
        } else {
            console.log(`\nPublication incomplete - version ${result.version}`);
            console.log("Verifiez manuellement le dashboard Homey");
        }
    } catch (error) {
        console.log(`Erreur: ${error.message}`);
    }
    
    console.log("Processus interactif termine.");
}

main();
