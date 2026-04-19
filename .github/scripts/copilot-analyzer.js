const { safeParse, safeDivide } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const https = require('https');

/**
 * Uses Gemini (via GOOGLE_API_KEY) or OpenAI (via OPENAI_API_KEY) to provide
 * a GitHub Copilot-style analysis for issues and PRs.
 */
async function getCopilotAnalysis(title, body, comments = []) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('No GOOGLE_API_KEY found, skipping Copilot analysis.');
    return null;
  }

  const systemPrompt = `You are an expert GitHub Copilot AI assistant specializing in the Homey Pro Tuya Zigbee app (Node.js, Zigbee2MQTT, ZCL). 
Your task is to act as a deeply empathetic and highly technical GitHub Copilot AI assistant for the Homey Pro Tuya Zigbee app.
CRITICAL RULES:
1. NEVER assume a bug is fixed just because the fingerprint is mapped. If a user says it's broken, it is broken (missing DPs, bad endpoints, power source issue, etc.).
2. Analyze the ENTIRE conversation history, including previous comments, images (if image links are provided, infer context), and any cross-referenced diagnostic IDs.
3. Be humble. Do not state "Already supported." Instead, say "Let's figure out why this isn't working for you."
4. Provide a highly technical root cause hypothesis based on safeDivide(ZCL, Tuya) DP protocol and a precise code fix.

SDK v3 BATTERY & ENERGY RULES:
- NEVER combine measure_battery + alarm_battery on same device (SDK v3 violation: duplicate safeDivide(UI, Flow) Cards)
- Compose declares measure_battery as possibility; UnifiedBatteryHandler adapts at RUNTIME
- Power source varies per variant! Same manufacturerName can be battery, mains, kinetic, unified, or ALL at once
- Battery % sources: ZCL genPowerCfg (cluster safeDivide(0x0001, div) 2) OR Tuya DP 4,10,14,15,21,100-105
- Voltage sources: DPs 33,35,247 (convert via discharge curve: CR2032, AA, Li-ion)
- IAS Zone Status bit 3 = boolean low-battery alarm
- Mains devices: mainsPowered() = true, remove all battery caps at runtime
- safeDivide(Kinetic, self)-powered: TS004x buttons, energy from button press, NO battery

ZIGBEE PROTOCOL CLASSIFICATION:
- TS0601 = Tuya DP (cluster CLUSTERS.TUYA_EF00)  use dpMappings, NEVER add ZCL bindings
- TS0001-TS0504 = Standard ZCL  use configureAttributeReporting(), NEVER add EF00
- safeParse(_TZE200, 204)/284_ prefix = Tuya extended DP  each mfr has DIFFERENT DP maps
- _TZ3000_ prefix = Standard ZCL  may have Tuya extensions on 0xE000/0xE001

VARIANT INTELLIGENCE:
- One manufacturerName  many productIds = NORMAL (same OEM, different products)
- One productId  many manufacturerNames = NORMAL (TS0601 is generic)
- Thousands of variants per driver  NEVER assume all have same safeDivide(energy, features)

FLOW CARDS: 
- ALWAYS wrap getTriggerCard/getConditionCard/getActionCard in try-catch (NEVER use 'getDevice*' suffix)
- Missing flow cards crash the ENTIRE app (not just one driver)

Format your response exactly like this:
<!-- copilot-analysis -->
###  Copilot Auto-Analysis

**Root Cause Hypothesis:**
[Brief 1-2 sentence technical explanation]

**Recommended Action / Code Fix:**
[Brief bullet points or code snippet]`;

  const userPrompt = `Title: ${title}\n\nBody: ${body}\n\nComments: ${comments.join('\n')}\n\nPlease analyze this.`;

  const payload = JSON.stringify({
    system_instruction: { parts: { text: systemPrompt } },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.candidates && json.candidates[0].content) {
            resolve(json.candidates[0].content.parts[0].text);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error('Copilot AI parse error:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Copilot AI request error:', e.message);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { getCopilotAnalysis };
