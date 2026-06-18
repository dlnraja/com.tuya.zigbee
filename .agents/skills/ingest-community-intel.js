#!/usr/bin/env node
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
'use strict';

/**
 * Skill: Community Intel Ingestor
 * Fetches and processes device data from the Homey Community Forum.
 */

const { execSync } = require('child_process');
const path = require('path');

function ingestIntel() {
    console.log('--- Starting Community Intel Ingestion ---');
    // Use the sync crawlers as the canonical data source
    const syncDir = path.join(__dirname, '..', '..', 'scripts', 'sync');
    try {
        const output = execSync(`node "${path.join(syncDir, 'crawl-z2m.js')}"`, { encoding: 'utf8' });
        console.log(output);
        return { success: true };
    } catch (error) {
        console.error('Ingestion failed:', error.message);
        return { success: false, error: error.message };
    }
}

if (require.main === module) {
    ingestIntel();
}

module.exports = { ingestIntel };
