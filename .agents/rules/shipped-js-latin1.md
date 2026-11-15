# Shipped JS Latin-1 and package images (P3320)

Never add emoji or any raw character above U+00FF to shipped JavaScript (`app.js`, `lib/`, `drivers/**/*.js`, and anything else not in `.homeyignore`). Use ASCII tags (`[OK]`, `[WARN]`, `[ERR]`, `->`, `-`) or `\uXXXX` escapes. Accented Latin-1 stays. Do not change `locales/*.json` or compose/app titles. Do not ship unreferenced or heavy logos or images; keep Athom-required `small` / `large` / `xlarge`. Fail-closed gate: `tools/ci/p3320-shipped-latin1-assets-gate.js` (rules-gates id `p3320-latin1`). Full text: `docs/rules/SHIPPED_JS_LATIN1.md`.
