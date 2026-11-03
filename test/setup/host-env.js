'use strict';
// WHY(2026-10-11): unit tests run on a dev/CI host whose heap is far above Homey's; BootBudget must
// not treat that as Homey heap pressure (see lib/performance/BootBudget.js resolveHeapBytes).
// Tests that exercise pressure pass explicit bytes / device._bootBudgetHeapBytes, which still apply.
if (!process.env.BOOTBUDGET_HOST_HEAP) process.env.BOOTBUDGET_HOST_HEAP = 'ignore';
// P3243b: mocha started from a git hook inherits GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE; any test that runs
// `git init`/`git config`/`git commit` in a fixture would then write into the REAL shared repo
// (core.bare=true, core.worktree=<another tree>, fixture commits on a live branch). Strip them for every test.
for (const k of Object.keys(process.env)) {
  if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|PREFIX|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|NAMESPACE|QUARANTINE_PATH|PUSH_OPTION_\w+)$/.test(k)) delete process.env[k];
}
