'use strict';

/**
 * Startup Time Profiler - PERFORMANCE #73
 *
 * Profiles app startup time to identify bottlenecks:
 * - Phase timing (init, drivers, devices, flows)
 * - Module load time tracking
 * - Memory snapshots at key points
 * - Startup report generation
 *
 * @version 9.1.0
 */

class StartupTimeProfiler {
  constructor() {
    this._startTime = Date.now();
    this._phases = [];
    this._milestones = [];
    this._moduleLoads = [];
    this._memorySnapshots = [];
    this._completed = false;

    // Record initial memory
    this._snapshotMemory('app_start');
  }

  /**
   * Start timing a phase
   * @param {string} phaseName
   */
  startPhase(phaseName) {
    this._phases.push({
      name: phaseName,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      memoryAtStart: this._getCurrentMemory()
    });
  }

  /**
   * End timing a phase
   * @param {string} phaseName
   */
  endPhase(phaseName) {
    const phase = this._phases.find(p => p.name === phaseName && !p.endTime);
    if (phase) {
      phase.endTime = Date.now();
      phase.duration = phase.endTime - phase.startTime;
      phase.memoryAtEnd = this._getCurrentMemory();
      phase.memoryDelta = phase.memoryAtEnd - phase.memoryAtStart;
    }
  }

  /**
   * Record a milestone (point-in-time event)
   * @param {string} name
   * @param {Object} [meta]
   */
  recordMilestone(name, meta = {}) {
    this._milestones.push({
      name,
      timestamp: Date.now(),
      elapsed: Date.now() - this._startTime,
      memory: this._getCurrentMemory(),
      ...meta
    });
  }

  /**
   * Record module load time
   * @param {string} moduleName
   * @param {number} loadTimeMs
   */
  recordModuleLoad(moduleName, loadTimeMs) {
    this._moduleLoads.push({
      name: moduleName,
      loadTimeMs,
      timestamp: Date.now()
    });
  }

  /**
   * Take a memory snapshot
   * @param {string} label
   */
  _snapshotMemory(label) {
    const mem = this._getCurrentMemory();
    this._memorySnapshots.push({
      label,
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss
    });
  }

  /**
   * Mark startup as complete
   */
  complete() {
    this._completed = true;
    this._snapshotMemory('app_complete');
  }

  /**
   * Get the full startup profile
   * @returns {Object}
   */
  getProfile() {
    const totalTime = this._completed
      ? (this._memorySnapshots[this._memorySnapshots.length - 1]?.timestamp || Date.now()) - this._startTime
      : Date.now() - this._startTime;

    const completedPhases = this._phases.filter(p => p.endTime);
    const incompletePhases = this._phases.filter(p => !p.endTime);

    return {
      totalTimeMs: totalTime,
      completed: this._completed,
      phases: completedPhases.map(p => ({
        name: p.name,
        durationMs: p.duration,
        percentOfTotal: Math.round((p.duration / totalTime) * 100),
        memoryDeltaBytes: p.memoryDelta
      })),
      incompletePhases: incompletePhases.map(p => p.name),
      slowestPhase: completedPhases.length > 0
        ? completedPhases.reduce((a, b) => a.duration > b.duration ? a : b).name
        : null,
      milestones: this._milestones,
      moduleLoads: this._moduleLoads.sort((a, b) => b.loadTimeMs - a.loadTimeMs).slice(0, 20),
      memorySnapshots: this._memorySnapshots,
      memoryTrend: this._calculateMemoryTrend()
    };
  }

  /**
   * Get a human-readable startup report
   */
  getReport() {
    const profile = this.getProfile();
    const lines = [];

    lines.push('=== Startup Profile ===');
    lines.push(`Total Time: ${profile.totalTimeMs}ms`);
    lines.push(`Completed: ${profile.completed}`);
    lines.push('');

    lines.push('--- Phases ---');
    for (const phase of profile.phases) {
      lines.push(`  ${phase.name}: ${phase.durationMs}ms (${phase.percentOfTotal}%)`);
      if (phase.memoryDeltaBytes > 1024 * 1024) {
        lines.push(`    Memory: +${Math.round(phase.memoryDeltaBytes / 1024 / 1024)}MB`);
      }
    }

    if (profile.slowestPhase) {
      lines.push('');
      lines.push(`Slowest Phase: ${profile.slowestPhase}`);
    }

    if (profile.moduleLoads.length > 0) {
      lines.push('');
      lines.push('--- Top Module Load Times ---');
      for (const mod of profile.moduleLoads.slice(0, 5)) {
        lines.push(`  ${mod.name}: ${mod.loadTimeMs}ms`);
      }
    }

    lines.push('');
    lines.push('=== End Profile ===');

    return lines.join('\n');
  }

  _getCurrentMemory() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: mem.heapUsed || 0,
        heapTotal: mem.heapTotal || 0,
        rss: mem.rss || 0
      };
    }
    return { heapUsed: 0, heapTotal: 0, rss: 0 };
  }

  _calculateMemoryTrend() {
    if (this._memorySnapshots.length < 2) return 'stable';

    const first = this._memorySnapshots[0].heapUsed;
    const last = this._memorySnapshots[this._memorySnapshots.length - 1].heapUsed;
    const changePercent = ((last - first) / first) * 100;

    if (changePercent > 20) return 'increasing';
    if (changePercent < -20) return 'decreasing';
    return 'stable';
  }
}

module.exports = StartupTimeProfiler;
