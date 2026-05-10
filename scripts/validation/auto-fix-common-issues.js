#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  AUTO FIX COMMON ISSUES v1.0                                                 ║
 * ║  Delegates to the Master Self-Heal engine to resolve driver discrepancies    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

console.log('🔄 Delegating to Master Self-Heal Engine...');

const selfHealPath = path.join(__dirname, '..', 'maintenance', 'master-self-heal.js');

const result = spawnSync('node', [selfHealPath], { stdio: 'inherit' });

if (result.status === 0) {
  console.log('✅ Auto-fixes completed successfully.');
  process.exit(0);
} else {
  console.log('❌ Auto-fixes failed or reported errors.');
  process.exit(result.status || 1);
}
