#!/bin/bash
# 1. Remove old content and copy fresh files from your vault
rm -rf content
cp -r ~/vault\ 2.0/0_portfolio content

# 2. Sync with GitHub
git add .
git commit -m "Site update: $(date)"
git push origin master

# 3. Restore the symlink for local editing
rm -rf content
ln -s ~/vault\ 2.0/0_portfolio content
echo "Deployment complete and symlink restored."
