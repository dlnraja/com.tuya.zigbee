#!/usr/bin/env node
/**
 * Micro-Task Scheduler
 * --------------------
 * Breaks down large enrichment tasks into small, resumable chunks that each
 * use minimal API calls. Tracks progress across sessions and can resume from
 * where it left off. Estimates token cost per task.
 *
 * Features:
 *   - Split large tasks (e.g., 1000 drivers to enrich) into chunks of N
 *   - Persist progress to .github/state/micro-task-progress.json
 *   - Resume interrupted runs automatically
 *   - Estimate token cost per chunk and total
 *   - Respect provider rate limits between chunks
 *   - Dry-run mode to preview without executing
 *
 * Usage:
 *   const { MicroTaskScheduler } = require('./micro-task-scheduler');
 *   const scheduler = new MicroTaskScheduler('enrich-drivers', items, processItem, { chunkSize: 10 });
 *   await scheduler.run();
 *   // or: await scheduler.resume(); to pick up where it left off
 */
'use strict';

const fs = require('fs');
const safeTimer = require('./utils/safe-timers') || require('../utils/safe-timers') || require('../../lib/utils/safe-timers') || require('../lib/utils/safe-timers') || require('./lib/utils/safe-timers') || require('../../../lib/utils/safe-timers');
const path = require('path');

const PROGRESS_DIR = path.join(__dirname, '..', '..', '.github', 'state');

// ---------------------------------------------------------------------------
// 1. Task definitions - reusable task templates
// ---------------------------------------------------------------------------
const TASK_TEMPLATES = {
  'enrich-drivers': {
    description: 'Enrich driver metadata from external sources',
    estimatedTokensPerItem: 800,
    defaultChunkSize: 15,
    delayBetweenChunksMs: 2000,
    priority: 'normal',
  },
  'fingerprint-sync': {
    description: 'Sync fingerprints from Z2M/ZHA/deCONZ',
    estimatedTokensPerItem: 400,
    defaultChunkSize: 25,
    delayBetweenChunksMs: 1500,
    priority: 'normal',
  },
  'dp-mapping': {
    description: 'Generate DP mappings for new devices',
    estimatedTokensPerItem: 1200,
    defaultChunkSize: 8,
    delayBetweenChunksMs: 3000,
    priority: 'high',
  },
  'driver-generation': {
    description: 'Generate new driver code from device specs',
    estimatedTokensPerItem: 2000,
    defaultChunkSize: 5,
    delayBetweenChunksMs: 5000,
    priority: 'high',
  },
  'code-review': {
    description: 'Review and validate driver code',
    estimatedTokensPerItem: 1000,
    defaultChunkSize: 10,
    delayBetweenChunksMs: 2000,
    priority: 'normal',
  },
  'issue-triage': {
    description: 'Classify and prioritize GitHub issues',
    estimatedTokensPerItem: 300,
    defaultChunkSize: 30,
    delayBetweenChunksMs: 1000,
    priority: 'low',
  },
  'image-analysis': {
    description: 'Analyze device images for fingerprinting',
    estimatedTokensPerItem: 500,
    defaultChunkSize: 5,
    delayBetweenChunksMs: 4000,
    priority: 'normal',
  },
  'custom': {
    description: 'User-defined custom task',
    estimatedTokensPerItem: 500,
    defaultChunkSize: 10,
    delayBetweenChunksMs: 2000,
    priority: 'normal',
  },
};

// ---------------------------------------------------------------------------
// 2. Progress persistence
// ---------------------------------------------------------------------------
function _progressFile(taskId) {
  return path.join(PROGRESS_DIR, `micro-task-${taskId}.json`);
}

function _loadProgress(taskId) {
  try {
    return JSON.parse(fs.readFileSync(_progressFile(taskId), 'utf8'));
  } catch {
    return null;
  }
}

function _saveProgress(taskId, progress) {
  try {
    fs.mkdirSync(PROGRESS_DIR, { recursive: true });
    fs.writeFileSync(_progressFile(taskId), JSON.stringify(progress, null, 2));
  } catch (err) {
    console.error(`  [Scheduler] Failed to save progress: ${err.message}`);
  }
}

function _deleteProgress(taskId) {
  try {
    fs.unlinkSync(_progressFile(taskId));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// 3. MicroTaskScheduler class
// ---------------------------------------------------------------------------
class MicroTaskScheduler {
  /**
   * @param {string} taskId - unique identifier for this task run
   * @param {Array} items - array of items to process
   * @param {Function} processFn - async function(item, index, taskMeta) => any
   * @param {Object} opts - options
   * @param {string} opts.template - task template name (e.g., 'enrich-drivers')
   * @param {number} opts.chunkSize - items per chunk (default from template)
   * @param {number} opts.delayBetweenChunksMs - delay between chunks
   * @param {boolean} opts.dryRun - preview without executing
   * @param {number} opts.maxChunks - stop after N chunks (0 = unlimited)
   * @param {number} opts.estimatedTokensPerItem - override token estimate
   */
  constructor(taskId, items, processFn, opts = {}) {
    this.taskId = taskId;
    this.items = items;
    this.processFn = processFn;

    const template = TASK_TEMPLATES[opts.template] || TASK_TEMPLATES['custom'];
    this.chunkSize = opts.chunkSize || template.defaultChunkSize;
    this.delayMs = opts.delayBetweenChunksMs || template.delayBetweenChunksMs;
    this.dryRun = opts.dryRun || false;
    this.maxChunks = opts.maxChunks || 0;
    this.tokensPerItem = opts.estimatedTokensPerItem || template.estimatedTokensPerItem;
    this.description = template.description;

    // Load existing progress for resume
    const existing = _loadProgress(taskId);
    this.progress = existing || {
      taskId,
      totalItems: items.length,
      processedItems: [],
      failedItems: [],
      completedChunks: 0,
      totalChunks: Math.ceil(items.length / this.chunkSize),
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'pending',  // pending | running | paused | completed | failed
      estimatedTotalTokens: items.length * this.tokensPerItem,
      actualTokensUsed: 0,
      results: {},
    };
  }

  /**
   * Run the scheduler from the beginning (or skip already-processed items).
   */
  async run() {
    console.log(`\n=== Micro-Task Scheduler: ${this.taskId} ===`);
    console.log(`Description: ${this.description}`);
    console.log(`Total items: ${this.items.length} | Chunk size: ${this.chunkSize} | Chunks: ${this.progress.totalChunks}`);
    console.log(`Est. tokens: ${this.progress.estimatedTotalTokens.toLocaleString()}`);
    console.log(`Already processed: ${this.progress.processedItems.length}`);
    console.log(`Status: ${this.progress.status}`);
    console.log('');

    if (this.dryRun) {
      this._printDryRun();
      return this.progress;
    }

    this.progress.status = 'running';
    this.progress.lastUpdatedAt = new Date().toISOString();
    _saveProgress(this.taskId, this.progress);

    const processedSet = new Set(this.progress.processedItems);

    for (let chunkIdx = 0; chunkIdx < this.progress.totalChunks; chunkIdx++) {
      const startIdx = chunkIdx * this.chunkSize;
      const chunk = this.items.slice(startIdx, startIdx + this.chunkSize)
        .map((item, i) => ({ item, globalIdx: startIdx + i }))
        .filter(({ globalIdx }) => !processedSet.has(globalIdx));

      if (chunk.length === 0) continue;

      if (this.maxChunks > 0 && this.progress.completedChunks >= this.maxChunks) {
        console.log(`  [Scheduler] Reached max chunks limit (${this.maxChunks}). Pausing.`);
        this.progress.status = 'paused';
        _saveProgress(this.taskId, this.progress);
        return this.progress;
      }

      console.log(`  [Scheduler] Chunk ${chunkIdx + 1}/${this.progress.totalChunks} (${chunk.length} items)...`);

      for (const { item, globalIdx } of chunk) {
        try {
          const result = await this.processFn(item, globalIdx, {
            taskId: this.taskId,
            chunkIndex: chunkIdx,
            tokensPerItem: this.tokensPerItem,
          });

          this.progress.processedItems.push(globalIdx);
          this.progress.results[globalIdx] = { success: true, result, at: new Date().toISOString() };
          this.progress.actualTokensUsed += this.tokensPerItem;
        } catch (err) {
          console.log(`  [Scheduler] Item ${globalIdx} failed: ${err.message}`);
          this.progress.failedItems.push({ index: globalIdx, error: err.message, at: new Date().toISOString() });
          this.progress.results[globalIdx] = { success: false, error: err.message };
        }

        this.progress.lastUpdatedAt = new Date().toISOString();
      }

      this.progress.completedChunks++;
      _saveProgress(this.taskId, this.progress);

      const pct = Math.round((this.progress.processedItems.length / this.items.length) * 100);
      console.log(`  [Scheduler] Progress: ${this.progress.processedItems.length}/${this.items.length} (${pct}%) | Est. tokens used: ${this.progress.actualTokensUsed.toLocaleString()}`);

      // Delay between chunks to respect rate limits
      if (chunkIdx < this.progress.totalChunks - 1) {
        await new Promise(r => safeTimer.safeSetTimeout(globalThis, r, this.delayMs));
      }
    }

    this.progress.status = this.progress.failedItems.length > 0 ? 'completed-with-errors' : 'completed';
    this.progress.completedAt = new Date().toISOString();
    _saveProgress(this.taskId, this.progress);

    console.log(`\n  [Scheduler] Task "${this.taskId}" ${this.progress.status}.`);
    console.log(`  Processed: ${this.progress.processedItems.length} | Failed: ${this.progress.failedItems.length}`);
    console.log(`  Total tokens estimated: ${this.progress.actualTokensUsed.toLocaleString()}`);

    return this.progress;
  }

  /**
   * Resume a previously paused/interrupted task.
   */
  async resume() {
    const existing = _loadProgress(this.taskId);
    if (!existing) {
      console.log(`  [Scheduler] No saved progress for "${this.taskId}". Starting fresh.`);
      return this.run();
    }

    console.log(`  [Scheduler] Resuming "${this.taskId}" from chunk ${existing.completedChunks + 1}/${existing.totalChunks}`);
    console.log(`  Previously processed: ${existing.processedItems.length} items`);

    // Merge saved progress into our instance
    this.progress = { ...this.progress, ...existing };
    return this.run();
  }

  /**
   * Print a dry-run summary without executing.
   */
  _printDryRun() {
    console.log('--- DRY RUN ---\n');
    console.log('Chunks:');
    for (let i = 0; i < this.progress.totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.items.length);
      const chunkTokens = (end - start) * this.tokensPerItem;
      console.log(`  Chunk ${i + 1}: items [${start}-${end - 1}] (${end - start} items, ~${chunkTokens.toLocaleString()} tokens)`);
    }
    console.log(`\nTotal estimated tokens: ${this.progress.estimatedTotalTokens.toLocaleString()}`);
    console.log(`Estimated chunks delay: ${this.progress.totalChunks * this.delayMs / 1000}s`);
  }

  /**
   * Get current progress summary.
   */
  getStatus() {
    const pct = this.items.length > 0
      ? Math.round((this.progress.processedItems.length / this.items.length) * 100)
      : 0;

    return {
      taskId: this.taskId,
      status: this.progress.status,
      totalItems: this.items.length,
      processed: this.progress.processedItems.length,
      failed: this.progress.failedItems.length,
      remaining: this.items.length - this.progress.processedItems.length,
      completedChunks: this.progress.completedChunks,
      totalChunks: this.progress.totalChunks,
      percentComplete: pct,
      estimatedTokensTotal: this.progress.estimatedTotalTokens,
      estimatedTokensUsed: this.progress.actualTokensUsed,
      startedAt: this.progress.startedAt,
      lastUpdatedAt: this.progress.lastUpdatedAt,
    };
  }

  /**
   * Reset progress for this task.
   */
  reset() {
    _deleteProgress(this.taskId);
    this.progress = {
      taskId: this.taskId,
      totalItems: this.items.length,
      processedItems: [],
      failedItems: [],
      completedChunks: 0,
      totalChunks: Math.ceil(this.items.length / this.chunkSize),
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'pending',
      estimatedTotalTokens: this.items.length * this.tokensPerItem,
      actualTokensUsed: 0,
      results: {},
    };
    console.log(`  [Scheduler] Progress reset for "${this.taskId}".`);
  }
}

// ---------------------------------------------------------------------------
// 4. Convenience: list active/pending tasks
// ---------------------------------------------------------------------------
function listActiveTasks() {
  const tasks = [];
  try {
    const files = fs.readdirSync(PROGRESS_DIR).filter(f => f.startsWith('micro-task-') && f.endsWith('.json'));
    for (const file of files) {
      try {
        const progress = JSON.parse(fs.readFileSync(path.join(PROGRESS_DIR, file), 'utf8'));
        tasks.push({
          taskId: progress.taskId,
          status: progress.status,
          processed: progress.processedItems?.length || 0,
          total: progress.totalItems,
          percentComplete: progress.totalItems > 0
            ? Math.round(((progress.processedItems?.length || 0) / progress.totalItems) * 100)
            : 0,
          lastUpdatedAt: progress.lastUpdatedAt,
        });
      } catch { /* skip corrupted */ }
    }
  } catch { /* ignore */ }
  return tasks;
}

function cleanCompletedTasks() {
  const files = fs.readdirSync(PROGRESS_DIR).filter(f => f.startsWith('micro-task-') && f.endsWith('.json'));
  let cleaned = 0;
  for (const file of files) {
    try {
      const progress = JSON.parse(fs.readFileSync(path.join(PROGRESS_DIR, file), 'utf8'));
      if (progress.status === 'completed' || progress.status === 'completed-with-errors') {
        fs.unlinkSync(path.join(PROGRESS_DIR, file));
        cleaned++;
      }
    } catch { /* skip */ }
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// 5. Estimate cost helper
// ---------------------------------------------------------------------------
function estimateTaskCost(itemCount, taskType = 'custom') {
  const template = TASK_TEMPLATES[taskType] || TASK_TEMPLATES['custom'];
  const tokens = itemCount * template.estimatedTokensPerItem;
  return {
    taskType,
    itemCount,
    chunkSize: template.defaultChunkSize,
    totalChunks: Math.ceil(itemCount / template.defaultChunkSize),
    estimatedTokens: tokens,
    delaySeconds: Math.ceil(itemCount / template.defaultChunkSize) * (template.delayBetweenChunksMs / 1000),
    description: template.description,
  };
}

// ---------------------------------------------------------------------------
// 6. CLI interface
// ---------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'list';

  if (cmd === 'list') {
    const tasks = listActiveTasks();
    if (tasks.length === 0) {
      console.log('\nNo active micro-tasks found.');
    } else {
      console.log('\n=== Active Micro-Tasks ===\n');
      for (const t of tasks) {
        console.log(`  ${t.taskId}: ${t.status} (${t.percentComplete}% | ${t.processed}/${t.total}) - last updated: ${t.lastUpdatedAt}`);
      }
    }
  } else if (cmd === 'estimate') {
    const taskType = args[1] || 'custom';
    const count = parseInt(args[2]) || 100;
    const est = estimateTaskCost(count, taskType);
    console.log(`\nEstimated cost for ${count} items (${taskType}):`);
    console.log(`  Chunks: ${est.totalChunks} x ${est.chunkSize}`);
    console.log(`  Tokens: ${est.estimatedTokens.toLocaleString()}`);
    console.log(`  Estimated time: ${est.delaySeconds}s (chunk delays only)`);
  } else if (cmd === 'clean') {
    const cleaned = cleanCompletedTasks();
    console.log(`Cleaned ${cleaned} completed task file(s).`);
  } else if (cmd === 'templates') {
    console.log('\n=== Available Task Templates ===\n');
    for (const [name, t] of Object.entries(TASK_TEMPLATES)) {
      console.log(`  ${name}: ${t.description}`);
      console.log(`    Chunk size: ${t.defaultChunkSize} | Tokens/item: ${t.estimatedTokensPerItem} | Delay: ${t.delayBetweenChunksMs}ms`);
    }
  } else {
    console.log('Usage: node micro-task-scheduler.js [list|estimate <type> <count>|clean|templates]');
  }
}

module.exports = {
  MicroTaskScheduler,
  listActiveTasks,
  cleanCompletedTasks,
  estimateTaskCost,
  TASK_TEMPLATES,
};
