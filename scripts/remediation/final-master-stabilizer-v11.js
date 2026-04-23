'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const TARGET_DIRS = ['lib', 'drivers'];

let fixedFiles = 0;

/**
 * V11 Targets: 
 * - Unterminated strings in IPC/Camera drivers
 * - Mangled Flow Card registration (triggering during init)
 * - Restoring missing method bodies in WiFi drivers
 */

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let modified = false;

    // 1. Fix Unterminated RTSP error string
    if (content.includes("must start with rtsp:// or rtsps:")) {
        content = content.replace(/rtsp:\/\/ or rtsps:\s+return;/g, "rtsp:// or rtsps:');\n          return;");
        modified = true;
    }

    // 2. Fix Mangled Flow Cards in WiFiCamera and similar
    // Pattern: const xCard = this._getFlowCard('...')?.trigger(this, {}, {}).catch(this.error || console.error)
    // Replace with standard SDK3 registration
    const flowCardRegex = /const\s+(\w+)\s*=\s*this\._getFlowCard\('([^']+)'\)\?\.trigger\(this,\s*\{\},\s*\{\}\)\.catch\(this\.error\s*\|\|\s*console\.error\)/g;
    if (flowCardRegex.test(content)) {
        content = content.replace(flowCardRegex, "const $1 = this.homey.flow.getActionCard('$2')");
        modified = true;
    }

    // 3. Fix dangling arrow function tails
    // Pattern: args.mode === 'on');});
    content = content.replace(/args\.mode\s*===\s*'on'\);\s*}\);/g, "args.mode === 'on');\n      });");

    // 4. Fix semicolon + brace collision
    content = content.replace(/\);\s*}\);/g, ");\n      });");

    // 5. Restore specifically the WiFi Camera _allocateCloudRTSP method if it was partially deleted
    if (content.includes('async _allocateCloudRTSP() {') && !content.includes('const result = await this._cloudClient.allocateRTSP')) {
        // This is tricky to fix via regex if too much is missing. 
        // We'll look for the orphaned part:
        if (content.includes('if (result.success && result.result && result.result.url)')) {
            content = content.replace(/async _allocateCloudRTSP\(\) \{\s+if \(result\.success/, 
                "async _allocateCloudRTSP() {\n    if (!this._cloudClient) return;\n    const s = this.getSettings();\n    try {\n      const result = await this._cloudClient.allocateRTSP(s.device_id);\n      if (result.success");
            modified = true;
        }
    }

    // 6. Fix specifically the missing _initLocalConnection or similar headers
    // (Handled by general V9/V10 patterns if they were just fragmented arrows)

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[STABILIZED-V11] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- FLOW & STRING STABILIZER V11: CAMERA & IPC REPAIR ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
