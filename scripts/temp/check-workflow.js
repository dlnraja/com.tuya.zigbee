const fs = require('fs');
const file = '.github/workflows/upstream-auto-triage.yml';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('GOOGLE_API_KEY')) {
  // We need to pass the GOOGLE_API_KEY to the run step so the script can access it
  const target = "env:\n          GITHUB_TOKEN: ${{ secrets.GH_PAT }}";
  const replacement = "env:\n          GITHUB_TOKEN: ${{ secrets.GH_PAT }}\n          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}";
  
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log(' Added GOOGLE_API_KEY to upstream-auto-triage.yml');
  } else {
     // Alternate target if it varies slightly
     const altTarget = "env:\n          GH_PAT: ${{ secrets.GH_PAT }}";
     const altReplacement = "env:\n          GH_PAT: ${{ secrets.GH_PAT }}\n          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}";
     if (content.includes(altTarget)) {
       content = content.replace(altTarget, altReplacement);
       fs.writeFileSync(file, content);
       console.log(' Added GOOGLE_API_KEY to upstream-auto-triage.yml (alt)');
     } else {
       console.log('Could not find env block in upstream-auto-triage.yml');
     }
  }
} else {
  console.log('GOOGLE_API_KEY already in upstream-auto-triage.yml');
}
