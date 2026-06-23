#!/usr/bin/env node
/**
 * Create a Substack draft from a markdown post.
 *
 * Default: creates a draft (no email sent). Add --publish to send to subscribers.
 *
 * Usage:
 *   ./scripts/publish-to-substack.mjs "content/How I transitioned to Vim.md"
 *   ./scripts/publish-to-substack.mjs --publish "content/How I Got to 130WPM Typing Speed.md"
 *
 * Auth (get from browser cookies after logging into substack.com):
 *   Application → Cookies → substack.com → substack.sid
 *
 *   export SUBSTACK_SID="..."                  # substack.sid cookie value
 *   export SUBSTACK_PUB="kaleemp.substack.com"
 *
 * Or create .substack-env (gitignored):
 *   SUBSTACK_SID="..."
 *   SUBSTACK_PUB="kaleemp.substack.com"
 */

import fs from "fs"
import path from "path"
import { readFile, writeFile } from "fs/promises"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..")
const CONTENT_DIR = path.resolve(REPO_ROOT, "content")

// ─── Config ────────────────────────────────────────────────────────────────────

function loadConfig() {
  const envFile = path.join(REPO_ROOT, ".substack-env")
  let fileVars = {}
  if (fs.existsSync(envFile)) {
    const text = fs.readFileSync(envFile, "utf-8")
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(\w+)\s*=\s*"(.+?)"\s*$/)
      if (m) fileVars[m[1]] = m[2]
    }
  }
  return {
    sid: process.env.SUBSTACK_SID || fileVars.SUBSTACK_SID || "",
    pub: process.env.SUBSTACK_PUB || fileVars.SUBSTACK_PUB || "",
  }
}

// ─── Substack API ──────────────────────────────────────────────────────────────

async function substackFetch(path, options = {}) {
  const { sid, pub } = loadConfig()
  const base = `https://${pub}`
  const url = `${base}/api/v1${path}`
  const headers = {
    "content-type": "application/json",
    cookie: `connect.sid=${sid}; substack.sid=${sid}`,
    "substack-ux": "web",
    ...options.headers,
  }
  delete options.headers

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Substack API ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json()
}

async function uploadImage(filePath) {
  const { sid, pub } = loadConfig()
  const buffer = await readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  }
  const mime = mimeTypes[ext] || "application/octet-stream"
  const dataUri = `data:${mime};base64,${buffer.toString("base64")}`

  const res = await fetch(`https://${pub}/api/v1/image`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `connect.sid=${sid}; substack.sid=${sid}`,
      accept: "application/json",
    },
    body: JSON.stringify({ image: dataUri }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Image upload failed (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  // Substack upload returns { url: "..." }
  const imageUrl = data.url || data.image_url || data
  return imageUrl
}

// ─── Frontmatter ────────────────────────────────────────────────────────────────

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { frontmatter: {}, body: raw }
  const fm = {}
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^\s*(\w+)\s*:\s*(.+)$/)
    if (kv) fm[kv[1]] = kv[2].trim()
  }
  return { frontmatter: fm, body: raw.slice(m[0].length) }
}

// ─── Obsidian wikilink handling ────────────────────────────────────────────────

function extractWikilinkImages(body) {
  const images = []
  const re = /!\[\[([^\]]+?)(?:\|(\d+))?\]\]/g
  let match
  while ((match = re.exec(body)) !== null) {
    images.push({ raw: match[0], filename: match[1].trim(), width: match[2] || null })
  }
  return images
}

function resolveImageFile(filename) {
  const candidates = [
    path.join(CONTENT_DIR, filename),
    path.join(CONTENT_DIR, "attachments", filename),
  ]
  try {
    for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        candidates.push(path.join(CONTENT_DIR, entry.name, filename))
      }
    }
  } catch {}
  for (const c of candidates) {
    const resolved = path.resolve(c)
    if (fs.existsSync(resolved)) return resolved
  }
  return null
}

function resolveWikilinksInText(text, resolvedImages) {
  let result = text
  for (const img of resolvedImages) {
    if (img.cdnUrl) {
      result = result.replace(img.raw, `![${img.filename}](${img.cdnUrl})`)
    } else {
      result = result.replace(img.raw, img.filename)
    }
  }
  result = result.replace(/\[\[([^\]]+?)(?:\|[^\]]+)?\]\]/g, (_, name) => name.split("/").pop() || name)
  return result
}

// ─── Markdown → ProseMirror ────────────────────────────────────────────────────

import { unified } from "unified"
import remarkParse from "remark-parse"

function inlineToPM(nodes) {
  const result = []
  for (const node of nodes) {
    if (node.type === "text") {
      result.push({ type: "text", text: node.value })
    } else if (node.type === "strong") {
      for (const child of inlineToPM(node.children)) {
        child.marks = [...(child.marks || []), { type: "strong" }]
        result.push(child)
      }
    } else if (node.type === "emphasis") {
      for (const child of inlineToPM(node.children)) {
        child.marks = [...(child.marks || []), { type: "em" }]
        result.push(child)
      }
    } else if (node.type === "inlineCode") {
      result.push({ type: "text", text: node.value, marks: [{ type: "code" }] })
    } else if (node.type === "link") {
      for (const child of inlineToPM(node.children)) {
        child.marks = [...(child.marks || []), { type: "link", attrs: { href: node.url } }]
        result.push(child)
      }
    } else if (node.type === "delete") {
      for (const child of inlineToPM(node.children)) {
        child.marks = [...(child.marks || []), { type: "strike" }]
        result.push(child)
      }
    }
  }
  return result
}

async function markdownToProseMirror(markdownBody) {
  const wikilinkImages = extractWikilinkImages(markdownBody)
  const resolvedImages = []
  for (const img of wikilinkImages) {
    const filePath = resolveImageFile(img.filename)
    if (filePath) {
      try {
        const cdnUrl = await uploadImage(filePath)
        resolvedImages.push({ ...img, cdnUrl, filePath })
        console.log(`  ✓ uploaded image: ${img.filename}`)
      } catch (e) {
        console.warn(`  ⚠ failed to upload ${img.filename}: ${e.message}`)
      }
    } else {
      console.warn(`  ⚠ image not found: ${img.filename}`)
    }
  }

  const cleanedBody = resolveWikilinksInText(markdownBody, resolvedImages)
  const mdast = unified().use(remarkParse).parse(cleanedBody)
  const pmContent = []

  for (const node of mdast.children) {
    const converted = mdastNodeToPM(node)
    if (converted) pmContent.push(converted)
  }

  return { doc: { type: "doc", content: pmContent }, resolvedImages }
}

function mdastNodeToPM(node) {
  switch (node.type) {
    case "paragraph": {
      // Check if sole child is an image — render as standalone image node
      const imgChild = node.children.find((c) => c.type === "image")
      if (imgChild) {
        return {
          type: "image",
          attrs: { src: imgChild.url, alt: imgChild.alt || "" },
        }
      }
      return { type: "paragraph", content: inlineToPM(node.children) }
    }
    case "heading":
      return {
        type: "heading",
        attrs: { level: node.depth },
        content: inlineToPM(node.children),
      }
    case "blockquote": {
      const content = node.children.map((c) => mdastNodeToPM(c)).filter(Boolean)
      return { type: "blockquote", content }
    }
    case "code":
      return {
        type: "codeBlock",
        attrs: node.lang ? { language: node.lang } : {},
        content: node.value ? [{ type: "text", text: node.value }] : [],
      }
    case "list": {
      const listType = node.ordered ? "orderedList" : "bulletList"
      const content = node.children.map((item) => ({
        type: "listItem",
        content: (item.children || []).map((c) => {
          if (c.type === "paragraph") return { type: "paragraph", content: inlineToPM(c.children) }
          return mdastNodeToPM(c)
        }).filter(Boolean),
      }))
      return { type: listType, content }
    }
    case "thematicBreak":
      return { type: "horizontalRule", content: [] }
    case "html":
      return { type: "paragraph", content: [{ type: "text", text: node.value }] }
    case "image": {
      return {
        type: "image",
        attrs: { src: node.url, alt: node.alt || "" },
      }
    }
    default:
      return null
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const shouldPublish = args.includes("--publish")
  const fileArg = args.find((a) => !a.startsWith("--"))
  if (!fileArg) {
    console.log(`
Usage:  ./scripts/publish-to-substack.mjs [--publish] <markdown-file>

Flags:
  --publish  Publish immediately and send email (default is draft-only)

Examples:
  ./scripts/publish-to-substack.mjs "content/How I Read Papers.md"
  ./scripts/publish-to-substack.mjs --publish "content/How I Got to 130WPM Typing Speed.md"

Auth (set one of):
  export SUBSTACK_SID="..." && export SUBSTACK_PUB="kaleemp.substack.com"
  echo 'SUBSTACK_SID="..."' >> .substack-env
  echo 'SUBSTACK_PUB="kaleemp.substack.com"' >> .substack-env

Get SUBSTACK_SID from browser: substack.com → DevTools → Application → Cookies → substack.sid
`)
    process.exit(1)
  }

  const cfg = loadConfig()
  if (!cfg.sid) {
    console.error("Error: SUBSTACK_SID not set. See usage above.")
    process.exit(1)
  }
  if (!cfg.pub) {
    console.error("Error: SUBSTACK_PUB not set. See usage above.")
    process.exit(1)
  }

  const filePath = path.resolve(fileArg)
  if (!fs.existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`\n📄 Reading: ${path.relative(REPO_ROOT, filePath)}`)
  const raw = await readFile(filePath, "utf-8")
  const { frontmatter, body } = parseFrontmatter(raw)
  const title = frontmatter.title || path.basename(filePath, path.extname(filePath)).replace(/[-_]/g, " ")
  console.log(`📝 Title: ${title}`)

  if (frontmatter.draft === "true" || frontmatter.draft === true) {
    console.log("  → Skipping: marked as draft")
    process.exit(0)
  }

  console.log(`\n🖼  Uploading images...`)
  const { doc, resolvedImages } = await markdownToProseMirror(body)

  console.log(`\n📝 Creating Substack draft...`)
  const payload = {
    draft_title: title,
    draft_body: JSON.stringify(doc),
    draft_bylines: [{ id: 1 }], // will be corrected by API
    audience: "everyone",
    type: "newsletter",
  }
  if (frontmatter.subtitle) payload.draft_subtitle = frontmatter.subtitle

  const draft = await substackFetch("/drafts", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  const draftId = draft.id || draft.draft_id
  console.log(`  ✓ Draft created: ${draftId}`)

  const outPath = path.join(REPO_ROOT, ".last-substack-publish.json")
  const editUrl = `https://${cfg.pub}/publish/${draftId}`

  if (!shouldPublish) {
    await writeFile(outPath, JSON.stringify({ title, draftId, file: filePath, url: editUrl, status: "draft" }, null, 2))
    console.log(`\n✅ Draft saved: ${editUrl}`)
    console.log(`   Images: ${resolvedImages.length} uploaded`)
    console.log(`   Edit before publishing at the link above.`)
    console.log(`   Info → .last-substack-publish.json\n`)
    return
  }

  console.log(`\n🚀 Publishing...`)
  await substackFetch(`/drafts/${draftId}/publish`, {
    method: "POST",
    body: JSON.stringify({
      send: true,
      share_automatically: true,
    }),
  })

  const postUrl = `https://${cfg.pub}/p/${draftId}`
  await writeFile(outPath, JSON.stringify({ title, draftId, file: filePath, url: postUrl, status: "published" }, null, 2))

  console.log(`\n✅ Published: ${postUrl}`)
  console.log(`   Images: ${resolvedImages.length} uploaded`)
  console.log(`   Info → .last-substack-publish.json\n`)
}

main().catch((e) => {
  console.error(`\n❌ Error: ${e.message}`)
  process.exit(1)
})
