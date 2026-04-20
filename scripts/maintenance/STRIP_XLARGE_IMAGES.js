#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// 1. Update app.json (if it exists)
const appJsonPath = path.join(ROOT, 'app.json');
if (fs.existsSync(appJsonPath)) {
    let appJson = fs.readFileSync(appJsonPath, 'utf8');
    // Remove xlarge image from global images
    appJson = appJson.replace(/"xlarge":\s*"\/assets\/images\/xlarge\.png",?\s*/g, '');
    // Clean up trailing commas in objects
    appJson = appJson.replace(/,(\s*\})/g, '$1');
    fs.writeFileSync(appJsonPath, appJson);
    console.log('Updated app.json: Removed xlarge image reference.');
}

// 2. Update .homeycompose/app.json
const composeAppPath = path.join(ROOT, '.homeycompose', 'app.json');
if (fs.existsSync(composeAppPath)) {
    let composeApp = fs.readFileSync(composeAppPath, 'utf8');
    composeApp = composeApp.replace(/"xlarge":\s*"\/assets\/images\/xlarge\.png",?\s*/g, '');
    composeApp = composeApp.replace(/,(\s*\})/g, '$1');
    fs.writeFileSync(composeAppPath, composeApp);
    console.log('Updated .homeycompose/app.json: Removed xlarge image reference.');
}

// 3. Update all drivers' driver.compose.json
const driversDir = path.join(ROOT, 'drivers');
if (fs.existsSync(driversDir)) {
    const drivers = fs.readdirSync(driversDir).filter(f => fs.statSync(path.join(driversDir, f)).isDirectory());
    let count = 0;
    drivers.forEach(driver => {
        const composePath = path.join(driversDir, driver, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            let content = fs.readFileSync(composePath, 'utf8');
            if (content.includes('xlarge')) {
                // Remove xlarge from images object
                content = content.replace(/"xlarge":\s*"[^"]+",?\s*/g, '');
                // Clean up trailing commas
                content = content.replace(/,(\s*\})/g, '$1');
                fs.writeFileSync(composePath, content);
                count++;
            }
        }
    });
    console.log(`Updated ${count} drivers: Removed xlarge image references from driver.compose.json.`);
}

// 4. Add xlarge.png to .homeyignore
const ignoreFile = path.join(ROOT, '.homeyignore');
if (fs.existsSync(ignoreFile)) {
    let ignore = fs.readFileSync(ignoreFile, 'utf8');
    if (!ignore.includes('xlarge.png')) {
        ignore += '\nxlarge.png\n';
        fs.writeFileSync(ignoreFile, ignore);
        console.log('Added xlarge.png to .homeyignore.');
    }
}
