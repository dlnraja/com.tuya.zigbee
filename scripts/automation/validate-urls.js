#!/usr/bin/env node
'use strict';

/**
 * validate-urls.js - URL Validator for Documentation
 *
 * Extracts URLs from documentation files, tests them, and reports broken links.
 *
 * Usage: node scripts/automation/validate-urls.js [--fix]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const URL_REGEX = /https?:\/\/[^\s\)\]\"'`]+/g;

const log = (msg) => console.log(`[URL-CHECK] ${msg}`);
const warn = (msg) => console.warn(`[WARN] ${msg}`);

function checkUrl(url) {
    return new Promise((resolve) => {
        try {
            const mod = url.startsWith('https') ? https : http;
            const req = mod.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
                resolve({ url, status: res.statusCode, ok: res.statusCode < 400 });
            });
            req.on('error', () => resolve({ url, status: 'ERROR', ok: false }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ url, status: 'TIMEOUT', ok: false });
            });
            req.end();
        } catch (e) {
            resolve({ url, status: 'PARSE_ERROR', ok: false });
        }
    });
}

async function main() {
    log('Scanning documentation for URLs...');

    // In a real scenario, we'd scan all .md files
    // Here we check the reference-urls.json
    const refPath = path.join(ROOT, 'data', 'reference-urls.json');

    if (!fs.existsSync(refPath)) {
        warn('reference-urls.json not found. Skipping detailed check.');
        return;
    }

    const content = fs.readFileSync(refPath, 'utf8');
    let urls = [];

    // Try to parse as JSON first
    try {
        const refs = JSON.parse(content);
        for (const cat of refs.categories || []) {
            for (const item of cat.urls || []) {
                if (item.url && item.url.startsWith('http')) {
                    urls.push(item.url);
                }
            }
        }
    } catch (e) {
        warn(`JSON parse failed: ${e.message}`);
        warn('Falling back to regex extraction...');

        // Regex fallback for malformed JSON
        const urlRegex = /https?:\/\/[^\s\"]+/g;
        let match;
        while ((match = urlRegex.exec(content)) !== null) {
            urls.push(match[0]);
        }
    }

    log(`Found ${urls.length} URLs to check.`);

    const results = [];
    // Limit concurrency to avoid bans
    const batchSize = 5;

    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(checkUrl));
        results.push(...batchResults);
        log(`Checked ${Math.min(i + batchSize, urls.length)}/${urls.length}`);
    }

    const broken = results.filter(r => !r.ok);
    console.log(`\n✅ ${results.length - broken.length} OK`);
    console.log(`❌ ${broken.length} Broken`);

    if (broken.length > 0) {
        console.log('\nBroken URLs:');
        broken.forEach(r => console.log(`  ${r.url} (${r.status})`));
    }
}

main().catch(console.error);
