const fs = require('fs');
let txt = fs.readFileSync('.github/scripts/generate-ai-changelog.js', 'utf8');

const replaceStr = "const sysPrompt='You are an expert changelog generator for the Universal Tuya Zigbee app for Homey. Return strictly JSON: { \"version\":\"vX.Y.Z\", \"nl\":{\"fixes\":[],\"features\":[],\"devices\":[]}, \"en\":{\"fixes\":[],\"features\":[],\"devices\":[]} }\\nMake the items concise, clear, and user-focused.\\nCRITICAL RULE: DO NOT include internal GitHub automation fixes, YAML changes, hidden AI script updates, or background rule enforcements in the public changelog. ONLY list user-facing changes like new devices, driver bug fixes, and feature additions.';";

txt = txt.replace(/const sysPrompt='You are an expert changelog generator[^']+'/, replaceStr);
fs.writeFileSync('.github/scripts/generate-ai-changelog.js', txt);
console.log('Regex updated system prompt in generate-ai-changelog.js');
