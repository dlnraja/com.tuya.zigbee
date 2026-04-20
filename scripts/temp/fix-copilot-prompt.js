const fs = require('fs');
const file = '.github/scripts/copilot-analyzer.js';
let content = fs.readFileSync(file, 'utf8');

// Enhance the system prompt to instruct the AI to consider the entire history, images, and cross-referenced logs
const oldPrompt = "Your task is to analyze the issue and provide a concise, highly technical summary and recommended fix.";
const newPrompt = `Your task is to act as a deeply empathetic and highly technical GitHub Copilot AI assistant for the Homey Pro Tuya Zigbee app.
CRITICAL RULES:
1. NEVER assume a bug is fixed just because the fingerprint is mapped. If a user says it's broken, it is broken (missing DPs, bad endpoints, power source issue, etc.).
2. Analyze the ENTIRE conversation history, including previous comments, images (if image links are provided, infer context), and any cross-referenced diagnostic IDs.
3. Be humble. Do not state "Already supported." Instead, say "Let's figure out why this isn't working for you."
4. Provide a highly technical root cause hypothesis based on ZCL/Tuya DP protocol and a precise code fix.`;

content = content.replace(oldPrompt, newPrompt);
fs.writeFileSync(file, content);
console.log(' Enhanced copilot-analyzer.js system prompt for empathy and deep analysis');
