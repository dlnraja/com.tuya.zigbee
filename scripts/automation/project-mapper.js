#!/usr/bin/env node
'use strict';

/**
 * project-mapper.js - v1.0.0
 * Part of the "Windsurf AI Cascade" system.
 * Maps the project structure, methods, and relationships 
 * to help AI agents understand the codebase quickly and efficiently.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IGNORE = [
  'node_modules', '.git', '.gemini', '.github', 'assets', 
  'locales', 'test', 'tmp', 'build', 'dist'
];

const MAPPING_FILE = path.join(ROOT, '.windsurf-cascade-map.json');

function mapDirectory(dir, depth = 0) {
  if (depth > 5) return null;
  const results = {};
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (IGNORE.includes(file)) continue;
    
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      results[file] = mapDirectory(fullPath, depth + 1);
    } else if (file.endsWith('.js')) {
      results[file] = mapFile(fullPath);
    }
  }
  return results;
}

function mapFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const map = {
    classes: [],
    methods: [],
    requires: [],
    version
  };

  // Find version (vX.X.X pattern)
  const vMatch = content.match(/v\d+\.\d+\.\d+/);
  if (vMatch) map.version = vMatch[0];

  // Find requires
  const reqMatch = content.match(/require\(['"](.+)['"]\)/g);
  if (reqMatch) map.requires = reqMatch.map(r => r.match(/['"](.+)['"]/)[1]);

  // Find classes and methods (simple regex)
  for (const line of lines) {
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) map.classes.push(classMatch[1]);

    const methodMatch = line.match(/^\s*(?:async\s+)? (\w+)\s*\(/ )       ;
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
      map.methods.push(methodMatch[1]);
    }
  }

  return map;
}

console.log(' Mapping project (Windsurf AI Cascade style)...');
const projectMap = {
  timestamp: new Date().toISOString(),
  structure: mapDirectory(ROOT)
};

fs.writeFileSync(MAPPING_FILE, JSON.stringify(projectMap, null, 2));
console.log(' Mapping saved to .windsurf-cascade-map.json');
