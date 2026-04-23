const fs = require('fs');
const file = 'CHANGELOG.md';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
const newLines = [];
let skipSection = false;

// We want to aggressively filter out non-driver things.
// Patterns to remove:
const removePatterns = [
  /chore/i, /refactor/i, /build/i, /CI/i, /bot/i, /AI/i, /automation/i, /triage/i, /pipeline/i,
  /github action/i, /lint/i, /diagnostic report/i, /intelligent-bug-detector/i, /handle-issue-comments/i,
  /copilot/i, /workflow/i, /test coverage/i, /typo/i, /code cleanup/i, /script/i, /dependency/i,
  /update README/i, /update docs/i, /internal/i, /API key/i, /gmail/i, /imap/i, /oauth/i
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trimEnd();
  
  if (line.startsWith('## [')) {
     skipSection = false;
  }
  
  // Skip entire sections if they are clearly internal
  if (line.match(/^### (Internal|Chore|CI|Build|Refactoring|Documentation|Scripts|Automations|Bots)/i)) {
     skipSection = true;
     continue;
  } else if (line.startsWith('### ')) {
     skipSection = false;
  }
  
  if (skipSection) continue;
  
  // Check if the line itself should be removed based on patterns
  let shouldRemove = false;
  if (line.startsWith('-')) {
    for (const pattern of removePatterns) {
      if (pattern.test(line)) {
        shouldRemove = true;
        break;
      }
    }
  }
  
  if (!shouldRemove) {
    newLines.push(line);
  }
}

// Re-assemble and clean up empty sections
let finalContent = newLines.join('\n');

// Clean up empty sections (e.g. ### Bug Fixes followed by empty line or another header)
let previousContent;
do {
  previousContent = finalContent;
  finalContent = finalContent.replace(/\n### [^\n]+\n+(? =\n|### |## |---|$ )/g , '\n')      ;
} while (finalContent !== previousContent);

// Clean up empty releases (## [x.x.x] ... --- with no bullet points inside)
do {
  previousContent = finalContent;
  finalContent = finalContent.replace(/\n## \[[^\]]+\][^\n]*\n+(?:---|\n(? =## ))/g, '\n---\n')      ;
} while (finalContent !== previousContent);

// Clean up multiple empty lines
finalContent = finalContent.replace(/\n{3,}/g, '\n\n' );

fs.writeFileSync(file, finalContent);
console.log(' Deep cleaned CHANGELOG.md for pure driver focus');
