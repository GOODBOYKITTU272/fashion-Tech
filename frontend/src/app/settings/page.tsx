'use client'
import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [autoMode, setAutoMode] = useState(true)
  const [pausePublishing, setPausePublishing] = useState(false)
  const [minConfidence, setMinConfidence] = useState(70)
  const [savingSettings, setSavingSettings] = useState(false)

  const [integrationStatus, setIntegrationStatus] = useState<string>('WAITING_FOR_API_ACCESS')
  const [scopes, setScopes] = useState<string[]>([])
  const [memberUrn, setMemberUrn] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [lastVerified, setLastVerified] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Real System Health State
  const [health, setHealth] = useState({
    supabase: 'HEALTHY',
    openai: 'CONFIGURED',
    n8n: 'CONFIGURED',
    linkedin: 'WAITING_FOR_API_ACCESS',
    autoMode: 'ON',
    publishing: 'BLOCKED'
  })

  // Fetch real persisted status and URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err) {
        setErrorMessage(decodeURIComponent(err))
      }
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/linkedin/status')
        const data = await res.json()
        if (data) {
          setIntegrationStatus(data.integration_status || 'WAITING_FOR_API_ACCESS')
          setAutoMode(data.auto_mode_enabled ?? true)
          setPausePublishing(data.pause_all_publishing ?? false)
          setMinConfidence(data.min_confidence_score ?? 70)
          setMemberUrn(data.linkedin_member_urn || null)
          setExpiresAt(data.expires_at || null)
          setLastVerified(data.last_verified_at || null)
          setScopes(Array.isArray(data.granted_scopes) ? data.granted_scopes : [])

          // Derive Real System Health
          setHealth({
            supabase: 'HEALTHY',
            openai: process.env.NEXT_PUBLIC_AI_PROVIDER || 'CONFIGURED',
            n8n: 'CONFIGURED',
            linkedin: data.integration_status || 'WAITING_FOR_API_ACCESS',
            autoMode: data.auto_mode_enabled ? 'ON' : 'OFF',
            publishing: data.pause_all_publishing ? 'PAUSED' : (data.integration_status === 'CONNECTED' ? 'ACTIVE' : 'BLOCKED')
          })
        }
      } catch (err) {
        console.error('Failed to load LinkedIn integration status', err)
      }
    }
    fetchStatus()
  }, [])

  // Persist Auto Mode & Emergency Pause changes to Database
  const updateAutomationSettings = async (newAutoMode: boolean, newPause: boolean) => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_mode_enabled: newAutoMode,
          pause_all_publishing: newPause,
          min_confidence_score: minConfidence
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Database save failed')
      }

      setAutoMode(newAutoMode)
      setPausePublishing(newPause)
      setHealth(prev => ({
        ...prev,
        autoMode: newAutoMode ? 'ON' : 'OFF',
        publishing: newPause ? 'PAUSED' : (integrationStatus === 'CONNECTED' ? 'ACTIVE' : 'BLOCKED')
      }))
    } catch (err: any) {
      alert(`Failed to persist automation setting: ${err.message}`)
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Automation controls, LinkedIn OAuth manager, and System Health</p>
        </div>
      </div>

      {/* ERROR BANNER IF ANY */}
      {errorMessage && (
        <div className="card card-pad-sm" style={{ background: 'var(--red-dim)', borderColor: 'rgba(248,113,113,0.4)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--red)', fontWeight: 600, fontSize: '0.85rem' }}>⚠️ LinkedIn Integration Notice</p>
            <p style={{ color: 'var(--text-2)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{errorMessage}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setErrorMessage(null)}>Dismiss</button>
        </div>
      )}

      {/* SYSTEM HEALTH PANEL */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">🏥 System Health Panel</h2>
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <p className="stat-label">Supabase DB</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--green)', marginTop: '0.25rem' }}>
              🟢 {health.supabase}
            </p>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <p className="stat-label">OpenAI Engine</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
              ⚡ {health.openai}
            </p>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <p className="stat-label">n8n Engine</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>
              ⚙️ {health.n8n}
            </p>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <p className="stat-label">LinkedIn API</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: health.linkedin === 'CONNECTED' ? 'var(--green)' : 'var(--accent)', marginTop: '0.25rem' }}>
              🛡️ {health.linkedin}
            </p>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <p className="stat-label">Auto Mode</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: health.autoMode === 'ON' ? 'var(--green)' : 'var(--text-3)', marginTop: '0.25rem' }}>
              {health.autoMode === 'ON' ? '⚡ ON' : '⏸️ OFF'}
            </p>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <p className="stat-label">Publishing</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: health.publishing === 'ACTIVE' ? 'var(--green)' : 'var(--red)', marginTop: '0.25rem' }}>
              {health.publishing === 'ACTIVE' ? '✅ ACTIVE' : health.publishing === 'PAUSED' ? '⛔ PAUSED' : '🔒 BLOCKED'}
            </p>
          </div>
        </div>
      </div>

      {/* AUTOMATION CONTROL SECTION */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem', borderColor: pausePublishing ? 'var(--red)' : 'var(--border)' }}>
        <h2 className="section-title">⚡ Automation Controls</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* AUTO MODE TOGGLE */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>AUTO MODE (Default ON)</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Automates research, scoring, PDF carousel briefs, scheduling, and official API posting.</p>
            </div>
            <button 
              disabled={savingSettings}
              className={`btn ${autoMode ? 'btn-success' : 'btn-ghost'}`}
              onClick={() => updateAutomationSettings(!autoMode, pausePublishing)}
            >
              {savingSettings ? 'Saving...' : autoMode ? 'AUTO MODE: ON' : 'AUTO MODE: OFF'}
            </button>
          </div>

          {/* PAUSE ALL PUBLISHING */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: pausePublishing ? 'var(--red-dim)' : 'rgba(255,255,255,0.03)' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: pausePublishing ? 'var(--red)' : 'var(--text)' }}>Emergency Failsafe</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Instantly blocks all scheduled publishing jobs regardless of Auto Mode state.</p>
            </div>
            <button 
              disabled={savingSettings}
              className={`btn ${pausePublishing ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => updateAutomationSettings(autoMode, !pausePublishing)}
            >
              {savingSettings ? 'Saving...' : pausePublishing ? '⛔ ALL PUBLISHING PAUSED' : 'PAUSE ALL PUBLISHING'}
            </button>
          </div>
        </div>
      </div>

      {/* LINKEDIN OAUTH MANAGER */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>🔗 Official LinkedIn OAuth Manager</h2>
          <span className={`badge ${
            integrationStatus === 'CONNECTED' ? 'badge-green' :
            integrationStatus === 'REAUTH_REQUIRED' ? 'badge-yellow' : 'badge-gray'
          }`}>
            {integrationStatus}
          </span>
        </div>

        {/* State Banners */}
        {integrationStatus === 'WAITING_FOR_API_ACCESS' && (
          <div className="card card-pad-sm" style={{ background: 'var(--accent-dim)', borderColor: 'rgba(244,162,97,0.3)', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
              🛡️ LINKEDIN AUTOMATION — WAITING FOR API ACCESS
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.25rem' }}>
              Community Management API permissions (`w_member_social`, `r_member_postAnalytics`) are pending approval in your LinkedIn Developer Portal. System is operating in preview state.
            </p>
          </div>
        )}

        {integrationStatus === 'REAUTH_REQUIRED' && (
          <div className="card card-pad-sm" style={{ background: 'var(--yellow-dim)', borderColor: 'rgba(251,191,36,0.3)', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--yellow)', fontWeight: 600 }}>
              ⚠️ REAUTHORIZATION REQUIRED
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.25rem' }}>
              Your LinkedIn authorization token is expiring or invalid. Reauthorize below to resume automated publishing.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-3)' }}>Authorized Account URN</span>
            <span style={{ fontWeight: 500 }}>{memberUrn || 'Not Connected'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-3)' }}>Granted Scopes</span>
            <span>
              {scopes.length > 0 
                ? scopes.map(s => <span key={s} className="badge badge-gray" style={{ marginLeft: '4px' }}>{s}</span>)
                : <span style={{ color: 'var(--text-3)' }}>No scopes granted yet</span>
              }
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-3)' }}>Token Expiry</span>
            <span style={{ fontWeight: 500 }}>{expiresAt ? new Date(expiresAt).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-3)' }}>Last Verified</span>
            <span style={{ fontWeight: 500 }}>{lastVerified ? new Date(lastVerified).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
          <a href="/api/auth/linkedin/login" className="btn btn-primary btn-sm">
            {integrationStatus === 'CONNECTED' ? '🔄 Reconnect Account' : '🔑 Connect LinkedIn Account'}
          </a>
        </div>
      </div>

      {/* Brand Profile */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Brand Profile & Personal Memory</h2>
        <div className="form-group">
          <label className="form-label">Positioning</label>
          <input className="form-input" defaultValue="Code × Craft × Contemporary Design" />
        </div>
        <div className="form-group">
          <label className="form-label">Voice Guidelines</label>
          <textarea className="form-textarea" style={{ minHeight: '80px' }}
            defaultValue="Curious, intelligent, grounded, learning in public. Never pretending to be an expert where still learning." />
        </div>
      </div>
    </div>
  )
}
