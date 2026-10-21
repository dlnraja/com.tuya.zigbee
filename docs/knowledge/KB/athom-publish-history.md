# Athom publish history — master (own summary, 21/10/2026)

Sources: our CI logs (Auto-Publish on Push runs 39606425381 / 39607758188), the ledger
`docs/knowledge/athom-publish-outcomes.jsonl`, `docs/knowledge/ATHOM_LIMITS.md`.

- Builds #3656–#3676 (9.0.1575 → 9.0.1593) all ended `processing_failed` with `AggregateError`; the build page shows no
  name/SDK/size, i.e. Athom never parsed the manifest.
- The byte-identical 9.0.1574 archive that reached Test earlier failed the same way on re-upload → not our content.
- Local check of 9.0.1589/1593: `homey app validate --level publish` passes; archive has `app.json` at its root;
  changelog has the current key and the same shape as the passing 1574; flow cards show none of the 10/10 fault
  (`{arg}` placeholder). stable-v5 and bastien-home keep reaching Test with the same PAT.
- Plausible Athom-side factor (unverified): per-app state after ~3,676 builds.
- Consequence (P-KB4): master breaker — 3 consecutive `processing_failed` builds stop automatic publishing; only a manual
  dispatch may try. Automatic retries on master are limited to one, for socket hang up only.
- Earlier proven content faults kept for reference: `{brightness}` in a flow title (led_controller_spi_tuya, 10/10);
  spacey fake manufacturer names; same-version re-upload after processing_failed is itself rejected.
