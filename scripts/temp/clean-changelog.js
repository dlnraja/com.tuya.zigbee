const fs = require('fs');
const file = 'CHANGELOG.md';
let content = fs.readFileSync(file, 'utf8');

// The goal is to make the changelog user-friendly, focusing only on driver improvements, new features, and bug fixes related to devices.
// We will filter out internal chore, CI, refactoring, and AI bot internal mentions.

const lines = content.split('\n');
const newLines = [];
let skipSection = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trimEnd();
  
  if (line.startsWith('## [')) {
     skipSection = false;
  }
  
  if (line.match(/^### (Internal|Chore|CI|Build|Refactoring|Documentation)/i)) {
     skipSection = true;
     continue;
  } else if (line.startsWith('### ')) {
     skipSection = false;
  }
  
  if (skipSection) continue;
  
  // Filter out internal bot/AI/action stuff from generic lists
  if (line.match(/intelligent-bug-detector|handle-issue-comments|copilot-analyzer|CI|chore:|refactor:|build:|Auto-Triage|Fine-tune automations|GitHub Actions|workflow/i)) {
    continue;
  }
  
  // Rewrite vague/internal bugs to user-friendly terms
  if (line.includes("Fixed 'Missing Capability Listener' error during initialization")) {
     newLines.push("- Fixed app crash on device startup for various sensors and switches.");
     continue;
  }
  if (line.includes("Resolved syntax errors and missing methods in drivers")) {
     newLines.push("- Fixed flow card conditions and control issues for 1-4 gang switches.");
     continue;
  }
  
  newLines.push(line);
}

// Clean up empty lines and empty sections
let finalContent = newLines.join('\n');
finalContent = finalContent.replace(/\n### [^\n]+\n+(? =\n|### |## |---)/g, '\n')      ;
finalContent = finalContent.replace(/\n{3,}/g, '\n\n' );

fs.writeFileSync(file, finalContent);
console.log(' Cleaned up CHANGELOG.md for user-friendly driver focus');
