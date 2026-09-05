// tools/ci/cleanup-ghost-workflows.js — identify + delete ghost workflows
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const GH = 'C:/Users/Dell/Tools/gh/bin/gh.exe';

function loadJson(p) {
  let raw = fs.readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
}

function main() {
  const workflows = loadJson(process.env.TEMP + '/gh-workflows.json');
  const list = workflows.workflows || workflows;
  console.log('Total workflows on GH:', list.length);

  // Get all local workflow files
  const wfDir = path.join(ROOT, '.github', 'workflows');
  const localFiles = new Set(fs.readdirSync(wfDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')));
  console.log('Local workflow files:', localFiles.size);

  // Find ghosts
  const ghosts = list.filter(w => w.path && w.path.startsWith('.github/workflows/') && !localFiles.has(w.path.replace('.github/workflows/', '')));
  console.log('Ghosts (on GH but deleted from repo):', ghosts.length);
  ghosts.forEach(g => console.log('  ' + g.id + ' - ' + g.path + ' - ' + g.name));

  if (process.argv.includes('--delete')) {
    console.log('\n--- DELETING GHOSTS via Contents API (delete file from repo) ---');
    // NOTE: You can't actually delete a workflow via API by ID. The only way is to
    // delete the file from the repo. But our ghosts have NO file (that's why they're ghosts).
    // Solution: We need to delete them via the GH web UI "Disable workflow" + manually
    // delete, OR we just need to update the GH file content to "rename" the workflow.
    // The actual fix: these workflows are persisted on GH until manually deleted.
    // Use `gh workflow disable` to disable them, then note them for manual deletion.

    let disabled = 0;
    for (const g of ghosts) {
      try {
        execSync(`"${GH}" workflow disable ${g.id}`, { stdio: 'pipe' });
        console.log('  DISABLED ' + g.id + ' (' + g.path + ')');
        disabled++;
      } catch (e) {
        console.log('  FAILED disable ' + g.id + ': ' + (e.message || '').substring(0, 200));
      }
    }
    console.log('\nDisabled: ' + disabled + '/' + ghosts.length);
    console.log('\nNOTE: Disabled workflows remain visible in GH but won\'t run.');
    console.log('For full deletion, visit: https://github.com/dlnraja/com.tuya.zigbee/actions/workflows');
  } else {
    console.log('\nRun with --delete to actually disable them');
  }
}

main();
