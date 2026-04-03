#!/usr/bin/env node
'use strict';
/**
 * manufacturer-scraper.js
 * Intelligently searches commercial descriptions, manufacturer sites, and Aliexpress
 * to guess the capabilities of unknown Tuya Zigbee Fingerprints and auto-implements them.
 */
const fs = require('fs');
const path = require('path');
const { callAI } = require('./ai-helper');
const { fetchWithRetry } = require('./retry-helper');
const REPORT_FILE = path.join(__dirname, '..', 'state', 'manufacturer-scraper-report.json');

async function searchWebSearch(query) {
  // Uses a generic serach API or DDG text endpoint. 
  // For GitHub Actions, we often rely on RapidAPI or DDG Lite.
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetchWithRetry(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, { retries: 2, label: 'DDG' });
    if (!res.ok) return '';
    const text = await res.text();
    // Rough extraction of search result snippets
    const snippets = text.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/gi) || [];
    return snippets.map(s => s.replace(/<[^>]+>/g, '')).join('\n');
  } catch (e) {
    return '';
  }
}

async function searchAliexpress(keywords) {
  // Simulated or API-driven Aliexpress search just for text descriptions.
  return await searchWebSearch(`site:aliexpress.com "Tuya" "Zigbee" ${keywords}`);
}

async function searchTuyaManufacturer(productId) {
  return await searchWebSearch(`site:tuya.com OR site:developer.tuya.com ${productId} Zigbee`);
}

async function main() {
  console.log('=== Manufacturer & Aliexpress Commercial Scraper ===');
  
  // Get missing fingerprints from enrichment-state
  const ENR_STATE = path.join(__dirname, '..', 'state', 'enrichment-state.json');
  let missing = [];
  try {
    const enr = JSON.parse(fs.readFileSync(ENR_STATE, 'utf8'));
    missing = (enr.knownNew || []).slice(0, 10); // Process top 10
  } catch {
    console.log('No enrichment state found. Running on default placeholders if needed.');
  }

  const results = [];
  
  for (const fp of missing) {
    console.log(`\n🔍 Researching: ${fp}`);
    const rx = await searchAliexpress(fp);
    const mfx = await searchTuyaManufacturer(fp);
    
    // Combine context
    const fullContext = `
    Search Aliexpress: ${rx.substring(0, 800)}
    Search Tuya: ${mfx.substring(0, 800)}
    `;

    // Ask AI to guess capabilities based on commercial text
    const sysPrompt = `You are a Smart Home Zigbee Engineer.
Analyze the commercial descriptions (Aliexpress/Tuya) for the fingerprint '${fp}'.
1. Guess its exact Homey capabilities (e.g., 'measure_temperature', 'onoff', 'measure_power').
2. Identify any missing or special Tuya DPs from the text.
3. Determine the correct device class (socket, light, sensor, etc.).
Output JSON ONLY `{ "class": "...", "guessed_capabilities": ["..."], "dps": [{"id":1, "cap":"..."}], "reasoning": "..." }``;

    const aiGuess = await callAI(fullContext, sysPrompt, { maxTokens: 1000 });
    let analysis = {};
    if (aiGuess && aiGuess.text) {
      try {
        const jsonMatch = aiGuess.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.log(`Failed to parse AI JSON for ${fp}`);
      }
    }
    
    analysis.fingerprint = fp;
    results.push(analysis);
    console.log(`✅ AI Analysis for ${fp}:`, analysis.guessed_capabilities || 'None');
    
    // Auto-implement locally if high confidence
    await autoImplement(analysis);
  }

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log('\nReport saved to', REPORT_FILE);
}

// Function that actually modifies the codebase files based on high confidence AI guesses.
async function autoImplement(analysis) {
  if (!analysis.guessed_capabilities || analysis.guessed_capabilities.length === 0) return;
  const fp = analysis.fingerprint;
  
  // Example logic: if the AI determines it's a smart plug, add the fingerprint to drivers/plug_smart
  let targetDriver = '';
  if (analysis.class === 'socket' && analysis.guessed_capabilities.includes('measure_power')) {
    targetDriver = 'plug_energy_monitor';
  } else if (analysis.class === 'socket') {
    targetDriver = 'plug_smart';
  } else if (analysis.class === 'sensor' && analysis.guessed_capabilities.includes('measure_temperature')) {
    targetDriver = 'sensor_climate';
  }

  if (targetDriver) {
    const driverFile = path.join(__dirname, '..', '..', 'drivers', targetDriver, 'driver.compose.json');
    if (fs.existsSync(driverFile)) {
      try {
        let content = fs.readFileSync(driverFile, 'utf8');
        if (!content.includes(fp)) {
          console.log(`⚡ Injecting capability: Auto-scaffolding ${fp} into ${targetDriver}`);
          // Simple JSON injection for arrays
          content = content.replace(/"manufacturerName":\s*\[/, `"manufacturerName": [\n        "${fp}",`);
          fs.writeFileSync(driverFile, content);
        }
      } catch (e) {
        console.log('Error injecting auto-implementation', e.message);
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
