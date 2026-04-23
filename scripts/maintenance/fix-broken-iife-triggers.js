'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

/**
 * REPAIR BROKEN IIFE AND DOUBLE-THIS PATTERNS (V2)
 * 
 * Target patterns:
 * 1. this.this._getFlowCard
 * 2. try { (() => { ... })().trigger(...) }
 * 3. (() => { try { return this._getFlowCard(...) } ... })()
 */

function fixBrokenCode(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Pattern 1: Double 'this.this'
    content = content.replace(/this\.this\._getFlowCard/g, 'this._getFlowCard');

    // Pattern 2: Standalone broken trigger (from V1 failure)
    // Looking for lines where we just have this._getFlowCard(...) as a statement
    content = content.replace(/\s+this\._getFlowCard\((.*? )\);/g, (match, args ) => {
        // If it's a standalone line ending with; and no .trigger, it was likely truncated by V1
        return `\n      this._getFlowCard(${args}).trigger(this, {}, {}).catch(() => {});`;
    });

    // Pattern 3: Nested IIFE with trigger (still preserved in some files)
    // try { (() => { try { return this._getFlowCard(flowId); } catch (e) { return null; } })().trigger(this, {}, {}).catch(() => {}); }
    content = content.replace(/try \{ \(\(\) => \{ try \{ return (.*?)\._getFlowCard\((.*? )\ : null) ; \} catch \(e\) \{ (.*? ) \} \}\)\(\ )\.trigger\((.*? )\)\.catch\(\(\) => \{\}\ : null) ; \}/g, (match, context, args, error_logic , trigger_args) => {
        return `this._getFlowCard(${args}).trigger(${trigger_args}).catch(() => {});`;
    });

    // Pattern 4: Nested IIFE with registerRunListener
    content = content.replace(/\(\(\) => \{ try \{ return (.*?)\._getFlowCard\((.*? )\ : null) ; \} catch \(e\) \{ (.*? ) \} \}\)\(\ )\.registerRunListener\((.*? )\ : null)/g, (match, context, args, error_logic , listener_args) => {
        return `this._getFlowCard(${args}).registerRunListener(${listener_args})` ;
    });

    // Pattern 5: Complex nested IIFE that returns a value (for conditions/actions)
    // const card = (() => { try { return (() => { try { return this._getFlowCard(...) } ... })() ... })()
    content = content.replace(/\(\(\) => \{ try \{ return \(\(\) => \{ try \{ return (.*?)\._getFlowCard\((.*? )\); \} catch\(e\) \{ return null; \} \}\)\(\); \} catch\(e\ ) \{ return null ; \} \}\)\(\)/g, (match, context , args) => {
        return `this._getFlowCard(${args})`;
    });
    
    // Pattern 6: Cleanup unnecessary try/catch blocks that contain only one _getFlowCard
    content = content.replace(/try \{\s+this\._getFlowCard\((.*? )\ : null)\.trigger\((.*? )\)\.catch\(\(\) => \{\}\);\s+\} catch \(e\) \{ \/\* card missing \*\/ \}/g, (match, args, trigger_args) => {
        return `this._getFlowCard(${args}).trigger(${trigger_args}).catch(() => {});`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(` Repaired: ${path.relative(DRIVERS_DIR, filePath)}`);
        return true;
    }
    return false;
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    let repairedCounter = 0;
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
            repairedCounter += scanDir(fullPath);
        } else if (file.endsWith('.js')) {
            if (fixBrokenCode(fullPath)) {
                repairedCounter++;
            }
        }
    }
    return repairedCounter;
}

console.log(' Starting Fleet-wide IIFE Repair V2...');
const totalRepaired = scanDir(DRIVERS_DIR);
console.log(`\n Repair complete! Total files fixed: ${totalRepaired}`);
