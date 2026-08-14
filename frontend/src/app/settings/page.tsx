'use client'
import { useState, useEffect } from 'react'

const SOURCES = [
  { name: 'Business of Fashion', tier: 1, trust: 90, category: 'Industry News', active: true },
  { name: 'Vogue Runway',        tier: 1, trust: 85, category: 'Contemporary Design', active: true },
  { name: 'The Interline',       tier: 2, trust: 85, category: 'Fashion-Tech', active: true },
  { name: 'CLO3D Blog',          tier: 2, trust: 80, category: 'Fashion-Tech', active: true },
  { name: 'Craft Council',       tier: 2, trust: 75, category: 'Craftsmanship', active: true },
]

const TIER_COLOR: Record<number, string> = { 1: 'var(--green)', 2: 'var(--accent)', 3: 'var(--text-2)' }

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

  // Fetch real persisted status on mount
  useEffect(() => {
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

      // Update state after confirmed DB persistence
      setAutoMode(newAutoMode)
      setPausePublishing(newPause)
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
          <p className="page-subtitle">Automation controls, LinkedIn OAuth manager, and brand memory</p>
        </div>
      </div>

      {/* AUTOMATION CONTROL SECTION WITH DB PERSISTENCE */}
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
          <a href="/api/auth/linkedin/callback" className="btn btn-primary btn-sm">
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
