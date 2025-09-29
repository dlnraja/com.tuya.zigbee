#!/bin/bash
# GitHub Sync Script: master <=> tuya-light

git fetch origin
git checkout tuya-light
git merge origin/master --no-edit
git push origin tuya-light

git checkout master
echo "✅ Synchronisation complète master ↔ tuya-light"