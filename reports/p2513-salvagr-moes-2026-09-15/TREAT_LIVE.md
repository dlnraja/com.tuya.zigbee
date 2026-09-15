# P2513 — Salvagr #533 residual Stop + mid-%

**Classify:** BOTH  
**Couple:** `_TZE204_5slehgeo`+`TS0601` → `curtain_motor`  
**GH:** #533 (2026-09-15: crashes/timeout OK; Stop dead; mid-% → extreme)

## Fix
1. Moes idle-skip **2s** (was 40s) — deliberate STOP works after Homey UI release
2. Stamp mid-position TX; skip Homey open/close echo for 3s (prevents DP1 extreme)

## Gate
`npm run check:p2513`
