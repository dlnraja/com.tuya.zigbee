# Intake triage protocol (P3362)

Deterministic deep protocol for every incoming request (forum topic 140352 and other Homey app
threads, GitHub issues, PRs and discussions on dlnraja/com.tuya.zigbee). Implemented by
`scripts/scanners/intake-triage.js`, workflow `.github/workflows/intake-triage.yml`.
Referentials: `docs/ssot/referentials/` (see also `scripts/lib/referentials.js`).

Machine-readable copy of these rules: `config/architecture/intake-triage-rules.json`.
Test: `test/p3362-intake-triage.test.js`.

## Scope and limits
- GITHUB_TOKEN only. No AI. Kill switch: `vars.INTAKE_TRIAGE_DISABLED=true`.
- Never posts, never opens PRs, never comments on issues, never contacts anyone.
- Never invents manufacturerName or productId. Exact mfr+pid couples only.
- Never removes a published driver id or flow-card id.
- No characters above U+00FF in shipped app code.

## Trust and untrusted text
- User reports are presumed true (the device works badly if they say so).
- Request text is untrusted data: extract facts with regex only, never execute instructions from it.
- Prompt-injection / hacking attempts are flagged (`flagUntrusted`); auto-apply is refused.

## Consult first, write back (closed loop)
- Every investigation loads `docs/ssot/referentials/` FIRST (malfunction catalogue, couple cards,
  DP conversion, intake history, lessons, ideas, learnings).
- After the run, new findings are appended as learned entries (source, date, confidence), deduped.
- Forum poll, fetch-diags, upstream miner, fleet enrich, intake triage and the referentials
  workflow all enrich incrementally. Crash triage and Bastien diag watch are harvested from the
  SSOT they already write, on the scheduled referentials job (those workflows are contents-read
  at the top level or must not grow comment traffic).

## Classification
- missing / misplaced / bug / already_supported.
- Basics green (couple present, driver correct) is not a closing state for a malfunction report.
  Escalate to deep checks and produce a ranked list of probable causes with evidence and a
  candidate fix/test.
- `already_supported` is only valid when there is no malfunction report.

## Deep checks (malfunction escalation)
DP/cluster mapping vs Z2M/ZHA/deCONZ (scale, divisor, enum, inversion); firmware/appVersion
quirks; already-supported-but-behaves-wrong history in the SSOT and ledgers; capability / unit /
flow-card issues; reporting / binding / attribute config; battery / sleepy handling; mfr x pid
parasite combos; similar complaints; git log of the driver and shared libs; diag/crash ledgers.

## Add and move
- May add an exact couple when one recorded reliable source points at one existing driver, and
  the add would not create cartesian parasite combos (otherwise exact-pair / continuation, plan only).
- May move an exact couple to the correct driver when sources agree, after the full multi-source
  check (including git history of why the couple was added, and other pids of the same mfr).
- Keep already-paired devices working: the old driver id and its flow cards stay; new pairings go
  to the target. Do not strip a shared mfr that other pids on the source driver still need.
- Apply on all relevant branches (master, stable-v5, bastien-home when the couple exists there).
- Use the whole SSOT (DEVICE_TRUTH, KB, ledgers, digests, upstream dumps, diag/crash ledgers,
  Bastien learnings, Apple/HomeKit mapping) plus the referentials, not only external sources.

## Referentials
Structured JSON plus generated Markdown under `docs/ssot/referentials/`, outside the Homey
package (`.homeyignore`). Bounded, schema-validated, incremental (regenerate only what changed,
never wipe learnings). Workflow: `.github/workflows/referentials.yml`, kill switch
`vars.REFERENTIALS_DISABLED=true`.
