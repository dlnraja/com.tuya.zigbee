import sys,subprocess,os,oxipng
from PIL import Image, ImageChops
root=sys.argv[1]; dry=len(sys.argv)>2
files=subprocess.run(['git','-C',root,'ls-files','-z','*.png'],capture_output=True).stdout.decode().split('\0')
before=after=n=0
for f in filter(None,files):
    p=os.path.join(root,f); data=open(p,'rb').read()
    try: out=oxipng.optimize_from_memory(data,level=4,strip=oxipng.StripChunks.safe())
    except Exception as e: print('skip',f,e); continue
    before+=len(data)
    if len(out)>=len(data): after+=len(data); continue
    import io
    a=Image.open(io.BytesIO(data)).convert('RGBA'); b=Image.open(io.BytesIO(out)).convert('RGBA')
    if a.size!=b.size or ImageChops.difference(a,b).getbbox() is not None or list(a.getdata())!=list(b.getdata()):
        after+=len(data); print('mismatch',f); continue
    after+=len(out); n+=1
    if not dry: open(p,'wb').write(out)
print(f"pngs changed {n}: {before/1e6:.2f} MB -> {after/1e6:.2f} MB")
