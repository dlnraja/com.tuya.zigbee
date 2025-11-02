#!/usr/bin/env node

/**
 * FIX WALL TOUCH FLOW CARDS - CRITICAL FIX
 * 
 * PROBLÈME CRITIQUE (Diagnostic 5bbbabc5):
 * 8 drivers wall_touch_*gang complètement cassés car flow cards manquantes
 * 
 * ERREUR:
 * Error: Invalid Flow Card ID: wall_touch_*gang_button_pressed
 * at drivers/wall_touch_*gang/driver.js:27
 * 
 * SOLUTION:
 * Générer automatiquement toutes les flow cards manquantes
 * pour wall_touch 1-8 gang (64 flow cards total!)
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚨 FIX WALL TOUCH FLOW CARDS - CRITICAL\n');
console.log('═'.repeat(70));

const APP_JSON_PATH = path.join(__dirname, '..', '..', 'app.json');

console.log('\n🔍 Analyse du problème...\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

// Backup
const backupPath = APP_JSON_PATH + '.backup-wall-touch-flows';
fs.writeFileSync(backupPath, fs.readFileSync(APP_JSON_PATH));
console.log(`📦 Backup créé: ${backupPath}\n`);

console.log('❌ PROBLÈME IDENTIFIÉ:');
console.log('   8 drivers wall_touch_*gang ne peuvent pas démarrer');
console.log('   car ils cherchent des flow cards qui n\'existent PAS!\n');

console.log('🔍 DRIVERS AFFECTÉS:');
for (let gang = 1; gang <= 8; gang++) {
    const driverId = `wall_touch_${gang}gang`;
    const flowCardId = `${driverId}_button_pressed`;
    
    // Chercher si la flow card existe
    const exists = appJson.flow?.triggers?.some(t => t.id === flowCardId);
    console.log(`   ${driverId}: ${exists ? '✅' : '❌'} Flow card ${exists ? 'OK' : 'MANQUANTE'}`);
}

console.log('\n═'.repeat(70));
console.log('\n✅ GÉNÉRATION DES FLOW CARDS...\n');

// Initialiser flow section si nécessaire
if (!appJson.flow) {
    appJson.flow = {};
}
if (!appJson.flow.triggers) {
    appJson.flow.triggers = [];
}

let addedCount = 0;
const newFlowCards = [];

// Générer flow cards pour chaque gang (1-8)
for (let gang = 1; gang <= 8; gang++) {
    const driverId = `wall_touch_${gang}gang`;
    
    // Générer flow cards pour chaque bouton (1-gang count)
    for (let button = 1; button <= gang; button++) {
        const flowCardId = `${driverId}_button_${button}_pressed`;
        
        // Vérifier si existe déjà
        const exists = appJson.flow.triggers.some(t => t.id === flowCardId);
        
        if (!exists) {
            const flowCard = {
                "id": flowCardId,
                "title": {
                    "en": `Button ${button} pressed`,
                    "fr": `Bouton ${button} appuyé`
                },
                "titleFormatted": {
                    "en": `Button ${button} pressed`,
                    "fr": `Bouton ${button} appuyé`
                },
                "hint": {
                    "en": `Triggered when button ${button} is pressed`,
                    "fr": `Déclenché quand le bouton ${button} est appuyé`
                },
                "tokens": [
                    {
                        "name": "button",
                        "type": "string",
                        "title": {
                            "en": "Button",
                            "fr": "Bouton"
                        },
                        "example": button.toString()
                    },
                    {
                        "name": "action",
                        "type": "string",
                        "title": {
                            "en": "Action",
                            "fr": "Action"
                        },
                        "example": "pressed"
                    }
                ],
                "args": [
                    {
                        "type": "device",
                        "name": "device",
                        "filter": `driver_id=${driverId}`
                    }
                ]
            };
            
            appJson.flow.triggers.push(flowCard);
            newFlowCards.push(flowCardId);
            addedCount++;
            console.log(`   ✅ Ajouté: ${flowCardId}`);
        }
    }
    
    // Ajouter aussi la flow card générique "*_button_pressed" si manquante
    const genericFlowCardId = `${driverId}_button_pressed`;
    const genericExists = appJson.flow.triggers.some(t => t.id === genericFlowCardId);
    
    if (!genericExists) {
        const genericFlowCard = {
            "id": genericFlowCardId,
            "title": {
                "en": "Any button pressed",
                "fr": "N'importe quel bouton appuyé"
            },
            "titleFormatted": {
                "en": "Any button pressed",
                "fr": "N'importe quel bouton appuyé"
            },
            "hint": {
                "en": "Triggered when any button is pressed",
                "fr": "Déclenché quand n'importe quel bouton est appuyé"
            },
            "tokens": [
                {
                    "name": "button",
                    "type": "string",
                    "title": {
                        "en": "Button",
                        "fr": "Bouton"
                    },
                    "example": "1"
                },
                {
                    "name": "action",
                    "type": "string",
                    "title": {
                        "en": "Action",
                        "fr": "Action"
                    },
                    "example": "pressed"
                }
            ],
            "args": [
                {
                    "type": "device",
                    "name": "device",
                    "filter": `driver_id=${driverId}`
                }
            ]
        };
        
        appJson.flow.triggers.push(genericFlowCard);
        newFlowCards.push(genericFlowCardId);
        addedCount++;
        console.log(`   ✅ Ajouté: ${genericFlowCardId} (generic)`);
    }
}

// Sauvegarder app.json
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2));

console.log('\n═'.repeat(70));
console.log(`\n✅ ${addedCount} FLOW CARDS AJOUTÉES!\n`);

console.log('📋 RÉCAPITULATIF PAR DRIVER:\n');
for (let gang = 1; gang <= 8; gang++) {
    const driverId = `wall_touch_${gang}gang`;
    const flowCardsCount = gang + 1; // gang buttons + 1 generic
    console.log(`   ${driverId}: ${flowCardsCount} flow cards (${gang} boutons + 1 generic)`);
}

console.log(`\n   TOTAL: ${addedCount} flow cards créées\n`);

console.log('═'.repeat(70));
console.log('\n🎯 RÉSULTAT ATTENDU:\n');
console.log('✅ Les 8 drivers wall_touch_*gang vont maintenant se charger correctement');
console.log('✅ Plus d\'erreur "Invalid Flow Card ID"');
console.log('✅ Switches muraux fonctionnels dans flows Homey\n');

console.log('═'.repeat(70));
console.log('\n📝 PROCHAINES ÉTAPES:\n');
console.log('1. Valider: homey app validate');
console.log('2. Build: homey app build');
console.log('3. Test local: homey app run');
console.log('4. Commit: git add app.json && git commit');
console.log('5. Push: git push origin master\n');

console.log('✅ FIX WALL TOUCH FLOW CARDS COMPLETE!\n');
