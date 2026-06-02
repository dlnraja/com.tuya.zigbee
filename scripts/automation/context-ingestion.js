#!/usr/bin/env node
/**
 * Context Ingestion Script - Phase 0
 * Inspired by nicedreamzapp/claude-code-local patterns
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();

// Execute git commands
function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

// 1. Parse commit history
const commits = git('git log --all --oneline -100');
fs.writeFileSync('.context_commit_history.txt', commits);
console.log('✅ Commit history saved');

// 2. List branches
const branches = git('git branch -a');
fs.writeFileSync('.context_branches.txt', branches);
console.log('✅ Branches saved');

// 3. Parse dotfiles
const dotfiles = ['.ai/rules/.cursorrules', '.ai/rules/.windsurfrules', '.eslintrc.json', '.prettierrc', '.gitattributes', '.gitignore', '.homeyignore'];
let dotfilesContent = '=== DOTFILES DUMP ===\n\n';
for (const f of dotfiles) {
  const fp = path.join(ROOT, f);
  if (fs.existsSync(fp)) {
    try {
      const content = fs.readFileSync(fp, 'utf8');
      dotfilesContent += `\n--- ${f} ---\n${content.substring(0, 2000)}\n`;
    } catch (e) {}
  }
}
fs.writeFileSync('.context_dotfiles_dump.txt', dotfilesContent);
console.log('✅ Dotfiles dump saved');

// 4. Create checkpoint
const checkpoint = `# Context Checkpoint - Phase 0
Date: ${new Date().toISOString()}
Branches: See .context_branches.txt
Commits analyzed: See .context_commit_history.txt
Dotfiles parsed: ${dotfiles.length} files
Next: Phase 1 - Triage PRs/Issues + Forum Cross-Reference

## Summary
- Branches: ${branches.split('\n').filter(b => b.trim()).length}
- Recent commits: ${commits.split('\n').filter(c => c.trim()).length}
- Dotfiles: ${dotfiles.length}
`;
fs.writeFileSync('.context_checkpoint.md', checkpoint);
console.log('✅ Checkpoint created');

// 5. Memory JSON
const memory = {
  version: '5.11.212',
  phase: 0,
  timestamp: new Date().toISOString(),
  branches: branches.split('\n').filter(b => b.trim() && !b.startsWith(' ')).map(b => b.replace(/^\* /, '').trim()),
  last_commits: commits.split('\n').filter(c => c.trim()).slice(0, 10),
  dotfiles_parsed: dotfiles,
  shadow_mode: true,
  pending_tasks: []
};
fs.writeFileSync('.context_memory.json', JSON.stringify(memory, null, 2));
console.log('✅ Memory JSON created');

// 6. Action log
const log = [];
function logAction(action, details) {
  const entry = { timestamp: new Date().toISOString(), action, details };
  log.push(entry);
  fs.writeFileSync('.context_memory_log.json', JSON.stringify(log, null, 2));
}

logAction('context_ingestion', { phase: 0, status: 'complete' });
console.log('✅ Action log created');

console.log('\n=== PHASE 0 COMPLETE ===');
console.log('Files created:');
console.log('- .context_commit_history.txt');
console.log('- .context_branches.txt');
console.log('- .context_dotfiles_dump.txt');
console.log('- .context_checkpoint.md');
console.log('- .context_memory.json');
console.log('- .context_memory_log.json');
console.log('\nNext: Phase 1 - Scan GitHub PRs/Issues + Cross-Reference Forum');