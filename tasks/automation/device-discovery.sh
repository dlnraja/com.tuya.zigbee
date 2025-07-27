#!/bin/bash
echo "DEVICE DISCOVERY AUTOMATION"
echo "============================"

# Create device audit script
cat > scripts/audit-devices.js << 'EOF'
const fs = require('fs');
const path = require('path');

class DeviceAuditor {
    constructor() {
        this.drivers = this.loadDrivers();
        this.models = this.extractModels();
    }

    loadDrivers() {
        const driversDir = path.join(__dirname, '../drivers');
        const drivers = [];
        
        if (fs.existsSync(driversDir)) {
            const files = fs.readdirSync(driversDir);
            files.forEach(file => {
                if (file.endsWith('.js')) {
                    const content = fs.readFileSync(path.join(driversDir, file), 'utf8');
                    drivers.push({
                        file: file,
                        content: content,
                        models: this.extractModelsFromContent(content)
                    });
                }
            });
        }
        
        return drivers;
    }

    extractModelsFromContent(content) {
        const models = [];
        const modelRegex = /modelId:\s*['"]([^'"]+)['"]/g;
        let match;
        
        while ((match = modelRegex.exec(content)) !== null) {
            models.push(match[1]);
        }
        
        return models;
    }

    extractModels() {
        const allModels = [];
        this.drivers.forEach(driver => {
            allModels.push(...driver.models);
        });
        return allModels;
    }

    generateReport() {
        const report = {
            totalDrivers: this.drivers.length,
            totalModels: this.models.length,
            models: this.models,
            drivers: this.drivers.map(d => ({
                file: d.file,
                modelCount: d.models.length,
                models: d.models
            }))
        };

        fs.writeFileSync(
            path.join(__dirname, '../reports/device-audit.json'),
            JSON.stringify(report, null, 2)
        );

        console.log(`Audit complete: ${report.totalDrivers} drivers, ${report.totalModels} models`);
        return report;
    }
}

const auditor = new DeviceAuditor();
auditor.generateReport();
