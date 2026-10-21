# Athom build & publish lessons

- Socket hang up: the upload succeeds; Athom-side processing fails later. Failure rate grows with manifest (app.json) size; parallel uploads and file count are not the cause. Retry policy v2: socket hang up 4 retries, other transient 2, AggregateError 2 then bisect, unknown none. Stop waiting once Athom marks a build failed.
- AggregateError / processing_failed: found by bisecting commits between the last good and first bad build, then fixed and guarded in CI.
- Size: keep research data out of the bundle via .homeyignore (backups/, tmp/, data/kb/, data/leads/).

Detailed notes:
- [GitHub Actions — mesure et optimisation (10/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/ACTIONS_OPTIMIZATION.md)
- [Athom AggregateError on master — bisect result (2026-10-10)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/ATHOM_AGGREGATEERROR_BISECT_2026-10-10.md)
- [Athom / Homey publish limits — what we know (2026-10-10, Paris)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/ATHOM_LIMITS.md)
- [New driver ids rejected by Athom (AggregateError) — offline analysis 2026-10-11 (Paris)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/ATHOM_NEW_DRIVER_REJECTION_2026-10-11.md)
- [Athom "processing failed": diagnosis (20/10/2026, P2902)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/ATHOM_PROCESSING_FAILED_2026-10-20.md)
- [Athom `processing_failed | socket hang up` — evidence, conclusion, fixes (2026-10-19)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/ATHOM_SOCKET_HANGUP_ROOT_CAUSE_2026-10-19.md)
- [Athom "socket hang up" / processing_failed / AggregateError — root-cause study (P2930, 21/10/2026 Paris)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/ATHOM_SOCKET_HANGUP_ROOT_CAUSE_P2930.md)
- [Disabled workflows (P2916, 20/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/DISABLED_WORKFLOWS_P2916.md)
- [GitHub Actions hardening P2900 (20/10/2026, Paris time)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/GHA_HARDENING_P2900.md)
- [Gledopto GL-SPI-206P (`led_controller_spi_tuya`) — runtime fix + Athom status (2026-10-10)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/GLEDOPTO_SPI_206P_FIX_2026-10-10.md)
- [P2924 — "socket hang up": where it happens and what we changed (21/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/P2924_SOCKET_HANG_UP_2026-10-21.md)
- [led_controller_spi_tuya — Athom AggregateError bisect (19/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/SPI_ATHOM_BISECT_2026-10-19.md)
