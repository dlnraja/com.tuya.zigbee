#!/usr/bin/env node
'use strict';

/**
 * Diagnostic Auto-Resolver - Automatically detects and suggests fixes for common issues
 * Used by GitHub Actions to analyze build failures, runtime errors, and suggest improvements
 * 
 * v7.5.4: Initial implementation
 */

const fs = require('fs');
const path = require('path');

class DiagnosticAutoResolver {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.projectRoot = options.projectRoot || path.join(__dirname, '..');
  }

  /**
   * Scan project for common issues
   */
  async scan() {
    const issues = [];

    // 1. Check for circular dependencies
    issues.push(...this._checkCircularDeps());

    // 2. Check for missing markReady()
    issues.push(...this._checkMarkReady());

    // 3. Check for unprotected JSON.parse
    issues.push(...this._checkUnprotectedJsonParse());

    // 4. Check version alignment
    issues.push(...this._checkVersionAlignment());

    // 5. Check for forum references in active code
    issues.push(...this._checkForumRefs());

    return issues.filter(Boolean);
  }

  /**
   * Check for known circular dependencies
   */
  _checkCircularDeps() {
    const issues = [];
    const libDir = path.join(this.projectRoot, 'lib', 'utils');
    if (!fs.existsSync(libDir)) return issues;

    const files = fs.readdirSync(libDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(libDir, file), 'utf8');
      const requires = content.match(/require\(['"]\.\/([^'"]+)['"]\)/g) || [];
      for (const req of requires) {
        const dep = req.match(/require\(['"]\.\/([^'"]+)['"]\)/)?.[1];
        if (dep) {
          const depPath = path.join(libDir, dep + '.js');
          if (fs.existsSync(depPath)) {
            const depContent = fs.readFileSync(depPath, 'utf8');
            if (depContent.includes(`require('./${file.replace('.js', '')}')`)) {
              issues.push({
                type: 'circular_dependency',
                severity: 'high',
                file: `lib/utils/${file}`,
                message: `Circular dependency: ${file} <-> ${dep}.js`,
                fix: `Break the cycle by importing from MathUtils.js instead`
              });
            }
          }
        }
      }
    }
    return issues;
  }

  /**
   * Check that markReady() is called in app.js
   */
  _checkMarkReady() {
    const appPath = path.join(this.projectRoot, 'app.js');
    if (!fs.existsSync(appPath)) return [];
    const content = fs.readFileSync(appPath, 'utf8');
    if (!content.includes('markReady()')) {
      return [{
        type: 'missing_markReady',
        severity: 'critical',
        file: 'app.js',
        message: 'markReady() not called - causes invalid_state error',
        fix: 'Add this.homey.markReady() at end of onInit()'
      }];
    }
    return [];
  }

  /**
   * Check for unprotected JSON.parse calls
   */
  _checkUnprotectedJsonParse() {
    const issues = [];
    const scanDirs = ['lib/tuya-local', 'lib/utils'];
    for (const dir of scanDirs) {
      const fullDir = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullDir)) continue;
      const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(fullDir, file), 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('JSON.parse') && !lines[i].includes('try') && !lines[i].includes('catch')) {
            // Check if previous lines have try
            const prevLines = lines.slice(Math.max(0, i - 3), i).join('\n');
            if (!prevLines.includes('try')) {
              issues.push({
                type: 'unprotected_json_parse',
                severity: 'medium',
                file: `${dir}/${file}`,
                line: i + 1,
                message: 'JSON.parse without try-catch - can crash on malformed input',
                fix: 'Wrap in try-catch: let info; try { info = JSON.parse(payload); } catch (e) { return; }'
              });
            }
          }
        }
      }
    }
    return issues;
  }

  /**
   * Check version alignment across app.json, .homeycompose/app.json, package.json
   */
  _checkVersionAlignment() {
    const files = ['app.json', '.homeycompose/app.json', 'package.json'];
    const versions = {};
    for (const file of files) {
      const fullPath = path.join(this.projectRoot, file);
      if (fs.existsSync(fullPath)) {
        try {
          const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          versions[file] = json.version;
        } catch (e) {}
      }
    }
    const uniqueVersions = [...new Set(Object.values(versions))];
    if (uniqueVersions.length > 1) {
      return [{
        type: 'version_mismatch',
        severity: 'high',
        message: `Version mismatch: ${JSON.stringify(versions)}`,
        fix: 'Align all versions to the same value'
      }];
    }
    return [];
  }

  /**
   * Check for active forum references in YMLs
   */
  _checkForumRefs() {
    const issues = [];
    const ymlDir = path.join(this.projectRoot, '.github', 'workflows');
    if (!fs.existsSync(ymlDir)) return issues;
    const ymls = fs.readdirSync(ymlDir).filter(f => f.endsWith('.yml'));
    for (const yml of ymls) {
      const content = fs.readFileSync(path.join(ymlDir, yml), 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/forum/i) && !lines[i].trim().startsWith('#')) {
          issues.push({
            type: 'forum_reference',
            severity: 'low',
            file: `.github/workflows/${yml}`,
            line: i + 1,
            message: 'Active forum reference in YML',
            fix: 'Replace "forum" with "community" for silent operation'
          });
        }
      }
    }
    return issues;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const resolver = new DiagnosticAutoResolver({
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    projectRoot: path.join(__dirname, '..')
  });

  resolver.scan().then(issues => {
    if (issues.length === 0) {
      console.log('✅ No issues found');
    } else {
      console.log(`⚠️ Found ${issues.length} issues:\n`);
      for (const issue of issues) {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🔵';
        console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.file) console.log(`   File: ${issue.file}${issue.line ? ':' + issue.line : ''}`);
        if (issue.fix) console.log(`   Fix: ${issue.fix}`);
        console.log('');
      }
    }
    process.exit(issues.some(i => i.severity === 'critical') ? 1 : 0);
  });
}

module.exports = DiagnosticAutoResolver;