# Store text and changelog coherence

Follow `docs/rules/STORE_TEXT_COHERENCE.md` and `config/architecture/store-text-coherence-ssot.json`.

Do not invent or remove published driver, flow-card or capability ids. Do not mix another app's changelog versions into this branch. Bastien `app.json` stays the official compose output (no `normalise()`). Never commit the built root `app.json` that `homey app validate` writes (P2920); keep the compact source form. Recurring work is the free workflow `store-text-coherence.yml` (kill switch `STORE_TEXT_COHERENCE_DISABLED`), not a Grok Bot routine.
