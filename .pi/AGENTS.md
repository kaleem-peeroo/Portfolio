# Portfolio — Kaleem Peeroo

## Project Overview

Personal portfolio / digital garden at [kaleempeeroo.com](https://kaleempeeroo.com). Built on **Quartz v4.5.2** (jzhao.xyz SSG) — converts Markdown notes from an Obsidian vault into a browsable, searchable static site with graph view, backlinks, TOC, dark mode, RSS.

Hosted on **Cloudflare Workers** — static assets in `public/` deployed via `wrangler deploy`.

**Stack:** TypeScript ≥5.9.3 (strict, ESM) · Preact ^10.28 · SCSS + LightningCSS · esbuild ^0.27.2 · unified/remark/rehype (20+ plugins) · FlexSearch · D3 ^7 · Pixi.js ^8 · Shiki ^1 · KaTeX · Prettier ^3.8 · tsx + Node `--test` runner · Cloudflare Workers

**Fork of:** `jackyzha0/quartz`. Custom `quartz.config.ts` and `quartz.layout.ts` with personal branding, theme, Substack link, Google Analytics (G-W45E6W22LM).

## Directory Structure

| Path | Purpose |
|------|---------|
| `content/` | Markdown source files (copied from Obsidian vault at deploy time — ephemeral) |
| `quartz/` | SSG engine — build pipeline, plugins, components, styles, i18n, CLI |
| `quartz/components/` | Preact components (page layout, search, graph, backlinks, etc.) |
| `quartz/plugins/` | Transformers (remark/rehype), Emitters (HTML/RSS/assets), Filters |
| `quartz/styles/` | SCSS stylesheets (custom + base) |
| `quartz/util/` | Utility modules (paths, trie, resources, theme) |
| `public/` | Build output — deployed to Cloudflare |
| `scripts/` | `publish-to-substack.mjs` (one-off tool) |
| `docs/` | Upstream Quartz documentation |
| `.github/workflows/` | CI — gated to upstream repo, **won't run on this fork** |

## Commands

All commands run from project root.

| Command | Action |
|---------|--------|
| `npm test` | Run 69 tests via `tsx --test` (~161ms) |
| `npm run check` | `tsc --noEmit && prettier . --check` |
| `npm run format` | `prettier . --write` |
| `npx quartz build` | Build static site to `public/` (419ms, ~50 files) |
| `npx quartz build --serve` | Dev server with hot reload on `localhost` |
| `npx quartz build --serve -d docs` | Dev server with docs content |
| `npx quartz build --bundleInfo` | Build with bundle analysis |
| `npx wrangler deploy` | Deploy `public/` to Cloudflare Workers |
| `./deploy.sh` | Full deploy: vault → build → deploy → git commit → restore |
| `npm run docs` | `npx quartz build --serve -d docs` |
| `npm run profile` | CPU profile the build |

**No `npm run build` script** — use `npx quartz build` directly.

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

- **Branch**: Single `master` branch — no feature/hotfix/dev branches
- **Commit style**: Mix of auto-generated deploy commits (`Site update: Tue 23 Jun 2026 19:39:41 BST`) and manual imperative commits (`fix: resolve Obsidian attachment images...`, `add Substack subscribe form...`)
- **Deploy flow**: Content copied from vault → build → deploy → `git add && git commit && git push` to master
- **Remote**: `git@github.com:kaleem-peeroo/Portfolio.git` (SSH)
- **Dependabot**: Auto-creates short-lived branches for dep updates

## Deploy Pipeline

`deploy.sh` — 5 steps:
1. Resolve content source (arg > `.portfolio-path` > `$PORTFOLIO_PATH`)
2. Remove `content/`, copy from Obsidian vault
3. `npx quartz build` → `public/`
4. `npx wrangler deploy` → Cloudflare Workers
5. `git add . && git commit -m "Site update: ..." && git push` to master

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

## Risks & Gotchas

- **No `src/` directory** — Quartz engine lives in `quartz/`
- **Preact, not React** — `preact-render-to-string` for SSR, NOT `react-dom/server`
- **CI gated to upstream** — workflows check `github.repository == 'jackyzha0/quartz'` so they **won't run on this fork**. All quality checks must run locally.
- **No ESLint** — only `tsc --noEmit` + prettier for code quality
- **No `npm run build`** — use `npx quartz build` directly
- **Cloudflare Workers** — no Node.js runtime features in worker code
- **content/ dir is ephemeral** — created/copied at deploy time, not committed (mostly)
- **Prettier check** will flag `init/` and `.pi/` scratch files — not source code issues
