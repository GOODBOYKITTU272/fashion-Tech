import { getSupabaseAdmin } from './supabase-admin'
import { reviseDraftContent } from './ai'
import { generateLinkedInPdfCarousel } from './carousel-engine'

export interface TelegramApprovalRequestInput {
  calendar_id: string
  title: string
  pillar: string
  format: string
  planned_date: string
  planned_time: string
  caption: string
  sources: string[]
  image_url?: string | null
  carousel_pdf_url?: string | null
  carousel_cover_url?: string | null
}

export interface TelegramApprovalResult {
  success: boolean
  status: 'SENT' | 'TELEGRAM_NOT_CONFIGURED' | 'FAILED'
  message_id?: number
  error?: string
}

/**
 * sendTelegramApprovalRequest
 * Sends human approval notification to Telegram with inline buttons: APPROVE, REJECT, EDIT.
 */
export async function sendTelegramApprovalRequest(input: TelegramApprovalRequestInput): Promise<TelegramApprovalResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.TELEGRAM_CHAT_ID

  if (!botToken || botToken.startsWith('your-') || !chatId || chatId.startsWith('your-')) {
    return {
      success: false,
      status: 'TELEGRAM_NOT_CONFIGURED',
      error: 'TELEGRAM_NOT_CONFIGURED: TELEGRAM_BOT_TOKEN or TELEGRAM_ALLOWED_CHAT_ID environment variable is missing.'
    }
  }

  const captionText = input.caption.substring(0, 400)
  const sourceText = input.sources.length > 0 ? input.sources.join(', ') : 'Vogue Business'

  const messageText = `<b>POST READY FOR APPROVAL</b> 🚀

<b>Title:</b> ${escapeHtml(input.title)}
<b>Pillar:</b> ${escapeHtml(input.pillar)}
<b>Format:</b> ${escapeHtml(input.format)}
<b>Scheduled:</b> ${escapeHtml(input.planned_date)} at ${escapeHtml(input.planned_time)} IST

<b>Caption Preview:</b>
${escapeHtml(captionText)}

<b>Sources:</b> ${escapeHtml(sourceText)}
${input.carousel_pdf_url ? `\n<b>PDF Carousel:</b> <a href="${input.carousel_pdf_url}">Download PDF</a>` : ''}`

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ APPROVE', callback_data: `approve:${input.calendar_id}` },
        { text: '❌ REJECT', callback_data: `reject:${input.calendar_id}` },
        { text: '✏️ EDIT', callback_data: `edit:${input.calendar_id}` }
      ]
    ]
  }

  try {
    const hasPhoto = !!((input.carousel_cover_url && !input.carousel_cover_url.endsWith('.svg')) || (input.image_url && !input.image_url.endsWith('.svg')))
    const endpoint = hasPhoto
      ? `https://api.telegram.org/bot${botToken}/sendPhoto`
      : `https://api.telegram.org/bot${botToken}/sendMessage`

    const payload: any = {
      chat_id: chatId,
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    }

    if (hasPhoto) {
      payload.photo = input.carousel_cover_url || input.image_url
      payload.caption = messageText
    } else {
      payload.text = messageText + (input.carousel_cover_url ? `\n\n<b>Cover Preview:</b> <a href="${input.carousel_cover_url}">View Cover Image</a>` : '')
    }


    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errJson = await res.json()
      throw new Error(`Telegram API HTTP ${res.status}: ${errJson.description || 'Failed to send message'}`)
    }

    const json = await res.json()
    return {
      success: true,
      status: 'SENT',
      message_id: json.result?.message_id
    }
  } catch (err: any) {
    console.error('Telegram Approval Request Error:', err)
    return {
      success: false,
      status: 'FAILED',
      error: err.message
    }
  }
}

/**
 * answerTelegramCallbackQuery
 */
export async function answerTelegramCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  })
}

/**
 * sendTelegramTextMessage
 */
export async function sendTelegramTextMessage(chatId: string, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  })
}

/**
 * deleteTelegramMessage
 */
export async function deleteTelegramMessage(chatId: string, messageId: number): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return
  await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: String(chatId), message_id: messageId })
  })
}


/**
 * handleTelegramWebhookCallback
 * Authenticates callback from Telegram bot, updates content_calendar and drafts approval status cleanly.
 */
export async function handleTelegramWebhookCallback(callbackQuery: any): Promise<{ success: boolean; action: string; message: string }> {
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.TELEGRAM_CHAT_ID

  const fromId = String(callbackQuery?.from?.id || callbackQuery?.message?.chat?.id || '')
  if (!allowedChatId || fromId !== allowedChatId) {
    return { success: false, action: 'UNAUTHORIZED', message: 'Unauthorized Telegram sender rejected.' }
  }

  const dataStr = String(callbackQuery?.data || '')
  const [action, calendarId] = dataStr.split(':')

  if (!action || !calendarId) {
    return { success: false, action: 'INVALID', message: 'Invalid callback payload' }
  }

  const admin = getSupabaseAdmin()

  if (action === 'approve') {
    await admin.from('content_calendar').update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: 'pranavi'
    }).eq('id', calendarId)

    return { success: true, action: 'APPROVED', message: 'Post marked APPROVED for publication.' }
  }

  if (action === 'reject') {
    await admin.from('content_calendar').update({
      approval_status: 'rejected',
      quality_gate_status: 'failed'
    }).eq('id', calendarId)

    return { success: true, action: 'REJECTED', message: 'Post marked REJECTED. Publication blocked.' }
  }

  if (action === 'edit') {
    await admin.from('content_calendar').update({
      approval_status: 'changes_requested'
    }).eq('id', calendarId)

    return { success: true, action: 'CHANGES_REQUESTED', message: 'Post marked CHANGES_REQUESTED. Please reply with requested edits.' }
  }

  return { success: false, action: 'UNKNOWN', message: 'Unknown action' }
}

/**
 * handleTelegramMessageText
 * Processes user text reply to EDIT changes. Revises draft, increments version, and resends for approval.
 */
export async function handleTelegramMessageText(chatId: string, text: string): Promise<void> {
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.TELEGRAM_CHAT_ID
  if (!allowedChatId || String(chatId) !== allowedChatId) {
    console.error('Unauthorized Telegram text message received from:', chatId)
    return
  }

  const admin = getSupabaseAdmin()

  // Find latest content_calendar row in 'changes_requested' status
  const { data: posts } = await admin
    .from('content_calendar')
    .select('id, draft_id, pillar, format, planned_date, planned_time, approved_version, carousel_pdf_url, carousel_cover_url')
    .eq('approval_status', 'changes_requested')
    .order('created_at', { ascending: false })
    .limit(1)

  const post = posts?.[0]
  if (!post) {
    await sendTelegramTextMessage(chatId, 'Hi Pranavi! No posts are currently awaiting edits. Tap "✏️ EDIT" on any post in Today\'s Inbox to request revisions.')
    return
  }

  await sendTelegramTextMessage(chatId, `Got it! Revising the draft with: "${text}". Please wait while I regenerate the assets...`)

  try {
    // Get draft content
    const { data: drafts } = await admin
      .from('drafts')
      .select('id, title, full_content')
      .eq('id', post.draft_id)
      .limit(1)

    const draft = drafts?.[0]
    if (!draft) {
      throw new Error('Draft row missing for the selected calendar post.')
    }

    // Call AI to revise draft content
    const revised = await reviseDraftContent(draft.title, draft.full_content, text, post.format)

    const nextVersion = (post.approved_version || 1) + 1

    // Update draft in database
    await admin
      .from('drafts')
      .update({
        title: revised.title,
        hook: revised.hook,
        full_content: revised.full_content,
        edit_instructions: text,
        approved_version: nextVersion
      })
      .eq('id', draft.id)

    // Re-render PDF Carousel if format is carousel
    let pdfUrl = post.carousel_pdf_url
    let coverUrl = post.carousel_cover_url

    if (post.format === 'pdf_carousel' || post.format === 'carousel') {
      const carouselRes = await generateLinkedInPdfCarousel({
        title: revised.title,
        hook: revised.hook,
        sections: [
          { heading: 'Key Concept', body: revised.hook },
          { heading: 'Educational Deep Dive', body: revised.full_content }
        ],
        sources: [{ name: 'Vogue Business' }]
      })
      if (carouselRes.success) {
        pdfUrl = carouselRes.carousel_pdf_url
        coverUrl = carouselRes.carousel_cover_url
      }
    }

    // Update calendar post
    await admin
      .from('content_calendar')
      .update({
        approval_status: 'pending_approval',
        approved_version: nextVersion,
        edit_instructions: text,
        carousel_pdf_url: pdfUrl,
        carousel_cover_url: coverUrl
      })
      .eq('id', post.id)

    // Resend fresh preview for approval
    await sendTelegramApprovalRequest({
      calendar_id: post.id,
      title: revised.title,
      pillar: post.pillar,
      format: post.format,
      planned_date: post.planned_date,
      planned_time: post.planned_time || '20:30:00',
      caption: revised.full_content,
      sources: ['Vogue Business'],
      carousel_pdf_url: pdfUrl,
      carousel_cover_url: coverUrl
    })

  } catch (err: any) {
    console.error('Failed to process draft revision:', err)
    await sendTelegramTextMessage(chatId, `⚠️ Revision failed: ${err.message}`)
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#039;'
      default: return m
    }
  })
}
