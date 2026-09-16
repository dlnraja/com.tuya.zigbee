@echo off
cd /d C:\Users\Dell\Documents\homey\stable
node tools/ci/align-mfs-db-intelligent.js --apply
node tools/ci/align-mfs-db-intelligent.js --check
git status -sb -- data/mfs_db.json
