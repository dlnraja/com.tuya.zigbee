// 🎯 MASTER ORCHESTRATOR FINAL v10.0 - VERSION COURTE
const fs = require('fs');

class FinalOrchestrator {
    constructor() {
        this.VERSION_TARGET = '1.0.31';
        this.MEGA_IDS = [
            '_TZE284_uqfph8ah', '_TZE284_bjawzodf', '_TZE200_bjawzodf', '_TZ3000_26fmupbb',
            '_TZ3400_keyjhapk', '_TZE204_dcnsggvz', '_TYST11_whpb9yts', '_TYZB01_iuibaj4r',
            'BSEED', 'EweLink', 'GIRIER', 'Lonsonho', 'MOES', 'Nedis', 'OWON', 'Generic'
        ];
    }

    async executeAll() {
        console.log('🎯 MASTER ORCHESTRATOR FINAL - 10 ITÉRATIONS');
        
        for (let i = 1; i <= 10; i++) {
            console.log(`\n🚀 ITÉRATION ${i}/10`);
            
            await this.cleanCache();
            await this.fixEndpoints();
            await this.enrichIds();
            await this.createImages();
            
            console.log(`✅ ITÉRATION ${i} TERMINÉE`);
        }
        
        await this.finalizeAndPublish();
        console.log('🎉 ORCHESTRATION COMPLÈTE - PRÊT POUR GITHUB ACTIONS');
    }

    async cleanCache() {
        try { fs.rmSync('.homeycompose', {recursive: true}); } catch(e) {}
    }

    async fixEndpoints() {
        const drivers = fs.readdirSync('drivers');
        let fixed = 0;
        
        drivers.forEach(driver => {
            const configPath = `drivers/${driver}/driver.compose.json`;
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                
                if (!config.zigbee) config.zigbee = {};
                if (!config.zigbee.endpoints) {
                    if (driver.includes('3gang')) {
                        config.zigbee.endpoints = {
                            "1": {"clusters": [0,4,5,6]},
                            "2": {"clusters": [0,4,5,6]},
                            "3": {"clusters": [0,4,5,6]}
                        };
                    } else if (driver.includes('2gang')) {
                        config.zigbee.endpoints = {
                            "1": {"clusters": [0,4,5,6]},
                            "2": {"clusters": [0,4,5,6]}
                        };
                    } else if (driver.includes('energy')) {
                        config.zigbee.endpoints = {"1": {"clusters": [0,4,5,6,1794]}};
                    } else {
                        config.zigbee.endpoints = {"1": {"clusters": [0,4,5,6]}};
                    }
                    
                    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                    fixed++;
                }
            }
        });
        
        console.log(`🔧 ${fixed} endpoints corrigés`);
    }

    async enrichIds() {
        const drivers = fs.readdirSync('drivers');
        let enriched = 0;
        
        drivers.forEach(driver => {
            const configPath = `drivers/${driver}/driver.compose.json`;
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                
                if (!config.zigbee) config.zigbee = {};
                if (!config.zigbee.manufacturerName) config.zigbee.manufacturerName = [];
                
                config.zigbee.manufacturerName.push(...this.MEGA_IDS);
                
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                enriched++;
            }
        });
        
        console.log(`🏷️ ${enriched} drivers enrichis avec ${this.MEGA_IDS.length} IDs`);
    }

    async createImages() {
        const drivers = fs.readdirSync('drivers');
        let created = 0;
        
        drivers.forEach(driver => {
            const assetsDir = `drivers/${driver}/assets`;
            if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, {recursive: true});
            
            const spec = {
                driver,
                sizes: ['75x75px', '250x175px', '500x350px'],
                style: 'Johan Bendz + Homey SDK3',
                category: this.detectCategory(driver)
            };
            
            fs.writeFileSync(`${assetsDir}/image-spec.json`, JSON.stringify(spec, null, 2));
            created++;
        });
        
        console.log(`🎨 ${created} spécifications images créées`);
    }

    detectCategory(driver) {
        if (driver.includes('3gang')) return '3 buttons';
        if (driver.includes('2gang')) return '2 buttons';
        if (driver.includes('motion')) return 'PIR sensor';
        if (driver.includes('energy')) return 'energy monitor';
        return 'smart device';
    }

    async finalizeAndPublish() {
        // Mise à jour version
        if (fs.existsSync('app.json')) {
            const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
            app.version = this.VERSION_TARGET;
            fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
        }
        
        console.log(`📝 Version finalisée: ${this.VERSION_TARGET}`);
        console.log('🚀 Utiliser: git add -A && git commit && git push');
    }
}

// EXÉCUTION
if (require.main === module) {
    const orchestrator = new FinalOrchestrator();
    orchestrator.executeAll().catch(console.error);
}

module.exports = FinalOrchestrator;
