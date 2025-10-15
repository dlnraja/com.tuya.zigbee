@echo off
echo Forcing new commit...
git commit --allow-empty -m "fix: Force update APP images 250x175/500x350"
echo Pushing...
git push origin master
echo Done!
del %0
