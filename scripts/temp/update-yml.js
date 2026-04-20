const fs = require('fs');
let txt = fs.readFileSync('.github/workflows/daily-everything.yml', 'utf8');

const strToReplace = "            node .github/scripts/fetch-gmail-diagnostics.js || true\n          else\n            echo \"Skipping Gmail (only runs at 08:00+14:00+20:00 UTC)\"\n          fi";

const newStr = "            node .github/scripts/fetch-gmail-diagnostics.js || true\n          else\n            # Also allow manual dispatch to run gmail diagnostics\n            if [ \"$\{\{ github.event_name \}\}\" = \"workflow_dispatch\" ]; then\n              node .github/scripts/fetch-gmail-diagnostics.js || true\n            else\n              echo \"Skipping Gmail\"\n            fi\n          fi";

if (txt.includes(strToReplace)) {
  txt = txt.replace(strToReplace, newStr);
  fs.writeFileSync('.github/workflows/daily-everything.yml', txt);
  console.log('Fixed yml script');
} else {
  console.log('Target string not found');
}
