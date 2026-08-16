# P202 — Gmail + GitHub email triage (2026-08-16)

## Signals reviewed
- Latest Gmail Diagnostics CI artifact (`31963777306`, 100 emails)
- Local crash-pattern gate (verdict **ok**, patterns already fixed_p*)
- GitHub notifications (mostly CI + closed #420 Auto-Fix spam)
- Athom builds: Test healthy **9.0.565**; **9.0.566** `processing_failed` / `socket hang up` → **P139 no bump-loop**

## Live findings
| Signal | Action |
|--------|--------|
| Heap OOM @ 9.0.537 | Already gated `heap_oom_live_data` fixed_p148; FingerprintCache Buffer-parse OK |
| Athom processing_failed flood in Gmail | Do **not** republish-spam; wait Athom / next real code bump |
| Unmatched OCR FPs (`…jiaa`, `…jaa`, `…saak`) | Resolve against known drivers in `collect-diagnostics.js` |
| GH #420 Auto-Fix comment spam | Remove hardcoded `issue_number: 420` notify |
| `_TZE204_clrdrnya` | Keep on `presence_sensor_radar`; strip from `sensor_illuminance_presence` configs |

## Fixes shipped
- `.github/workflows/auto-fix-and-publish.yml` — notify via summary / open `autofix-notify` only
- `.github/scripts/collect-diagnostics.js` — case-insensitive idx + OCR near-miss resolve
- `drivers/sensor_illuminance_presence/*` — clrdrnya ownership cleanup
- Test: `test/critical/p202-gmail-github-hygiene.test.js`
