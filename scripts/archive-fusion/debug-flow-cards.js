/**
 * Debug Flow Cards - Pourquoi les flow cards n'apparaissent pas
 */

const fs = require('fs-extra');
const path = require('path');

async function debugFlowCards() {
    console.log('🔍 DEBUG: Flow Cards Investigation\n');

    // Vérifier la structure des flow cards
    const flowDir = '.homeycompose/flow';
    
    console.log('📁 Checking flow directory structure:');
    try {
        const files = await fs.readdir(flowDir);
        console.log('Files found:', files);
        
        for (const file of files) {
            const filePath = path.join(flowDir, file);
            const content = await fs.readJSON(filePath);
            console.log(`\n📄 ${file}:`);
            console.log(`   - Contains ${content.length} flow cards`);
            
            if (content.length > 0) {
                console.log(`   - First card ID: ${content[0].id}`);
                console.log(`   - First card title: ${content[0].title?.en || 'NO TITLE'}`);
            }
        }
    } catch (error) {
        console.error('❌ Error reading flow directory:', error.message);
    }

    // Vérifier app.json principal
    console.log('\n📋 Checking main app.json:');
    try {
        const appJson = await fs.readJSON('app.json');
        console.log('App ID:', appJson.id);
        console.log('Version:', appJson.version);
        console.log('Flow section exists:', !!appJson.flow);
        
        if (appJson.flow) {
            console.log('Triggers:', appJson.flow.triggers?.length || 0);
            console.log('Actions:', appJson.flow.actions?.length || 0);
            console.log('Conditions:', appJson.flow.conditions?.length || 0);
        }
    } catch (error) {
        console.error('❌ Error reading app.json:', error.message);
    }

    // Vérifier .homeycompose/app.json
    console.log('\n📋 Checking .homeycompose/app.json:');
    try {
        const composeAppJson = await fs.readJSON('.homeycompose/app.json');
        console.log('Version:', composeAppJson.version);
        console.log('Flow section exists:', !!composeAppJson.flow);
        
        if (composeAppJson.flow) {
            console.log('Triggers:', composeAppJson.flow.triggers?.length || 0);
            console.log('Actions:', composeAppJson.flow.actions?.length || 0);
            console.log('Conditions:', composeAppJson.flow.conditions?.length || 0);
        }
    } catch (error) {
        console.error('❌ Error reading .homeycompose/app.json:', error.message);
    }

    // Proposer des solutions
    console.log('\n🔧 SOLUTIONS POSSIBLES:');
    console.log('1. Les flow cards ne s\'affichent qu\'après publication officielle');
    console.log('2. Il faut ajouter une section "flow" dans app.json principal');
    console.log('3. Les flow cards nécessitent une recompilation avec "homey app build"');
    console.log('4. Les filtres de drivers dans les flow cards ne matchent pas');

    return {
        flowFilesExist: await fs.pathExists(flowDir),
        appJsonHasFlow: await fs.readJSON('app.json').then(app => !!app.flow).catch(() => false),
        composeAppJsonHasFlow: await fs.readJSON('.homeycompose/app.json').then(app => !!app.flow).catch(() => false)
    };
}

debugFlowCards().catch(console.error);
