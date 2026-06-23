## 1. Project Overview

**Portfolio** — Kaleem Peeroo's personal website / digital garden at [kaleempeeroo.com](https://kaleempeeroo.com). Built with **Quartz v4.5.2** (OSS SSG by jackyzha0), deployed to **Cloudflare Workers**. Content authored in external Obsidian vault, synced via deploy script.

### Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node 22 (`>=22`, pinned `22.16.0`) |
| Language | TypeScript 5.9 (strict, `noUnusedLocals`/`noUnusedParameters`) |
| UI | Preact (JSX via `jsxImportSource: "preact"`, `react-jsx` transform) |
| Build | esbuild (custom pipeline) |
| CSS | SCSS via `esbuild-sass-plugin` + LightningCSS |
| Markdown | unified + remark + rehype pipeline |
| Syntax highlighting | Shiki |
| Math | KaTeX |
| Search | FlexSearch |
| Graph viz | d3 + Pixi.js |
| Icons | Pixi.js + Tween.js |
| OG images | Satori + Sharp (disabled: `plugin.CustomOgImages()` commented out) |
| CI | GitHub Actions (upstream-only, none run on fork) |
| Deploy | Cloudflare Workers (`wrangler.toml`, assets from `./public/`) |

### Key Config Files

- `package.json` — `@jackyzha0/quartz` v4.5.2, ES module, npm `engine-strict`
- `tsconfig.json` — strict, Preact JSX, `esnext` module/target, `incremental: true`
- `quartz.config.ts` — Site title, theme, analytics (GA tag `G-W45E6W22LM`), plugin pipeline
- `quartz.layout.ts` — Page layout: shared components, content layout, list layout
- `wrangler.toml` — Cloudflare config, maps `./public/` as static assets
- `.prettierrc` — `printWidth: 100`, `trailingComma: "all"`, `semi: false`, `tabWidth: 2`

## 2. Directory Structure

```
Portfolio/
├── content/             # ~25 Markdown pages (replaced on every deploy)
│   ├── index.md         # Home page
│   ├── Blog.md          # Blog listing
│   ├── Projects.md      # Projects listing
│   ├── Research.md      # Research page
│   ├── Publications.md  # Publications
│   ├── Contact.md       # Contact
│   └── attachments/     # Images (e.g., typing speed screenshots)
├── quartz/              # Full Quartz SSG framework (103 .ts, 41 .tsx, 21 .scss)
│   ├── bootstrap-cli.mjs    # CLI entry point (invoked via `npx quartz`)
│   ├── build.ts             # Main build orchestrator
│   ├── cfg.ts               # Config types
│   ├── worker.ts            # Pooled build worker
│   ├── cli/                 # CLI arg parsing, handlers
│   ├── components/          # Preact UI components + inline scripts
│   ├── plugins/             # Plugin system: transformers/, emitters/, filters/
│   ├── processors/          # Low-level pipeline: parse, filter, emit
│   ├── util/                # Utilities: path, file tree, theme, OG, perf
│   ├── styles/              # Global SCSS (variables, base, custom, syntax)
│   ├── static/              # Static assets (icon.png)
│   └── i18n/                # 31 locale files
├── scripts/
│   └── publish-to-substack.mjs   # Cross-posts content to Substack
├── .github/
│   └── workflows/          # 4 workflows (all upstream-only, none run on fork)
├── docs/                   # Upstream Quartz documentation mirror
├── public/                 # Build output (7.1MB, gitignored)
├── deploy.sh               # Full deploy pipeline
├── Dockerfile              # node:22-slim multi-stage build
└── .pi/                    # Pi agent metadata
```

## 3. Commands

### Run (local dev)
```bash
npx quartz build --serve    # Preview at localhost:8080
```

### Build
```bash
npx quartz build            # Outputs to ./public/ (7.1MB, 24 input → 41 output files)
```
Build verified clean: 0 errors, 0 warnings, ~360ms total.

### Test
```bash
npm test                    # tsx --test → 6 suites, 69 tests, all pass (263ms)
```
3 test files: `quartz/util/fileTrie.test.ts`, `quartz/util/path.test.ts`, `quartz/components/scripts/search.test.ts`.

### Lint / TypeCheck
```bash
npm run check               # tsc --noEmit && npx prettier . --check
```
- `tsc --noEmit`: PASS (0 errors)
- `prettier --check`: FAIL on 6 files (`.pi/*.md`, `progress.md`, `scripts/publish-to-substack.mjs`)
- Fix: `npx prettier . --write`

### Format
```bash
npm run format              # npx prettier . --write
```

### Deploy
```bash
./deploy.sh [optional-content-path]
```
Full pipeline: copy from Obsidian vault → `npx quartz build` → `npx wrangler deploy` → `git commit/push` → restore vault symlink.

### Profile
```bash
npm run profile             # 0x profiler on build
```

## 4. Code Style & Conventions

- **TypeScript**: Strict mode, `noUnusedLocals`, `noUnusedParameters`, incremental builds
- **JSX**: Preact, `react-jsx` transform, `jsxImportSource: "preact"`
- **Formatting**: Prettier (no semicolons, trailing commas, 100 print width, 2-space tabs)
- **Imports**: ES module (`"type": "module"` in package.json)
- **Module resolution**: Node-style (`moduleResolution: "node"`)
- **SCSS**: Component-scoped `.scss` files in `quartz/components/styles/`, global styles in `quartz/styles/`
- **No semicolons** in TS/JS (Prettier config)
- **No React** — uses Preact (smaller bundle, same API surface)
- **Plugin architecture**: 3 types — Transformer (AST modify), Filter (include/exclude), Emitter (file emit). Defined in `quartz.config.ts` pipeline array.

## 5. Architecture Notes

### Plugin Pipeline (from `quartz.config.ts`)
```
FrontMatter → CreatedModifiedDate → SyntaxHighlighting → ObsidianFlavoredMarkdown
→ GitHubFlavoredMarkdown → TOC → CrawlLinks → Description → Latex → HardLineBreaks
→ [Filter: RemoveDrafts]
→ AliasRedirects → ComponentResources → ContentPage → FolderPage → TagPage
→ ContentIndex (sitemap + RSS) → Assets → Static → Favicon → NotFoundPage
```

### SPA & Client Features
- **SPA navigation**: micromorph (DOM diffing, no full page loads)
- **Search**: FlexSearch (client-side full-text)
- **Graph view**: d3 force layout + Pixi.js WebGL renderer
- **Popovers**: Preview cards on hover (internal links)
- **Theme**: CSS custom properties, dark/light toggle
- **Custom events**: `prenav`, `nav`, `themechange`, `readermodechange` (declared in `globals.d.ts`)

### Deploy Architecture
```
Obsidian vault (~/vault 2.0/0_portfolio) → deploy.sh:
  1. cp content from vault into ./content/
  2. npx quartz build → ./public/
  3. npx wrangler deploy → Cloudflare Workers
  4. git commit + push to origin/master
  5. symlink ./content/ back to vault
```

### Important Constraints

1. **`content/` is replaced on every deploy** — do not edit content in-repo. Source of truth is the Obsidian vault.
2. **CI workflows are upstream-only** — all 4 GitHub Actions check `github.repository == 'jackyzha0/quartz'` and won't run on this fork. Deploy is fully manual.
3. **OG images are disabled** — `plugin.CustomOgImages()` commented out in `quartz.config.ts`.
4. **No `.portfolio-path` file** on this machine — deploy picks vault path from `$PORTFOLIO_PATH` env or CLI arg.
5. **Only `master` branch** exists — no feature branches, no PR workflow.
6. **`deploy.sh` deletes and recreates `content/`** — if interrupted, content can be orphaned.

### Key Dependencies

| Package | Purpose |
|---------|---------|
| pixi.js ^8.15.0 | GPU graph visualization |
| d3 ^7.9.0 | Force-directed graph layout |
| flexsearch ^0.8.205 | Client-side full-text search |
| satori ^0.19.1 | OG image generation (disabled) |
| sharp ^0.34.5 | Image processing |
| shiki ^1.26.2 | Syntax highlighting |
| micromorph ^0.4.5 | SPA page transitions |
| workerpool ^10.0.1 | Parallel build workers |
| @tweenjs/tween.js | Animations |

## 6. Testing

- **Runner**: Node.js built-in `--test` runner via `tsx` (TAP protocol)
- **Config**: No test config file — `tsx --test` auto-discovers test files
- **Test files**: 3 files, 6 suites, 69 individual tests
- **Status**: All 69 pass, 0 failures, 0 skipped (263ms total)

### Test suites:
1. `search.test.ts` — search encoder (4 tests: English, CJK, mixed, edge cases)
2. `fileTrie.test.ts` — FileTrie data structure (10 tests: constructor, add, filter, map, entries, etc.)
3. `path.test.ts` — path utilities (55 tests: typeguards, transforms, link strategies, resolveRelative)

### Running tests
```bash
npm test                          # all tests
tsx --test quartz/util/path.test.ts  # single test file
```

## 7. Git Workflow

- **Branch**: `master` only (no feature/fix branches, no PRs)
- **Remote**: `git@github.com:kaleem-peeroo/Portfolio.git`
- **Total commits**: 50

### Commit style: Imperative mood, lowercase start, informal prefixes
```
fix: resolve Obsidian attachment images in subdirectories
add --draft flag to publish script
deploy.sh: configurable content path (CLI arg > .portfolio-path file > PORTFOLIO_PATH env var)
README: new-machine setup steps
```
- Prefixes used: `fix:`, `add`, `<file>:`, bare noun
- No strict conventional commits (`feat:`, scope parens, `!` breaking)
- 50-80 char one-liners; multi-line body for complex changes

### Automated commits
About ~19 of last 30 are machine-generated from deploy script:
```
Site update: Wed 10 Jun 2026 12:34:24 BST
```

### Committing
- Commit directly to `master`
- Imperative mood, lowercase, prefix when helpful
- No PRs, no merge commits — pure linear history
