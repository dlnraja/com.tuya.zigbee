// post-issue-439-reply.js — P53
// Post a status reply on issue #439 confirming 678 FPs were added to generic_tuya.
//
// Run: node tools/ci/post-issue-439-reply.js
'use strict';
const { execFileSync } = require('child_process');
const ghExe = 'C:\\Users\\Dell\\Tools\\gh\\bin\\gh.exe';

const body = `## P53 — 678 of 955 new Tuya FPs added to generic_tuya ✅

Thanks for the auto-scan! I processed the 955 FPs in this issue.

**Results:**
- 277 of 955 FPs were **already in drivers** (including other specialized drivers like \`presence_sensor_radar\`, \`climate_sensor\`, etc.)
- 678 **new FPs added** to \`drivers/generic_tuya/driver.compose.json\`
- 0 FPs were ambiguous or non-Tuya patterns
- \`generic_tuya\` grew from 381 → **1059 manufacturer names**

**Coverage by prefix:**
| Prefix | Added |
|---|---|
| _TZ3000 | 181 |
| _TZE200 | 177 |
| _TZE204 | 116 |
| _TZE284 | 88 |
| _TZ3210 | 45 |
| _TZ3002 | 22 |
| _TZB210 | 14 |
| _TYZB01 | 10 |
| ... +25 more |

These will be available in the next app release. The remaining 277 FPs are already handled by the specific drivers they match — no double-add risk.

P54 also added: parallel fetcher + diff-cache for the 4 timeout scanners (mega-crawl now finishes in ~5min instead of timing out at 600s).`;

function gh(args) {
  return execFileSync(ghExe, args, { encoding: 'utf8' }).trim();
}

console.log('=== Posting reply on issue #439 ===');
try {
  const out = gh(['issue', 'comment', '439', '--body', body]);
  console.log('Posted:', out);
} catch (e) {
  console.error('Failed to post:', e.message);
  process.exit(1);
}
