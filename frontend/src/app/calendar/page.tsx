'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PILLARS = [
  { label: 'Educational', color: 'var(--primary)', bg: 'var(--primary-dim)' },
  { label: 'Storytelling', color: 'var(--accent)', bg: 'var(--accent-dim)' },
  { label: 'Soft Selling', color: 'var(--green)', bg: 'var(--green-dim)' },
]

interface CalendarPost {
  id: string
  draft_id: string | null
  title: string
  planned_date: string
  planned_time: string
  pillar: string
  format: string
  quality_gate_status: string
  publishing_status: string
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
  
  // Calculate start and end dates (YYYY-MM-DD)
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

  // Calculate dynamic weekly summary counts from visible week posts
  const mix = { Educational: 0, Storytelling: 0, 'Soft Selling': 0 }
  posts.forEach(p => {
    if (p.pillar.toLowerCase().includes('educational') || p.pillar.toLowerCase().includes('tech') || p.pillar.toLowerCase().includes('craft')) {
      mix['Educational']++
    } else if (p.pillar.toLowerCase().includes('personal') || p.pillar.toLowerCase().includes('story')) {
      mix['Storytelling']++
    } else {
      mix['Soft Selling']++
    }
  })

  const totalPosts = posts.length

  const handleCardClick = (post: CalendarPost | null) => {
    if (post) {
      router.push(`/editor?title=${encodeURIComponent(post.title)}&pillar=${encodeURIComponent(post.pillar)}`)
    } else {
      router.push('/editor')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">
            Week of {weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {totalPosts} post{totalPosts !== 1 ? 's' : ''} scheduled
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(w => w - 1)}>
            ← Previous Week
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)}>
            Current Week
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(w => w + 1)}>
            Next Week →
          </button>
          <Link href="/editor" className="btn btn-primary btn-sm">
            + Add Post
          </Link>
        </div>
      </div>

      {/* Dynamic Weekly Mix Cards */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {PILLARS.map(p => (
          <div key={p.label} className="stat-card" style={{ borderColor: p.color + '44', background: p.bg }}>
            <p className="stat-label">{p.label}</p>
            <p className="stat-value" style={{ color: p.color, fontSize: '2.5rem' }}>
              {mix[p.label as keyof typeof mix]}
            </p>
            <p className="stat-sub" style={{ color: p.color + 'aa' }}>
              {p.label === 'Educational' ? 'target: 2' : 'target: 1'}
            </p>
          </div>
        ))}
        <div className="stat-card">
          <p className="stat-label">Total Visible Posts</p>
          <p className="stat-value">{totalPosts}<span style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>/4</span></p>
          <p className="stat-sub">{totalPosts >= 4 ? '✅ Target met' : `${4 - totalPosts} more recommended`}</p>
        </div>
      </div>

      {/* Desktop Calendar Grid */}
      <div className="card card-pad" style={{ overflowX: 'auto' }}>
        <div className="cal-grid">
          {DAYS.map((d, i) => (
            <div key={d} className="cal-day-header">
              {d}<br />
              <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>{weekDates[i].getDate()}</span>
            </div>
          ))}

          {weekDates.map((dateObj, i) => {
            const dateStr = formatDate(dateObj)
            const dayPosts = postsByDate[dateStr] || []

            return (
              <div
                key={dateStr}
                className={`cal-slot ${dayPosts.length > 0 ? 'has-post' : ''}`}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  padding: '0.5rem'
                }}
              >
                {dayPosts.length > 0 ? (
                  dayPosts.map(p => {
                    const isNative = p.source === 'linkedin_native'
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleCardClick(p)}
                        style={{
                          background: isNative ? 'rgba(129, 140, 248, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: isNative ? '1px solid #818cf8' : '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '0.4rem',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span className={`badge ${isNative ? 'badge-primary' : 'badge-blue'}`} style={{ fontSize: '0.58rem' }}>
                            {isNative ? 'LINKEDIN NATIVE' : p.pillar}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{p.planned_time}</span>
                        </div>
                        <p style={{ fontSize: '0.725rem', color: 'var(--text)', fontWeight: 500, margin: '0.2rem 0', lineHeight: 1.25 }}>
                          {p.title}
                        </p>
                        <span className={`badge ${isNative ? 'badge-gray' : (p.quality_gate_status === 'PASSED' ? 'badge-green' : 'badge-yellow')}`} style={{ fontSize: '0.58rem' }}>
                          {isNative ? 'NOT EVALUATED' : p.quality_gate_status}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div
                    onClick={() => router.push(`/editor?date=${dateStr}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'var(--text-3)',
                      fontSize: '1.25rem'
                    }}
                    title="Add post for this date"
                  >
                    +
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Post List View for Selected Week */}
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 className="section-title">Posts Scheduled for This Week ({totalPosts})</h2>
        {posts.length > 0 ? (
          posts.map(p => {
            const isNative = p.source === 'linkedin_native'
            return (
              <div
                key={p.id}
                onClick={() => handleCardClick(p)}
                className="card card-pad-sm"
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: isNative ? '1px solid #818cf8' : '1px solid var(--border)'
                }}
              >
                <div style={{ width: '80px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600 }}>{p.planned_date}</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>{p.planned_time}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span className={`badge ${isNative ? 'badge-primary' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                      {isNative ? 'LINKEDIN NATIVE' : 'INTERNAL ENGINE'}
                    </span>
                    {isNative && <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>MANUAL IMPORT</span>}
                    <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{p.pillar} · {p.format}</span>
                  </div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{p.title}</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span className={`badge ${isNative ? 'badge-gray' : (p.quality_gate_status === 'PASSED' ? 'badge-green' : 'badge-yellow')}`}>
                    Quality: {isNative ? 'NOT EVALUATED' : p.quality_gate_status}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', textAlign: 'center', margin: '1rem 0' }}>
            No posts scheduled for this week. Use week navigation above to view other weeks or click <strong>+ Add Post</strong>.
          </p>
        )}
      </div>
    </div>
  )
}
