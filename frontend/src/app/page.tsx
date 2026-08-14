'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

interface ControlRoomStatusData {
  automation: {
    auto_mode_enabled: boolean
    pause_all_publishing: boolean
    min_confidence_score: number
    state_valid: boolean
  }
  linkedin: {
    integration_status: string
    auth_status: string
    granted_scopes: string[]
    can_publish: boolean
  }
  next_post: {
    id: string
    title: string
    pillar: string
    format: string
    planned_date: string
    planned_time: string | null
    status: string
    quality_gate_status: string
    confidence_score: number | null
  } | null
  publishing_gate: {
    allowed: boolean
    reason_code: string
    reasons: string[]
  }
}

export default function TodayPage() {
  const [data, setData] = useState<ControlRoomStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dryRunLoading, setDryRunLoading] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<any>(null)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestResult, setIngestResult] = useState<any>(null)

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await authenticatedFetch('/api/control-room/status')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error('Failed to load control room status API:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStatus()
  }, [])

  const handleRunDryTest = async (validateOnly = false) => {
    setDryRunLoading(true)
    setDryRunResult(null)
    try {
      const res = await authenticatedFetch('/api/publisher/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: nextPost?.id,
          validateOnly
        })
      })
      const json = await res.json()
      setDryRunResult(json)
    } catch (err: any) {
      setDryRunResult({
        success: false,
        status: 'ERROR',
        reasons: [err.message || 'Dry test request failed']
      })
    } finally {
      setDryRunLoading(false)
    }
  }

  const handleTriggerIngestion = async () => {
    setIngestLoading(true)
    setIngestResult(null)
    try {
      const res = await authenticatedFetch('/api/signals/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const json = await res.json()
      setIngestResult(json)
    } catch (err: any) {
      setIngestResult({
        success: false,
        errors: [err.message || 'Ingestion request failed']
      })
    } finally {
      setIngestLoading(false)
    }
  }

  const autoState = data?.automation
  const linkedinState = data?.linkedin
  const nextPost = data?.next_post
  const gateResult = data?.publishing_gate

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Today&apos;s Inbox</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · Daily automation signals &amp; publishing readiness
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/settings" className="btn btn-ghost btn-sm">
            ⚙️ Manage OAuth
          </Link>
          <button 
            disabled={ingestLoading}
            className="btn btn-primary btn-sm"
            onClick={handleTriggerIngestion}
          >
            {ingestLoading ? 'Syncing...' : '🔄 Sync Research Sources'}
          </button>
        </div>
      </div>

      {/* REAL AUTOMATION & INTEGRATION CONTROL BANNER */}
      <div className="card card-pad-sm" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`badge ${autoState?.auto_mode_enabled ? 'badge-green' : 'badge-gray'}`}>
              AUTO MODE: {autoState?.auto_mode_enabled ? 'ON' : 'OFF'}
            </span>
            {autoState?.pause_all_publishing && (
              <span className="badge badge-red">⛔ PAUSE ALL PUBLISHING ACTIVE</span>
            )}
            <span className={`badge ${
              linkedinState?.integration_status === 'CONNECTED' ? 'badge-green' :
              linkedinState?.integration_status === 'REAUTH_REQUIRED' ? 'badge-yellow' : 'badge-gray'
            }`}>
              LIVE TRANSPORT: NOT SELECTED
            </span>
            <span className="badge badge-blue">
              RESEARCH INGESTION: SAFE HTTP READY
            </span>
            <span className="badge badge-gray">
              AGENT REACH CLI: LOCAL ONLY
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
            Min Confidence Threshold: <strong>{autoState?.min_confidence_score ?? 70}%</strong>
          </div>
        </div>
      </div>

      {/* INGESTION RESULT BANNER */}
      {ingestResult && (
        <div className="card card-pad-sm" style={{ marginBottom: '1.5rem', background: ingestResult.success ? 'var(--green-dim)' : 'var(--accent-dim)', borderColor: 'var(--border)' }}>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', color: ingestResult.success ? 'var(--green)' : 'var(--accent)' }}>
            📡 Research Signal Ingestion Result: {ingestResult.success ? 'Success' : 'Partial / Failed'} ({ingestResult.runtime})
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.25rem' }}>
            Discovered: <strong>{ingestResult.signals_discovered ?? 0}</strong> | Inserted: <strong>{ingestResult.signals_inserted ?? 0}</strong> | Deduplicated: <strong>{ingestResult.signals_deduplicated ?? 0}</strong>
          </p>
        </div>
      )}

      {/* REAL NEXT POST & PUBLISHING ELIGIBILITY STATUS CARD */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem', borderColor: gateResult?.allowed ? 'var(--green)' : 'var(--border)' }}>
        {nextPost ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                  NEXT SCHEDULED POST
                </span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0.25rem 0 0.5rem 0' }}>
                  {nextPost.title}
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-2)', margin: 0 }}>
                  Scheduled for <strong>{nextPost.planned_date} · {nextPost.pillar} Pillar ({nextPost.format})</strong>
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>Quality Gate Status</p>
                <span className={`badge ${nextPost.quality_gate_status === 'passed' ? 'badge-green' : 'badge-yellow'}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                  QUALITY: {nextPost.quality_gate_status.toUpperCase()} {nextPost.confidence_score ? `(${nextPost.confidence_score}%)` : ''}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '1rem 0', textAlign: 'center' }}>
            <span className="badge badge-gray" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
              NEXT SCHEDULED POST
            </span>
            <p style={{ fontSize: '1rem', color: 'var(--text-2)', fontWeight: 500, margin: '0.25rem 0' }}>
              No scheduled post yet
            </p>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-3)', margin: 0 }}>
              Use the Post Editor or Weekly Scheduler to queue future content.
            </p>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.825rem', fontWeight: 600, margin: 0 }}>
              Publishing Readiness Gate:
            </p>
            <p style={{ fontSize: '0.8rem', color: gateResult?.allowed ? 'var(--green)' : 'var(--accent)', marginTop: '0.2rem' }}>
              {gateResult?.allowed
                ? '✅ ELIGIBLE — Ready for dry-run simulation'
                : `BLOCKED — Reason Code: ${gateResult?.reason_code || 'LINKEDIN_NOT_CONNECTED'}`
              }
            </p>
            {gateResult?.reasons && gateResult.reasons.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                {gateResult.reasons[0]}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              disabled={dryRunLoading} 
              className="btn btn-secondary btn-sm"
              onClick={() => handleRunDryTest(true)}
            >
              {dryRunLoading ? 'Validating...' : '🔍 Validate Payload Only'}
            </button>
            <button 
              disabled={dryRunLoading} 
              className="btn btn-primary btn-sm"
              onClick={() => handleRunDryTest(false)}
            >
              {dryRunLoading ? 'Running...' : '🧪 Run Publishing Dry Test'}
            </button>
          </div>
        </div>

        {/* DRY RUN RESULT DISPLAY BANNER */}
        {dryRunResult && (
          <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: 'var(--radius-sm)', background: dryRunResult.success ? 'var(--green-dim)' : 'var(--accent-dim)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: dryRunResult.success ? 'var(--green)' : 'var(--accent)' }}>
              <span>🧪 W6 Publisher Dry-Run Status: {dryRunResult.status}</span>
              <span>{dryRunResult.idempotency_key}</span>
            </div>
            {dryRunResult.reasons && (
              <p style={{ color: 'var(--text-2)', marginTop: '0.25rem' }}>{dryRunResult.reasons[0]}</p>
            )}
            {dryRunResult.payload_preview && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }}>View Generated Payload Preview ({dryRunResult.payload_preview.request_type})</summary>
                <pre style={{ background: '#111', padding: '0.5rem', borderRadius: '4px', fontSize: '0.725rem', overflowX: 'auto', marginTop: '0.4rem', color: '#e0e0e0' }}>
                  {JSON.stringify(dryRunResult.payload_preview, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* TODAY'S INBOX OPPORTUNITIES LIST */}
      <div className="card card-pad" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📫</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
          No new unprocessed research signals
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', maxWidth: '420px', margin: '0 auto' }}>
          Research signal ingestion acquires safe fashion technology, Indian craftsmanship, and textile signals into Supabase. Click <strong>Sync Research Sources</strong> to trigger acquisition.
        </p>
      </div>
    </div>
  )
}
