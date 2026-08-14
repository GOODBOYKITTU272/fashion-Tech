'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

const PILLARS = ['Educational', 'Storytelling', 'Soft Selling']
const FORMATS = ['text_only', 'single_image', 'pdf_carousel']

export default function EditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const postId = searchParams.get('id')

  // Editor states
  const [loading, setLoading] = useState(!!postId)
  const [saving, setSaving] = useState(false)
  const [revising, setRevising] = useState(false)
  const [activeTab, setActiveTab] = useState<'caption' | 'visual' | 'sources' | 'schedule'>('caption')

  // Post & Draft fields
  const [title, setTitle] = useState('New Fashion-Tech Concept')
  const [pillar, setPillar] = useState('Educational')
  const [format, setFormat] = useState('pdf_carousel')
  const [caption, setCaption] = useState('')
  const [personalInput, setPersonalInput] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [carouselPdfUrl, setCarouselPdfUrl] = useState<string | null>(null)
  const [carouselCoverUrl, setCarouselCoverUrl] = useState<string | null>(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  
  // Scheduling fields
  const [plannedDate, setPlannedDate] = useState('')
  const [plannedTime, setPlannedTime] = useState('20:30')
  const [approvalStatus, setApprovalStatus] = useState<string>('draft')

  // Natural language revision request state
  const [revisionInstructions, setRevisionInstructions] = useState('')

  // Load post details if editing an existing row
  useEffect(() => {
    if (!postId) return

    async function loadPostData() {
      try {
        const { data: post, error } = await supabase
          .from('content_calendar')
          .select('*')
          .eq('id', postId)
          .single()

        if (error) throw error
        if (post) {
          setTitle(post.title || '')
          setPillar(post.pillar || 'Educational')
          setFormat(post.format || 'pdf_carousel')
          setPlannedDate(post.planned_date || '')
          setPlannedTime(post.planned_time ? post.planned_time.substring(0, 5) : '20:30')
          setApprovalStatus(post.approval_status || 'draft')
          setCarouselPdfUrl(post.carousel_pdf_url || null)
          setCarouselCoverUrl(post.carousel_cover_url || null)

          if (post.draft_id) {
            const { data: draft } = await supabase
              .from('drafts')
              .select('*')
              .eq('id', post.draft_id)
              .single()

            if (draft) {
              setCaption(draft.full_content || '')
              setPersonalInput(draft.personal_input || '')
              setImageUrl(draft.image_url || null)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load post for editing:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPostData()
  }, [postId])

  // Save changes locally to database
  const handleSave = async (silent = false) => {
    setSaving(true)
    try {
      // Find calendar item to get draft ID
      const { data: post } = await supabase
        .from('content_calendar')
        .select('draft_id')
        .eq('id', postId)
        .single()

      if (post && post.draft_id) {
        // Update drafts
        await supabase
          .from('drafts')
          .update({
            full_content: caption,
            personal_input: personalInput,
            image_url: imageUrl
          })
          .eq('id', post.draft_id)
      }

      // Update calendar item
      await supabase
        .from('content_calendar')
        .update({
          pillar,
          format,
          planned_date: plannedDate,
          planned_time: plannedTime + ':00',
          approval_status: approvalStatus as any
        })
        .eq('id', postId)

      if (!silent) {
        alert('Changes saved successfully.')
      }
    } catch (err) {
      console.error('Failed to save post:', err)
      alert('Save operation failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    setSaving(true)
    try {
      await supabase
        .from('content_calendar')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'pranavi'
        })
        .eq('id', postId)
      
      setApprovalStatus('approved')
      router.push('/')
    } catch (err) {
      console.error('Approve failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    setSaving(true)
    try {
      await supabase
        .from('content_calendar')
        .update({
          approval_status: 'rejected',
          quality_gate_status: 'failed'
        })
        .eq('id', postId)
      
      setApprovalStatus('rejected')
      router.push('/')
    } catch (err) {
      console.error('Reject failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // AI Revision loop execution
  const handleAIRevise = async () => {
    if (!revisionInstructions.trim()) return
    setRevising(true)
    try {
      const res = await authenticatedFetch('/api/ai/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          full_content: caption,
          instructions: revisionInstructions,
          format
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setCaption(data.full_content)
          setTitle(data.title)
          setRevisionInstructions('')
          alert('AI successfully revised your draft!')
        } else {
          alert('AI revision failed to apply.')
        }
      }
    } catch (err) {
      console.error('AI revision error:', err)
    } finally {
      setRevising(false)
    }
  }

  const getSlides = () => {
    const rawParagraphs = caption ? caption.split('\n\n').filter(p => p.trim().length > 10) : []
    const slides = [
      {
        type: 'CoverSlide',
        heading: title || 'Untitled Concept',
        body: caption ? caption.substring(0, 160) + '...' : 'Slide hook goes here.'
      },
      {
        type: 'SectionSlide',
        heading: 'The Context',
        body: rawParagraphs[0] || 'Understanding the intersection of design and craft parameter systems.'
      }
    ]

    const insightTypes = ['InsightSlide', 'ComparisonSlide', 'CraftDetailSlide', 'FrameworkSlide']
    const remaining = rawParagraphs.slice(1, 5)

    remaining.forEach((para, idx) => {
      slides.push({
        type: insightTypes[idx % insightTypes.length] as any,
        heading: para.substring(0, 30).trim() + '...',
        body: para
      })
    })

    slides.push({
      type: 'QuoteSlide',
      heading: 'Philosophy',
      body: rawParagraphs[rawParagraphs.length - 1] || 'Design process iteration quote.'
    })

    slides.push({
      type: 'ClosingSlide',
      heading: 'Reflection & CTA',
      body: 'Follow Pranavi Yadav for Code x Craft x Contemporary Design insights.'
    })

    return slides
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          Opening studio desk...
        </p>
      </div>
    )
  }

  return (
    <div className="page fade-up">
      {/* Studio Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <p className="section-label">FASHION STUDIO WORKSPACE</p>
          <h1 className="page-title">{title || 'Draft Review'}</h1>
          <p className="page-subtitle">Refining: {pillar} · {format}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleSave()} disabled={saving} className="btn btn-secondary btn-sm">
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
          {approvalStatus !== 'approved' && (
            <button onClick={handleApprove} className="btn btn-primary btn-sm">
              ✅ Approve
            </button>
          )}
          {approvalStatus !== 'rejected' && (
            <button onClick={handleReject} className="btn btn-danger btn-sm">
              ❌ Reject
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* Main Work desk */}
        <div>
          {/* Workspace Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1.5rem' }}>
            {['caption', 'visual', 'sources', 'schedule'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  paddingBottom: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB CONTENTS */}
          {activeTab === 'caption' && (
            <div className="card" style={{ border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Title / Hook Concept</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Post Caption Copy</label>
                <textarea 
                  value={caption} 
                  onChange={(e) => setCaption(e.target.value)} 
                  className="form-textarea" 
                  style={{ minHeight: '260px' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'visual' && (
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <p className="section-label" style={{ fontSize: '0.7rem', margin: 0 }}>Interactive Carousel Preview</p>
                {carouselPdfUrl && (
                  <a href={carouselPdfUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xs" style={{ fontSize: '0.7rem', textDecoration: 'none' }}>
                    📂 Download PDF
                  </a>
                )}
              </div>

              {format === 'pdf_carousel' || format === 'carousel' ? (() => {
                const slides = getSlides()
                const currentSlide = slides[activeSlideIndex] || slides[0]
                const totalSlides = slides.length

                const handlePrev = () => setActiveSlideIndex(prev => Math.max(0, prev - 1))
                const handleNext = () => setActiveSlideIndex(prev => Math.min(totalSlides - 1, prev + 1))

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    {/* The 4:5 Slide Viewport */}
                    <div style={{
                      width: '320px',
                      height: '400px',
                      background: '#FAF6F0',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: '0 4px 12px rgba(28, 27, 25, 0.03)',
                      textAlign: 'left'
                    }}>
                      {/* Top Header */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid #e5e5e0', paddingBottom: '6px', marginBottom: '16px' }}>
                          <span style={{ fontSize: '7px', letterSpacing: '1.2px', color: '#696560', fontWeight: 600 }}>CODE × CRAFT</span>
                          <span style={{ fontSize: '7px', color: '#696560', fontWeight: 700 }}>0{activeSlideIndex + 1}</span>
                        </div>

                        {/* Title & Body Layout Grid */}
                        <div style={{ display: 'flex', gap: '12px', height: '260px' }}>
                          {/* Left Column Content */}
                          <div style={{ flex: currentSlide.type === 'SectionSlide' || currentSlide.type === 'QuoteSlide' ? '1' : '0.55', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h3 style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: currentSlide.type === 'CoverSlide' ? '19px' : '15px',
                              lineHeight: '1.3',
                              color: currentSlide.type === 'QuoteSlide' ? '#8C7B6C' : '#1C1B19',
                              fontWeight: 400,
                              margin: 0
                            }}>
                              {currentSlide.heading}
                            </h3>
                            <div style={{ width: '30px', height: '1px', background: '#8C7B6C', margin: '2px 0' }} />
                            <p style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: '9px',
                              lineHeight: '1.55',
                              color: '#696560',
                              margin: 0,
                              wordBreak: 'break-word'
                            }}>
                              {currentSlide.body}
                            </p>
                          </div>

                          {/* Right Column Sketch SVGs */}
                          {currentSlide.type !== 'SectionSlide' && currentSlide.type !== 'QuoteSlide' && (
                            <div style={{ flex: '0.45', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>
                              {currentSlide.type === 'CoverSlide' || currentSlide.type === 'FrameworkSlide' ? (
                                <svg viewBox="0 0 100 200" style={{ width: '100%', height: '160px', stroke: '#1C1B19', fill: 'none', strokeWidth: 1.2 }}>
                                  <path d="M 40 20 L 60 20 L 63 35 L 75 50 L 70 85 Q 63 110 61 140 Q 66 160 70 185 L 30 185 Q 34 160 39 140 Q 37 110 30 85 L 25 50 L 37 35 Z" />
                                  <line x1="50" y1="0" x2="50" y2="200" stroke="#e5e5e0" strokeWidth="0.8" />
                                </svg>
                              ) : currentSlide.type === 'CraftDetailSlide' ? (
                                <svg viewBox="0 0 100 200" style={{ width: '100%', height: '160px', stroke: '#1C1B19', fill: 'none', strokeWidth: 1.2 }}>
                                  <path d="M 50 10 L 80 20 L 85 60 Q 75 80 80 100 L 65 170 L 35 170 L 35 20 Z" />
                                  <path d="M 46 6 L 85 14 L 90 60 Q 80 84 84 104 L 69 176 L 31 176 L 31 20 Z" stroke="#8C7B6C" strokeDasharray="3,2" strokeWidth="0.8" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 100 200" style={{ width: '100%', height: '160px', stroke: '#1C1B19', fill: 'none', strokeWidth: 1.2 }}>
                                  <path d="M 35 25 Q 55 60 45 100 Q 65 125 50 180" />
                                  <path d="M 60 30 Q 40 70 55 90 Q 40 120 45 180" />
                                  <path d="M 25 40 Q 50 65 60 85 Q 42 120 40 180" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Footer */}
                      <div style={{ borderTop: '0.5px solid #e5e5e0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '6.5px', color: '#7c7974' }}>Pranavi | Fashion Design Journey</span>
                        <span style={{ fontSize: '6.5px', color: '#7c7974', fontWeight: 600 }}>{currentSlide.type}</span>
                      </div>
                    </div>

                    {/* Prev/Next controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={handlePrev} disabled={activeSlideIndex === 0}>
                        ◀ Prev
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Slide {activeSlideIndex + 1} of {totalSlides}
                      </span>
                      <button className="btn btn-secondary btn-sm" onClick={handleNext} disabled={activeSlideIndex === totalSlides - 1}>
                        Next ▶
                      </button>
                    </div>
                  </div>
                )
              })() : (
                <div>
                  {carouselCoverUrl || imageUrl ? (
                    <div style={{ maxWidth: '320px', margin: '1rem auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <img src={carouselCoverUrl || imageUrl || ''} alt="Draft Preview" style={{ width: '100%', objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', padding: '2rem 0' }}>No media assets generated for this post format yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <p className="section-label" style={{ marginBottom: '1rem' }}>Provenances & Research context</p>
              <div className="form-group">
                <label className="form-label">Personal Insight Additions</label>
                <textarea 
                  value={personalInput} 
                  onChange={(e) => setPersonalInput(e.target.value)} 
                  className="form-textarea"
                  placeholder="Insert observations or technical notes from your collection design drafts to incorporate..."
                  style={{ minHeight: '120px' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="card" style={{ border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Planned Posting Date</label>
                <input 
                  type="date" 
                  value={plannedDate} 
                  onChange={(e) => setPlannedDate(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Planned Time (IST)</label>
                <input 
                  type="time" 
                  value={plannedTime} 
                  onChange={(e) => setPlannedTime(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pillar & Format</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <select value={pillar} onChange={(e) => setPillar(e.target.value)} className="form-select">
                    {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="form-select">
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant Sidebar */}
        <aside>
          <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <p className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)' }}>
              <span>✦</span> AI STUDIO ASSISTANT
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Submit design critique or request text variations to naturally refine hook structures or caption narratives.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <textarea
                value={revisionInstructions}
                onChange={(e) => setRevisionInstructions(e.target.value)}
                placeholder="What would you like changed?"
                className="form-textarea"
                style={{ minHeight: '110px', fontSize: '0.85rem' }}
              />
            </div>

            <button
              onClick={handleAIRevise}
              disabled={revising || !revisionInstructions.trim()}
              className="btn btn-primary"
              style={{ width: '100%', fontSize: '0.76rem', justifyContent: 'center' }}
            >
              {revising ? 'Revising Draft...' : 'Ask AI to Revise'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
