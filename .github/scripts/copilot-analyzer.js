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
4. Provide a highly technical root cause hypothesis based on ZCL/Tuya DP protocol and a precise code fix.
Format your response exactly like this:
<!-- copilot-analysis -->
### 🤖 Copilot Auto-Analysis

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
