# Portfolio — Kaleem Peeroo

Personal portfolio/digital garden built with [Quartz v4](https://quartz.jzhao.xyz), deployed to [kaleempeeroo.com](https://kaleempeeroo.com) via Cloudflare Workers.

## Setup on a New Machine

```bash
# 1. Clone
git clone git@github.com:kaleem-peeroo/Portfolio.git
cd Portfolio/quartz

# 2. Install dependencies
npm ci

# 3. Point to your Obsidian vault
echo '~/vault 2.0/0_portfolio' > .portfolio-path
```

## Deploy

```bash
cd Portfolio/quartz
./deploy.sh
```

This copies content from your vault, builds the site, deploys to Cloudflare, commits to git, and restores the symlink.

### Override content source

```bash
./deploy.sh /some/other/vault
```

## Local Preview

```bash
npx quartz build --serve
```

## Tech Stack

Quartz v4 · TypeScript · Preact · SCSS · esbuild · Cloudflare Workers
