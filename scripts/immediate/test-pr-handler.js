#!/usr/bin/env node

/**
 * CREATE TEST PR
 * Test auto-pr-handler workflow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🧪 CREATE TEST PR\n');
console.log('═'.repeat(70));

// Create test branch
const branchName = `test-pr-handler-${Date.now()}`;

console.log('\n📝 Creating test branch...');

try {
    // Create and checkout new branch
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
    
    // Create test file
    const testFile = path.join(__dirname, '..', '..', 'TEST_PR.md');
    const testContent = `# TEST PR

This is a test PR to validate the auto-pr-handler workflow.

**Created**: ${new Date().toLocaleString()}
**Branch**: ${branchName}

## Purpose

Test the following:
- ✅ PR detection
- ✅ Auto-labeling
- ✅ Validation scripts
- ✅ Auto-merge capability
- ✅ Contributor notification

## Expected Behavior

1. PR opened
2. Auto-respond with welcome message
3. Labels added: "auto-review"
4. Validation runs
5. If validation passes → Auto-merge
6. Thank you comment posted

---

**This PR should be automatically processed and merged.**
`;
    
    fs.writeFileSync(testFile, testContent);
    
    // Commit and push
    console.log('\n📤 Committing and pushing...');
    execSync('git add TEST_PR.md', { stdio: 'inherit' });
    execSync(`git commit -m "test: Create test PR for auto-handler validation"`, { stdio: 'inherit' });
    execSync(`git push origin ${branchName}`, { stdio: 'inherit' });
    
    console.log('\n✅ Test branch pushed!\n');
    console.log('═'.repeat(70));
    console.log('\n📋 NEXT STEPS:\n');
    console.log('1. Create PR on GitHub:');
    console.log(`   https://github.com/dlnraja/com.tuya.zigbee/compare/${branchName}\n`);
    console.log('2. Or use GitHub CLI:');
    console.log(`   gh pr create --base master --head ${branchName} --title "Test: Auto-PR Handler" --body "Testing auto-pr-handler workflow"\n`);
    console.log('3. Monitor workflow execution:');
    console.log('   https://github.com/dlnraja/com.tuya.zigbee/actions\n');
    console.log('4. Check for:');
    console.log('   ✅ Auto-comment with welcome message');
    console.log('   ✅ Labels added');
    console.log('   ✅ Validation runs');
    console.log('   ✅ Auto-merge (if validation passes)\n');
    console.log('═'.repeat(70));
    console.log('\n✅ TEST PR READY!\n');
    
    // Save instructions
    const instructionsFile = path.join(__dirname, '..', '..', 'reports', 'TEST_PR_INSTRUCTIONS.md');
    const instructions = `# TEST PR INSTRUCTIONS

**Branch**: ${branchName}
**Created**: ${new Date().toLocaleString()}

## Create PR

### Option 1: GitHub Web

1. Visit: https://github.com/dlnraja/com.tuya.zigbee/compare/${branchName}
2. Click "Create Pull Request"
3. Title: "Test: Auto-PR Handler"
4. Description: "Testing auto-pr-handler workflow"
5. Click "Create Pull Request"

### Option 2: GitHub CLI

\`\`\`bash
gh pr create --base master --head ${branchName} --title "Test: Auto-PR Handler" --body "Testing auto-pr-handler workflow"
\`\`\`

## Monitor

1. **Workflow Run**: https://github.com/dlnraja/com.tuya.zigbee/actions
2. **PR Page**: Will be created after PR creation

## Expected Results

1. ✅ PR opened
2. ✅ Auto-comment posted (welcome message)
3. ✅ Labels added: "auto-review"
4. ✅ Validation scripts run
5. ✅ Validation passes (TEST_PR.md is valid)
6. ✅ Auto-merge executed
7. ✅ Thank you comment posted

## Cleanup

After test completes:
\`\`\`bash
git checkout master
git branch -D ${branchName}
git push origin --delete ${branchName}
\`\`\`

---

**Status**: Ready to create PR  
**Date**: ${new Date().toLocaleString()}
`;
    
    const outputDir = path.dirname(instructionsFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(instructionsFile, instructions);
    console.log(`📄 Instructions saved: reports/TEST_PR_INSTRUCTIONS.md\n`);
    
} catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
}

process.exit(0);
