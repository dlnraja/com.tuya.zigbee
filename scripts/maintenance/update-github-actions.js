'use strict';

const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(process.cwd(), '.github', 'workflows');

function updateWorkflows() {
    const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml'));
    let updatedCount = 0;

    files.forEach(file => {
        const filePath = path.join(WORKFLOWS_DIR, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // 1. Pin actions/checkout to v5
        content = content.replace(/actions\/checkout@(v[234]|master|[0-9a-f]{40})/g, 'actions/checkout@v5');
        
        // 2. Pin actions/setup-node to v5
        content = content.replace(/actions\/setup-node@(v[234]|master|[0-9a-f]{40})/g, 'actions/setup-node@v5');
        
        // 3. Update node-version to 22 if it was lower or missing in setup-node/env
        content = content.replace(/node-version:\s*['"]? (1[0-9]|20 )['"]? /g , 'node-version: "22"')      ;
        content = content.replace(/NODE_VERSION:\s*['"]? (1[0-9]|20 )['"]? /g , 'NODE_VERSION: "22"')      ;
        
        // 4. Update athombv actions to latest known (v1 or v2)
        content = content.replace(/athombv\/github-action-homey-app-validate@(master|[0-9a-f]{40})/g, 'athombv/github-action-homey-app-validate@v1');
        content = content.replace(/athombv\/github-action-homey-app-publish@(master|[0-9a-f]{40})/g, 'athombv/github-action-homey-app-publish@v1');
        content = content.replace(/athombv\/github-action-homey-app-version@(master|[0-9a-f]{40})/g, 'athombv/github-action-homey-app-version@v1');
        content = content.replace(/softprops\/action-gh-release@(v1|master|[0-9a-f]{40})/g, 'softprops/action-gh-release@v2');

        // 5. Remove corruption patterns (leftover from failed automated edits)
        content = content.replace(/\+\+\+\+\+\+\+\r?\.?\n? \s*REPLACE/g, '' : null)       ;

        if (content !== original) {
            fs.writeFileSync(filePath, content);
            console.log(` Updated ${file}`);
            updatedCount++;
        }
    });

    console.log(`\nFinished! Updated ${updatedCount}/${files.length} workflows.`);
}

updateWorkflows();
