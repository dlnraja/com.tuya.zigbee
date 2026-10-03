# Spec 009: Johan / upstream thread intelligence (daily, incremental)
## Outcome
A free daily GitHub Actions workflow scans ALL JohanBendz/com.tuya.zigbee issues, PRs and discussions (open + closed)
and all their comments, incrementally (checkpoint = last `updated_at` per thread), and feeds a leads file used to
investigate and enrich code, SSOT/DEVICE_TRUTH, docs and CREDITS. Seed item: JohanBendz/com.tuya.zigbee#797 and similar
threads (Johan's repo + ours + forum).
## Requirements
- MUST store structured info only: mfr/pid, DPs, clusters, firmware versions, symptoms (our wording), regressions,
  workarounds, user conflicts, canonical links, authors. No copied text (constitution C1).
- Pre-extraction (regex/heuristics, optional free AI e.g. Gemini free tier, budget-guarded) is a helper only.
- MUST: every new/updated thread gets a deep reading pass — understand symptoms, context, firmware, interviews,
  DP logs, workarounds, regressions, conflicts, screenshot descriptions — and reason before turning it into
  rules/quirks/fingerprints/docs. Threads stay `needs_deep_read` in the leads file until that pass is recorded.
- Quirks still need ≥2 sources (D4); device compat goes to stable (grouped publish, M6); smart layers master only.
- Read-only: never posts, comments or reacts (X1).
## Outputs
`data/leads/johan-thread-intel.json` (links + structured fields + status), checkpoint
`data/leads/johan-thread-intel-checkpoint.json`; both .homeyignore'd.
