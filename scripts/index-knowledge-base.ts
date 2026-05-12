import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

import axios from 'axios'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { google } from 'googleapis'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const CREATED_BY = 'dc2b983f-1435-4933-a714-3387f01fb8d3'
const DRIVE_FOLDER_ID = '15MNwhUeEuAEsbi6qCGuPOTPpoJNdJRJg'
const HELP_CENTER_BASE = 'https://help.prophero.com/es/doc-center'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

let totalDocuments = 0
let totalChunks = 0

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFParser = require('pdf2json')
    const pdfParser = new PDFParser(null, 1)

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const text = pdfData.Pages
          .map((page: any) =>
            page.Texts
              .map((t: any) => decodeURIComponent(t.R.map((r: any) => r.T).join('')))
              .join(' ')
          )
          .join('\n')
        resolve(text)
      } catch (e) {
        reject(e)
      }
    })

    pdfParser.on('pdfParser_dataError', (err: any) => {
      reject(new Error(err.parserError))
    })

    pdfParser.parseBuffer(buffer)
  })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

interface Chunk {
  content: string
  headingPath: string
}

// Used by indexGoogleDrive — kept for backward compatibility
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = []
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length >= 100)
  let buffer = ''
  for (const para of paragraphs) {
    if (para.length > chunkSize * 4) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para]
      for (const sentence of sentences) {
        if ((buffer + ' ' + sentence).trim().length > chunkSize * 4) {
          if (buffer.trim().length >= 100) chunks.push(buffer.trim())
          buffer = buffer.trim().split(/\s+/).slice(-overlap).join(' ') + ' ' + sentence
        } else {
          buffer = (buffer + ' ' + sentence).trim()
        }
      }
    } else if ((buffer + '\n\n' + para).trim().length > chunkSize * 4) {
      if (buffer.trim().length >= 100) chunks.push(buffer.trim())
      buffer = buffer.trim().split(/\s+/).slice(-overlap).join(' ') + '\n\n' + para
    } else {
      buffer = buffer ? buffer + '\n\n' + para : para
    }
  }
  if (buffer.trim().length >= 100) chunks.push(buffer.trim())
  return chunks
}

function recursiveSplit(text: string, maxSize: number, overlap: number, separators: string[]): string[] {
  if (text.length <= maxSize) return text.trim().length >= 80 ? [text.trim()] : []

  const [sep, ...rest] = separators
  if (sep === undefined) {
    const pieces: string[] = []
    let start = 0
    while (start < text.length) {
      const piece = text.slice(start, start + maxSize).trim()
      if (piece.length >= 80) pieces.push(piece)
      start += maxSize - overlap
    }
    return pieces
  }

  const parts = text.split(sep)
  const results: string[] = []
  let buffer = ''

  for (const part of parts) {
    const joined = buffer ? buffer + sep + part : part
    if (joined.length > maxSize) {
      if (buffer.trim().length >= 80) {
        results.push(...(buffer.length > maxSize
          ? recursiveSplit(buffer, maxSize, overlap, rest)
          : [buffer.trim()]))
      }
      buffer = buffer.slice(-overlap) + sep + part
    } else {
      buffer = joined
    }
  }
  if (buffer.trim().length >= 80) {
    results.push(...(buffer.length > maxSize
      ? recursiveSplit(buffer, maxSize, overlap, rest)
      : [buffer.trim()]))
  }
  return results
}

function chunkByHeadings(text: string, title: string, sourceUrl: string): Chunk[] {
  const CHUNK_SIZE = 1800
  const OVERLAP = 180
  const SEPARATORS = ['\n\n', '\n', '. ', ' ']
  const MIN_PARA = 80

  interface Section { heading: string; lines: string[] }
  const sections: Section[] = []
  let current: Section = { heading: title, lines: [] }

  for (const line of text.split('\n')) {
    const t = line.trim()
    if (t.startsWith('### ') || t.startsWith('## ')) {
      if (current.lines.length > 0) sections.push(current)
      current = { heading: t.replace(/^#{2,3}\s+/, ''), lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  if (current.lines.length > 0) sections.push(current)

  const chunks: Chunk[] = []

  for (const section of sections) {
    // Merge paragraphs shorter than MIN_PARA with the next
    const rawParas = section.lines.join('\n').split(/\n{2,}/)
    const mergedParas: string[] = []
    let pending = ''
    for (const para of rawParas) {
      const p = para.trim()
      if (!p) continue
      if (pending && pending.length < MIN_PARA) {
        pending = pending + '\n\n' + p
      } else {
        if (pending) mergedParas.push(pending)
        pending = p
      }
    }
    if (pending) mergedParas.push(pending)

    const sectionText = mergedParas.join('\n\n').trim()
    if (!sectionText) continue

    const prefix = `[Artículo: ${title}] [Sección: ${section.heading}] [Fuente: ${sourceUrl}]\n\n`
    const available = CHUNK_SIZE - prefix.length
    const pieces = recursiveSplit(sectionText, available, OVERLAP, SEPARATORS)

    if (pieces.length === 0 && sectionText.length >= MIN_PARA) {
      chunks.push({ content: prefix + sectionText, headingPath: section.heading })
    } else {
      for (const piece of pieces) {
        chunks.push({ content: prefix + piece, headingPath: section.heading })
      }
    }
  }

  return chunks
}

// ---------------------------------------------------------------------------
// Embed + insert (accepts Chunk[] or string[] for backward compat)
// ---------------------------------------------------------------------------

async function embedAndInsert(chunks: Array<Chunk | string>, documentId: string, tenantId: string) {
  for (let i = 0; i < chunks.length; i++) {
    const raw = chunks[i]
    const content = typeof raw === 'string' ? raw : raw.content
    const headingPath = typeof raw === 'string' ? null : raw.headingPath

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    })

    const { error } = await supabase.from('knowledge_chunks').insert({
      document_id: documentId,
      tenant_id: tenantId,
      content,
      chunk_index: i,
      embedding: embeddingRes.data[0].embedding,
      token_count: Math.round(content.length / 4),
      heading_path: headingPath,
      // TODO: fts_vector — set via DB trigger: to_tsvector('spanish', content)
      // Supabase .insert() does not support raw SQL expressions; handle in a migration:
      // CREATE TRIGGER set_fts BEFORE INSERT ON knowledge_chunks
      //   FOR EACH ROW EXECUTE FUNCTION tsvector_update_trigger(fts_vector,'pg_catalog.spanish',content);
    })

    if (error) {
      console.error(`  ✗ Failed to insert chunk ${i}:`, error.message)
    }

    await sleep(100)
  }

  totalChunks += chunks.length
  console.log(`  → ${chunks.length} chunks inserted`)
}

async function upsertDocument(params: {
  title: string
  sourceType: 'url' | 'google_drive'
  sourceUrl: string
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('knowledge_documents')
    .upsert(
      {
        tenant_id: TENANT_ID,
        created_by: CREATED_BY,
        title: params.title,
        source_type: params.sourceType,
        source_url: params.sourceUrl,
        status: 'indexed',
      },
      { onConflict: 'tenant_id,source_url' }
    )
    .select('id')
    .single()

  if (error || !data) {
    console.error('  ✗ Failed to upsert document:', error?.message)
    return null
  }

  return (data as { id: string }).id
}

// ---------------------------------------------------------------------------
// Source 1: PropHero Help Center
// ---------------------------------------------------------------------------

function extractDocCenterLinks(html: string): string[] {
  const $ = cheerio.load(html)
  const urls: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    let url: string
    if (href.startsWith('http')) {
      url = href
    } else if (href.startsWith('/')) {
      url = 'https://help.prophero.com' + href
    } else {
      return
    }
    if (url.startsWith('https://help.prophero.com') && url.includes('/doc-center/')) {
      urls.push(url.split('?')[0].split('#')[0]) // strip query/hash
    }
  })
  return urls
}

async function scrapeArticle(url: string): Promise<void> {
  await sleep(500)
  try {
    console.log(`\n  Scraping: ${url}`)
    const res = await axios.get(url, { timeout: 15000 })
    const $page = cheerio.load(res.data as string)

    $page('nav, footer, header, script, style, [role="navigation"], .sidebar, .nav, .menu').remove()

    const title =
      $page('h1').first().text().trim() ||
      $page('title').text().trim() ||
      url

    const contentSelectors = [
      '.article-body',
      '.content-wrapper',
      '[class*="article-body"]',
      '[class*="content-wrapper"]',
      'article',
      'main',
      '.content',
      '.doc-content',
      '#content',
      'body',
    ]
    let content = ''
    for (const sel of contentSelectors) {
      const candidate = $page(sel).first().text().trim()
      if (candidate.length > 200) {
        content = candidate
        break
      }
    }

    if (content.length < 100) {
      console.log('  ⚠ Not enough content, skipping')
      return
    }

    content = content.replace(/\t/g, ' ').replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

    const docId = await upsertDocument({ title, sourceType: 'url', sourceUrl: url })
    if (!docId) return

    const chunks = chunkByHeadings(content, title, url)
    if (chunks.length === 0) {
      console.log('  ⚠ No chunks produced, skipping')
      return
    }

    await embedAndInsert(chunks, docId, TENANT_ID)
    totalDocuments++
  } catch (e) {
    console.error(`  ✗ Error scraping ${url}:`, e instanceof Error ? e.message : e)
  }
}

async function scrapeHelpCenter() {
  console.log('\n══════════════════════════════════════')
  console.log('SOURCE 1: PropHero Help Center')
  console.log('══════════════════════════════════════')

  // Level 1: fetch index, collect section links
  console.log(`Fetching index: ${HELP_CENTER_BASE}`)
  let indexHtml: string
  try {
    const res = await axios.get(HELP_CENTER_BASE, { timeout: 15000 })
    indexHtml = res.data as string
  } catch (e) {
    console.error('Failed to fetch help center index:', e instanceof Error ? e.message : e)
    return
  }

  const sectionUrls = [...new Set(extractDocCenterLinks(indexHtml))]
  console.log(`Found ${sectionUrls.length} section links from index`)

  // Level 2: fetch each section, collect article links
  const articleUrls = new Set<string>()
  articleUrls.add(HELP_CENTER_BASE)

  for (const sectionUrl of sectionUrls) {
    articleUrls.add(sectionUrl)
    await sleep(500)
    try {
      console.log(`\nFetching section: ${sectionUrl}`)
      const res = await axios.get(sectionUrl, { timeout: 15000 })
      const articleLinks = extractDocCenterLinks(res.data as string)
      for (const link of articleLinks) {
        articleUrls.add(link)
      }
      console.log(`  → found ${articleLinks.length} links (${articleUrls.size} total so far)`)
    } catch (e) {
      console.error(`  ✗ Failed to fetch section ${sectionUrl}:`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`\nTotal unique article URLs to scrape: ${articleUrls.size}`)

  for (const url of articleUrls) {
    await scrapeArticle(url)
  }
}

// ---------------------------------------------------------------------------
// Source 2: Google Drive PDFs and Docs
// ---------------------------------------------------------------------------

async function indexGoogleDrive() {
  console.log('\n══════════════════════════════════════')
  console.log('SOURCE 2: Google Drive')
  console.log('══════════════════════════════════════')

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_API_KEY not set in .env.local — skipping Google Drive source.')
    console.error('Create one at https://console.cloud.google.com with Drive API enabled.')
    return
  }

  const drive = google.drive({ version: 'v3', auth: apiKey })

  async function listFilesRecursively(folderId: string): Promise<Array<{ id: string; name: string; mimeType: string }>> {
    const files: Array<{ id: string; name: string; mimeType: string }> = []
    let pageToken: string | undefined

    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageSize: 100,
        ...(pageToken ? { pageToken } : {}),
      })

      for (const file of res.data.files ?? []) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          const sub = await listFilesRecursively(file.id!)
          files.push(...sub)
        } else if (
          file.mimeType === 'application/pdf' ||
          file.mimeType === 'application/vnd.google-apps.document'
        ) {
          files.push({ id: file.id!, name: file.name!, mimeType: file.mimeType })
        }
      }

      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    return files
  }

  let files: Array<{ id: string; name: string; mimeType: string }>
  try {
    files = await listFilesRecursively(DRIVE_FOLDER_ID)
  } catch (e) {
    console.error('Failed to list Drive files:', e instanceof Error ? e.message : e)
    return
  }

  console.log(`Found ${files.length} files in Drive folder`)

  for (const file of files) {
    console.log(`\nProcessing: ${file.name} (${file.mimeType})`)
    await sleep(300)

    try {
      let text = ''

      if (file.mimeType === 'application/pdf') {
        const response = await axios.get(
          `https://drive.google.com/uc?export=download&id=${file.id}&key=${apiKey}`,
          { responseType: 'arraybuffer' }
        )
        const buffer = Buffer.from(response.data)
        text = await extractPdfText(buffer)
      } else {
        // Google Doc — export as plain text
        const response = await axios.get(
          `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain&key=${apiKey}`,
          { responseType: 'text' }
        )
        text = response.data as string
      }

      text = text.replace(/\t/g, ' ').replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

      if (text.length < 100) {
        console.log('  ⚠ Not enough text content, skipping')
        continue
      }

      const sourceUrl = `https://drive.google.com/file/d/${file.id}/view`
      const docId = await upsertDocument({
        title: file.name,
        sourceType: 'google_drive',
        sourceUrl,
      })
      if (!docId) continue

      const chunks = chunkText(text)
      if (chunks.length === 0) {
        console.log('  ⚠ No chunks produced, skipping')
        continue
      }

      await embedAndInsert(chunks, docId, TENANT_ID)
      totalDocuments++
    } catch (e) {
      console.error(`  ✗ Error processing ${file.name}:`, e instanceof Error ? e.message : e)
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║   PropHero Knowledge Base Indexer    ║')
  console.log('╚══════════════════════════════════════╝')
  console.log(`Tenant: ${TENANT_ID}`)
  console.log(`Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)

  await scrapeHelpCenter()
  await indexGoogleDrive()

  console.log('\n══════════════════════════════════════')
  console.log('DONE')
  console.log(`Documents indexed: ${totalDocuments}`)
  console.log(`Total chunks:      ${totalChunks}`)
  console.log('══════════════════════════════════════')
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
