'use strict';
/**
 * quota-resume.js (P92.88)
 * Quota-aware task deferral + autonomous resume.
 *
 * Problem: when a daily AI/budget cap is hit mid-run, tasks were SKIPPED
 * silently and never retried. This module records deferred tasks in
 * .github/state/quota-deferred.json and re-runs them on the NEXT run when
 * budget is available again (after the cooldown — next day, next week).
 *
 * API:
 *   defer(taskId, payload)          — record a task skipped for quota reasons
 *   complete(taskId)                — mark done (called on success)
 *   listPending()                   — deferred tasks not yet completed
 *   processPending(executor, canRun)— run pending tasks while canRun() is true
 *
 * Zero secrets, zero external calls — state file only.
 */
const fs = require('fs');
const path = require('path');

const STATE = path.join(__dirname, '..', 'state', 'quota-deferred.json');

function _load() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    return Array.isArray(j.tasks) ? j : { tasks: [] };
  } catch {
    return { tasks: [] };
  }
}

function _save(state) {
  try {
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
  } catch { /* non-critical */ }
}

function defer(taskId, payload = {}) {
  const state = _load();
  if (!state.tasks.some(t => t.id === taskId && !t.done)) {
    state.tasks.push({ id: taskId, payload, deferredAt: new Date().toISOString(), attempts: 0, done: false });
    _save(state);
    console.log(`[quota-resume] ⏸️ Tâche différée (quota): ${taskId} — reprise automatique au prochain run`);
  }
}

function complete(taskId) {
  const state = _load();
  let changed = false;
  for (const t of state.tasks) {
    if (t.id === taskId && !t.done) {t.done = true; t.completedAt = new Date().toISOString(); changed = true;}
  }
  if (changed) {_save(state);}
}

function listPending() {
  return _load().tasks.filter(t => !t.done);
}

/**
 * Run pending tasks while budget allows.
 * @param {(task) => Promise<boolean>} executor - returns true on success
 * @param {() => boolean} canRun - budget check (e.g. ai-helper.budgetAllows)
 * @returns {Promise<{resumed:number, stillPending:number}>}
 */
async function processPending(executor, canRun) {
  const pending = listPending();
  if (!pending.length) {return { resumed: 0, stillPending: 0 };}
  console.log(`[quota-resume] ▶️ ${pending.length} tâche(s) différée(s) à reprendre`);
  let resumed = 0;
  for (const task of pending) {
    if (canRun && !canRun()) {
      console.log(`[quota-resume] ⛔ quota toujours épuisé — ${pending.length - resumed} tâche(s) restent en attente`);
      break;
    }
    try {
      const ok = await executor(task);
      const state = _load();
      const t = state.tasks.find(x => x.id === task.id && !x.done);
      if (t) {t.attempts++; _save(state);}
      if (ok) {complete(task.id); resumed++; console.log(`[quota-resume] ✅ ${task.id} repris et terminé`);}
    } catch (err) {
      console.log(`[quota-resume] ⚠️ ${task.id} a échoué (${err.message}) — restera en attente`);
    }
  }
  return { resumed, stillPending: listPending().length };
}

module.exports = { defer, complete, listPending, processPending, STATE };
