@echo off
git add assets/images/small.png assets/images/large.png
git commit -m "fix: Use driver dimensions 75x75/500x500 for APP fallback"
git push origin master
del %0
