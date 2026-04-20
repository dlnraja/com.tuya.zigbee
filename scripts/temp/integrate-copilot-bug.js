const fs = require('fs');
const file = '.github/scripts/intelligent-bug-detector.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('copilot-analyzer')) {
  content = content.replace(
    "const fs = require('fs');",
    "const fs = require('fs');\nconst { getCopilotAnalysis } = require('./copilot-analyzer.js');"
  );
  
  const target = "async function analyzeAndRespond(issue) {";
  const replacement = `async function analyzeAndRespond(issue) {
  let copilotAddon = '';
  try {
    const analysis = await getCopilotAnalysis(issue.title, issue.body, issue.comments || []);
    if (analysis) {
      copilotAddon = '\\n\\n' + analysis;
    }
  } catch (e) { console.error('Copilot bug-detector err:', e); }
`;
  
  content = content.replace(target, replacement);
  
  // Find where response is sent
  const commentTarget = "console.log(`Responding to issue #${issue.number} with pattern ${matchedPattern.id}`);";
  const commentReplacement = "console.log(`Responding to issue #${issue.number} with pattern ${matchedPattern.id}`);\n    responseBody += copilotAddon;";
  
  content = content.replace(commentTarget, commentReplacement);
  
  fs.writeFileSync(file, content);
  console.log(' Integrated Copilot analysis into intelligent-bug-detector.js');
} else {
  console.log('Copilot already integrated');
}
