#!/usr/bin/env bash
# WHY(P2900, 20/10/2026 Paris): gh/API calls in workflows failed on transient TLS handshake timeouts, EOF,
# 502/503 and secondary rate limits. Usage: .github/scripts/gh-retry.sh gh workflow run x.yml ...
# Retries only transport errors (4 tries, 5/15/45s + jitter); real errors (404, 422, auth) fail at once.
set -u
n=0; max=${GH_RETRY_MAX:-4}
while :; do
  n=$((n+1))
  out=$("$@" 2>&1); rc=$?
  printf '%s\n' "$out"
  [ $rc -eq 0 ] && exit 0
  if [ $n -ge $max ] || ! printf '%s' "$out" | grep -Eiq 'TLS handshake|EOF|connection reset|i/o timeout|timed out|HTTP 50[0234]|secondary rate limit|Bad Gateway|Service Unavailable|ECONNRESET|socket hang up'; then exit $rc; fi
  d=$(( 5 * 3 ** (n-1) + RANDOM % 5 ))
  echo "::warning::gh transient error (try $n/$max), retrying in ${d}s"; sleep "$d"
done
