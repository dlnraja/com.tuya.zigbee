# TREAT FINAL — anciens prompts + energies + diags (2026-09-23)

Silent. Dual-app BOTH + Bastien. Never forum POST.

## Tips (after this treat)

| App | Tip |
|-----|-----|
| Universal | **9.0.1198** |
| Bastien | **1.0.68** |
| Stable | **5.12.311** |

## Anciens prompts (session)

| Demande | Verdict |
|---------|---------|
| Traite PR/issues/forum SHADOW | Done — open #550/#551 tip-lag only; no open PRs |
| Bastien diags + piles vides | **P2691** (885a9901 powerCfg storm) → tip ≥1.0.67 |
| Energies | 0× `energy.approximation` + `measure_power` conflicts; P2689 adaptive battery; P2691 skip TX |
| Reprend tout + diags | **P2692** publish heal (Auto-Publish was blocked by heobian OCR collisions) |

## Diags Gmail (no newer than 885a9901)

All Bastien/Universal logs from Sep 20–22 treated in `reports/gmail-diag-2026-09-23/TREAT.md`.
User action: update tips above; remotes re-pair optional after 1.0.68.

## Code this pass (P2692)

- `prune-fp-collision-bleed`: `heobian≡hobeian` collision keys
- Strip invent brand-as-`productId` (`HOBEIAN`/`heobian` as pid)
- `HOBEIAN|ZG-301Z` → `switch_1gang` only (strip from `curtain_motor`; keep `ZG-301Z-MOTO`)
- Stable: BSEED `blhvsaqf` → `wall_switch_1gang_1way` (P2462)
- Contre quoi: `test/critical/p2692-publish-heal-energy.test.js`

## Energy

- Fleet: no Homey Energy v3 schema conflict (`approximation` ∩ power caps) = **0**
- Battery: P2685/P2689/P2691 class skip on coin remotes
