# Cross-App Prompt Rules

Every AI prompt, automation prompt, diagnosis, issue reply, PR review, changelog draft, forum reply, and repair plan must benefit both maintained app tracks by default:

- Primary app: `com.dlnraja.tuya.zigbee` on `master`.
- Stable app: `com.dlnraja.tuya.zigbee.stable` on `stable-v5`.

Before producing an answer or code change, the agent must classify the impact for both tracks:

1. Is the finding a universal bug fix, security hardening, diagnostic improvement, battery fix, button/flow fix, SDK3 compliance fix, or Homey publishing fix?
2. If yes, mark it as a candidate for both apps and document whether it should be forward-ported, backported, or intentionally kept on one track.
3. If no, state why it is master-only or stable-only.

Cross-app propagation rules:

- Never copy App IDs, version lines, store URLs, publish secrets, or branch-specific release metadata between tracks.
- Never destabilize `stable-v5` with experimental WiFi, telemetry, radar, broad fallback, or migration-heavy behavior unless explicitly approved.
- Always reuse stable fixes for buttons, battery, flows, pairing, endpoint mapping, lifecycle guards, and SDK3 validation when they apply to `master`.
- Always backport low-risk crash fixes, security redaction, diagnostics, CI policy, publish verification, and capability listener fixes from `master` to `stable-v5` when compatible.
- When a prompt mentions a user bug, forum post, crash email, PR, or diagnostic log, compare the root cause against both tracks and record the cross-app decision.
- When writing a public reply, do not expose internal branch mechanics unless it helps the user choose the correct app/test channel.

Prompt output expectation:

- Include a short cross-app note in technical plans, PR summaries, and internal reports.
- User-facing forum/GitHub comments should stay simple, but the internal decision must still happen before writing them.
- If a change cannot be applied to both apps now, create a follow-up note with the reason and the safe conditions for later propagation.
