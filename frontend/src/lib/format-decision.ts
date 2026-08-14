export type PostFormat = 'pdf_carousel' | 'single_image' | 'editorial_graphic' | 'text_only' | 'poll'

export interface FormatDecisionInput {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
  pillar: string
  hasMultipleStepsOrFramework: boolean
}

/**
 * decidePostFormat
 * Weekly format decision policy:
 * - MONDAY (Educational): Default PDF/Document Carousel
 * - TUESDAY (Storytelling): Default Single Image + Text
 * - THURSDAY (Educational): Default PDF/Document Carousel
 * - FRIDAY (Soft Selling / Conversion): Default Single Image / Graphic / Poll
 */
export function decidePostFormat(input: FormatDecisionInput): PostFormat {
  const { dayOfWeek, hasMultipleStepsOrFramework } = input

  if (dayOfWeek === 'Monday' || dayOfWeek === 'Thursday') {
    return 'pdf_carousel'
  }

  if (dayOfWeek === 'Tuesday') {
    return 'single_image'
  }

  if (dayOfWeek === 'Friday') {
    return hasMultipleStepsOrFramework ? 'pdf_carousel' : 'single_image'
  }

  // Fallback for other days
  return hasMultipleStepsOrFramework ? 'pdf_carousel' : 'single_image'
}
