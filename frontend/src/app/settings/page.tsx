const SOURCES = [
  { name: 'Business of Fashion', tier: 1, trust: 90, category: 'Industry News', active: true },
  { name: 'Vogue Runway',        tier: 1, trust: 85, category: 'Contemporary Design', active: true },
  { name: 'The Interline',       tier: 2, trust: 85, category: 'Fashion-Tech', active: true },
  { name: 'CLO3D Blog',          tier: 2, trust: 80, category: 'Fashion-Tech', active: true },
  { name: 'Craft Council',       tier: 2, trust: 75, category: 'Craftsmanship', active: true },
]

const WATCHLIST = [
  { name: 'Iris van Herpen', type: 'designer', score: 90 },
  { name: 'Rahul Mishra',    type: 'designer', score: 85 },
  { name: 'Sabyasachi',      type: 'brand',    score: 80 },
  { name: 'Institute of Digital Fashion', type: 'organization', score: 85 },
]

const TIER_COLOR: Record<number, string> = { 1: 'var(--green)', 2: 'var(--accent)', 3: 'var(--text-2)' }

export default function SettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Brand memory, sources, and watchlist</p>
        </div>
      </div>

      {/* Brand Profile */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Brand Profile</h2>
        <div className="form-group">
          <label className="form-label">Positioning</label>
          <input className="form-input" defaultValue="Code × Craft × Contemporary Design" />
        </div>
        <div className="form-group">
          <label className="form-label">Voice Guidelines</label>
          <textarea className="form-textarea" style={{ minHeight: '80px' }}
            defaultValue="Curious, intelligent, grounded, learning in public. Never pretending to be an expert where still learning." />
        </div>
        <div className="form-group">
          <label className="form-label">Target Audience</label>
          <input className="form-input" defaultValue="Fashion professionals, designers, fashion-tech people, textile researchers — USA + UK" />
        </div>
        <button className="btn btn-primary btn-sm">Save Profile</button>
      </div>

      {/* Sources */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Source Registry</h2>
          <button className="btn btn-ghost btn-sm">+ Add Source</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {SOURCES.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
              borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{s.name}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{s.category}</p>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: TIER_COLOR[s.tier] }}>T{s.tier}</span>
              <span className="badge badge-gray">{s.trust}/100</span>
              <div style={{ width: '32px', height: '18px', borderRadius: '999px', background: s.active ? 'var(--green)' : 'var(--border)',
                transition: 'background 0.2s', cursor: 'pointer', position: 'relative' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'white',
                  position: 'absolute', top: '2px', left: s.active ? '16px' : '2px', transition: 'left 0.2s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Watchlist */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Watchlist</h2>
          <button className="btn btn-ghost btn-sm">+ Add Entity</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {WATCHLIST.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
              borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{w.name}</p>
              </div>
              <span className="badge badge-gray">{w.type}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{w.score}/100</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Provider */}
      <div className="card card-pad">
        <h2 className="section-title">AI Provider</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
          The system uses a provider abstraction. Change the provider without touching workflow logic.
        </p>
        <div className="form-group">
          <label className="form-label">Current Provider</label>
          <select className="form-select">
            <option value="openai">OpenAI (configured)</option>
            <option value="ollama">Ollama (local, free)</option>
            <option value="gemini">Gemini (free tier)</option>
            <option value="groq">Groq (free tier)</option>
          </select>
        </div>
        <div className="card card-pad-sm" style={{ background: 'var(--green-dim)', borderColor: 'rgba(52,211,153,0.3)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--green)' }}>✅ OpenAI key configured via environment variable</p>
        </div>
      </div>
    </div>
  )
}
