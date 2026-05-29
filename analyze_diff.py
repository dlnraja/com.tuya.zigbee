import json, subprocess
files = [f.strip() for f in open("filelist.txt").read().strip().split(chr(10)) if f.strip()]
def gj(ref, f):
    try:
        c = subprocess.check_output(["git","show",f"{ref}:{f}"],shell=True,text=True,stderr=subprocess.DEVNULL)
        return json.loads(c)
    except: return None
em=[]; es=[]; nf=[]; mf=[]; mpm=[]; mps=[]; mem=[]; mes=[]; isl=0; ixr=0; dd=0; efs=[]
for f in files:
    m=gj("HEAD",f); s=gj("origin/stable-v5",f)
    if s is None: nf.append(f)
    else: mf.append(f)
    if m:
        mn=m.get("zigbee",{}).get("manufacturerName",[])
        if isinstance(mn,list) and len(mn)==0: em.append(f)
        pid=m.get("zigbee",{}).get("productId",[])
        if not (isinstance(pid,list) and len(pid)>0): mpm.append(f)
        ep=m.get("zigbee",{}).get("endpoints",{})
        if not (isinstance(ep,dict) and len(ep)>0): mem.append(f)
    if s:
        mn=s.get("zigbee",{}).get("manufacturerName",[])
        if isinstance(mn,list) and len(mn)==0: es.append(f)
        pid=s.get("zigbee",{}).get("productId",[])
        if not (isinstance(pid,list) and len(pid)>0): mps.append(f)
        ep=s.get("zigbee",{}).get("endpoints",{})
        if not (isinstance(ep,dict) and len(ep)>0): mes.append(f)
    if m and s:
        mi=m.get("images",{}); si=s.get("images",{})
        if mi.get("small","").startswith("/") and not si.get("small","").startswith("/"): isl+=1
        if "xlarge" not in mi and "xlarge" in si: ixr+=1
        mmn=set(m.get("zigbee",{}).get("manufacturerName",[])); smn=s.get("zigbee",{}).get("manufacturerName",[])
        if isinstance(smn,list) and len(smn)>len(mmn) and {x.upper() for x in smn}=={x.upper() for x in mmn}: dd+=1
print(f"Total differing: {len(files)}")
print(f"New in master: {len(nf)}")
print(f"Modified: {len(mf)}")
print(f"\n=== EMPTY manufacturerName[] IN MASTER: {len(em)} ===")
for f in em:
    s=gj("origin/stable-v5",f)
    if s:
        smn=s.get("zigbee",{}).get("manufacturerName",[])
        if isinstance(smn,list) and len(smn)>0: efs.append((f,len(smn)))
        else: print(f"  {f} (empty in BOTH)")
    else: print(f"  {f} (NEW)")
for f,c in sorted(efs): print(f"  {f} (stable-v5 had {c})")
print(f"\nEMPTIED from stable-v5: {len(efs)}")
print(f"\n=== EMPTY manufacturerName[] IN STABLE-V5: {len(es)} ===")
for f in sorted(es): print(f"  {f}")
print(f"\n=== MISSING productId IN MASTER: {len(mpm)} ===")
for f in sorted(mpm): print(f"  {f}")
print(f"\n=== MISSING productId IN STABLE-V5: {len(mps)} ===")
for f in sorted(mps): print(f"  {f}")
print(f"\n=== MISSING endpoints IN MASTER: {len(mem)} ===")
print(f"=== MISSING endpoints IN STABLE-V5: {len(mes)} ===")
print(f"\n=== IMAGE PATHS: slash added={isl}, xlarge removed={ixr} ===")
print(f"=== DEDUPED manufacturerName: {dd} ===")
