'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PILLARS = [
  { label: 'Educational', color: 'var(--primary)', bg: 'var(--primary-dim)' },
  { label: 'Storytelling', color: 'var(--accent)', bg: 'var(--accent-dim)' },
  { label: 'Soft Selling', color: 'var(--green)', bg: 'var(--green-dim)' },
]

const SAMPLE_WEEK = [
  { day: 'Mon', post: { title: 'CLO3D & Handloom: A New Partnership', pillar: 'Educational', status: 'approved' } },
  { day: 'Tue', post: null },
  { day: 'Wed', post: { title: 'My First Draping Mistake (and What It Taught Me)', pillar: 'Storytelling', status: 'draft' } },
  { day: 'Thu', post: { title: 'Why Indian Textiles Are Having a Global Moment', pillar: 'Educational', status: 'scheduled' } },
  { day: 'Fri', post: null },
  { day: 'Sat', post: { title: 'Explore My CLO3D Portfolio', pillar: 'Soft Selling', status: 'draft' } },
  { day: 'Sun', post: null },
]

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-gray',
  approved: 'badge-primary',
  scheduled: 'badge-green',
  published: 'badge-accent',
  skipped: 'badge-red',
}

const PILLAR_COLOR: Record<string, string> = {
  Educational: 'var(--primary)',
  Storytelling: 'var(--accent)',
  'Soft Selling': 'var(--green)',
}

export default function CalendarPage() {
  const router = useRouter()
  const weekStart = new Date()
  // get Monday
  const day = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))

  const dates = DAYS.map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d.getDate()
  })

  const totalPosts = SAMPLE_WEEK.filter(d => d.post).length
  const mix = { Educational: 0, Storytelling: 0, 'Soft Selling': 0 }
  SAMPLE_WEEK.forEach(d => { if (d.post) mix[d.post.pillar as keyof typeof mix]++ })

  const handleCardClick = (post: { title: string; pillar: string } | null) => {
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
          <p className="page-subtitle">This week&apos;s plan — {totalPosts}/4 posts scheduled</p>
        </div>
        <Link href="/editor" className="btn btn-primary btn-sm">
          + Add Post
        </Link>
      </div>

      {/* Weekly Mix */}
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
          <p className="stat-label">Total Posts</p>
          <p className="stat-value">{totalPosts}<span style={{ fontSize: '1.2rem', color: 'var(--text-3)' }}>/4</span></p>
          <p className="stat-sub">{totalPosts >= 4 ? '✅ Week complete' : `${4 - totalPosts} more needed`}</p>
        </div>
      </div>

      {/* Desktop Calendar Grid */}
      <div className="card card-pad" style={{ overflowX: 'auto' }}>
        <div className="cal-grid">
          {DAYS.map((d, i) => (
            <div key={d} className="cal-day-header">
              {d}<br />
              <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>{dates[i]}</span>
            </div>
          ))}
          {SAMPLE_WEEK.map((slot, i) => (
            <div
              key={i}
              onClick={() => handleCardClick(slot.post)}
              className={`cal-slot ${slot.post ? 'has-post' : ''}`}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
              title={slot.post ? `Edit: ${slot.post.title}` : 'Add new post for this day'}
            >
              {slot.post ? (
                <>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: PILLAR_COLOR[slot.post.pillar], marginBottom: '0.25rem' }}>
                    {slot.post.pillar}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.3, marginBottom: '0.4rem' }}>
                    {slot.post.title}
                  </p>
                  <span className={`badge ${STATUS_BADGE[slot.post.status]}`} style={{ fontSize: '0.62rem' }}>
                    {slot.post.status}
                  </span>
                </>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-3)',
                  fontSize: '1.5rem'
                }}>
                  +
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Post List view */}
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 className="section-title">Post List</h2>
        {SAMPLE_WEEK.filter(s => s.post).map((slot, i) => (
          <div
            key={i}
            onClick={() => handleCardClick(slot.post)}
            className="card card-pad-sm"
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, border-color 0.15s ease'
            }}
          >
            <div style={{ width: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600 }}>{slot.day}</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{slot.post!.title}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                <span className={`badge ${STATUS_BADGE[slot.post!.status]}`}>{slot.post!.status}</span>
                <span style={{ fontSize: '0.72rem', color: PILLAR_COLOR[slot.post!.pillar] }}>{slot.post!.pillar}</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCardClick(slot.post)
              }}
              className="btn btn-ghost btn-sm"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
