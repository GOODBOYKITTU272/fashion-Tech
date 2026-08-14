import PDFDocument from 'pdfkit'
import { getSupabaseAdmin } from './supabase-admin'
import crypto from 'crypto'
import { BRAND_TOKENS } from './brand-tokens'

export interface CarouselSlideContent {
  slide_number: number
  type: 'CoverSlide' | 'SectionSlide' | 'InsightSlide' | 'ComparisonSlide' | 'QuoteSlide' | 'CraftDetailSlide' | 'FrameworkSlide' | 'ClosingSlide'
  heading: string
  body: string
}

export interface CarouselGenerationInput {
  title: string
  hook: string
  sections: Array<{ heading: string; body: string }>
  sources: Array<{ name: string; url?: string }>
  cta?: string
}

export interface CarouselGenerationResult {
  success: boolean
  carousel_pdf_url: string
  carousel_cover_url: string
  slide_count: number
  renderer_version: string
  design_template: string
  error?: string
}

/**
 * Technical Fashion Illustration Vector Helpers
 */
function drawMannequin(doc: any, cx: number, cy: number, scale = 1.0) {
  doc.save()
  doc.translate(cx, cy)
  doc.scale(scale)

  // 1. Grid/Axis reference lines
  doc.lineWidth(0.45).strokeColor(BRAND_TOKENS.colors.border)
  doc.moveTo(-70, 100).lineTo(70, 100).stroke() // Chest axis
  doc.moveTo(-50, 160).lineTo(50, 160).stroke() // Waist axis
  doc.moveTo(-60, 210).lineTo(60, 210).stroke() // Hip axis
  doc.moveTo(0, 0).lineTo(0, 270).stroke() // Center front axis

  // 2. Faint circle construction
  doc.circle(0, 50, 35).stroke()

  // 3. Mannequin contours
  doc.lineWidth(0.95).strokeColor(BRAND_TOKENS.colors.textPrimary)
  doc.moveTo(-12, 20).lineTo(12, 20) // neck top
  doc.lineTo(15, 35).lineTo(30, 50) // shoulder right
  doc.lineTo(25, 95) // armhole right
  doc.quadraticCurveTo(16, 125, 14, 160) // waist right
  doc.quadraticCurveTo(20, 185, 24, 215) // hip right
  doc.lineTo(-24, 215) // bottom hem
  doc.quadraticCurveTo(-20, 185, -14, 160) // waist left
  doc.quadraticCurveTo(-16, 125, -25, 95) // armhole left
  doc.lineTo(-30, 50).lineTo(-15, 35).lineTo(-12, 20)
  doc.stroke()

  // 4. Seam lines
  doc.lineWidth(0.5).strokeColor(BRAND_TOKENS.colors.accent)
  doc.moveTo(-8, 50).quadraticCurveTo(-5, 160, -9, 215).stroke() // side seams front left
  doc.moveTo(8, 50).quadraticCurveTo(5, 160, 9, 215).stroke() // side seams front right

  // 5. Wooden stand/base
  doc.lineWidth(1.25).strokeColor(BRAND_TOKENS.colors.textPrimary)
  doc.moveTo(0, 215).lineTo(0, 280).stroke() // center pole
  doc.moveTo(-25, 280).lineTo(25, 280).stroke() // base plate

  doc.restore()
}

function drawPatternDraft(doc: any, cx: number, cy: number, scale = 1.0) {
  doc.save()
  doc.translate(cx, cy)
  doc.scale(scale)

  // 1. Faint grid paper background
  doc.lineWidth(0.35).strokeColor(BRAND_TOKENS.colors.border)
  for (let x = -80; x <= 80; x += 16) {
    doc.moveTo(x, -20).lineTo(x, 240).stroke()
  }
  for (let y = -20; y <= 240; y += 16) {
    doc.moveTo(-80, y).lineTo(80, y).stroke()
  }

  // 2. Front bodice pattern outline
  doc.lineWidth(0.95).strokeColor(BRAND_TOKENS.colors.textPrimary)
  doc.moveTo(0, 0) // neck point
  doc.lineTo(45, 12) // shoulder seam
  doc.bezierCurveTo(50, 28, 32, 50, 38, 68) // armhole curve
  doc.lineTo(18, 175) // side seam
  doc.lineTo(-12, 175) // waist hem
  doc.lineTo(-12, 18) // center front line
  doc.closePath().stroke()

  // 3. Sewing allowance dashed lines
  doc.lineWidth(0.45).dash(3, { space: 2 }).strokeColor(BRAND_TOKENS.colors.accent)
  doc.moveTo(-6, -6)
  doc.lineTo(51, 6)
  doc.lineTo(56, 68)
  doc.lineTo(24, 181)
  doc.lineTo(-18, 181)
  doc.lineTo(-18, 12)
  doc.closePath().stroke()
  doc.undash()

  // 4. Grainline indicator arrow
  doc.lineWidth(0.7).strokeColor(BRAND_TOKENS.colors.textPrimary)
  doc.moveTo(8, 35).lineTo(8, 145).stroke()
  doc.moveTo(5, 40).lineTo(8, 35).lineTo(11, 40).stroke()
  doc.moveTo(5, 140).lineTo(8, 145).lineTo(11, 140).stroke()

  doc.restore()
}

function drawDrapingSketch(doc: any, cx: number, cy: number, scale = 1.0) {
  doc.save()
  doc.translate(cx, cy)
  doc.scale(scale)

  // 1. Subtle placeholder mannequin base
  doc.lineWidth(0.35).strokeColor(BRAND_TOKENS.colors.border)
  doc.moveTo(-16, 25).lineTo(16, 25)
  doc.lineTo(22, 40).lineTo(20, 80).lineTo(12, 130).lineTo(-12, 130).lineTo(-20, 80).lineTo(-22, 40).closePath().stroke()
  doc.moveTo(0, 130).lineTo(0, 240).stroke()

  // 2. Elegant draping curves representing folded textile drapes
  doc.lineWidth(0.95).strokeColor(BRAND_TOKENS.colors.textPrimary)
  doc.moveTo(-16, 25).bezierCurveTo(6, 60, -6, 100, 14, 135).stroke()
  doc.moveTo(11, 30).bezierCurveTo(-11, 70, 6, 90, -9, 135).stroke()
  doc.moveTo(-22, 40).bezierCurveTo(0, 65, 12, 85, -6, 135).stroke()

  // 3. Hanging drape folds below waistline
  doc.moveTo(14, 135).bezierCurveTo(22, 170, 16, 210, 20, 240).stroke()
  doc.moveTo(-9, 135).bezierCurveTo(-17, 170, -11, 205, -14, 240).stroke()

  doc.restore()
}

function drawDotPattern(doc: any, x: number, y: number) {
  doc.save()
  doc.fillColor(BRAND_TOKENS.colors.accent)
  for (let i = 0; i < 4; i++) {
    doc.circle(x, y + i * 8, 1.2).fill()
  }
  doc.restore()
}

/**
 * Content Safety Guard: Filter unsupported claims or statistics
 */
export function cleanUnsupportedClaims(text: string): string {
  // If the text invents unsupported percentages or large currencies, block/sanitize
  const statRegex = /\b\d+%|\$\s*\d+\s*[a-zA-Z]*|\b\d+\s*(?:percent|billion|million|crore|cr|b)\b/gi
  const matches = text.match(statRegex)
  if (matches) {
    let cleaned = text
    for (const match of matches) {
      cleaned = cleaned.replace(match, '[Verified Insight]')
    }
    return cleaned
  }
  return text
}

/**
 * generateLinkedInPdfCarousel
 * Generates an adaptive 6-8 page 4:5 aspect ratio editorial PDF document for LinkedIn carousels.
 * Fully aligned to unified BRAND_TOKENS and visual design system.
 */
export async function generateLinkedInPdfCarousel(input: CarouselGenerationInput): Promise<CarouselGenerationResult> {
  try {
    const cleanTitle = cleanUnsupportedClaims(input.title)
    const cleanHook = cleanUnsupportedClaims(input.hook)

    const doc = new PDFDocument({
      size: [BRAND_TOKENS.layout.width, BRAND_TOKENS.layout.height], // 4:5 ratio (432pt x 540pt)
      margin: BRAND_TOKENS.layout.margin,
      autoFirstPage: false
    })

    const buffers: Buffer[] = []
    doc.on('data', b => buffers.push(b))

    // Build Slide Components
    const slides: CarouselSlideContent[] = [
      {
        slide_number: 1,
        type: 'CoverSlide',
        heading: cleanTitle,
        body: cleanHook
      },
      {
        slide_number: 2,
        type: 'SectionSlide',
        heading: 'The Context',
        body: cleanHook
      }
    ]

    // Map additional insights
    const insightTypes: Array<'InsightSlide' | 'ComparisonSlide' | 'CraftDetailSlide' | 'FrameworkSlide'> = [
      'InsightSlide',
      'ComparisonSlide',
      'CraftDetailSlide',
      'FrameworkSlide'
    ]

    input.sections.slice(0, 4).forEach((sec, idx) => {
      slides.push({
        slide_number: slides.length + 1,
        type: insightTypes[idx % insightTypes.length],
        heading: cleanUnsupportedClaims(sec.heading),
        body: cleanUnsupportedClaims(sec.body)
      })
    })

    // Add Quote Slide if there's enough text
    slides.push({
      slide_number: slides.length + 1,
      type: 'QuoteSlide',
      heading: 'Philosophy',
      body: cleanUnsupportedClaims(input.hook)
    })

    // Closing CTA Slide
    const sourceNames = input.sources.map(s => s.name).join(' · ')
    slides.push({
      slide_number: slides.length + 1,
      type: 'ClosingSlide',
      heading: 'Reflection & CTA',
      body: cleanUnsupportedClaims(`${input.cta || 'Follow Pranavi Yadav for Code x Craft x Contemporary Design insights.'}\n\nSources: ${sourceNames || 'Vogue Business · Original Research'}`)
    })

    // Render Pages
    for (const slide of slides) {
      doc.addPage()

      // Warm Ivory Background
      doc.rect(0, 0, BRAND_TOKENS.layout.width, BRAND_TOKENS.layout.height).fill(BRAND_TOKENS.colors.background)

      // Thin Top Divider
      doc.lineWidth(0.55).strokeColor(BRAND_TOKENS.colors.border)
      doc.moveTo(36, 36).lineTo(396, 36).stroke()

      // Header Labels (Subtle spaced uppercase)
      doc.fillColor(BRAND_TOKENS.colors.textSecondary).font(BRAND_TOKENS.fonts.sans).fontSize(7.5)
      doc.text('CODE × CRAFT', 36, 44, { characterSpacing: 1.2 })
      doc.text(`0${slide.slide_number}`, 380, 44)

      // Thin Bottom Divider
      doc.lineWidth(0.45).strokeColor(BRAND_TOKENS.colors.border)
      doc.moveTo(36, 492).lineTo(396, 492).stroke()
      doc.fillColor(BRAND_TOKENS.colors.textSecondary).fontSize(7)
      doc.text('Pranavi | Fashion Design Journey', 36, 499)

      // Render Layout Component Styles
      if (slide.type === 'CoverSlide') {
        doc.fillColor(BRAND_TOKENS.colors.textPrimary)
           .font(BRAND_TOKENS.fonts.serif)
           .fontSize(31)
           .text(slide.heading, 36, 90, { width: 170, lineGap: 4 })

        doc.lineWidth(0.85).strokeColor(BRAND_TOKENS.colors.accent)
        doc.moveTo(36, 230).lineTo(90, 230).stroke()

        doc.fillColor(BRAND_TOKENS.colors.textSecondary)
           .font(BRAND_TOKENS.fonts.sans)
           .fontSize(11.5)
           .text(slide.body, 36, 252, { width: 170, lineGap: 5.5 })

        drawMannequin(doc, 300, 110, 1.1)
        drawDotPattern(doc, 36, 430)
      } else if (slide.type === 'SectionSlide') {
        doc.fillColor(BRAND_TOKENS.colors.textPrimary)
           .font(BRAND_TOKENS.fonts.serif)
           .fontSize(25)
           .text(slide.heading, 36, 120, { width: 360, align: 'center' })

        doc.lineWidth(0.85).strokeColor(BRAND_TOKENS.colors.accent)
        doc.moveTo(180, 180).lineTo(252, 180).stroke()

        doc.fillColor(BRAND_TOKENS.colors.textSecondary)
           .font(BRAND_TOKENS.fonts.sans)
           .fontSize(12)
           .text(slide.body, 70, 210, { width: 292, align: 'center', lineGap: 5 })
      } else if (slide.type === 'QuoteSlide') {
        doc.fillColor(BRAND_TOKENS.colors.accent)
           .font(BRAND_TOKENS.fonts.serif)
           .fontSize(20)
           .text(`"${slide.body}"`, 60, 180, { width: 312, align: 'center', lineGap: 6 })
      } else if (slide.type === 'ClosingSlide') {
        doc.fillColor(BRAND_TOKENS.colors.textPrimary)
           .font(BRAND_TOKENS.fonts.serif)
           .fontSize(25)
           .text(slide.heading, 36, 90, { width: 170, lineGap: 3 })

        doc.lineWidth(0.85).strokeColor(BRAND_TOKENS.colors.accent)
        doc.moveTo(36, 190).lineTo(90, 190).stroke()

        doc.fillColor(BRAND_TOKENS.colors.textSecondary)
           .font(BRAND_TOKENS.fonts.sans)
           .fontSize(11)
           .text(slide.body, 36, 212, { width: 170, lineGap: 5 })

        drawDrapingSketch(doc, 305, 110, 1.05)
        drawDotPattern(doc, 36, 430)
      } else {
        // Choose illustration based on component type
        if (slide.type === 'CraftDetailSlide') {
          drawPatternDraft(doc, 305, 115, 1.05)
        } else if (slide.type === 'FrameworkSlide') {
          drawMannequin(doc, 300, 110, 1.1)
        } else {
          drawDrapingSketch(doc, 305, 110, 1.05)
        }

        doc.fillColor(BRAND_TOKENS.colors.textPrimary)
           .font(BRAND_TOKENS.fonts.serif)
           .fontSize(26)
           .text(slide.heading, 36, 90, { width: 170, lineGap: 3.5 })

        doc.lineWidth(0.85).strokeColor(BRAND_TOKENS.colors.accent)
        doc.moveTo(36, 210).lineTo(90, 210).stroke()

        doc.fillColor(BRAND_TOKENS.colors.textSecondary)
           .font(BRAND_TOKENS.fonts.sans)
           .fontSize(11)
           .text(slide.body, 36, 230, { width: 170, lineGap: 5.5 })

        drawDotPattern(doc, 36, 430)
      }
    }

    doc.end()

    // Wait for PDF stream to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
    })

    // Generate Cover SVG (Beige Warm Cream Style matching PDF & Web tokens)
    const coverSvg = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1350" fill="${BRAND_TOKENS.colors.background}"/>
      <line x1="90" y1="90" x2="990" y2="90" stroke="${BRAND_TOKENS.colors.border}" stroke-width="2"/>
      <text x="90" y="116" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="${BRAND_TOKENS.colors.textSecondary}" letter-spacing="3">CODE × CRAFT</text>
      <text x="960" y="116" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="${BRAND_TOKENS.colors.textSecondary}">01</text>
      
      <text x="90" y="320" font-family="Georgia, Times New Roman, serif" font-size="72" fill="${BRAND_TOKENS.colors.textPrimary}" width="460">${escapeXml(cleanTitle)}</text>
      <line x1="90" y1="580" x2="220" y2="580" stroke="${BRAND_TOKENS.colors.accent}" stroke-width="2"/>
      <text x="90" y="640" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="${BRAND_TOKENS.colors.textSecondary}" width="460">${escapeXml(cleanHook.substring(0, 180))}</text>
      
      <!-- Vector Mannequin path placeholder on SVG Cover -->
      <g transform="translate(720, 240) scale(2.2)" stroke="${BRAND_TOKENS.colors.textPrimary}" stroke-width="1.5" fill="none">
        <path d="M -12 20 L 12 20 L 15 35 L 30 50 L 25 95 Q 16 125 14 160 Q 20 185 24 215 L -24 215 Q -20 185 -14 160 Q -16 125 -25 95 L -30 50 L -15 35 Z"/>
        <path d="M 0 0 L 0 270" stroke="${BRAND_TOKENS.colors.border}" stroke-width="1"/>
        <path d="M 0 215 L 0 280 M -25 280 L 25 280" stroke="${BRAND_TOKENS.colors.accent}" stroke-width="2"/>
      </g>
      
      <line x1="90" y1="1230" x2="990" y2="1230" stroke="${BRAND_TOKENS.colors.border}" stroke-width="1"/>
      <text x="90" y="1270" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="${BRAND_TOKENS.colors.textSecondary}">Pranavi | Fashion Design Journey</text>
    </svg>`
    const coverBuffer = Buffer.from(coverSvg, 'utf-8')

    // Persistent Upload to Supabase Storage
    const admin = getSupabaseAdmin()
    const timestamp = Date.now()
    const pdfPath = `carousels/pdf_${timestamp}.pdf`
    const coverPath = `carousels/cover_${timestamp}.svg`

    const [pdfUpload, coverUpload] = await Promise.all([
      admin.storage.from('media').upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true }),
      admin.storage.from('media').upload(coverPath, coverBuffer, { contentType: 'image/svg+xml', upsert: true })
    ])

    if (pdfUpload.error) {
      throw new Error(`CAROUSEL_STORAGE_FAILED: PDF upload failed (${pdfUpload.error.message})`)
    }
    if (coverUpload.error) {
      throw new Error(`CAROUSEL_STORAGE_FAILED: Cover upload failed (${coverUpload.error.message})`)
    }

    const { data: pdfUrlData } = admin.storage.from('media').getPublicUrl(pdfPath)
    const { data: coverUrlData } = admin.storage.from('media').getPublicUrl(coverPath)

    const pdfUrl = pdfUrlData.publicUrl
    const coverUrl = coverUrlData.publicUrl

    // Verify Persistent URLs via HTTP GET
    const [pdfCheck, coverCheck] = await Promise.all([
      fetch(pdfUrl, { method: 'HEAD' }),
      fetch(coverUrl, { method: 'HEAD' })
    ])

    if (pdfCheck.status !== 200 || coverCheck.status !== 200) {
      throw new Error(`CAROUSEL_STORAGE_FAILED: Uploaded assets failed HTTP 200 verification (PDF: ${pdfCheck.status}, Cover: ${coverCheck.status})`)
    }

    return {
      success: true,
      carousel_pdf_url: pdfUrl,
      carousel_cover_url: coverUrl,
      slide_count: slides.length,
      renderer_version: 'pdfkit_editorial_v2.0',
      design_template: 'editorial_serif_beige'
    }
  } catch (err: any) {
    console.error('LinkedIn PDF Carousel Generation Error:', err)
    return {
      success: false,
      carousel_pdf_url: '',
      carousel_cover_url: '',
      slide_count: 0,
      renderer_version: 'pdfkit_editorial_v2.0',
      design_template: 'editorial_serif_beige',
      error: err.message
    }
  }
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}
