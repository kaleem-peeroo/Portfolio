#!/usr/bin/env node
/**
 * Publish a markdown blog post to Substack.
 *
 * Usage:
 *   ./scripts/publish-to-substack.mjs content/How-I-Transitioned-to-Vim.md
 *
 * Auth (get from browser cookies after logging into substack.com):
 *   export SUBSTACK_SID="..."
 *   export SUBSTACK_PUB="kaleemp.substack.com"
 *
 * Or create .substack-env:
 *   SUBSTACK_SID="..."
 *   SUBSTACK_PUB="kaleemp.substack.com"
 */

import fs from "fs"
import path from "path"
import { readFile, writeFile } from "fs/promises"
import { fileURLToPath } from "url"

// ─── Config ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..")
const CONTENT_DIR = path.resolve(REPO_ROOT, "content")

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

// ─── Obsidian wikilinks ─────────────────────────────────────────────────────────

function getBodyText(node) {
  if (node.type === "text") return node.value
  if (node.children) return node.children.map(getBodyText).join("")
  return ""
}

/**
 * Collect all image references from the body text.
 * Returns [{ raw, filename, width }]
 */
function extractWikilinkImages(body) {
  const images = []
  const re = /!\[\[([^\]]+?)(?:\|(\d+))?\]\]/g
  let match
  while ((match = re.exec(body)) !== null) {
    images.push({ raw: match[0], filename: match[1].trim(), width: match[2] || null })
  }
  return images
}

/**
 * Resolve a wikilink filename to an actual file in the content directory tree.
 */
function resolveImageFile(filename) {
  // Handle relative paths within content
  const candidates = [
    path.join(CONTENT_DIR, filename),
    path.join(CONTENT_DIR, "attachments", filename),
    path.join(CONTENT_DIR, "..", "public", "attachments", filename),
  ]
  // Also search recursively one level deep
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

// ─── Substack API ──────────────────────────────────────────────────────────────

const SUBSTACK_API = "https://substack.com/api/v1"

async function substackFetch(path, options = {}) {
  const { sid, pub } = loadConfig()
  const url = `${SUBSTACK_API}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      cookie: `substack_sid=${sid}`,
      "substack-ux": "web",
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Substack API ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json()
}

async function uploadImage(filePath) {
  const { sid } = loadConfig()
  const fileBuffer = await readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" }
  const mime = mimeTypes[ext] || "application/octet-stream"

  const form = new FormData()
  form.append("image", new Blob([fileBuffer], { type: mime }), path.basename(filePath))
  form.append("type", "post")

  const res = await fetch(`${SUBSTACK_API}/image/upload`, {
    method: "POST",
    headers: { cookie: `substack_sid=${sid}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Image upload failed: ${res.status} ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.url || data.image_url || data
}

// ─── Markdown → ProseMirror ────────────────────────────────────────────────────

import { unified } from "unified"
import remarkParse from "remark-parse"
import { visit } from "unist-util-visit"

/**
 * Convert inline markdown children (strong, em, link, code, text) to ProseMirror marks + text nodes.
 */
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
    } else if (node.type === "image") {
      // Standard markdown image
      result.push({
        type: "text",
        text: node.alt || "",
        marks: [{ type: "link", attrs: { href: node.url } }],
      })
    }
  }
  return result
}

/**
 * Resolve wikilinks in raw text content, returning replacement text.
 */
function resolveWikilinksInText(text, resolvedImages) {
  // Replace image wikilinks first with the Substack CDN URL
  let result = text
  for (const img of resolvedImages) {
    if (img.cdnUrl) {
      result = result.replace(img.raw, `![${img.filename}](${img.cdnUrl})`)
    } else {
      result = result.replace(img.raw, img.filename)
    }
  }
  // Replace regular wikilinks [[Page]] with just the page name
  result = result.replace(/\[\[([^\]]+?)(?:\|[^\]]+)?\]\]/g, (_, name) => name.split("/").pop() || name)
  return result
}

async function markdownToProseMirror(markdownBody) {
  // First, extract and upload wikilink images
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

  // Replace wikilinks in the body text with markdown equivalents
  const cleanedBody = resolveWikilinksInText(markdownBody, resolvedImages)

  // Parse with remark
  const mdast = unified().use(remarkParse).parse(cleanedBody)

  // Convert mdast to ProseMirror
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
      const content = inlineToPM(node.children)
      // Handle images inside paragraphs
      for (const child of node.children) {
        if (child.type === "image") {
          return {
            type: "image",
            attrs: {
              src: child.url,
              alt: child.alt || "",
              title: child.title || null,
            },
          }
        }
      }
      return { type: "paragraph", content }
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

    case "inlineCode":
      return { type: "text", text: node.value, marks: [{ type: "code" }] }

    case "list": {
      const listType = node.ordered ? "orderedList" : "bulletList"
      const content = node.children.map((item) => {
        const itemContent = (item.children || [])
          .map((c) => {
            if (c.type === "paragraph") {
              return { type: "paragraph", content: inlineToPM(c.children) }
            }
            return mdastNodeToPM(c)
          })
          .filter(Boolean)
        return { type: "listItem", content: itemContent }
      })
      return { type: listType, content }
    }

    case "thematicBreak":
      return { type: "horizontalRule", content: [] }

    case "html":
      // Pass through raw HTML as a paragraph
      return { type: "paragraph", content: [{ type: "text", text: node.value }] }

    default:
      return null
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.log(`
Usage:  ./scripts/publish-to-substack.mjs <markdown-file>

Examples:
  ./scripts/publish-to-substack.mjs content/How-I-Transitioned-to-Vim.md
  ./scripts/publish-to-substack.mjs content/Blog.md

Auth (set one of):
  export SUBSTACK_SID="..." && export SUBSTACK_PUB="kaleemp.substack.com"
  echo 'SUBSTACK_SID="..."' >> .substack-env
  echo 'SUBSTACK_PUB="kaleemp.substack.com"' >> .substack-env

Get SUBSTACK_SID from browser cookies after logging into substack.com.
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
  const title = frontmatter.title || frontmatter.published_on || path.basename(filePath, path.extname(filePath)).replace(/[-_]/g, " ")
  console.log(`📝 Title: ${title}`)

  // Check for draft flag
  if (frontmatter.draft === "true" || frontmatter.draft === true) {
    console.log("  → Skipping: marked as draft")
    process.exit(0)
  }

  console.log(`\n🖼  Uploading images...`)
  const { doc, resolvedImages } = await markdownToProseMirror(body)

  console.log(`\n📝 Creating Substack draft...`)
  const draft = await substackFetch("/drafts", {
    method: "POST",
    body: JSON.stringify({
      title,
      body: doc,
      subtitle: frontmatter.subtitle || "",
      type: "newsletter",
    }),
  })

  const draftId = draft.id || draft.draft_id
  console.log(`  ✓ Draft created: ${draftId}`)

  console.log(`\n🚀 Publishing...`)
  await substackFetch(`/drafts/${draftId}/publish`, {
    method: "POST",
    body: JSON.stringify({
      send_email: true,
      audience: "everyone",
    }),
  })

  // Save draft info
  const outPath = path.join(REPO_ROOT, ".last-substack-publish.json")
  await writeFile(outPath, JSON.stringify({ title, draftId, file: filePath, url: `https://${cfg.pub}/p/${draftId}` }, null, 2))

  console.log(`\n✅ Published: https://${cfg.pub}/p/${draftId}`)
  console.log(`   Images uploaded: ${resolvedImages.length}`)
  console.log(`   Info saved to: .last-substack-publish.json\n`)
}

main().catch((e) => {
  console.error(`\n❌ Error: ${e.message}`)
  process.exit(1)
})
