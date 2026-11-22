'use strict';
// P3243b: mocha started from a git hook inherits GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE; any test that runs
// `git init`/`git config`/`git commit` in a fixture would then write into the REAL shared repo
// (core.bare=true, core.worktree=<another tree>, fixture commits on a live branch). Strip them for every test.
for (const k of Object.keys(process.env)) {
  if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|PREFIX|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|NAMESPACE|QUARANTINE_PATH|PUSH_OPTION_\w+)$/.test(k)) delete process.env[k];
}
// P3389: load the lazy device-class helper before any test replaces Module._load, so a device.js
// required inside such a hermetic window (mocked 'homey' / 'homey-zigbeedriver') is built eagerly
// with those mocks, exactly as before; outside such windows device classes stay lazy (shipped behaviour).
require('../../lib/utils/LazyDeviceClass');
