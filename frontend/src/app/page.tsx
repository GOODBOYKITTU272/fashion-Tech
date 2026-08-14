export const dynamic = 'force-dynamic'
import { getTopOpportunities } from '@/lib/data'

function ScoreRing({ score }: { score: number }) {
  const cls = score >= 75 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low'
  return <div className={`score-ring ${cls}`}>{score}</div>
}

function ScoreBars({ topic }: { topic: Awaited<ReturnType<typeof getTopOpportunities>>[0] }) {
  const bars = [
    { label: 'US Relevance', val: topic.us_relevance_score },
    { label: 'UK Relevance', val: topic.uk_relevance_score },
    { label: 'Pranavi Fit',  val: topic.pranavi_alignment_score },
    { label: 'Freshness',    val: topic.freshness_score },
    { label: 'Source Trust', val: topic.source_trust_score },
  ]
  return (
    <div className="score-bars">
      {bars.map(b => (
        <div key={b.label} className="score-bar-row">
          <span className="score-bar-label">{b.label}</span>
          <div className="score-bar-track">
            <div className="score-bar-fill" style={{ width: `${b.val}%` }} />
          </div>
          <span className="score-bar-val">{b.val}</span>
        </div>
      ))}
    </div>
  )
}

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor(diff / 60_000)
  if (h > 24) return `${Math.floor(h / 24)}d ago`
  if (h >= 1) return `${h}h ago`
  return `${m}m ago`
}

export default async function InboxPage() {
  const topics = await getTopOpportunities()
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page">
      {/* State Machine Status Header */}
      <div className="card card-pad-sm" style={{ background: 'var(--accent-dim)', borderColor: 'rgba(244,162,97,0.3)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-green">AUTO MODE: ON</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
            🛡️ LINKEDIN AUTOMATION — WAITING FOR API ACCESS
          </span>
        </div>
        <a href="/settings" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
          ⚙️ Manage OAuth
        </a>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Today&apos;s Inbox</h1>
          <p className="page-subtitle">
            <span className="live-dot" /> &nbsp;{today} &nbsp;·&nbsp; {topics.length} opportunities ranked
          </p>
        </div>
        <button className="btn btn-ghost btn-sm">🔄 Sync Sources</button>
      </div>

      {topics.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="empty-icon">📭</div>
          <p className="empty-title">No opportunities yet today</p>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            The daily research workflow (W1/W2) runs automatically at 2:00 AM.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {topics.map((topic, i) => (
            <article key={topic.cluster_id} className="card card-pad fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <ScoreRing score={topic.total_opportunity_score} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary">#{i + 1}</span>
                    {topic.category && <span className="badge badge-gray">{topic.category}</span>}
                    {topic.source_name && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        {topic.source_url
                          ? <a href={topic.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-2)' }}>{topic.source_name} ↗</a>
                          : topic.source_name}
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
                      {timeAgo(topic.scored_at)}
                    </span>
                  </div>

                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    {topic.cluster_title}
                  </h2>

                  {topic.summary && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1rem' }}>
                      {topic.summary}
                    </p>
                  )}

                  <ScoreBars topic={topic} />

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <a href={`/editor?cluster=${topic.cluster_id}`} className="btn btn-primary btn-sm">
                      ✏️ View Auto Draft
                    </a>
                    <button className="btn btn-ghost btn-sm">👁 View Signals</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
