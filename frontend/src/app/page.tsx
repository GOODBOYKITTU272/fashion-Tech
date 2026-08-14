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
            The daily research workflow runs at 2 AM. You can trigger a manual sync above.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {topics.map((topic, i) => (
            <article key={topic.cluster_id} className="card card-pad fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <ScoreRing score={topic.total_opportunity_score} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Header row */}
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

                  {/* Title */}
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    {topic.cluster_title}
                  </h2>

                  {/* Summary */}
                  {topic.summary && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1rem' }}>
                      {topic.summary}
                    </p>
                  )}

                  {/* Score bars */}
                  <ScoreBars topic={topic} />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <a href={`/editor?cluster=${topic.cluster_id}`} className="btn btn-primary btn-sm">
                      ✏️ Create Draft
                    </a>
                    <button className="btn btn-ghost btn-sm">👁 View Sources</button>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Seed notice */}
      {topics.length === 0 && (
        <div className="card card-pad-sm" style={{ marginTop: '1.5rem', background: 'var(--yellow-dim)', borderColor: 'rgba(251,191,36,0.3)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--yellow)' }}>
            <strong>Setup tip:</strong> Once n8n W1 and W2 workflows are running, research signals will appear here automatically each morning.
          </p>
        </div>
      )}
    </div>
  )
}
