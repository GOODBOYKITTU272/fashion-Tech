export default function AnalyticsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Qualified USA + UK follower growth — your north-star metric</p>
        </div>
        <button className="btn btn-ghost btn-sm">📥 Import Data</button>
      </div>

      {/* KPI Header */}
      <div className="card card-pad" style={{ background: 'linear-gradient(135deg, var(--primary-dim) 0%, rgba(244,162,97,0.08) 100%)', borderColor: 'rgba(155,93,229,0.3)', marginBottom: '1.5rem' }}>
        <p className="stat-label" style={{ color: 'var(--primary)' }}>🏆 North-Star KPI</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginTop: '0.25rem' }}>
          —
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginTop: '0.3rem' }}>
          USA + UK qualified follower growth · No data imported yet
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Followers',    value: '—', sub: 'Import LinkedIn data' },
          { label: 'USA Followers',      value: '—', sub: 'Target market' },
          { label: 'UK Followers',       value: '—', sub: 'Target market' },
          { label: 'USA+UK %',           value: '—', sub: 'Quality indicator' },
          { label: 'Posts This Week',    value: '3',  sub: '4 planned' },
          { label: 'Avg Opportunity Score', value: '—', sub: 'From scored topics' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="stat-label">{s.label}</p>
            <p className="stat-value">{s.value}</p>
            <p className="stat-sub">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Import Instructions */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Import LinkedIn Analytics</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '1.25rem' }}>
          LinkedIn doesn&apos;t provide a real-time API. Export your analytics from LinkedIn and import the CSV here.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[
            { step: '1', text: 'Go to LinkedIn → Me → Posts & Activity → Analytics' },
            { step: '2', text: 'Click "Export" and choose "Followers" or "Post metrics"' },
            { step: '3', text: 'Upload the CSV file below' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary-dim)',
                color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.step}
              </span>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', paddingTop: '3px' }}>{s.text}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1.25rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>📄 Drop CSV file here or</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}>Browse file</button>
        </div>
      </div>

      {/* What gets tracked */}
      <div className="card card-pad">
        <h2 className="section-title">What Gets Tracked</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {[
            'Total followers', 'USA followers', 'UK followers', 'USA+UK %',
            'Impressions', 'Reactions', 'Comments', 'Reposts',
            'Profile views', 'DM signals', 'Best post (pillar)', 'Best post (format)',
            'Best hook type', 'Best posting time', 'Audience quality', 'Weekly growth',
          ].map(m => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem',
              borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', fontSize: '0.8rem', color: 'var(--text-2)' }}>
              <span style={{ color: 'var(--primary)' }}>•</span> {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
