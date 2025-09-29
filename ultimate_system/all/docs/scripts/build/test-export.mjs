#!/usr/bin/env node
/**
 * 🧪 Test Export Script
 * Script de test pour diagnostiquer les problèmes d'export
 */

import fs from 'fs-extra';
import path from 'path';

console.log('🧪 Test Export Script Starting...');
console.log('Current directory:', process.cwd());

try {
  // Test basic fs-extra
  console.log('Testing fs-extra...');
  const testDir = path.join(process.cwd(), 'docs', 'data');
  console.log('Target directory:', testDir);
  
  // Create directory
  await fs.ensureDir(testDir);
  console.log('✅ Directory created/ensured');
  
  // Test write
  const testData = { test: true, timestamp: new Date().toISOString() };
  const testFile = path.join(testDir, 'test.json');
  await fs.writeJson(testFile, testData, { spaces: 2 });
  console.log('✅ Test file written:', testFile);
  
  // Test read
  const readData = await fs.readJson(testFile);
  console.log('✅ Test file read:', readData);
  
  // Cleanup
  await fs.remove(testFile);
  console.log('✅ Test file cleaned up');
  
  console.log('🎉 All tests passed!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
