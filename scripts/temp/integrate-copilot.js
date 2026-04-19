const fs = require('fs');
const file = '.github/scripts/triage-upstream-enhanced.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('copilot-analyzer')) {
  // Insert require
  content = content.replace(
    "const fs = require('fs');", 
    "const fs = require('fs');\nconst { getCopilotAnalysis } = require('./copilot-analyzer.js');"
  );
  
  // Find where we can insert the copilot call
  // Look for processIssue function
  const target = "async function processIssue(issue) {";
  const replacement = `async function processIssue(issue) {
  // Fetch Copilot analysis if available
  let copilotComment = '';
  try {
    const analysis = await getCopilotAnalysis(issue.title, issue.body, issue.comments || []);
    if (analysis) {
       copilotComment = analysis + '\\n\\n---\\n\\n';
    }
  } catch (e) { console.error('Copilot err:', e); }
  
`;
  
  content = content.replace(target, replacement);
  
  // Find where comment is posted and prepend copilotComment
  const commentTarget = "let commentBody = `<!-- tuya-triage-bot -->\\n";
  const commentReplacement = "let commentBody = copilotComment + `<!-- tuya-triage-bot -->\\n";
  content = content.replace(commentTarget, commentReplacement);
  
  fs.writeFileSync(file, content);
  console.log(' Integrated Copilot analysis into triage-upstream-enhanced.js');
} else {
  console.log('Copilot already integrated');
}
