// Performance optimized
#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const fs = require('fs');
// Test 1: app.json
if (fs.existsSync('app.json')) {
    const stats = fs.statSync('app.json');
    try {
        const content = fs.readFileSync('app.json', 'utf8');
        const appConfig = JSON.parse(content);
    } catch (error) {
    }
} else {
}

// Test 2: Clusters
if (fs.existsSync('app.json')) {
    const content = fs.readFileSync('app.json', 'utf8');
    const clusterMatches = content.match(/"clusters":\s*\[[^\]]*\]/g);

    if (clusterMatches) {
        const numericClusters = clusterMatches.filter(match =>
            match.match(/"clusters":\s*\[\s*\d+/)
        );
        if (numericClusters.length === clusterMatches.length) {
        } else {
        }
    }
}

// Test 3: Drivers
const driversPath = './drivers';
if (fs.existsSync(driversPath)) {
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(d => d.isDirectory());
    // Vérifier quelques drivers
    const sampleDrivers = drivers.slice(0, 3);
    sampleDrivers.forEach(driver => {
        const composePath = `./drivers/${driver.name}/driver.compose.json`;
        if (fs.existsSync(composePath)) {
            try {
                const content = fs.readFileSync(composePath, 'utf8');
                const config = JSON.parse(content);
                if (config.zigbee && config.zigbee.manufacturerName) {
                } else {
                }
            } catch (error) {
            }
        } else {
        }
    });
}