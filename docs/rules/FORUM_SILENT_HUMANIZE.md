# Forum Silent Enrichment & Human Voice Doctrine

**Status:** active (P108+)  
**Community reference (read-only):** [Stop pasting unchecked AI answers](https://community.homey.app/t/stop-pasting-unchecked-ai-answers-in-the-homey-community/157628)

## Goal
Improve the Homey app, workflows, and automations from **all** forum signals — without dumping unchecked AI text into Homey Community.

## Rules
| ID | Rule |
|----|------|
| FS1 | Default = **no forum reply**. Implement silently in code/CI. |
| FS2 | `REPLY_TOPICS=140352` only; never reply on 26439 / 146735 / 89271 / 43287 / 157628 / 157859 / others. |
| FS3 | Never paste raw / unchecked LLM output to Discourse (T157628). |
| FS4 | Any rare draft must pass humanize style + `reply-quality-gate` + `forum-ai-paste-gate`. |
| FS5 | Auto-post scripts forced dry-run (`forum-responder.js`, `post-forum-update.js`). |
| FS6 | Scan satellite threads READ-ONLY via `forum-silent-multi-scan.js`. |
| FS7 | Changelogs/commits: generic wording; no external-thread attribution. |
| FS8 | Private messages: harvest via SSO (`forum-pm-read-only.js`) on cron; **never POST**. |

## Tooling
- `tools/ci/forum-silent-multi-scan.js` — multi-topic silent digest
- `tools/ci/apply-forum-silent-multi.js` — dry-run sacred-couple reinforce from digests
- `tools/ci/forum-ai-paste-gate.js` — anti AI-paste detector
- `tools/ci/forum-pm-read-only.js` — inbox/sent harvest (no POST)
- `tools/ci/forum-media-deep-scan.js` — screenshot alts / image URLs / diag UUIDs
- `tools/ci/forum-dispatch-diag-if-new.js` — at most one `tuya-deep-diag` UUID from PMs
- `lib/utils/rf-channel-coexistence.js` — Zigbee/Thread ≠ Wi-Fi numbering
- `.github/scripts/reply-quality-gate.js` — factual + human-leak checks
- `.github/scripts/forum-responder.js` — dry-run only
- Workflows: `forum-pm-read.yml` (cron 07:50/19:50 UTC), `forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`

## Voice
See `docs/responses/FORUM_STYLE_GUIDE.md`.
