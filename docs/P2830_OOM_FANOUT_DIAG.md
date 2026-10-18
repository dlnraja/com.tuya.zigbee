# P2830 — Bastien OOM / "all relays react" (how to read the next diagnostic)

Symptoms (Bastien, 17–18/10/2026, v1.0.161): one wall button turns on every relay, then the app dies
with `FATAL ERROR: Reached heap limit … JavaScript heap out of memory` (~64 MB, SIGABRT).

What shipped (commits 79dc2b0cc3, 3c8cc312cc on bastien-home):

| Log line | Meaning | Action |
|---|---|---|
| `[HEAP-SENTINEL] level=ok|warn|critical heap=NMB rss=NMB trend=a>b>c [cleaned=1]` | Sampled every 30 s (house app only). `warn` ≥ 44 MB heap or 55 MB rss, `critical` ≥ 52 / 60 MB. `cleaned=1`: MemwarnGuard cleaners ran (60 s cooldown). A rising `trend` right before a crash identifies the leak window. | If `critical` repeats, read the lines before it for the feature that was running. |
| `[FANOUT] capability-changed flow fan-out capped (N dropped so far)` | More than 40 capability-changed flow triggers/second: a cascade was cut off. Logged at 1 and every 200. | Look for the device/capability storm just before it. |
| `[PHYSICAL] P2830 relay EP<N> left group 0 (no group fan-out)` / store key `p2830_group0_left_ep<N>` | A mains relay/plug/dimmer was removed from Zigbee group 0 ("HomeyGroup"). Group-0 membership made one OnOff command reach every relay. Done once per endpoint. | Expected once per relay after the update. Not repeated. |
| `[FLOW-GUARD] … (logged once)` | A flow card id absent from the manifest was requested; logged once per process. | Informational. |
| `[RESILIENCE] … queued until device wakes` | Battery command queue (bounded). | Informational. |

Bounds introduced: raw-frame dedupe key ≤ ~100 chars (no per-frame stringify); LogBuffer ≤ 200 entries / 64 KB,
persisted at most every 30 s; DiagnosticLogger ring 100 compact entries; Zigbee command queue ≤ 200 (oldest rejected).

Not proven: the exact allocation that crossed the 64 MB limit. The sentinel trend is there to capture it.
Tests: `node --test test/critical/p2830-bastien-oom-fanout.test.js`.
