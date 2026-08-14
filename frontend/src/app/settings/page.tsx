'use client'

import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { supabase } from '@/lib/supabase'

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

  const [researchSourcesStatus, setResearchSourcesStatus] = useState<Record<string, string>>({
    rss: 'configured',
    reddit: 'configured',
    linkedin_public: 'configured',
    twitter_x: 'auth_required'
  })

  // Pipeline debug states
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineResult, setPipelineResult] = useState<any>(null)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestResult, setIngestResult] = useState<any>(null)

  const [health, setHealth] = useState({
    supabase: 'HEALTHY',
    openai: 'CONFIGURED — NOT VERIFIED',
    n8n: 'CONFIGURED — NOT VERIFIED',
    linkedin: 'WAITING_FOR_API_ACCESS',
    autoMode: 'ON',
    publishing: 'BLOCKED'
  })

  // Fetch real persisted status on mount
  const fetchStatus = async () => {
    try {
      const res = await authenticatedFetch('/api/control-room/status')
      if (res.ok) {
        const data = await res.json()
        const linkedin = data.linkedin
        const automation = data.automation

        setIntegrationStatus(linkedin?.integration_status || 'WAITING_FOR_API_ACCESS')
        setAutoMode(automation?.auto_mode_enabled ?? true)
        setPausePublishing(automation?.pause_all_publishing ?? false)
        setMinConfidence(automation?.min_confidence_score ?? 70)
        setMemberUrn(linkedin?.linkedin_member_urn || null)
        setExpiresAt(linkedin?.expires_at || null)
        setLastVerified(linkedin?.last_verified_at || null)
        setScopes(Array.isArray(linkedin?.granted_scopes) ? linkedin.granted_scopes : [])

        if (automation?.research_sources_status) {
          setResearchSourcesStatus(automation.research_sources_status)
        }

        setHealth({
          supabase: 'HEALTHY',
          openai: 'CONFIGURED — NOT VERIFIED',
          n8n: 'CONFIGURED — NOT VERIFIED',
          linkedin: linkedin?.integration_status || 'WAITING_FOR_API_ACCESS',
          autoMode: automation?.auto_mode_enabled ? 'ON' : 'OFF',
          publishing: automation?.pause_all_publishing ? 'PAUSED' : (linkedin?.integration_status === 'CONNECTED' ? 'ACTIVE' : 'BLOCKED')
        })
      }
    } catch (err) {
      console.error('Failed to load LinkedIn integration status:', err)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err) {
        setErrorMessage(decodeURIComponent(err))
      }
    }
    fetchStatus()
  }, [])

  const updateAutomationSettings = async (newAutoMode: boolean, newPause: boolean) => {
    setSavingSettings(true)
    try {
      const res = await authenticatedFetch('/api/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_mode_enabled: newAutoMode,
          pause_all_publishing: newPause,
          min_confidence_score: minConfidence
        })
      })

      if (!res.ok) {
        throw new Error('Database save failed')
      }

      setAutoMode(newAutoMode)
      setPausePublishing(newPause)
      setHealth(prev => ({
        ...prev,
        autoMode: newAutoMode ? 'ON' : 'OFF',
        publishing: newPause ? 'PAUSED' : (integrationStatus === 'CONNECTED' ? 'ACTIVE' : 'BLOCKED')
      }))
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`)
    } finally {
      setSavingSettings(false)
    }
  }

  // Advanced Operations
  const handleTriggerIngestion = async () => {
    setIngestLoading(true)
    setIngestResult(null)
    try {
      const res = await authenticatedFetch('/api/signals/ingest', { method: 'POST' })
      const json = await res.json()
      setIngestResult(json)
      await fetchStatus()
    } catch (err: any) {
      setIngestResult({ success: false, errors: [err.message] })
    } finally {
      setIngestLoading(false)
    }
  }

  const handleRunFullPipeline = async () => {
    setPipelineLoading(true)
    setPipelineResult(null)
    try {
      const res = await authenticatedFetch('/api/signals/process', { method: 'POST' })
      const json = await res.json()
      setPipelineResult(json)
      await fetchStatus()
    } catch (err: any) {
      setPipelineResult({ success: false, error: err.message })
    } finally {
      setPipelineLoading(false)
    }
  }

  return (
    <div className="page fade-up">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <p className="section-label">STUDIO SETTINGS</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure publishing settings, brand parameters, and system controls</p>
        </div>
      </div>

      {errorMessage && (
        <div className="card card-pad-sm" style={{ background: 'var(--danger-dim)', borderColor: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>⚠️ LinkedIn Integration Notice</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{errorMessage}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setErrorMessage(null)}>Dismiss</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* AUTOMATION CONTROL */}
        <section className="card" style={{ border: '1px solid var(--border)', borderColor: pausePublishing ? 'var(--danger)' : 'var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 400, marginBottom: '1.25rem' }}>⚡ Automation Settings</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Auto Mode toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(140, 123, 108, 0.03)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>AUTO PILOT SCHEDULER</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Automates research discovery, drafting, scheduling, and official publication.</p>
              </div>
              <button 
                disabled={savingSettings}
                className="btn btn-secondary btn-sm"
                onClick={() => updateAutomationSettings(!autoMode, pausePublishing)}
              >
                {savingSettings ? 'Saving...' : autoMode ? 'Active (ON)' : 'Inactive (OFF)'}
              </button>
            </div>

            {/* Emergency Pause */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: pausePublishing ? 'var(--danger-dim)' : 'rgba(140, 123, 108, 0.03)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.92rem', color: pausePublishing ? 'var(--danger)' : 'var(--text-primary)' }}>EMERGENCY FAILSAFE</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Instantly blocks all publishing queues from delivering content live.</p>
              </div>
              <button 
                disabled={savingSettings}
                className={`btn btn-sm ${pausePublishing ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => updateAutomationSettings(autoMode, !pausePublishing)}
              >
                {savingSettings ? 'Saving...' : pausePublishing ? 'Publishing Blocked' : 'Pause All Posts'}
              </button>
            </div>
          </div>
        </section>

        {/* TELEGRAM APPROVAL BOT */}
        <section className="card" style={{ border: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 400, marginBottom: '0.5rem' }}>📱 Approval Channels</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Direct approvals via secure chat messages.</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Telegram Approval Bot</span>
            <span className="badge badge-green">Connected</span>
          </div>
        </section>

        {/* LINKEDIN OAUTH CONNECTION */}
        <section className="card" style={{ border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 400, margin: 0 }}>🔗 LinkedIn Account</h2>
            <span className={`badge ${integrationStatus === 'CONNECTED' ? 'badge-green' : 'badge-yellow'}`}>
              {integrationStatus}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>URN Identifier</span>
              <span style={{ fontWeight: 500 }}>{memberUrn || 'Not Connected'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Access Token Expiration</span>
              <span style={{ fontWeight: 500 }}>{expiresAt ? new Date(expiresAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <a href="/api/auth/linkedin/login" className="btn btn-secondary btn-sm">
              {integrationStatus === 'CONNECTED' ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}
            </a>
          </div>
        </section>

        {/* BRAND PROFILE */}
        <section className="card" style={{ border: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 400, marginBottom: '1.25rem' }}>🎨 Brand Profile Guidelines</h2>
          
          <div className="form-group">
            <label className="form-label">Studio Positioning</label>
            <input className="form-input" defaultValue="Code × Craft × Contemporary Design" />
          </div>

          <div className="form-group">
            <label className="form-label">Voice / Persona Guide</label>
            <textarea className="form-textarea" style={{ minHeight: '90px' }}
              defaultValue="Grounded, intellectual, documenting research, sharing learning curves. Avoiding fake expertise." />
          </div>
        </section>

        {/* COLLAPSIBLE ADVANCED DIAGNOSTICS */}
        <details style={{ cursor: 'pointer' }}>
          <summary style={{ 
            fontSize: '0.8rem', 
            fontWeight: 700, 
            letterSpacing: '0.08em', 
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            padding: '1rem 0'
          }}>
            Advanced System Diagnostics
          </summary>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', cursor: 'default', marginTop: '1rem' }}>
            {/* System Health */}
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>System Integrity Indicators</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <p className="stat-label">Supabase</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>🟢 {health.supabase}</p>
                </div>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <p className="stat-label">OpenAI Engine</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>⚡ {health.openai}</p>
                </div>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <p className="stat-label">n8n Engine</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>⚙️ {health.n8n}</p>
                </div>
              </div>
            </div>

            {/* Research Sources Status */}
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Advanced Research Sources</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <p className="stat-label">RSS Feeds</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>
                    {String(researchSourcesStatus.rss || 'configured').toUpperCase()}
                  </p>
                </div>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <p className="stat-label">Reddit</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: researchSourcesStatus.reddit === 'active' ? 'var(--success)' : 'var(--accent)', marginTop: '0.25rem' }}>
                    {String(researchSourcesStatus.reddit || 'configured').toUpperCase()}
                  </p>
                </div>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <p className="stat-label">LinkedIn Public</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>
                    {String(researchSourcesStatus.linkedin_public || 'configured').toUpperCase()}
                  </p>
                </div>
                <div className="stat-card" style={{ padding: '0.75rem' }}>
                  <p className="stat-label">Twitter / X</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', marginTop: '0.25rem' }}>
                    {String(researchSourcesStatus.twitter_x || 'auth_required').toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Run Actions */}
            <div className="card" style={{ border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Manual pipeline operations</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button 
                  disabled={pipelineLoading}
                  onClick={handleRunFullPipeline}
                  className="btn btn-secondary btn-sm"
                >
                  {pipelineLoading ? 'Running...' : 'Run Pipeline'}
                </button>
                <button 
                  disabled={ingestLoading}
                  onClick={handleTriggerIngestion}
                  className="btn btn-secondary btn-sm"
                >
                  {ingestLoading ? 'Syncing...' : 'Sync Sources'}
                </button>
              </div>

              {ingestResult && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  <b>Sync output:</b> Discovered {ingestResult.signals_discovered} | Accepted: {ingestResult.signals_accepted}
                </div>
              )}

              {pipelineResult && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  <b>Pipeline output:</b> {pipelineResult.status} {pipelineResult.failure_reason && ` - ${pipelineResult.failure_reason}`}
                </div>
              )}
            </div>
          </div>
        </details>

      </div>
    </div>
  )
}
