#!/usr/bin/env node

/**
 * COUNT DEVICES ADDED
 * Track manufacturer IDs added over time
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRIVERS_PATH = path.join(__dirname, '..', '..', 'drivers');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'reports', 'metrics', 'devices-count.json');

console.log('\n📊 COUNTING DEVICES\n');
console.log('═'.repeat(70));

let totalManufacturerIds = new Set();
let driverStats = [];

// Count current state
function countCurrent() {
    console.log('\n📥 Counting current devices...\n');
    
    const drivers = fs.readdirSync(DRIVERS_PATH).filter(d => {
        return fs.statSync(path.join(DRIVERS_PATH, d)).isDirectory();
    });
    
    for (const driver of drivers) {
        const composePath = path.join(DRIVERS_PATH, driver, 'driver.compose.json');
        
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                if (compose.zigbee && compose.zigbee.manufacturerName) {
                    const ids = compose.zigbee.manufacturerName;
                    ids.forEach(id => totalManufacturerIds.add(id));
                    
                    driverStats.push({
                        driver,
                        count: ids.length,
                        ids: ids
                    });
                }
            } catch (error) {
                // Ignore
            }
        }
    }
    
    console.log(`✅ Total drivers: ${drivers.length}`);
    console.log(`✅ Total manufacturer IDs: ${totalManufacturerIds.size}`);
}

// Count devices added in last period
function countAddedSince(days) {
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split('T')[0];
        
        // Get commits since date
        const commits = execSync(
            `git log --since="${sinceStr}" --pretty=format:"%H" -- drivers/`,
            { encoding: 'utf8', cwd: path.join(__dirname, '..', '..') }
        ).split('\n').filter(Boolean);
        
        if (commits.length === 0) return 0;
        
        // Get added manufacturer IDs
        const added = new Set();
        
        for (const commit of commits) {
            try {
                const diff = execSync(
                    `git show ${commit} -- drivers/*/driver.compose.json`,
                    { encoding: 'utf8', cwd: path.join(__dirname, '..', '..') }
                );
                
                // Match added manufacturer IDs
                const matches = diff.match(/\+\s*"(_TZ[^"]+)"/g);
                if (matches) {
                    matches.forEach(match => {
                        const id = match.match(/"(_TZ[^"]+)"/)[1];
                        added.add(id);
                    });
                }
            } catch (error) {
                // Ignore
            }
        }
        
        return added.size;
    } catch (error) {
        return 0;
    }
}

// Main execution
countCurrent();

const devicesAddedWeek = countAddedSince(7);
const devicesAddedMonth = countAddedSince(30);

console.log(`\n📈 Added last 7 days:  ${devicesAddedWeek}`);
console.log(`📈 Added last 30 days: ${devicesAddedMonth}`);

// Save results
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const result = {
    date: new Date().toISOString(),
    current: {
        drivers: driverStats.length,
        manufacturerIds: totalManufacturerIds.size
    },
    added: {
        week: devicesAddedWeek,
        month: devicesAddedMonth
    },
    topDrivers: driverStats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(d => ({ driver: d.driver, count: d.count }))
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));

console.log(`\n📄 Results saved: ${OUTPUT_FILE}`);
console.log('\n✅ COUNTING COMPLETE!\n');

// Output for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `devices_added_week=${devicesAddedWeek}\n`
    );
    fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `devices_added_month=${devicesAddedMonth}\n`
    );
    fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `total_devices=${totalManufacturerIds.size}\n`
    );
}

process.exit(0);
