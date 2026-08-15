# Gmail crash / diag sweep — 2026-08-15 evening

> Sources: GHA artifacts run `31886079596` + local gate + Homey diag UUIDs.
> Fresh workflow `31896208076` was still fetching at report time (no local IMAP secrets).

## Crash reports in mailbox (6)

| When | Signature | Status in code |
|------|-----------|----------------|
| 2026-08-05 | `reading '_destroyed'` (clusterUtils timeout / unbound this) | **fixed_p137** — `clusterUtils` no longer uses `this` |
| 2026-08-14 | `capability is not defined` | **fixed_p136** — `generic_tuya._autoMapDP` |
| 2026-08-14/15 | `auditCapabilities is not a function` | **fixed_p108** — DCM typeof guard + method |
| 2026-08-15 | `reading 'catch'` / `setTimeout` (SOS / button_wireless_1, Peter 5.12.70) | **fixed** — Promise.resolve + safe timers; stable **≥5.12.81** |

## Extra hardening this pass (BOTH / master)

1. `lib/utils/clusterUtils.js` — free-function timeouts via `globalThis` only (Gmail stack locus)
2. All `button_wireless_*` init — never `this.error` in `.catch` (readonly `error` Gmail)
3. `BaseUnifiedDevice` DCM/VARIANT init — log instead of `this.error`

## Gate

Local `gmail-crash-pattern-gate`: verdict **ok**, watch **[]** (after p349/p136/p137).

## User action

Peter / anyone on crashing Homey: update Test to **stable ≥5.12.81** or **master ≥9.0.519+** after this push. Old mailbox crashes are from **5.12.70** / older master builds.
