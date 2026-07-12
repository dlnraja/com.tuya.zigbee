#!/usr/bin/env node
/**
 * local-agenttrace.js v2.0
 *
 * Real implementation of agenttrace-style analysis for Codex sessions.
 * Handles the ACTUAL event structure (event_msg + response_item + session_meta).
 *
 * @author Mavis investigation 2026-07-12
 * @version 2.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CODEX_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.codex', 'sessions', '2026', '07', '10');
const REPORT_PATH = path.join(__dirname, '..', '..', '.github', 'state', 'agenttrace-local-report.json');

function parseSessionFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());
  const session = {
    file: path.basename(filePath),
    events: [],
    meta: null,
    toolCalls: [],
    userMessages: [],
    assistantMessages: [],
    reasonings: [],
    patches: [],
    subagents: [],
    tokens: { input: 0, output: 0, cached: 0, total: 0 },
    errors: [],
  };

  for (const line of lines) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    session.events.push(event);
    const t1 = event.type;
    const p = event.payload || {};
    const t2 = p.type;

    // Session meta
    if (t1 === 'session_meta') {
      session.meta = {
        session_id: p.session_id,
        id: p.id,
        parent_thread_id: p.parent_thread_id,
        timestamp: p.timestamp,
        originator: p.originator,
        agent_nickname: p.agent_nickname,
        agent_path: p.agent_path,
        thread_source: p.thread_source,
        model_provider: p.model_provider,
        cli_version: p.cli_version,
        depth: p.source?.subagent?.thread_spawn?.depth || 0,
      };
    }

    // Tokens (cumulative)
    if (t1 === 'event_msg' && t2 === 'token_count') {
      const u = p.info?.total_token_usage || {};
      session.tokens.input = u.input_tokens || 0;
      session.tokens.output = u.output_tokens || 0;
      session.tokens.cached = u.cached_input_tokens || 0;
      session.tokens.total = (u.input_tokens || 0) + (u.output_tokens || 0);
    }

    // User messages
    if (t1 === 'event_msg' && t2 === 'user_message') {
      session.userMessages.push({ text: (p.message || '').substring(0, 500), timestamp: event.timestamp });
    }

    // Agent reasoning (internal thinking)
    if (t1 === 'event_msg' && t2 === 'agent_reasoning') {
      session.reasonings.push({ text: (p.text || '').substring(0, 300), timestamp: event.timestamp });
    }

    // Agent messages (assistant output)
    if (t1 === 'event_msg' && t2 === 'agent_message') {
      session.assistantMessages.push({ text: (p.message || '').substring(0, 500), timestamp: event.timestamp, phase: p.phase });
    }

    // MCP tool calls (codex_apps, etc.)
    if (t1 === 'event_msg' && t2 === 'mcp_tool_call_end') {
      const inv = p.invocation || {};
      session.toolCalls.push({
        name: inv.tool || 'mcp_unknown',
        server: inv.server || 'unknown',
        args: JSON.stringify(inv.arguments || {}).substring(0, 200),
        success: p.result?.success !== false,
        timestamp: event.timestamp,
      });
    }

    // Custom tool calls (app-side)
    if (t1 === 'response_item' && t2 === 'custom_tool_call') {
      session.toolCalls.push({
        name: p.name || 'custom_unknown',
        server: 'app',
        args: JSON.stringify(p.input || {}).substring(0, 200),
        success: true, // output follows separately
        timestamp: event.timestamp,
      });
    }

    // Function calls
    if (t1 === 'response_item' && t2 === 'function_call') {
      session.toolCalls.push({
        name: p.name || 'function_unknown',
        server: 'function',
        args: JSON.stringify(p.arguments || {}).substring(0, 200),
        success: true,
        timestamp: event.timestamp,
      });
    }

    // Patch apply
    if (t1 === 'event_msg' && t2 === 'patch_apply_end') {
      session.patches.push({
        success: !p.stderr,
        stderr: p.stderr?.substring(0, 300),
        timestamp: event.timestamp,
      });
    }

    // Subagent activity
    if (t1 === 'event_msg' && t2 === 'sub_agent_activity') {
      session.subagents.push({
        description: (p.description || '').substring(0, 200),
        timestamp: event.timestamp,
      });
    }
  }

  return session;
}

function computeHealthScore(session) {
  let score = 100;
  const failedTools = session.toolCalls.filter((t) => !t.success).length;
  const failedPatches = session.patches.filter((p) => !p.success).length;
  score -= Math.min(20, failedTools * 2);
  score -= Math.min(20, failedPatches * 3);
  if (session.toolCalls.length > 5) score += 5;
  if (session.subagents.length > 0) score += 5;
  if (session.tokens.cached > 0 && session.tokens.cached / Math.max(1, session.tokens.input) > 0.8) {
    score += 5; // Good cache hit rate
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function analyzeSession(session) {
  const tools = {};
  const servers = {};
  let successCount = 0;
  let failCount = 0;
  for (const tc of session.toolCalls) {
    tools[tc.name] = (tools[tc.name] || 0) + 1;
    servers[tc.server] = (servers[tc.server] || 0) + 1;
    if (tc.success) successCount++;
    else failCount++;
  }
  const health = computeHealthScore(session);
  const totalCalls = successCount + failCount;
  return {
    file: session.file,
    meta: session.meta,
    counts: {
      events: session.events.length,
      userMessages: session.userMessages.length,
      assistantMessages: session.assistantMessages.length,
      reasonings: session.reasonings.length,
      toolCalls: session.toolCalls.length,
      patches: session.patches.length,
      subagents: session.subagents.length,
    },
    tokens: session.tokens,
    cacheHitRate: session.tokens.input > 0 ? (session.tokens.cached / session.tokens.input * 100).toFixed(1) + '%' : 'N/A',
    toolDistribution: tools,
    serverDistribution: servers,
    toolSuccessRate: totalCalls > 0 ? (successCount / totalCalls * 100).toFixed(1) + '%' : 'N/A',
    failedTools: failCount,
    failedPatches: session.patches.filter((p) => !p.success).length,
    health,
  };
}

function main() {
  const args = process.argv.slice(2);
  const sessionFilter = args.find((a) => a.startsWith('--session='))?.split('=')[1];

  if (!fs.existsSync(CODEX_DIR)) {
    console.error(`Codex sessions not found at ${CODEX_DIR}`);
    process.exit(1);
  }

  let files = fs.readdirSync(CODEX_DIR).filter((f) => f.endsWith('.jsonl'));
  if (sessionFilter) files = files.filter((f) => f.includes(sessionFilter));

  console.log(`Local AgentTrace v2.0 — analyzing ${files.length} Codex sessions\n`);

  const analyses = [];
  let totalEvents = 0, totalErrors = 0, totalToolCalls = 0;
  let totalInput = 0, totalOutput = 0, totalCached = 0;
  let totalPatches = 0, totalSubagents = 0, totalFailedPatches = 0;
  let avgHealth = 0;

  for (const f of files) {
    const session = parseSessionFile(path.join(CODEX_DIR, f));
    const a = analyzeSession(session);
    analyses.push(a);
    totalEvents += a.counts.events;
    totalToolCalls += a.counts.toolCalls;
    totalPatches += a.counts.patches;
    totalSubagents += a.counts.subagents;
    totalFailedPatches += a.failedPatches;
    totalInput += a.tokens.input;
    totalOutput += a.tokens.output;
    totalCached += a.tokens.cached;
    avgHealth += a.health;
  }
  avgHealth = (avgHealth / Math.max(1, analyses.length)).toFixed(1);
  const totalTokens = totalInput + totalOutput;
  const cacheHitRate = totalInput > 0 ? (totalCached / totalInput * 100).toFixed(1) + '%' : 'N/A';

  // Tool distribution aggregation
  const totalTools = {};
  const totalServers = {};
  for (const a of analyses) {
    for (const [n, c] of Object.entries(a.toolDistribution)) totalTools[n] = (totalTools[n] || 0) + c;
    for (const [n, c] of Object.entries(a.serverDistribution)) totalServers[n] = (totalServers[n] || 0) + c;
  }
  const toolList = Object.entries(totalTools).sort((a, b) => b[1] - a[1]);

  console.log('=== TOP-LEVEL METRICS ===');
  console.log(`Sessions: ${analyses.length}`);
  console.log(`Total events: ${totalEvents}`);
  console.log(`Total tool calls: ${totalToolCalls}`);
  console.log(`Total patches: ${totalPatches} (failed: ${totalFailedPatches})`);
  console.log(`Total subagents spawned: ${totalSubagents}`);
  console.log(`Total input tokens: ${(totalInput / 1e6).toFixed(1)}M (cached: ${(totalCached / 1e6).toFixed(1)}M, ${cacheHitRate})`);
  console.log(`Total output tokens: ${(totalOutput / 1e6).toFixed(1)}M`);
  console.log(`Total tokens: ${(totalTokens / 1e6).toFixed(1)}M`);
  console.log(`Avg health score: ${avgHealth}/100`);
  console.log('');

  console.log('=== TOOL DISTRIBUTION (top 15) ===');
  for (const [n, c] of toolList.slice(0, 15)) {
    console.log(`  ${n.padEnd(35)} ${c}`);
  }
  console.log('');

  console.log('=== SERVER DISTRIBUTION ===');
  for (const [n, c] of Object.entries(totalServers)) {
    console.log(`  ${n.padEnd(20)} ${c}`);
  }
  console.log('');

  console.log('=== SESSIONS OVERVIEW ===');
  for (const a of analyses) {
    const m = a.meta || {};
    const nick = m.agent_nickname || m.originator || 'main';
    console.log(`  ${nick} (depth ${m.depth || 0}) | agent_path: ${m.agent_path || '-'} | model: ${m.model_provider || '?'}`);
    console.log(`    events: ${a.counts.events} | user: ${a.counts.userMessages} | asst: ${a.counts.assistantMessages} | tools: ${a.counts.toolCalls} | patches: ${a.counts.patches} | subagents: ${a.counts.subagents} | health: ${a.health}/100`);
    console.log(`    tokens: in=${(a.tokens.input / 1e6).toFixed(1)}M (cached ${a.cacheHitRate}) | out=${(a.tokens.output / 1e3).toFixed(0)}K | tool-success: ${a.toolSuccessRate}`);
  }
  console.log('');

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    summary: {
      sessions: analyses.length,
      totalEvents,
      totalToolCalls,
      totalPatches,
      totalSubagents,
      totalFailedPatches,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalCachedTokens: totalCached,
      cacheHitRate,
      avgHealth: parseFloat(avgHealth),
    },
    toolDistribution: totalTools,
    serverDistribution: totalServers,
    sessions: analyses.map((a) => ({
      file: a.file,
      meta: a.meta,
      counts: a.counts,
      tokens: a.tokens,
      cacheHitRate: a.cacheHitRate,
      toolDistribution: a.toolDistribution,
      toolSuccessRate: a.toolSuccessRate,
      health: a.health,
    })),
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log(`✓ Report: ${REPORT_PATH} (${(fs.statSync(REPORT_PATH).length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) main();

module.exports = { parseSessionFile, analyzeSession, computeHealthScore };
