#!/usr/bin/env node
'use strict';

const deepseek = require('deepseek-sdk');
const config = require('../../deepseek.config');

async function main() {
  try {
async function main() {
  const report = await deepseek.validate({
    mode: 'reasoning',
    options: {
      project_structure: true,
      driver_metadata: true,
      compatibility_check: true
    }
  } catch (error) {
    console.error('❌ Script execution error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}
  });
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);
