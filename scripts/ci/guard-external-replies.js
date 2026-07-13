#!/usr/bin/env node
'use strict';

/**
 * Guard External Replies - Prevents auto-reply bots from posting on external repos
 *
 * This script should be called before any GitHub API comment/issue operation
 * to ensure we never accidentally post on external repositories.
 *
 * Usage: node scripts/ci/guard-external-replies.js [repo]
 * Returns: 0 if safe, 1 if blocked
 */

const REPO = process.argv[2] || '';

// List of external repos we should NEVER post on
const BLOCKED_REPOS = [
  'JohanBendz/com.tuya.zigbee',
  'JohanBendz/',
  'athombv/',
  'Koenkk/',
  'zigpy/',
  'dresden-elektronik/',
];

// Our own repos (safe to post on)
const ALLOWED_REPOS = [
  'dlnraja/com.tuya.zigbee',
  'dlnraja/',
];

function isExternalRepo(repo) {
  if (!repo) return false;

  // Check if it's our own repo
  for (const allowed of ALLOWED_REPOS) {
    if (repo.toLowerCase().startsWith(allowed.toLowerCase())) {
      return false;
    }
  }

  // Check if it's a blocked repo
  for (const blocked of BLOCKED_REPOS) {
    if (repo.toLowerCase().startsWith(blocked.toLowerCase())) {
      return true;
    }
  }

  // If not in our allow list, it's external
  return true;
}

function main() {
  if (!REPO) {
    console.log('Usage: guard-external-replies.js <repo>');
    console.log('Example: guard-external-replies.js JohanBendz/com.tuya.zigbee');
    process.exit(1);
  }

  if (isExternalRepo(REPO)) {
    console.error(`🚫 BLOCKED: Cannot post on external repo: ${REPO}`);
    console.error('This is an external repository. Auto-reply bots are not allowed.');
    process.exit(1);
  }

  console.log(`✅ ALLOWED: Can post on repo: ${REPO}`);
  process.exit(0);
}

main();
