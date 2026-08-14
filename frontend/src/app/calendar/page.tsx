'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface CalendarPost {
  id: string
  draft_id: string | null
  title: string
  planned_date: string
  planned_time: string
  raw_planned_time: string
  pillar: string
  format: string
  quality_gate_status: string
  publishing_status: string
  approval_status: 'pending_approval' | 'approved' | 'rejected' | 'changes_requested'
  source: 'internal' | 'linkedin_native' | 'zernio'
  external_platform: string | null
  provenance: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, 1 = next week, -1 = prev week
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState(true)

  // Compute Monday date for selected weekOffset
  const getMondayDate = (offset: number) => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7
    const monday = new Date(d.setDate(diff))
    return monday
  }

  const monday = getMondayDate(weekOffset)
  const formatDate = (date: Date) => date.toISOString().split('T')[0]
  
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const startDateStr = formatDate(weekDates[0])
  const endDateStr = formatDate(weekDates[6])

  useEffect(() => {
    async function loadWeekCalendar() {
      setLoading(true)
      try {
        const res = await authenticatedFetch(`/api/calendar?startDate=${startDateStr}&endDate=${endDateStr}`)
        if (res.ok) {
          const json = await res.json()
          setPosts(json.posts || [])
        }
      } catch (err) {
        console.error('Failed to load calendar API:', err)
      } finally {
        setLoading(false)
      }
    }
    loadWeekCalendar()
  }, [startDateStr, endDateStr])

  // Group posts by date
  const postsByDate: Record<string, CalendarPost[]> = {}
  posts.forEach(p => {
    if (!postsByDate[p.planned_date]) postsByDate[p.planned_date] = []
    postsByDate[p.planned_date].push(p)
  })

  // Detect Scheduling Conflicts (posts sharing same date + time)
  const conflicts: Array<{ date: string; time: string; count: number }> = []
  const timeSlotGroups: Record<string, number> = {}
  posts.forEach(p => {
    const key = `${p.planned_date} at ${p.planned_time}`
    timeSlotGroups[key] = (timeSlotGroups[key] || 0) + 1
  })
  Object.entries(timeSlotGroups).forEach(([key, count]) => {
    if (count > 1) {
      const [date, time] = key.split(' at ')
      conflicts.push({ date, time, count })
    }
  })

  // Map database technical statuses to human-friendly display titles
  const getStatusLabel = (post: CalendarPost) => {
    if (post.approval_status === 'approved') return 'Approved'
    if (post.approval_status === 'rejected') return 'Blocked'
    if (post.approval_status === 'changes_requested') return 'Needs approval'
    if (post.publishing_status === 'published') return 'Published'
    if (post.publishing_status === 'scheduled') return 'Scheduled'
    if (post.quality_gate_status === 'PASSED') return 'Ready for approval'
    return 'Draft'
  }

  const getStatusBadgeClass = (post: CalendarPost) => {
    const lbl = getStatusLabel(post)
    if (lbl === 'Approved' || lbl === 'Published') return 'badge-green'
    if (lbl === 'Blocked') return 'badge-red'
    if (lbl === 'Needs approval' || lbl === 'Ready for approval') return 'badge-yellow'
    return 'badge-gray'
  }

  const handleCardClick = (post: CalendarPost) => {
    router.push(`/editor?id=${post.id}`)
  }

  return (
    <div className="page fade-up">
      {/* Editorial Header */}
      <div className="page-header">
        <div>
          <p className="section-label">CODE × CRAFT</p>
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">
            Week of {weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(w => w - 1)}>
            ← Previous
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)}>
            Current Week
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(w => w + 1)}>
            Next →
          </button>
          <Link href="/editor" className="btn btn-primary btn-sm">
            + New Post
          </Link>
        </div>
      </div>

      {/* Conflict Warning Banners */}
      {conflicts.map((c, i) => (
        <div key={i} className="badge badge-red" style={{ 
          width: '100%', 
          padding: '0.85rem 1.25rem', 
          marginBottom: '1.5rem', 
          justifyContent: 'flex-start',
          borderRadius: 'var(--radius-sm)'
        }}>
          ⚠️ <b>Scheduling conflict:</b> {c.count} posts are set for {c.date} at {c.time}.
        </div>
      ))}

      {/* Grid View */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2.5rem', border: '1px solid var(--border)' }}>
        <div className="cal-grid">
          {DAYS.map((d, i) => (
            <div key={d} className="cal-day-header">
              <div>{d}</div>
              <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '2px' }}>{weekDates[i].getDate()}</div>
            </div>
          ))}

          {weekDates.map(dateObj => {
            const dateStr = formatDate(dateObj)
            const dayPosts = postsByDate[dateStr] || []

            return (
              <div
                key={dateStr}
                className="cal-slot"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minHeight: '130px'
                }}
              >
                {dayPosts.length > 0 ? (
                  dayPosts.map(p => {
                    const label = getStatusLabel(p)
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleCardClick(p)}
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.5rem',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600 }}>{p.format.toUpperCase()}</span>
                          <span>{p.planned_time.split(' ')[0]}</span>
                        </div>
                        <p style={{ 
                          fontSize: '0.76rem', 
                          fontWeight: 500, 
                          color: 'var(--text-primary)', 
                          lineHeight: 1.2, 
                          marginBottom: '0.4rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {p.title}
                        </p>
                        <span className={`badge ${getStatusBadgeClass(p)}`} style={{ fontSize: '0.58rem', padding: '0.1rem 0.35rem' }}>
                          {label}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <Link
                    href={`/editor?date=${dateStr}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'var(--text-tertiary)',
                      fontSize: '1.2rem'
                    }}
                  >
                    +
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Editorial Timeline / List View */}
      <div>
        <p className="section-label">TIMELINE VIEW</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.length > 0 ? (
            posts.map(p => (
              <div
                key={p.id}
                onClick={() => handleCardClick(p)}
                className="card card-pad-sm"
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ width: '85px', textAlign: 'left', borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.planned_date.substring(5)}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--accent)', marginTop: '2px' }}>{p.planned_time}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>{p.pillar}</span>
                    <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>{p.format}</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 400, color: 'var(--text-primary)' }}>{p.title}</h3>
                </div>
                <div>
                  <span className={`badge ${getStatusBadgeClass(p)}`}>
                    {getStatusLabel(p)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
              No scheduled posts for this week.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
