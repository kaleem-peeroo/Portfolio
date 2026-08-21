#!/bin/bash
set -euo pipefail

# --- Content path resolution ---
# Precedence: CLI arg > .portfolio-path file > PORTFOLIO_PATH env var
CONTENT_SRC="${1:-}"

if [ -z "$CONTENT_SRC" ] && [ -f ".portfolio-path" ]; then
  CONTENT_SRC="$(cat .portfolio-path | xargs)"
fi

if [ -z "$CONTENT_SRC" ]; then
  CONTENT_SRC="${PORTFOLIO_PATH:-}"
fi

if [ -z "$CONTENT_SRC" ]; then
  echo "Error: No content path provided."
  echo ""
  echo "Provide the path in one of these ways:"
  echo "  1. Pass as argument:               $0 ~/path/to/your/vault"
  echo "  2. Create .portfolio-path file:    echo '~/path/to/your/vault' > .portfolio-path"
  echo "  3. Set PORTFOLIO_PATH env var:      export PORTFOLIO_PATH='~/path/to/your/vault'"
  echo ""
  echo "Note: .portfolio-path is local-only (gitignored) — each machine sets its own."
  exit 1
fi

# Expand ~ if present (bash built-in)
CONTENT_SRC="${CONTENT_SRC/#\~/$HOME}"

if [ ! -d "$CONTENT_SRC" ]; then
  echo "Error: Content path '$CONTENT_SRC' is not a directory"
  exit 1
fi

echo "📁 Content source: $CONTENT_SRC"

# 1. Prepare Content
echo "📦 Copying content..."
rm -rf content
cp -r "$CONTENT_SRC" content

# 2. Build the Site
echo "🔨 Building site..."
npx quartz build

# 3. Deploy to Cloudflare
echo "☁️  Deploying to Cloudflare..."
npx wrangler deploy

# 4. Sync with GitHub (Backup)
echo "📤 Committing and pushing to GitHub..."
git add .
if git commit -m "Site update: $(date)"; then
  git push origin master
else
  echo "(nothing new to commit)"
fi

# 5. Restore symlink
echo "🔗 Restoring symlink..."
rm -rf content
ln -s "$CONTENT_SRC" content

echo "---------------------------------------"
echo "✅ Deployment complete!"
echo "Site live at: https://kaleempeeroo.com"
echo "---------------------------------------"
