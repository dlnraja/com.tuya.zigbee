const fs = require('fs');
const path = require('path');

const correctPackageJson = {
  "name": "com.tuya.zigbee",
  "version": "2.1.0",
  "description": "Universal Tuya Zigbee Device Integration for Homey",
  "main": "app.js",
  "scripts": {
    "test": "node tests/full-validation-suite.js",
    "validate": "node scripts/recursive-validation.js",
    "cleanup": "node scripts/master-cleanup.js",
    "repair-json": "node scripts/deep-json-repair.js",
    "lint": "eslint .",
    "format": "prettier --write .",
    "start": "homey app run",
    "build": "homey app build",
    "publish": "homey app publish"
  },
  "dependencies": {
    "homey-zigbeedriver": "^1.9.0",
    "zigbee-clusters": "^1.8.0",
    "fs-extra": "^11.1.0"
  },
  "devDependencies": {
    "eslint": "^8.45.0",
    "prettier": "^3.0.0",
    "jest": "^29.5.0",
    "jsonschema": "^1.4.1"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "author": "Tuya Zigbee Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/dlnraja/com.tuya.zigbee"
  },
  "keywords": [
    "homey",
    "zigbee",
    "tuya",
    "smart home",
    "iot"
  ]
};

const packageJsonPath = path.join(__dirname, '..', 'package.json');

fs.writeFileSync(packageJsonPath, JSON.stringify(correctPackageJson, null, 2));

console.log('✅ package.json has been successfully repaired.');
