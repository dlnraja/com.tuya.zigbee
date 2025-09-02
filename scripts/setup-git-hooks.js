const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function setupHusky() {
  try {
    // Install husky if not already installed
    if (!fs.existsSync(path.join(__dirname, '../node_modules/husky'))) {
      console.log('Installing husky...');
      execSync('npm install --save-dev husky', { stdio: 'inherit' });
    }

    // Initialize husky
    console.log('Setting up husky hooks...');
    execSync('npx husky install', { stdio: 'inherit' });

    // Create pre-commit hook
    const preCommitHook = `#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Lint and test
npm run lint
npm test

# Validate drivers
npm run validate:drivers
`;

    const hooksDir = path.join(__dirname, '../.husky');
    await fs.ensureDir(hooksDir);
    await fs.writeFile(path.join(hooksDir, 'pre-commit'), preCommitHook, { mode: 0o755 });

    // Create commit-msg hook
    const commitMsgHook = `#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Validate commit message format
. "$(dirname "$0")/../node_modules/@commitlint/cli/lib/cli.js" --edit "$1"
`;
    await fs.writeFile(path.join(hooksDir, 'commit-msg'), commitMsgHook, { mode: 0o755 });

    console.log('Git hooks have been set up successfully!');
  } catch (error) {
    console.error('Error setting up Git hooks:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupHusky().catch(console.error);
}

module.exports = { setupHusky };
