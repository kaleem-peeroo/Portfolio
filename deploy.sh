#!/bin/bash
# 1. Prepare Content
# Remove the symlink and copy actual files for the build
rm -rf content
cp -r ~/vault\ 2.0/0_portfolio content

# 2. Build the Site
# This generates the HTML in the /public folder
npx quartz build

# 3. Deploy to Cloudflare
# This pushes the /public folder to your domain immediately
npx wrangler deploy

# 4. Sync with GitHub (Backup)
git add .
git commit -m "Site update: $(date)"
git push origin master

# 5. Restore Workflow
# Put the symlink back so Obsidian works as usual
rm -rf content
ln -s ~/vault\ 2.0/0_portfolio content

echo "---------------------------------------"
echo "✅ Deployment complete!"
echo "Site live at: https://kaleempeeroo.com"
echo "---------------------------------------"
