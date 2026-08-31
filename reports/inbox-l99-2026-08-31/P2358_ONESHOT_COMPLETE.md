# P2358 one-shot — 2026-09-01

Silent only. No forum POST.

## Sources treated
- Forum NEED_ACTION (51): almost all `fixShipped` / tip update
- SoftHypothesis rows: couples already in compose/mfs (false soft) except bad invent
- GitHub: #533 only (Moes curtain) — P2348+P2356 shipped; tip lag on master
- Open PRs: 0
- Gmail/crash: covered by P2351–P2357

## Code fix (MASTER_ONLY CI enrich; BOTH-safe)
- `NeedActionInvestigator.resolveCoupleCandidates`: refuse `productId_default`; when mfr in compose, probe compose pids only
- Blocks `_TZ3210_tgvtvdoc`+TS0001→`switch_1gang` invent (rain = TS0207/TS0601)
- `alreadyInCatalog` resolution when compose-known
- Test: `test/critical/p2358-need-action-no-pid-default-invent.test.js`

## Publish
- Soft retry master after P139 hang on 9.0.754
- Stable already live **5.12.109** with P2356/P2357
