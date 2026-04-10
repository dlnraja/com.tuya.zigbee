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
                en: "The Autonomous Awakening: Adaptive Lighting (Natural Light), Zigbee Radio Sensing (Presence), Smart High-Fidelity Gestures, and Nexus Maintenance Orchestration for autonomous fleet healing."
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
        console.log('✅ .homeychangelog.json polished and sorted.');
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
        console.log('✅ CHANGELOG.md polished (duplicates removed).');
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
            if (!compose.energy) compose.energy = {};
            if (!compose.energy.approximation) compose.energy.approximation = {};

            const oldVal = compose.energy.approximation.usageConstant;
            let newVal = oldVal;

            // Logic based on driver name or class
            if (driverName.includes('bulb_rgbw') || driverName.includes('bulb_rgb_cct')) {
                newVal = 9;
            } else if (driverName.includes('bulb_rgb')) {
                newVal = 6;
            } else if (driverName.includes('bulb_tunable_white') || driverName.includes('bulb_white')) {
                newVal = 9;
            } else if (driverName.includes('led_strip')) {
                newVal = 12;
            } else if (driverName.includes('switch_1gang')) {
                newVal = 0.2;
            } else if (driverName.includes('switch_2gang')) {
                newVal = 0.4;
            } else if (driverName.includes('switch_3gang')) {
                newVal = 0.6;
            } else if (driverName.includes('switch_4gang')) {
                newVal = 0.8;
            } else if (driverName.includes('plug')) {
                newVal = 0.7;
            } else if (driverName.includes('presence_sensor_radar')) {
                newVal = 1.5;
            } else if (driverName.includes('curtain_motor')) {
                newVal = 1.0;
            }

            // Only update if it was default/low (0.5 or missing) or if we have a better guess
            if (newVal !== undefined && (oldVal === undefined || oldVal === 0.5 || oldVal === 0.1)) {
                compose.energy.approximation.usageConstant = newVal;
                changed = true;
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
                            "fr": "Activer la Lumière Naturelle (Synchro Solaire)"
                        },
                        "value": false,
                        "hint": {
                            "en": "Automatically adjust color temperature based on time of day",
                            "fr": "Ajuste automatiquement la température de couleur au fil de la journée"
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
                            "fr": "Activer la Détection de Présence Radio"
                        },
                        "value": false,
                        "hint": {
                            "en": "Infer presence from Zigbee signal fluctuations (BETA)",
                            "fr": "Déduit la présence des fluctuations du signal Zigbee (BETA)"
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
                            "fr": "Sensibilité Présence Radio"
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
                    "label": { "en": "Software Child Lock", "fr": "Sécurité Enfant Logicielle" },
                    "value": false,
                    "hint": { "en": "Prevents manual state changes on the device", "fr": "Empêche les changements d'état manuels sur l'appareil" }
                },
                {
                    "id": "auto_off_duration",
                    "type": "number",
                    "label": { "en": "Auto-Off Timer (Minutes)", "fr": "Minuterie Auto-Off (Minutes)" },
                    "value": 0,
                    "min": 0,
                    "max": 1440,
                    "hint": { "en": "Turn off automatically after X minutes (0 = disabled)", "fr": "S'éteint après X minutes (0 = désactivé)" }
                },
                {
                    "id": "enable_vacation_mode",
                    "type": "checkbox",
                    "label": { "en": "Vacation Mode (Presence Sim)", "fr": "Mode Vacances (Simulation Présence)" },
                    "value": false,
                    "hint": { "en": "Randomly toggle device during evenings to simulate presence", "fr": "Actionne l'appareil aléatoirement le soir pour simuler une présence" }
                },
                {
                    "id": "emulated_motion_hold",
                    "type": "number",
                    "label": { "en": "Emulated Motion Hold (Seconds)", "fr": "Maintien Mouvement Émulé (Secondes)" },
                    "value": 0,
                    "min": 0,
                    "max": 3600,
                    "hint": { "en": "Keep motion 'ON' for X seconds after hardware clears", "fr": "Garde le mouvement 'ON' pendant X secondes après le reset matériel" }
                },
                {
                    "id": "double_click_interval",
                    "type": "number",
                    "label": { "en": "Double Click Interval (ms)", "fr": "Intervalle Double-Clic (ms)" },
                    "value": 400,
                    "min": 100,
                    "max": 1000,
                    "hint": { "en": "Software emulation for single-action buttons", "fr": "Émulation logicielle pour boutons à action unique" }
                }
            ];
            
            // Special Settings for Mains/Lights
            if (compose.energy && compose.energy.mains === true) {
                smartFeatureSettings.push({
                    "id": "overload_threshold",
                    "type": "number",
                    "label": { "en": "Overload Protection (Watts)", "fr": "Protection Surcharge (Watts)" },
                    "value": 0,
                    "min": 0,
                    "max": 4000,
                    "hint": { "en": "Cut power if consumption exceeds this value (0 = disabled)", "fr": "Coupure si la consommation dépasse cette valeur (0 = désactivé)" }
                });
            }

            if (driverName.includes('bulb') || driverName.includes('led_strip')) {
                smartFeatureSettings.push({
                    "id": "enable_night_mode",
                    "type": "checkbox",
                    "label": { "en": "Night Mode (Auto-Dim)", "fr": "Mode Nuit (Auto-Dim)" },
                    "value": false,
                    "hint": { "en": "Automatically dim light when turned on at night", "fr": "Baisse l'intensité lors de l'allumage nocturne" }
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
                // console.log(`✅ ${driverName}: power=${newVal}W`);
            }
        }
    }
    console.log('✅ All driver energy profiles enriched.');
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
    const partsA = a.split('.').map(v => parseInt(v, 10) || 0);
    const partsB = b.split('.').map(v => parseInt(v, 10) || 0);
    for (let i = 0; i < 3; i++) {
        if (partsA[i] !== partsB[i]) return partsB[i] - partsA[i];
    }
    return 0;
  })`;
        
        content = content.replace(/\.sort\(\(a, b\) => \{[\s\S]*?\}\)/, newSort);
        
        // Fix the table header and versioning
        content = content.replace("| Version | Feature |", "| Version | Changes |");
        
        fs.writeFileSync(syncScriptPath, content);
        console.log('✅ sync-changelog-readme.js script fixed.');
    }
}

// Execute
polishChangelogs();
enrichPowerRatings();
fixSyncScript();
console.log('--- ALL POLISHING TASKS COMPLETED ---');
