# Unit-test anti-régression (P2469)

> Cursor always-on rule: [`.cursor/rules/unit-test-anti-regression-always.mdc`](../../.cursor/rules/unit-test-anti-regression-always.mdc)

## Why

Homey Test tip drifts, auto-fix-all rewrites `app.json`, enrich bots re-inject fingerprints, and agents re-touch drivers without noticing. Without a **fast failing unit test**, the same forum bug returns (Joep Unknown pairing, Moes dead curtain, VicHY phantom battery, …).

## Mandate

1. **Every prompt / every fix** that changes behavior → create or extend `test/critical/pNNNN-*.test.js`.
2. The test encodes **Contre quoi** (P215): what must never regress.
3. Wire `npm run check:pNNNN` and run it before claiming done.
4. Stay **smart**: one focused lock per bug class; no invent pid; no giant brittle snapshots.

## Pattern (critical test)

```js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

// Lock compose / device.js / sacred-keep / registry invariants
assert.deepStrictEqual(/* … */);
console.log('PNNNN …: PASS');
```

Run: `node --test test/critical/pNNNN-….test.js`

## Examples

| Patch | Test locks |
|-------|------------|
| P2467 Moes EF00 | `initialize(zclNode)`, mains force, skipWake |
| P2468 Joep/FrankEver/VicHY | clusters `[0,4,5,61184]`, FK DP maps, `600_000` re-heal |
| P2469 mandate | rule + doctrine + npm scripts exist |

## Dual-app

Reliability locks = **BOTH**. Keep the same `test/critical` file when backporting to `stable-v5`.
