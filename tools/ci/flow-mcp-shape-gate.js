#!/usr/bin/env node
'use strict';
// Flow-card shape gate for AI assistants (Homey MCP server / ChatGPT app, mcp.athom.com).
// WHY: the MCP server validates the whole flow-card catalogue of a Homey; ONE card from ANY app with
// a dropdown value whose `title` is null, or a `droptoken` that is not an array, makes
// list_flow_trigger_cards / list_flow_action_cards fail for every app on that Homey
// (community.homey.app t/155885 and t/145181, 2026). Homey's documented dropdown value shape is
// { id, title } (apps.developer.homey.app/the-basics/flow/arguments).
// Checks flow args only (device settings dropdowns legitimately use `label`).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

function checkCard(card, where, issues) {
  if (!card || typeof card !== 'object') {return;}
  if (card.droptoken !== undefined && !Array.isArray(card.droptoken)) {
    issues.push(`${where}: droptoken must be an array`);
  }
  if (!card.title || typeof card.title !== 'object' || !card.title.en) {issues.push(`${where}: missing title.en`);}
  for (const arg of Array.isArray(card.args) ? card.args : []) {
    if (arg && arg.type === 'dropdown') {
      for (const v of Array.isArray(arg.values) ? arg.values : []) {
        const t = v && v.title;
        if (t == null || (typeof t === 'object' && !t.en) || t === '') {
          issues.push(`${where}: dropdown ${arg.name} value ${v && v.id} has no title`);
        }
      }
    }
  }
}

function checkFlowObject(flow, where, issues) {
  for (const kind of ['triggers', 'conditions', 'actions']) {
    for (const c of (flow && flow[kind]) || []) {checkCard(c, `${where} ${kind}/${c && c.id}`, issues);}
  }
}

function run(root = ROOT) {
  const issues = [];
  const files = execSync("git ls-files '.homeycompose/flow/**/*.json' 'drivers/*/driver.flow.compose.json'",
    { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  for (const f of files) {
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); } catch { continue; }
    if (f.endsWith('driver.flow.compose.json')) {checkFlowObject(j, f, issues);}
    else {checkCard(j, f, issues);}
  }
  return issues;
}

module.exports = { checkCard, run };

if (require.main === module) {
  const issues = run();
  for (const i of issues.slice(0, 50)) {console.error(`[flow-mcp-shape] ${i}`);}
  if (issues.length) {
    console.error(`[flow-mcp-shape] FAIL ${issues.length} issue(s)`);
    process.exit(1);
  }
  console.log('[flow-mcp-shape] OK');
}
