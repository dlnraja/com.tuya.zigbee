#!/usr/bin/env bash
# P2917 — write the version that Athom confirmed in Test back to the branch, once, as [skip ci].
# Usage: version-writeback.sh <branch> <appId>   (needs HOMEY_PAT)
# The version is the HIGHEST Athom build whose state is "test" (confirmed Test, not this run's guess).
# Works on a CLEAN tree reset to origin/<branch>: only version fields change (never a built app.json).
# Skips when the branch is already >= version. Rebase + 3 bounded tries; never dispatches a run (no loop).
set -u
BR="$1"; APP="$2"
V=$(node scripts/ci/homey-build-status.js "$APP" 2>/dev/null | node -e '
  let v=""; const cmp=(a,b)=>{const x=a.split(".").map(Number),y=b.split(".").map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]-y[i];}return 0;};
  for (const l of require("fs").readFileSync(0,"utf8").split("\n")) { try { const r=JSON.parse(l); if (String(r.state).toLowerCase()==="test" && r.version && (!v||cmp(r.version,v)>0)) v=r.version; } catch {} }
  process.stdout.write(v);')
[ -n "$V" ] || { echo "no confirmed Test build found: skip write-back"; exit 0; }
echo "confirmed Test version: $V"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
for i in 1 2 3; do
  git fetch -q origin "$BR" || { sleep $((i*10)); continue; }
  git reset -q --hard "origin/$BR"
  CUR=$(node -p "require('./app.json').version")
  if [ "$(printf '%s\n%s\n' "$CUR" "$V" | sort -V | tail -1)" = "$CUR" ]; then echo "branch at $CUR >= $V: nothing to write back"; exit 0; fi
  V="$V" node -e '
    const fs=require("fs"); const V=process.env.V;
    for (const f of ["app.json",".homeycompose/app.json","package.json"]) { if(!fs.existsSync(f)) continue;
      const t=fs.readFileSync(f,"utf8"); const j=JSON.parse(t); j.version=V;
      fs.writeFileSync(f, t.startsWith("{\n")?JSON.stringify(j,null,2)+"\n":JSON.stringify(j)); }
    if (fs.existsSync("package-lock.json")) { const l=JSON.parse(fs.readFileSync("package-lock.json","utf8")); l.version=V; if(l.packages&&l.packages[""]) l.packages[""].version=V; fs.writeFileSync("package-lock.json", JSON.stringify(l,null,2)+"\n"); }
    if (fs.existsSync(".homeychangelog.json")) { const c=JSON.parse(fs.readFileSync(".homeychangelog.json","utf8")); if(!c[V]) c[V]={en:"Device database and reliability updates.",fr:"Mises à jour de la base d’appareils et de la fiabilité."}; fs.writeFileSync(".homeychangelog.json", JSON.stringify(c,null,2)+"\n"); }
    fs.writeFileSync(".github/homey-version-floor", V+"\n");'
  for f in app.json .homeycompose/app.json package.json package-lock.json .homeychangelog.json .github/homey-version-floor; do [ -f "$f" ] && git add "$f"; done
  git commit -q -m "chore(version): v${V} written back after Test [skip ci]" || { echo "::warning::commit failed"; exit 0; }
  git push -q origin "HEAD:$BR" && { echo "wrote back v$V"; exit 0; }
  echo "::warning::write-back push attempt $i failed; retrying"; sleep $((i*10))
done
echo "::warning::version write-back not pushed (next run re-applies the Athom floor)"
exit 0
