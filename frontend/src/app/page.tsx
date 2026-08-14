'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { RESEARCH_CHANNELS } from '@/lib/research-channels'
import { FASHION_QUERY_PACK } from '@/lib/fashion-query-pack'

interface UpcomingPost {
  id: string
  draft_id: string | null
  title: string
  planned_date: string
  planned_time: string | null
  pillar: string
  format: string
  quality_gate_status: string
  image_status: string
  image_url: string | null
  publishing_status: string
  provenance: 'REAL' | 'TEST' | 'UNKNOWN'
}

interface ResearchSignal {
  id: string
  source_name: string
  url: string
  title: string
  category: string
  platform?: string
  query_used?: string
  relevance_status?: string
  relevance_score?: number
  topic_family?: string
  relevance_reason?: string
  captured_at: string
  processed: boolean
}

interface ProductionEngine {
  vercel_cron: string
  last_pipeline_run: {
    run_id: string
    started_at: string
    completed_at: string | null
    current_stage: string
    status: string
    error_code: string | null
    failure_reason: string | null
  } | null
  last_successful_run: {
    run_id: string
    completed_at: string
  } | null
  stages: {
    w1_research: { status: string; last_run_at?: string; tool: string }
    w2_scoring: { status: string; provider: string; model: string }
    w3_drafting: { status: string; text_model: string; image_model: string }
    w4_quality_gate: { status: string; visual_asset_enforced: boolean }
    w5_scheduler: { status: string; cadence: string }
    w6_dry_run: { status: string; transport: string }
  }
  research_sources: Array<{ name: string; url: string; type: string; status: string }>
  tools: {
    rss_http: string
    jina_reader: string
    agent_reach_cli: string
    agent_reach_production: string
  }
}

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
  upcoming_posts: UpcomingPost[]
  recent_signals: ResearchSignal[]
  production_engine: ProductionEngine | null
}

export default function TodayPage() {
  const [data, setData] = useState<ControlRoomStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dryRunLoading, setDryRunLoading] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<any>(null)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineResult, setPipelineResult] = useState<any>(null)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestResult, setIngestResult] = useState<any>(null)

  const loadStatus = async () => {
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

  useEffect(() => {
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
      await loadStatus()
    } catch (err: any) {
      setIngestResult({
        success: false,
        errors: [err.message || 'Ingestion request failed']
      })
    } finally {
      setIngestLoading(false)
    }
  }

  const handleRunFullPipeline = async () => {
    setPipelineLoading(true)
    setPipelineResult(null)
    try {
      const res = await authenticatedFetch('/api/signals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const json = await res.json()
      setPipelineResult(json)
      await loadStatus()
    } catch (err: any) {
      setPipelineResult({
        success: false,
        error: err.message || 'Pipeline execution failed'
      })
    } finally {
      setPipelineLoading(false)
    }
  }

  const autoState = data?.automation
  const linkedinState = data?.linkedin
  const nextPost = data?.next_post
  const gateResult = data?.publishing_gate
  const engine = data?.production_engine
  const upcomingPosts = data?.upcoming_posts || []
  const recentSignals = data?.recent_signals || []

  const isZernioConnected = linkedinState?.integration_status === 'ZERNIO_CONNECTED' || linkedinState?.can_publish

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Today&apos;s Inbox</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · Production system status &amp; content engine
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            disabled={pipelineLoading}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
            onClick={handleRunFullPipeline}
          >
            {pipelineLoading ? 'Running Pipeline...' : '⚡ Run W1→W6 Pipeline'}
          </button>

          <button 
            disabled={ingestLoading}
            className="btn btn-secondary btn-sm"
            onClick={handleTriggerIngestion}
          >
            {ingestLoading ? 'Syncing...' : '🔄 Sync Research Sources'}
          </button>
        </div>
      </div>

      {/* 1. PRODUCTION ENGINE STATUS VIEW */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚙️</span> PRODUCTION ENGINE STATUS
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">
              VERCEL CRON: {engine?.vercel_cron || 'ACTIVE (0 2 * * *)'}
            </span>
            <span className={`badge ${autoState?.auto_mode_enabled ? 'badge-green' : 'badge-gray'}`}>
              AUTO MODE: {autoState?.auto_mode_enabled ? 'ON' : 'OFF'}
            </span>
            {autoState?.pause_all_publishing && (
              <span className="badge badge-red">⛔ PAUSE ALL PUBLISHING</span>
            )}
            <span className={`badge ${isZernioConnected ? 'badge-green' : 'badge-gray'}`}>
              LIVE TRANSPORT: {isZernioConnected ? 'ZERNIO (ACTIVE)' : 'NOT SELECTED'}
            </span>
          </div>
        </div>

        {/* STAGES W1 -> W6 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>W1 Research</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)', margin: '0.2rem 0' }}>ACTIVE</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-2)', margin: 0 }}>Safe HTTP RSS + Jina</p>
          </div>

          <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>W2 Scoring</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)', margin: '0.2rem 0' }}>ACTIVE</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-2)', margin: 0 }}>Gemini 3.5 Flash</p>
          </div>

          <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>W3 Drafting</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)', margin: '0.2rem 0' }}>ACTIVE</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-2)', margin: 0 }}>Gemini 3.5 + 3.1 Img</p>
          </div>

          <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>W4 Quality Gate</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)', margin: '0.2rem 0' }}>ACTIVE</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-2)', margin: 0 }}>Visual Asset Enforced</p>
          </div>

          <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>W5 Scheduler</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)', margin: '0.2rem 0' }}>ACTIVE</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-2)', margin: 0 }}>4 posts/week</p>
          </div>

          <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>W6 Publisher</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green)', margin: '0.2rem 0' }}>ACTIVE</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-2)', margin: 0 }}>Zernio Live / DryRun</p>
          </div>
        </div>

        {/* PIPELINE RUN TRACE */}
        {engine?.last_pipeline_run && (
          <div style={{ background: '#111', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              Last Cloud Pipeline Run: <strong>{engine.last_pipeline_run.run_id}</strong> ({engine.last_pipeline_run.current_stage})
            </div>
            <div style={{ color: engine.last_pipeline_run.status === 'COMPLETED' ? 'var(--green)' : 'var(--accent)' }}>
              Status: <strong>{engine.last_pipeline_run.status}</strong> {engine.last_pipeline_run.completed_at ? `(${new Date(engine.last_pipeline_run.completed_at).toLocaleTimeString()})` : ''}
            </div>
          </div>
        )}
      </div>

      {/* INGESTION & PIPELINE RESULT BANNERS */}
      {ingestResult && (
        <div className="card card-pad-sm" style={{ marginBottom: '1.5rem', background: ingestResult.success ? 'var(--green-dim)' : 'var(--accent-dim)', borderColor: 'var(--border)' }}>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', color: ingestResult.success ? 'var(--green)' : 'var(--accent)' }}>
            📡 Research Ingestion: Discovered {ingestResult.signals_discovered ?? 0} | Accepted (Relevant): {ingestResult.signals_accepted ?? 0} | Rejected: {ingestResult.signals_rejected ?? 0} | Deduplicated: {ingestResult.signals_deduplicated ?? 0}
          </p>
        </div>
      )}

      {pipelineResult && (
        <div className="card card-pad-sm" style={{ marginBottom: '1.5rem', background: pipelineResult.status === 'COMPLETED' ? 'var(--green-dim)' : 'var(--accent-dim)', borderColor: 'var(--border)' }}>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', color: pipelineResult.status === 'COMPLETED' ? 'var(--green)' : 'var(--accent)' }}>
            ⚡ Pipeline Run Trace ({pipelineResult.run_id}): {pipelineResult.status}
          </p>
          {pipelineResult.failure_reason && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.25rem' }}>
              Reason: {pipelineResult.failure_reason}
            </p>
          )}
        </div>
      )}

      {/* 2. UPCOMING LINKEDIN POSTS */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📅</span> UPCOMING LINKEDIN POSTS
        </h2>

        {upcomingPosts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcomingPosts.map(post => (
              <div key={post.id} style={{ background: '#18181b', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{post.provenance} PROVENANCE</span>
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{post.pillar} · {post.format}</span>
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0.2rem 0' }}>{post.title}</h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-3)', margin: 0 }}>
                    Planned Date: <strong>{post.planned_date}</strong> {post.planned_time ? `at ${post.planned_time}` : ''} | Draft ID: <code>{post.draft_id || 'N/A'}</code>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${post.quality_gate_status === 'passed' ? 'badge-green' : 'badge-yellow'}`}>
                    QG: {post.quality_gate_status.toUpperCase()}
                  </span>
                  <span className={`badge ${post.image_status === 'completed' ? 'badge-green' : 'badge-gray'}`}>
                    IMG: {post.image_status.toUpperCase()}
                  </span>
                  <span className={`badge ${post.publishing_status === 'published' ? 'badge-green' : 'badge-blue'}`}>
                    {post.publishing_status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', textAlign: 'center', margin: '1rem 0' }}>
            No upcoming calendar posts found. Click <strong>⚡ Run W1→W6 Pipeline</strong> to schedule fresh content.
          </p>
        )}
      </div>

      {/* 3. AGENT REACH & RESEARCH CHANNELS REGISTRY */}
      <div className="card card-pad" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🛰️</span> AGENT REACH RESEARCH CHANNELS &amp; RUNTIME REGISTRY
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {RESEARCH_CHANNELS.map(ch => (
            <div key={ch.channel_id} style={{ background: '#18181b', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ch.channel_name}</span>
                <span className={`badge ${ch.production_safe ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.65rem' }}>
                  {ch.production_safe ? `ACTIVE (${ch.runtime.toUpperCase()})` : `LOCAL_ONLY`}
                </span>
              </div>
              <p style={{ fontSize: '0.725rem', color: 'var(--text-3)', margin: 0 }}>
                Platform: <strong>{ch.platform}</strong> | Priority: <strong>{ch.priority}</strong>
              </p>
            </div>
          ))}
        </div>

        {/* FASHION QUERY PACK CLUSTERS */}
        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.825rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: 'var(--text-2)' }}>
            🎯 Fashion Query Pack Clusters (Code × Craft × Contemporary Design):
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.values(FASHION_QUERY_PACK).map(cluster => (
              <span key={cluster.id} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                {cluster.name} ({cluster.queries.length} queries)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. RECENT RESEARCH SIGNALS WITH RELEVANCE STATUS & PROVENANCE */}
      <div className="card card-pad">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📡</span> DISCOVERED RESEARCH SIGNALS &amp; RELEVANCE GATE
        </h2>

        {recentSignals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {recentSignals.map(sig => (
              <div key={sig.id} style={{ background: '#18181b', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{sig.platform || 'RSS'} · {sig.source_name}</span>
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{sig.topic_family || sig.category}</span>
                  </div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{sig.title}</h4>
                  {sig.relevance_reason && (
                    <p style={{ fontSize: '0.725rem', color: 'var(--text-3)', margin: '0.2rem 0 0 0' }}>
                      Reason: {sig.relevance_reason}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span className={`badge ${sig.relevance_status === 'accepted' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                    {sig.relevance_status === 'accepted' ? `ACCEPTED (${sig.relevance_score ?? 75}%)` : `REJECTED (${sig.relevance_score ?? 30}%)`}
                  </span>
                  <span className={`badge ${sig.processed ? 'badge-gray' : 'badge-blue'}`} style={{ fontSize: '0.7rem' }}>
                    {sig.processed ? 'PROCESSED' : 'UNPROCESSED (ELIGIBLE)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', textAlign: 'center', margin: '1rem 0' }}>
            No research signals ingested yet. Click <strong>🔄 Sync Research Sources</strong> to discover fresh fashion-tech articles.
          </p>
        )}
      </div>
    </div>
  )
}
