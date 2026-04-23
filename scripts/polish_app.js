const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

/**
 * Task 1: Clean and Sort Changelogs
 */
function polishChangelogs() {
    console.log('--- Polishing Changelogs ---');
    const changelogJsonPath = path.join(projectRoot, '.homeychangelog.json');
    const changelogMdPath = path.join(projectRoot, 'CHANGELOG.md');

    if (fs.existsSync(changelogJsonPath)) {
        let changelogJson = JSON.parse(fs.readFileSync(changelogJsonPath, 'utf8'));
        
        // Ensure 7.2.0 is an object if it's just a string
        if (typeof changelogJson['7.2.0'] === 'string') {
            changelogJson['7.2.0'] = { en: changelogJson['7.2.0'] };
        }

        // Add 7.1.0 if missing (data from CHANGELOG.md)
        if (!changelogJson['7.1.0']) {
            changelogJson['7.1.0'] = {
                en: "Omni-Sync Architecture: Autonomous sync from Z2M & ZHA, Self-Healing Migration Queue, Enriched DP Parser."
            };
        }

        // Add 7.2.0 details if missing
        if (!changelogJson['7.2.0'] || !changelogJson['7.2.0'].en || changelogJson['7.2.0'].en.length < 50) {
            changelogJson['7.2.0'] = {
                en: "The Autonomous Awakening: Adaptive Lighting (Natural Light), Zigbee Radio Sensing (Presence), Smart High-Fidelity Gestures, and Engine Maintenance Orchestration for autonomous fleet healing."
            };
        }

        // Sort keys
        const sortedKeys = Object.keys(changelogJson).sort((a, b) => {
            const partsA = a.split('.').map(Number);
            const partsB = b.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
                if ((partsA[i] || 0) !== (partsB[i] || 0)) return (partsB[i] || 0) - (partsA[i] || 0);
            }
            return 0;
        });

        const sortedJson = {};
        for (const key of sortedKeys) {
            sortedJson[key] = changelogJson[key];
        }

        fs.writeFileSync(changelogJsonPath, JSON.stringify(sortedJson, null, 2));
        console.log(' .homeychangelog.json polished and sorted.');
    }

    if (fs.existsSync(changelogMdPath)) {
        let content = fs.readFileSync(changelogMdPath, 'utf8');
        // Simple deduplication of version headers (## [X.X.X])
        const lines = content.split('\n');
        const seenVersions = new Set();
        const newLines = [];
        let skipTillNextHeader = false;

        for (const line of lines) {
            const match = line.match(/^##\s*\[(\d+\.\d+\.\d+)\]/);
            if (match) {
                const ver = match[1];
                if (seenVersions.has(ver)) {
                    skipTillNextHeader = true;
                    continue;
                }
                seenVersions.add(ver);
                skipTillNextHeader = false;
            }
            if (!skipTillNextHeader) {
                newLines.push(line);
            }
        }
        
        // Final cleaning of multiple empty lines
        let cleaned = newLines.join('\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFileSync(changelogMdPath, cleaned);
        console.log(' CHANGELOG.md polished (duplicates removed).');
    }
}

/**
 * Task 2: Enrich Power Ratings
 */
function enrichPowerRatings() {
    console.log('--- Enriching Power Ratings ---');
    const driversDir = path.join(projectRoot, 'drivers');
    const drivers = fs.readdirSync(driversDir);

    for (const driverName of drivers) {
        const composePath = path.join(driversDir, driverName, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            let compose;
            try {
                compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            } catch (e) {
                console.error(`Error parsing ${composePath}: ${e.message}`);
                continue;
            }

            let changed = false;
            let newVal = undefined;

            // Logic based on driver name or class
            const isSwitch = driverName.includes('switch');
            const isBulb = driverName.includes('bulb') || driverName.includes('led_strip');
            const isPlug = driverName.includes('plug') || driverName.includes('socket');

            if (isBulb) {
                if (driverName.includes('rgbw') || driverName.includes('rgb_cct')) newVal = 9;
                else if (driverName.includes('rgb')) newVal = 6;
                else newVal = 9;
                if (driverName.includes('strip')) newVal = 12;
            } else if (isSwitch || driverName.includes('relay')) {
                if (driverName.includes('1gang') || driverName.includes('_1ch') || driverName === 'wifi_switch') newVal = 0.2;
                else if (driverName.includes('2gang') || driverName.includes('_2ch')) newVal = 0.4;
                else if (driverName.includes('3gang') || driverName.includes('_3ch')) newVal = 0.6;
                else if (driverName.includes('4gang') || driverName.includes('_4ch')) newVal = 0.8;
                else newVal = 0.2; // default 1gang
            } else if (isPlug) {
                newVal = 0.7;
            } else if (driverName.includes('presence_sensor_radar')) {
                newVal = 1.5;
            } else if (driverName.includes('curtain_motor')) {
                newVal = 1.0;
            }

            // Only update if we have a guess and it's missing or a default low value
            if (newVal !== undefined) {
                if (!compose.energy) compose.energy = {};
                if (!compose.energy.approximation) compose.energy.approximation = {};
                
                if (isBulb || driverName.includes('curtain') || driverName.includes('radar')) {
                    // Constant usage for these (usually)
                    if (!compose.energy.approximation.usageConstant || compose.energy.approximation.usageConstant === 0.5 || compose.energy.approximation.usageConstant === 0.1) {
                        compose.energy.approximation.usageConstant = newVal;
                        changed = true;
                    }
                } else if (isSwitch || isPlug) {
                    // On/Off usage for switches/plugs - FORCE compliance
                    if (compose.energy.approximation.usageOff !== newVal || compose.energy.approximation.usageOn !== 100 || compose.energy.approximation.usageConstant !== undefined) {
                        compose.energy.approximation.usageOff = newVal; // standby
                        compose.energy.approximation.usageOn = 100;    // load
                        delete compose.energy.approximation.usageConstant;
                        changed = true;
                    }
                }
            }

            // Cleanup empty approximation/energy blocks to keep schema valid
            if (compose.energy && compose.energy.approximation) {
                // If it's NOT a switch/plug, usageOn/Off are usually invalid unless it has onoff capability
                const hasOnOff = compose.capabilities && compose.capabilities.includes('onoff');
                if (!hasOnOff && (isBulb || driverName.includes('curtain') || driverName.includes('radar'))) {
                    delete compose.energy.approximation.usageOn;
                    delete compose.energy.approximation.usageOff;
                    changed = true;
                }

                if (Object.keys(compose.energy.approximation).length === 0) {
                    delete compose.energy.approximation;
                    changed = true;
                }
            }
            if (compose.energy && Object.keys(compose.energy).length === 0) {
                delete compose.energy;
                changed = true;
            }

            // v7.2.6: Fix zigbee.manufacturerName objects (Homey SDK 3 requirement: strings only)
            if (compose.zigbee && Array.isArray(compose.zigbee.manufacturerName)) {
                let mChanged = false;
                const newNames = compose.zigbee.manufacturerName.map(m => {
                    if (typeof m === 'object' && m.manufacturerName) {
                        mChanged = true;
                        return m.manufacturerName;
                    }
                    return m;
                });
                if (mChanged) {
                    compose.zigbee.manufacturerName = [...new Set(newNames)];
                    changed = true;
                }
            }

            // Fix battery/mains logic for bulbs
            if (driverName.includes('bulb') || driverName.includes('led_strip')) {
                if (compose.energy.batteries) {
                    delete compose.energy.batteries;
                    changed = true;
                }
                if (compose.energy.mains !== true) {
                    compose.energy.mains = true;
                    changed = true;
                }
            }

            // v7.2.2: Add Intelligent Feature Settings
            if (!compose.settings) compose.settings = [];
            
            // 1. Natural Light (for lights)
            if (driverName.includes('bulb') || driverName.includes('led_strip')) {
                if (!compose.settings.find(s => s.id === 'enable_natural_light')) {
                    compose.settings.push({
                        "id": "enable_natural_light",
                        "type": "checkbox",
                        "label": {
                            "en": "Enable Natural Light (Solar Sync)",
                            "fr": "Activer la LumiÃ¨re Naturelle (Synchro Solaire)"
                        },
                        "value": false,
                        "hint": {
                            "en": "Automatically adjust color temperature based on time of day",
                            "fr": "Ajuste automatiquement la tempÃ©rature de couleur au fil de la journÃ©e"
                        }
                    });
                    changed = true;
                }
            }

            // 2. Radio Presence Sensing (for mains devices)
            if (compose.energy && compose.energy.mains === true) {
                if (!compose.settings.find(s => s.id === 'enable_radio_sensing')) {
                    compose.settings.push({
                        "id": "enable_radio_sensing",
                        "type": "checkbox",
                        "label": {
                            "en": "Enable Radio Presence Sensing",
                            "fr": "Activer la DÃ©tection de PrÃ©sence Radio"
                        },
                        "value": false,
                        "hint": {
                            "en": "Infer presence from Zigbee signal fluctuations (BETA)",
                            "fr": "DÃ©duit la prÃ©sence des fluctuations du signal Zigbee (BETA)"
                        }
                    });
                    changed = true;
                }
                
                if (!compose.settings.find(s => s.id === 'radio_sensitivity')) {
                    compose.settings.push({
                        "id": "radio_sensitivity",
                        "type": "number",
                        "label": {
                            "en": "Radio Presence Sensitivity",
                            "fr": "SensibilitÃ© PrÃ©sence Radio"
                        },
                        "value": 15,
                        "min": 5,
                        "max": 50,
                        "hint": {
                            "en": "LQI variance threshold (higher = less sensitive)",
                            "fr": "Seuil de variance LQI (plus haut = moins sensible)"
                        }
                    });
                    changed = true;
                }
            }
            
            // 3. Smart Feature Emulation (for ALL devices)
            const smartFeatureSettings = [
                {
                    "id": "enable_software_child_lock",
                    "type": "checkbox",
                    "label": { "en": "Software Child Lock", "fr": "SÃ©curitÃ© Enfant Logicielle" },
                    "value": false,
                    "hint": { "en": "Prevents manual state changes on the device", "fr": "EmpÃªche les changements d'Ã©tat manuels sur l'appareil" }
                },
                {
                    "id": "auto_off_duration",
                    "type": "number",
                    "label": { "en": "Auto-Off Timer (Minutes)", "fr": "Minuterie Auto-Off (Minutes)" },
                    "value": 0,
                    "min": 0,
                    "max": 1440,
                    "hint": { "en": "Turn off automatically after X minutes (0 = disabled)", "fr": "S'Ã©teint aprÃ¨s X minutes (0 = dÃ©sactivÃ©)" }
                },
                {
                    "id": "enable_vacation_mode",
                    "type": "checkbox",
                    "label": { "en": "Vacation Mode (Presence Sim)", "fr": "Mode Vacances (Simulation PrÃ©sence)" },
                    "value": false,
                    "hint": { "en": "Randomly toggle device during evenings to simulate presence", "fr": "Actionne l'appareil alÃ©atoirement le soir pour simuler une prÃ©sence" }
                },
                {
                    "id": "emulated_motion_hold",
                    "type": "number",
                    "label": { "en": "Emulated Motion Hold (Seconds)", "fr": "Maintien Mouvement Ã‰mulÃ© (Secondes)" },
                    "value": 0,
                    "min": 0,
                    "max": 3600,
                    "hint": { "en": "Keep motion 'ON' for X seconds after hardware clears", "fr": "Garde le mouvement 'ON' pendant X secondes aprÃ¨s le reset matÃ©riel" }
                },
                {
                    "id": "double_click_interval",
                    "type": "number",
                    "label": { "en": "Double Click Interval (ms)", "fr": "Intervalle Double-Clic (ms)" },
                    "value": 400,
                    "min": 100,
                    "max": 1000,
                    "hint": { "en": "Software emulation for single-action buttons", "fr": "Ã‰mulation logicielle pour boutons Ã action unique" }
                },
                {
                    "id": "inching_duration",
                    "type": "number",
                    "label": { "en": "Inching Duration (Secs)", "fr": "DurÃ©e Inching (Secondes)" },
                    "value": 0,
                    "min": 0,
                    "max": 60,
                    "step": 0.1,
                    "hint": { "en": "Automatically turn off after X seconds (Pulse mode)", "fr": "S'Ã©teint automatiquement aprÃ¨s X secondes (mode Impulsion)" }
                },
                {
                    "id": "enable_state_recovery",
                    "type": "checkbox",
                    "label": { "en": "Software State Recovery", "fr": "RÃ©cupÃ©ration d'Ã‰tat Logicielle" },
                    "value": false,
                    "hint": { "en": "Restore previous ON/OFF state after power failure", "fr": "Restore l'Ã©tat prÃ©cÃ©dent aprÃ¨s une coupure de courant" }
                },
                {
                    "id": "enable_soft_transitions",
                    "type": "checkbox",
                    "label": { "en": "Soft transitions (Fade)", "fr": "Transitions douces (Fade)" },
                    "value": false,
                    "hint": { "en": "Enable software-simulated smooth transitions (Lights/Dim)", "fr": "Active les transitions douces simulÃ©es (LumiÃ¨res/Variateurs)" }
                },
                {
                    "id": "maintenance_threshold",
                    "type": "number",
                    "label": { "en": "Maintenance Alert Threshold", "fr": "Seuil Alerte Maintenance" },
                    "value": 30,
                    "min": 0,
                    "max": 100,
                    "hint": { "en": "Alert if health score drops below this value", "fr": "Alerte si le score de santÃ© descend sous cette valeur" }
                }
            ];
            
            // Special Settings for Lights
            if (driverName.includes('bulb') || driverName.includes('led_strip')) {
                smartFeatureSettings.push({
                    "id": "enable_circadian_lighting",
                    "type": "checkbox",
                    "label": { "en": "Circadian Lighting (Adaptive CT)", "fr": "Ã‰clairage Circadien (CT Adaptatif)" },
                    "value": false,
                    "hint": { "en": "Automatically adjust color temperature based on time of day", "fr": "Ajuste automatiquement la tempÃ©rature de couleur au cours de la journÃ©e" }
                });
            }

            // Special Settings for Climate
            if (driverName.includes('thermostat') || driverName.includes('radiator') || driverName.includes('climate')) {
                smartFeatureSettings.push({
                    "id": "enable_tpi_regulation",
                    "type": "checkbox",
                    "label": { "en": "Adaptive TPI Regulation", "fr": "RÃ©gulation TPI Adaptative" },
                    "value": false,
                    "hint": { "en": "Use advanced software-based heating cycles (more precise)", "fr": "Utilise des cycles de chauffe logiciels avancÃ©s (plus prÃ©cis)" }
                });
            }
            
            // Special Settings for Mains
            if (compose.energy && compose.energy.mains === true) {
                smartFeatureSettings.push({
                    "id": "overload_threshold",
                    "type": "number",
                    "label": { "en": "Overload Protection (Watts)", "fr": "Protection Surcharge (Watts)" },
                    "value": 0,
                    "min": 0,
                    "max": 4000,
                    "hint": { "en": "Cut power if consumption exceeds this value (0 = disabled)", "fr": "Coupure si la consommation dÃ©passe cette valeur (0 = dÃ©sactivÃ©)" }
                });
            }

            if (driverName.includes('bulb') || driverName.includes('led_strip')) {
                smartFeatureSettings.push({
                    "id": "enable_night_mode",
                    "type": "checkbox",
                    "label": { "en": "Night Mode (Auto-Dim)", "fr": "Mode Nuit (Auto-Dim)" },
                    "value": false,
                    "hint": { "en": "Automatically dim light when turned on at night", "fr": "Baisse l'intensitÃ© lors de l'allumage nocturne" }
                });
            }

            smartFeatureSettings.forEach(setting => {
                if (!compose.settings.find(s => s.id === setting.id)) {
                    compose.settings.push(setting);
                    changed = true;
                }
            });

            // 4. Intelligent Health Capabilities (for ALL devices)
            if (!compose.capabilities) compose.capabilities = [];
            const healthCaps = ['measure_radio_stability', 'measure_maintenance_score'];
            healthCaps.forEach(cap => {
                if (!compose.capabilities.includes(cap)) {
                    compose.capabilities.push(cap);
                    changed = true;
                }
            });

            if (changed) {
                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                // console.log(` ${driverName}: power=${newVal}W`);
            }
        }
    }
    console.log(' All driver energy profiles enriched.');
}

/**
 * Task 3: Fix Sync Script
 */
function fixSyncScript() {
    const syncScriptPath = path.join(projectRoot, 'scripts/automation/sync-changelog-readme.js');
    if (fs.existsSync(syncScriptPath)) {
        let content = fs.readFileSync(syncScriptPath, 'utf8');
        
        // Fix the sorting logic to be safer
        const newSort = `  .sort((a, b) => {
    const partsA = a.split('.').map(v => parseInt(v , 10) || 0);
    const partsB = b.split('.').map(v => parseInt(v , 10) || 0);
    for (let i = 0; i < 3; i++) {
        if (partsA[i] !== partsB[i]) return partsB[i] - partsA[i];
    }
    return 0;
  })`;
        
        content = content.replace(/\.sort\(\(a, b\) => \{[\s\S]*? \}\)/, newSort)      ;
        
        // Fix the table header and versioning
        content = content.replace("| Version | Feature |", "| Version | Changes |" );
        
        fs.writeFileSync(syncScriptPath, content);
        console.log(' sync-changelog-readme.js script fixed.');
    }
}

// Execute
polishChangelogs();
enrichPowerRatings();
fixSyncScript();
console.log('--- ALL POLISHING TASKS COMPLETED ---');
