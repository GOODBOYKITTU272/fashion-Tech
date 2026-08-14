import PDFDocument from 'pdfkit'
import { getSupabaseAdmin } from './supabase-admin'

export interface CarouselSlideContent {
  slide_number: number
  type: 'hook' | 'context' | 'core_value' | 'application' | 'cta'
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
 * generateLinkedInPdfCarousel
 * Generates an adaptive 6-8 page 4:5 aspect ratio editorial PDF document for LinkedIn carousels.
 * Adopts clean editorial fashion aesthetics (Code x Craft x Contemporary Design).
 * Uploads persistently to Supabase Storage and verifies HTTP 200 resolution.
 */
export async function generateLinkedInPdfCarousel(input: CarouselGenerationInput): Promise<CarouselGenerationResult> {
  try {
    const doc = new PDFDocument({
      size: [432, 540], // 4:5 Aspect Ratio (432pt x 540pt equivalent to 1080px x 1350px)
      margin: 36,
      autoFirstPage: false
    })

    const buffers: Buffer[] = []
    doc.on('data', b => buffers.push(b))

    const slides: CarouselSlideContent[] = [
      {
        slide_number: 1,
        type: 'hook',
        heading: input.title,
        body: input.hook
      }
    ]

    // Adaptive Core Educational Slides (3-5 slides)
    input.sections.slice(0, 5).forEach((sec, idx) => {
      slides.push({
        slide_number: slides.length + 1,
        type: idx === 0 ? 'context' : (idx === input.sections.length - 1 ? 'application' : 'core_value'),
        heading: sec.heading,
        body: sec.body
      })
    })

    // Final Slide: Sources & Soft CTA
    const sourceNames = input.sources.map(s => s.name).join(' · ')
    slides.push({
      slide_number: slides.length + 1,
      type: 'cta',
      heading: 'Insights & Provenance',
      body: `${input.cta || 'Follow Pranavi Yadav for Code x Craft x Contemporary Design insights.'}\n\nSources: ${sourceNames || 'Vogue Business · Original Research'}`
    })

    // Render Pages
    for (const slide of slides) {
      doc.addPage()

      // Canvas Background
      if (slide.type === 'hook') {
        doc.rect(0, 0, 432, 540).fill('#18181b')
        
        // Minimal Indian Craft Linework Header Accent
        doc.rect(36, 36, 360, 2).fill('#818cf8')

        doc.fillColor('#93c5fd').fontSize(9).text('CODE × CRAFT × CONTEMPORARY DESIGN', 36, 50, { characterSpacing: 1 })

        doc.fillColor('#ffffff').fontSize(22).text(slide.heading, 36, 120, { width: 360, lineGap: 6 })

        doc.fillColor('#e4e4e7').fontSize(12).text(slide.body, 36, 260, { width: 360, lineGap: 4 })

        doc.fillColor('#a1a1aa').fontSize(9).text('SWIPE FOR THE DEEP DIVE →', 36, 480)
      } else if (slide.type === 'cta') {
        doc.rect(0, 0, 432, 540).fill('#09090b')
        doc.rect(36, 36, 360, 2).fill('#818cf8')

        doc.fillColor('#818cf8').fontSize(16).text(slide.heading, 36, 70, { width: 360 })

        doc.fillColor('#d4d4d8').fontSize(11).text(slide.body, 36, 140, { width: 360, lineGap: 6 })

        doc.fillColor('#71717a').fontSize(8).text('PRANAVI YADAV · FASHION TECH ENGINE', 36, 480)
      } else {
        doc.rect(0, 0, 432, 540).fill('#09090b')

        // Top Accent Bar
        doc.rect(36, 36, 360, 1).fill('#27272a')

        doc.fillColor('#818cf8').fontSize(8).text(`SLIDE 0${slide.slide_number} / 0${slides.length}`, 36, 46)

        doc.fillColor('#ffffff').fontSize(17).text(slide.heading, 36, 80, { width: 360, lineGap: 4 })

        doc.fillColor('#e4e4e7').fontSize(11).text(slide.body, 36, 170, { width: 360, lineGap: 6 })

        doc.fillColor('#71717a').fontSize(8).text('PRANAVI YADAV · FASHION TECH', 36, 480)
      }
    }

    doc.end()

    // Wait for PDF stream to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
    })

    // Generate Cover SVG/Buffer
    const coverSvg = `<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1350" fill="#18181b"/>
      <rect x="90" y="90" width="900" height="6" fill="#818cf8"/>
      <text x="90" y="160" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#93c5fd" letter-spacing="3">CODE × CRAFT × CONTEMPORARY DESIGN</text>
      <text x="90" y="320" font-family="Helvetica, Arial, sans-serif" font-size="54" font-weight="bold" fill="#ffffff">${escapeXml(input.title)}</text>
      <text x="90" y="680" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#e4e4e7">${escapeXml(input.hook.substring(0, 180))}</text>
      <text x="90" y="1200" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#a1a1aa">SWIPE FOR THE DEEP DIVE →</text>
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
      renderer_version: 'pdfkit_editorial_v1.5',
      design_template: 'code_craft_contemporary_womenswear'
    }
  } catch (err: any) {
    console.error('LinkedIn PDF Carousel Generation Error:', err)
    return {
      success: false,
      carousel_pdf_url: '',
      carousel_cover_url: '',
      slide_count: 0,
      renderer_version: 'pdfkit_editorial_v1.5',
      design_template: 'code_craft_contemporary_womenswear',
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
