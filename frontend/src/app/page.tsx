'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { supabase } from '@/lib/supabase'

interface UpcomingPost {
  id: string
  draft_id: string | null
  title: string
  planned_date: string
  planned_time: string | null
  pillar: string
  format: string
  quality_gate_status: string
  confidence_score: number | null
  image_status: string
  image_url: string | null
  carousel_pdf_url?: string | null
  carousel_cover_url?: string | null
  publishing_status: string
  source?: 'internal' | 'linkedin_native' | 'zernio'
  approval_status: 'pending_approval' | 'approved' | 'rejected' | 'changes_requested'
}

interface ResearchSignal {
  id: string
  source_name: string
  url: string
  title: string
  category: string
  relevance_score?: number
  relevance_reason?: string
  captured_at: string
}

interface ControlRoomStatusData {
  upcoming_posts: UpcomingPost[]
  recent_signals: ResearchSignal[]
}

export default function TodayPage() {
  const [data, setData] = useState<ControlRoomStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadStatus = async () => {
    try {
      const res = await authenticatedFetch('/api/control-room/status')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to load control room status API:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  // Action Handlers for Post Approvals
  const handleApprove = async (postId: string) => {
    setActionLoading(postId)
    try {
      const { error } = await supabase
        .from('content_calendar')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'pranavi'
        })
        .eq('id', postId)

      if (error) throw error
      await loadStatus()
    } catch (err) {
      console.error('Failed to approve post:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (postId: string) => {
    setActionLoading(postId)
    try {
      const { error } = await supabase
        .from('content_calendar')
        .update({
          approval_status: 'rejected',
          quality_gate_status: 'failed'
        })
        .eq('id', postId)

      if (error) throw error
      await loadStatus()
    } catch (err) {
      console.error('Failed to reject post:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          Loading your editorial desk...
        </p>
      </div>
    )
  }

  const upcomingPosts = data?.upcoming_posts || []
  const recentSignals = data?.recent_signals || []

  // Find next post awaiting approval, or fallback to the most imminent post
  const nextPost = upcomingPosts.find(p => p.approval_status === 'pending_approval') || upcomingPosts[0]

  // Filter 3 strongest signals sorted by relevance score
  const topSignals = [...recentSignals]
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 3)

  // Compute current week's timeline dates (Mon, Tue, Thu, Fri)
  const getWeekDate = (dayIndex: number) => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - (day === 0 ? 6 : day - 1) + dayIndex
    const target = new Date(d.setDate(diff))
    return target.toISOString().split('T')[0]
  }

  const timelineSlots = [
    { label: 'Mon', date: getWeekDate(0) },
    { label: 'Tue', date: getWeekDate(1) },
    { label: 'Thu', date: getWeekDate(3) },
    { label: 'Fri', date: getWeekDate(4) }
  ]

  return (
    <div className="page fade-up">
      {/* 1. EDITORIAL HEADER */}
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <p className="section-label" style={{ marginBottom: '0.2rem' }}>CODE × CRAFT</p>
          <h1 className="page-title" style={{ fontWeight: 400 }}>Good evening, Pranavi.</h1>
          <p className="page-subtitle">Curated briefings for your fashion design journey</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
        {/* 2. TODAY'S POST */}
        <section>
          <p className="section-label">TODAY&apos;S POST</p>
          {nextPost ? (
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge badge-primary">{nextPost.pillar}</span>
                    <span className="badge badge-blue">{nextPost.format}</span>
                    {nextPost.approval_status === 'approved' && (
                      <span className="badge badge-green">Scheduled for 8:30 PM IST</span>
                    )}
                    {nextPost.approval_status === 'pending_approval' && (
                      <span className="badge badge-yellow">Needs Approval</span>
                    )}
                    {nextPost.approval_status === 'rejected' && (
                      <span className="badge badge-red">Blocked</span>
                    )}
                  </div>

                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, margin: '0.5rem 0 1rem 0', color: 'var(--text-primary)' }}>
                    {nextPost.title}
                  </h2>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Scheduled: <strong>{nextPost.planned_date} at 8:30 PM IST</strong>
                  </p>

                  {/* Actions */}
                  {nextPost.approval_status === 'pending_approval' ? (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        disabled={actionLoading !== null}
                        onClick={() => handleApprove(nextPost.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Approve
                      </button>
                      <button 
                        disabled={actionLoading !== null}
                        onClick={() => handleReject(nextPost.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      >
                        Reject
                      </button>
                      <Link href={`/editor?id=${nextPost.id}`} className="btn btn-secondary btn-sm">
                        Edit
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {nextPost.publishing_status === 'published' ? (
                        <span className="badge badge-green">Published Live</span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Status: <strong>{nextPost.approval_status.toUpperCase()}</strong>
                        </span>
                      )}
                      <Link href={`/editor?id=${nextPost.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}>
                        Modify Draft
                      </Link>
                    </div>
                  )}
                </div>

                {/* Cover Preview Column */}
                {(nextPost.carousel_cover_url || nextPost.image_url) && (
                  <div style={{ width: '180px', flexShrink: 0 }}>
                    <p className="section-label" style={{ fontSize: '0.65rem', marginBottom: '0.5rem' }}>Visual Asset</p>
                    <div style={{ 
                      aspectRatio: '4/5', 
                      background: 'var(--bg)', 
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img 
                        src={nextPost.carousel_cover_url || nextPost.image_url || ''} 
                        alt="Post visual preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-muted" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <p>No upcoming posts scheduled. Visit the editor to draft new concepts.</p>
            </div>
          )}
        </section>

        {/* 3. TODAY'S RESEARCH */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p className="section-label" style={{ margin: 0 }}>TODAY&apos;S RESEARCH INTEL</p>
            <Link href="/research" style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
              VIEW ALL SIGNALS →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topSignals.length > 0 ? (
              topSignals.map(sig => (
                <div key={sig.id} className="card card-pad-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{sig.source_name}</span>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{sig.category}</span>
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{sig.title}</h4>
                    {sig.relevance_reason && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {sig.relevance_reason}
                      </p>
                    )}
                  </div>
                  <div className={`score-ring ${sig.relevance_score && sig.relevance_score >= 70 ? 'score-high' : 'score-mid'}`}>
                    {sig.relevance_score}%
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem' }}>
                No recent signals available.
              </p>
            )}
          </div>
        </section>

        {/* 4. THIS WEEK TIMELINE */}
        <section style={{ marginBottom: '2.5rem' }}>
          <p className="section-label">WEEKLY TIMELINE</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {timelineSlots.map(slot => {
              const matchedPosts = upcomingPosts.filter(p => p.planned_date === slot.date)
              const hasPost = matchedPosts.length > 0
              const approvedPost = matchedPosts.find(p => p.approval_status === 'approved')

              return (
                <div key={slot.label} className="card card-pad-sm" style={{ 
                  borderLeft: hasPost 
                    ? (approvedPost ? '3px solid var(--success)' : '3px solid var(--warning)') 
                    : '3px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{slot.label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{slot.date}</span>
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    {hasPost ? (
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {matchedPosts[0].title}
                        </p>
                        <span className="badge badge-gray" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', marginTop: '0.25rem' }}>
                          {approvedPost ? 'Approved' : 'Needs Review'}
                        </span>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Empty slot
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
