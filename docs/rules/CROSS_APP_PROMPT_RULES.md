# Cross-App Prompt Rules

Every AI prompt, automation prompt, diagnosis, issue reply, PR review, changelog draft, forum reply, and repair plan must benefit both maintained app tracks **according to each track’s purpose** (never blind duplication):

- Primary / advanced: `com.dlnraja.tuya.zigbee` on `master` (features + soak).
- Stable / LTS: track on `stable-v5` (reliability only). Confirm App ID on that branch before publish — do not assume `.stable` suffix if the compose file still shares the primary ID.

**Doctrine:** [`DUAL_APP_VISION.md`](./DUAL_APP_VISION.md) — classify `BOTH` | `MASTER_ONLY` | `STABLE_ONLY` before every change.

Before producing an answer or code change, the agent must classify the impact for both tracks:

1. Is the finding a universal bug fix, security hardening, battery/timer/IAS crash fix, button/flow fix, energy divisor / meter_power jump, SDK3 compliance fix, or Homey publishing fix? → tag **`BOTH`**.
2. Is it a feature (Daylight Atmosphere / Solar Sync / Path Light, presence sim, smart learn, scrape orchestrator, parallel DP discover, multichannel, AVE, …)? → tag **`MASTER_ONLY`**.
3. Is it Stable App ID / LTS publish / `5.12.x` identity only? → tag **`STABLE_ONLY`**.

**App IDs are independent:** master `com.dlnraja.tuya.zigbee` (9.0.x) ≠ stable `com.dlnraja.tuya.zigbee.stable` (5.12.x). Never copy identity files. SSOT: `config/architecture/dual-app-tracks.json`.
3. Is it stable identity / stable-only publish? → tag **`STABLE_ONLY`**.
4. Document whether it should be forward-ported, surgically backported, or intentionally kept on one track.
5. Never full-tree copy-paste. Adapt patches to each branch’s code shape.

Cross-app propagation rules:

- Never copy App IDs, version lines, store URLs, publish secrets, or branch-specific release metadata between tracks.
- Never destabilize `stable-v5` with experimental WiFi, telemetry, radar, broad fallback, free-scrape stacks, AlarmPolarity smart-learn, or migration-heavy behavior unless explicitly approved.
- Always reuse stable fixes for buttons, battery, flows, pairing, endpoint mapping, lifecycle guards, and SDK3 validation when they apply to `master`.
- Always backport low-risk crash fixes, security redaction, timer/IAS guards, and capability listener abort fixes from `master` to `stable-v5` when compatible (**surgical**).
- **Forum users on Test (e.g. Peter):** OCR/version may show `5.12.x` (stable) while discussion is about “the app”. When in doubt, treat crash/IAS/SOS/contact/water/timer bugs as **`BOTH`** and improve **both** tracks systematically — never assume they are on master-only.
- When a prompt mentions a user bug, forum post, crash email, PR, or diagnostic log, compare the root cause against both tracks and record the cross-app decision.
- When writing a public reply, do not expose internal branch mechanics unless it helps the user choose the correct app/test channel.
- Warn if stable publish to **Test** would overwrite master Test on a shared App ID.

Prompt output expectation:

- Include a short cross-app note (`BOTH` / `MASTER_ONLY` / `STABLE_ONLY`) in technical plans, PR summaries, and internal reports.
- User-facing forum/GitHub comments should stay simple, but the internal decision must still happen before writing them.
- If a change cannot be applied to both apps now, create a follow-up note with the reason and the safe conditions for later propagation.
