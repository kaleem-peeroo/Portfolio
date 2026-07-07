# Portfolio — Kaleem Peeroo

## Project Overview

Personal portfolio / digital garden at [kaleempeeroo.com](https://kaleempeeroo.com). Built on **Quartz v4.5.2** (jzhao.xyz SSG) — converts Markdown notes from an Obsidian vault into a browsable, searchable static site with graph view, backlinks, TOC, dark mode, RSS.

Hosted on **Cloudflare Workers** — static assets in `public/` deployed via `wrangler deploy`.

**Stack:** TypeScript ≥5.9.3 (strict, ESM) · Preact ^10.28 · SCSS + LightningCSS · esbuild ^0.27.2 · unified/remark/rehype (20+ plugins) · FlexSearch · D3 ^7 · Pixi.js ^8 · Shiki ^1 · KaTeX · Prettier ^3.8 · tsx + Node `--test` runner · Cloudflare Workers

**Fork of:** `jackyzha0/quartz`. Custom `quartz.config.ts` and `quartz.layout.ts` with personal branding, theme, Substack link, Google Analytics (G-W45E6W22LM).

## Directory Structure

| Path | Purpose |
|------|---------|
| `content/` | Markdown source (copied from Obsidian vault at deploy — ephemeral) |
| `quartz/` | SSG engine — build, plugins, components, styles, i18n, CLI |
| `public/` | Build output — deployed to Cloudflare Workers |
| `scripts/` | `publish-to-substack.mjs` — Substack draft/publish tool |
| `docs/` | Upstream Quartz documentation |
| `.github/workflows/` | CI — gated to upstream repo (won't run on fork) |
| `.substack-env` | Gitignored — holds `SUBSTACK_SID` + `SUBSTACK_PUB` for Substack auth |
| `.last-substack-publish.json` | Auto-generated — tracks last Substack draft/publish |

## Commands

All commands run from project root.

| Command | Action |
|---------|--------|
| `npm test` | Run 69 tests via `tsx --test` (~155ms) |
| `npm run check` | `tsc --noEmit && prettier . --check` (prettier flags scratch files — not source) |
| `npm run format` | `prettier . --write` |
| `npx quartz build` | Build static site to `public/` (~225ms, 32→50 files) |
| `npx quartz build --serve` | Dev server with hot reload |
| `npx wrangler deploy` | Deploy `public/` to Cloudflare Workers |
| `./deploy.sh` | Full deploy: vault → build → deploy → git commit → restore |
| `./scripts/publish-to-substack.mjs <file>` | Create Substack draft (default, no email). Add `--publish` to send. |

**No `npm run build` script** — use `npx quartz build` directly. Same for `npm run dev` — use `npx quartz build --serve`.

## Build Pipeline (3-phase)

```
[content/*.md] → Parse (transformers) → Filter → Emit (HTML + assets) → [public/]
```

1. **Parse** (`quartz/processors/parse.ts`): All transformer plugins run in sequence (frontmatter, syntax highlighting, LaTeX, Obsidian-flavored markdown, GFM, TOC, link crawling, descriptions, hard line breaks)
2. **Filter** (`quartz/processors/filter.ts`): Removes drafts and ignored content
3. **Emit** (`quartz/processors/emit.ts`): All emitter plugins write output (ContentPage, folder indexes, tag pages, sitemap, RSS, assets, favicons, aliases, 404)

Dev mode uses chokidar file watcher + WebSocket for live reload.

## Plugin Architecture

Three plugin types in `quartz/plugins/`:

- **Transformers**: `FrontMatter`, `CreatedModifiedDate`, `SyntaxHighlighting`, `ObsidianFlavoredMarkdown`, `GitHubFlavoredMarkdown`, `TableOfContents`, `CrawlLinks`, `Description`, `Latex`, `HardLineBreaks`
- **Filters**: `RemoveDrafts`
- **Emitters**: `AliasRedirects`, `ComponentResources`, `ContentPage`, `FolderPage`, `TagPage`, `ContentIndex` (sitemap + RSS), `Assets`, `Static`, `Favicon`, `NotFoundPage`

## Component System (Preact)

Layout configured in `quartz.layout.ts` — two component regions (left panel, right panel) per page layout type. Components in `quartz/components/`:

- **Content pages**: Breadcrumbs, ArticleTitle, ContentMeta, TagList, Search, DarkMode, ReaderMode, Explorer (file tree), TableOfContents, Substack embed, Backlinks
- **Shared**: Head, Footer (with Substack link)

## Code Style & Conventions

- **Preact** JSX — import from `preact`, NOT `react`
- **TypeScript** strict mode, ESM, `target: ESNext`, `moduleResolution: node`
- **Formatting**: Prettier — 100 width, 2-space tabs, no semis, trailing commas all
- **No ESLint** — type checking (`tsc --noEmit`) + prettier are the only quality checks
- **SCSS** stylesheets — no Tailwind, no CSS-in-JS
- **`any` type usage** — avoid; `tsconfig.json` has `strict: true`
- **Node >=22** — `.npmrc` has `engine-strict=true`

## Testing

- **Runner**: Node.js built-in `node:test` via `tsx --test`
- **Config**: None — uses Node-native conventions
- **Locations**:
  - `quartz/util/path.test.ts` — 17 tests (typeguards, transforms, link strategies, resolveRelative)
  - `quartz/util/fileTrie.test.ts` — 31 tests (trie data structure operations)
  - `quartz/components/scripts/search.test.ts` — 21 tests (English/CJK/mixed tokenization)
- **Total**: 69 tests, all passing, ~161ms runtime
- **Pattern**: `describe`/`it` from `node:test`, assertions from `node:assert` (or `node:assert/strict`)

## Git Workflow

- **Branch**: Single `master` — no feature/hotfix/dev branches
- **Commit style**: Mix of auto-generated deploy commits (`Site update: ...`) and manual imperative commits (`fix:`, `add`, `filter Explorer sidebar...`)
- **Deploy flow**: vault → build → deploy → `git add && git commit && git push` to master
- **Remote**: `git@github.com:kaleem-peeroo/Portfolio.git` (SSH)
- **Dependabot**: Short-lived branches for dep updates

## Deploy Pipeline

`deploy.sh` — 5 steps:
1. Resolve content source (CLI arg > `.portfolio-path` if exists > `$PORTFOLIO_PATH`)
2. Remove `content/`, copy from Obsidian vault
3. `npx quartz build` → `public/`
4. `npx wrangler deploy` → Cloudflare Workers
5. `git add . && git commit -m "Site update: ..." && git push` to master

## Substack Publishing

`scripts/publish-to-substack.mjs` — converts a Markdown post to Substack via the API.

**Auth** (set one):
- `export SUBSTACK_SID="..."` and `export SUBSTACK_PUB="kaleemp.substack.com"`
- Or write to `.substack-env` (gitignored — already done)

Get `SUBSTACK_SID` from browser: login to substack.com → DevTools → Storage → Cookies → `substack.com` → copy `substack.sid`

**Usage:**
```bash
# Draft (no email sent)
./scripts/publish-to-substack.mjs "content/your-post.md"

# Publish + send to subscribers
./scripts/publish-to-substack.mjs --publish "content/your-post.md"
```

**Handles:** Obsidian wikilinks (`![[image.png]]`), frontmatter (`title`, `subtitle`, `draft: true` to skip), image upload. Saves last result to `.last-substack-publish.json`.

**Gotcha — ProseMirror image nodes:** Substack renders images as `image` with `src` attr, NOT `captionedImage` with `url`. If images are missing in drafts, fix the ProseMirror node type in the script.

## Key Configuration Files

| File | Purpose |
|------|---------|
| `quartz.config.ts` | Site name, URL, GA tag, plugin list, layout config |
| `quartz.layout.ts` | Left/right sidebar component config per page layout |
| `tsconfig.json` | Strict TS, Preact JSX, ESNext target |
| `wrangler.toml` | Cloudflare Workers config (compatibility_date: "2026-03-08") |
| `.node-version` | Node 22.16.0 |
| `.npmrc` | `engine-strict=true` |
| `.prettierrc` | Formatting (100 width, 2 spaces, no semis) |
| `.substack-env` | Substack auth (gitignored) — `SUBSTACK_SID` + `SUBSTACK_PUB` |

## Risks & Gotchas

- **Quartz engine lives in `quartz/`** — no traditional `src/` dir
- **Preact, not React** — `preact-render-to-string` for SSR, NOT `react-dom/server`
- **CI gated to upstream** — workflows won't run on fork. Quality checks must run locally.
- **No ESLint** — only `tsc --noEmit` + prettier
- **No `npm run build`** — use `npx quartz build`
- **Cloudflare Workers** — no Node.js runtime features in worker code
- **content/ is ephemeral** — copied from vault at deploy, not committed
- **Prettier flags scratch files** — `.pi/AGENTS.md`, `.last-substack-publish.json`, `progress.md` — not source issues
- **Substack images use ProseMirror** — node type must be `image` with `src` attr, NOT `captionedImage` with `url` (won't render)

## Agent skills

### Issue tracker

Local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one CONTEXT.md + docs/adr/ at repo root. See `docs/agents/domain.md`.
