'use strict';
// WHY(2026-10-11): unit tests run on a dev/CI host whose heap is far above Homey's; BootBudget must
// not treat that as Homey heap pressure (see lib/performance/BootBudget.js resolveHeapBytes).
// Tests that exercise pressure pass explicit bytes / device._bootBudgetHeapBytes, which still apply.
if (!process.env.BOOTBUDGET_HOST_HEAP) process.env.BOOTBUDGET_HOST_HEAP = 'ignore';
