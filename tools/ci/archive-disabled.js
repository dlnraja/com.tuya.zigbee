#!/usr/bin/env node
// archive-disabled.js
const fs = require('fs');
const path = require('path');

const src = '.github/workflows/.disabled';
const dst = '.github/workflows/archive';
fs.mkdirSync(dst, { recursive: true });

const files = fs.readdirSync(src);
const fileList = files.map(f => '- `' + f + '`').join('\n');

const readme = `# Archived workflows

These workflows were DISABLED in P9 (2026-07-12) when continuous-flow.yml was created.
Their work is now done by continuous-flow.yml (daily 03:00 UTC) + the local Mavis cron.

## Why archived (not deleted)

- Reference for re-enabling if continuous-flow misses a feature
- Documentation of historical logic
- Backup in case of regression in continuous-flow

## How to re-enable

1. Move the .yml file back to .github/workflows/
2. Update the cron to a non-conflicting time
3. Test on a feature branch first
4. Remove the corresponding step from continuous-flow if duplicate

## Reactivation checklist

- [ ] Add upstream-guard invocation
- [ ] Add concurrency: cancel-in-progress
- [ ] Add timeout-minutes
- [ ] Add path filter (don't run on docs only)
- [ ] Add continue-on-error on each step
- [ ] Update cron to non-conflict time
- [ ] Document in continuous-flow.yml what's now covered

## List

${fileList}
`;

fs.writeFileSync(path.join(dst, 'README.md'), readme);
let moved = 0;
for (const f of files) {
  const s = path.join(src, f);
  const d = path.join(dst, f);
  fs.copyFileSync(s, d);
  fs.unlinkSync(s);
  moved++;
}
fs.rmdirSync(src);
console.log('Moved ' + moved + ' files to archive/');
console.log('Created README.md');
