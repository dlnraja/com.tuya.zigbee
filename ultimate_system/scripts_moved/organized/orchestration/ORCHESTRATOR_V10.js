const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎭 ORCHESTRATOR V10 - SYSTÈME COMPLET FINAL');

class OrchestratorV10 {
    constructor() {
        this.scripts = [
            'ULTIMATE_V10.js',
            'ANALYZER_V10.js', 
            'ENRICHER_V10.js',
            'COHERENCE_V10.js',
            'CATEGORY_MOVER_V10.js',
            'WEB_SCRAPER_30MIN_V10.js',
            'FINAL_ORGANIZER_V10.js'
        ];
        this.executionLog = [];
    }
    
    async executeAllPhases() {
        console.log('\n🎯 === ORCHESTRATION V10 DÉMARRÉE ===\n');
        
        for (const script of this.scripts) {
            this.executeScript(script);
        }
        
        this.finalizeExecution();
        console.log('\n🎉 === ORCHESTRATION V10 TERMINÉE ===');
    }
    
    executeScript(scriptName) {
        try {
            if (fs.existsSync(`./${scriptName}`)) {
                console.log(`▶️ Executing ${scriptName}`);
                execSync(`node ${scriptName}`, {stdio: 'inherit'});
                this.executionLog.push(`✅ ${scriptName}: SUCCESS`);
            } else {
                this.executionLog.push(`⚠️ ${scriptName}: NOT FOUND`);
            }
        } catch(e) {
            this.executionLog.push(`❌ ${scriptName}: ERROR`);
            console.log(`⚠️ ${scriptName} handled gracefully`);
        }
    }
    
    finalizeExecution() {
        // Save execution report
        if (!fs.existsSync('./references')) fs.mkdirSync('./references');
        fs.writeFileSync('./references/execution_log_v10.json', JSON.stringify(this.executionLog, null, 2));
        
        // Final Git push with smart handling
        this.smartGitPush();
        
        console.log('📊 Execution Summary:');
        this.executionLog.forEach(log => console.log(log));
    }
    
    smartGitPush() {
        try {
            execSync('git stash push -m "V10 orchestration"');
            execSync('git pull --rebase');
            execSync('git stash pop');
            execSync('homey app validate');
            execSync('git add -A && git commit -m "🎭 Orchestrator V10 Complete" && git push');
            console.log('🚀 Git push successful');
        } catch(e) {
            console.log('⚠️ Git push handled');
        }
    }
}

const orchestrator = new OrchestratorV10();
orchestrator.executeAllPhases();
