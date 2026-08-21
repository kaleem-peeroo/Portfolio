# Portfolio — Kaleem Peeroo

Personal portfolio/digital garden built with [Quartz v4](https://quartz.jzhao.xyz), deployed to [kaleempeeroo.com](https://kaleempeeroo.com) via Cloudflare Workers.

## Prerequisites

- **Node** ≥ 22
- **npm** ≥ 10.9.2
- **Wrangler** authenticated with Cloudflare (`npx wrangler login`)

## Setup on a New Machine

```bash
# 1. Clone
git clone git@github.com:kaleem-peeroo/Portfolio.git
cd Portfolio

# 2. Install dependencies
npm ci

# 3. Point to your Obsidian vault (see "Content Source" below)
echo '/path/to/your/vault' > .portfolio-path
```

## Content Source

The site is built from your Obsidian vault. `deploy.sh` resolves the vault path in this order:

1. **CLI argument** — `./deploy.sh /path/to/your/vault`
2. **`.portfolio-path` file** (recommended) — `echo '/path/to/your/vault' > .portfolio-path`
3. **`PORTFOLIO_PATH` env var** — `export PORTFOLIO_PATH='/path/to/your/vault'`

`.portfolio-path` is **local-only** (gitignored), so each machine points at its own vault location. The first two ways accept `~/...` shorthand.

## Publish to Substack

You can push a markdown post to [your Substack](https://kaleemp.substack.com) as a draft or published post.

```bash
# 1. Create the local env file (gitignored)
cp .substack-env.example .substack-env

# 2. Fill in your Substack session cookie
#    substack.com → DevTools → Application → Cookies → substack.sid
#    Paste the value into SUBSTACK_SID in .substack-env
```

Create a draft (no email sent):

```bash
./scripts/publish-to-substack.mjs "content/How I transitioned to Vim.md"
```

Send to subscribers:

```bash
./scripts/publish-to-substack.mjs --publish "content/How I Got to 130WPM Typing Speed.md"
```

`.substack-env` is gitignored — never commit it. Get a fresh `substack.sid` cookie if yours expires or is revoked.

## Deploy

```bash
./deploy.sh
```

This copies content from your vault, builds the site, deploys to Cloudflare, commits to git, and restores the `content` symlink.

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
