#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { callAI } = require('./ai-helper'); // Uses existing AI logic

const INTEL_PATH = path.join(__dirname, '..', 'state', 'community_intel.md');
const APP_DIR = path.join(__dirname, '..', '..');

async function main() {
  if (!fs.existsSync(INTEL_PATH)) {
    console.log('No community intelligence found. Exiting.');
    return;
  }

  const intelContent = fs.readFileSync(INTEL_PATH, 'utf8');
  if (intelContent.length < 50) {
    console.log('Community intelligence file is too small. Exiting.');
    return;
  }

  console.log('Analyzing community intelligence with AI...');
  
  const systemPrompt = `You are an expert maintainer of the Tuya Homey app.
Read the following GitHub issues and PR comments.
Extract any user requests to add new Tuya fingerprints (e.g. _TZ3000_xxxxxx) to existing drivers.
Return ONLY a valid JSON array of objects, with no markdown formatting around it (no \`\`\`json).
Each object must have:
- "fingerprint": The exact fingerprint string (e.g. "_TZ3000_xxxxx")
- "driver": The id of the target driver (e.g. "switch_1gang", "button_wireless_4")

If there are no clear requests to add fingerprints to known drivers, return an empty array [].
Do NOT guess drivers if it's completely unclear, but do your best to match Tuya device types to known drivers (e.g. 1-gang switch -> switch_1gang).`;

  try {
    const aiResponse = await callAI(intelContent, systemPrompt, {
      temperature: 0.1,
      max_tokens: 1000
    });

    console.log('AI Response:', aiResponse);
    
    // Parse the JSON. Clean up any accidental markdown formatting if present.
    let jsonStr = aiResponse.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '');
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '');
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.replace(/```$/, '');
    
    const additions = JSON.parse(jsonStr.trim());
    
    if (!Array.isArray(additions) || additions.length === 0) {
      console.log('No actionable fingerprints found by AI.');
      return;
    }
    
    console.log(`Found ${additions.length} fingerprints to inject.`);
    let modifiedFiles = 0;
    
    for (const item of additions) {
      if (!item.fingerprint || !item.driver) continue;
      
      const driverPath = path.join(APP_DIR, 'drivers', item.driver, 'driver.compose.json');
      if (fs.existsSync(driverPath)) {
        let obj = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
        obj.zigbee = obj.zigbee || {};
        obj.zigbee.manufacturerName = obj.zigbee.manufacturerName || [];
        
        if (!obj.zigbee.manufacturerName.includes(item.fingerprint)) {
          obj.zigbee.manufacturerName.push(item.fingerprint);
          fs.writeFileSync(driverPath, JSON.stringify(obj, null, 2));
          console.log(`Injected ${item.fingerprint} into ${item.driver}`);
          modifiedFiles++;
        } else {
          console.log(`${item.fingerprint} is already in ${item.driver}`);
        }
      } else {
        console.warn(`Warning: Driver ${item.driver} not found for fingerprint ${item.fingerprint}`);
      }
    }
    
    if (modifiedFiles > 0) {
      console.log(`Successfully modified ${modifiedFiles} driver(s). Ready for master:fix.`);
    } else {
      console.log('No modifications needed.');
    }
  } catch (err) {
    console.error('Error in autonomous resolver:', err);
    process.exit(1);
  }
}

main();
