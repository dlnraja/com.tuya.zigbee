/**
 * Fix Flow Cards Compilation - Force integration into app.json
 */

const fs = require('fs-extra');

async function fixFlowCardsCompilation() {
    console.log('🔧 Fixing Flow Cards Compilation...\n');

    try {
        // Lire les flow cards depuis .homeycompose/flow/
        const triggers = await fs.readJSON('.homeycompose/flow/triggers.json');
        const actions = await fs.readJSON('.homeycompose/flow/actions.json');
        const conditions = await fs.readJSON('.homeycompose/flow/conditions.json');

        console.log(`📥 Loaded ${triggers.length} triggers, ${actions.length} actions, ${conditions.length} conditions`);

        // Lire app.json principal
        const appJson = await fs.readJSON('app.json');
        
        // Ajouter la section flow
        appJson.flow = {
            triggers: triggers,
            actions: actions,
            conditions: conditions
        };

        // Sauvegarder app.json avec les flow cards
        await fs.writeJSON('app.json', appJson, { spaces: 2 });

        console.log('✅ Flow cards intégrées dans app.json');
        console.log(`   - ${triggers.length} triggers`);
        console.log(`   - ${actions.length} actions`);  
        console.log(`   - ${conditions.length} conditions`);

        // Aussi mettre à jour .homeycompose/app.json pour la cohérence
        const composeAppJson = await fs.readJSON('.homeycompose/app.json');
        composeAppJson.flow = {
            triggers: './flow/triggers.json',
            actions: './flow/actions.json', 
            conditions: './flow/conditions.json'
        };
        await fs.writeJSON('.homeycompose/app.json', composeAppJson, { spaces: 2 });

        console.log('✅ .homeycompose/app.json mis à jour avec références flow');

        return true;

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        return false;
    }
}

fixFlowCardsCompilation();
