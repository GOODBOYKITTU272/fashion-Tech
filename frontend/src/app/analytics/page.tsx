'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type MetricSummary = {
  total_followers: number
  usa_followers: number
  uk_followers: number
  growth: number
  impressions: number
  reactions: number
  comments: number
  reposts: number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [stats, setStats] = useState<MetricSummary>({
    total_followers: 0,
    usa_followers: 0,
    uk_followers: 0,
    growth: 0,
    impressions: 0,
    reactions: 0,
    comments: 0,
    reposts: 0
  })

  // Load latest metrics from database on mount
  useEffect(() => {
    async function loadMetrics() {
      const { data, error } = await supabase
        .from('post_metrics')
        .select('*')
        .order('snapshot_at', { ascending: false })
        .limit(1)

      if (!error && data && data.length > 0) {
        const latest = data[0]
        
        // Sum up aggregate post engagement metrics
        const { data: allMetrics } = await supabase
          .from('post_metrics')
          .select('impressions, reactions, comments, reposts')

        let totalImpressions = 0
        let totalReactions = 0
        let totalComments = 0
        let totalReposts = 0

        if (allMetrics) {
          allMetrics.forEach(m => {
            totalImpressions += m.impressions || 0
            totalReactions += m.reactions || 0
            totalComments += m.comments || 0
            totalReposts += m.reposts || 0
          })
        }

        setStats({
          total_followers: latest.followers_total || 0,
          usa_followers: latest.usa_followers || 0,
          uk_followers: latest.uk_followers || 0,
          growth: 0, // Calculated compared to previous snapshots
          impressions: totalImpressions,
          reactions: totalReactions,
          comments: totalComments,
          reposts: totalReposts
        })
      }
    }
    loadMetrics()
  }, [])

  const handleSyncMetrics = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/analytics/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(`Successfully synchronized ${data.sync_count} post metrics from Zernio!`)
        window.location.reload()
      } else {
        alert(`Sync failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message || err}`)
    } finally {
      setSyncing(false)
    }
  }

  // Simple client-side CSV parser
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        if (lines.length < 2) throw new Error('CSV is empty or invalid')

        // Simple CSV Parser splitting by comma/quotes
        const headers = parseCSVLine(lines[0])
        const parsedRows = lines.slice(1).map(line => {
          const values = parseCSVLine(line)
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim() || ''
            return obj
          }, {} as Record<string, string>)
        })

        // Process follower metrics
        let processedCount = 0
        for (const row of parsedRows) {
          const totalFollowers = Number(row['Total Followers'] || row['Followers'] || row['followers_total'] || 0)
          const impressions = Number(row['Impressions'] || row['impressions'] || 0)
          const reactions = Number(row['Reactions'] || row['reactions'] || 0)
          const comments = Number(row['Comments'] || row['comments'] || 0)
          const reposts = Number(row['Reposts'] || row['reposts'] || 0)
          
          if (totalFollowers > 0 || impressions > 0) {
            let postId = null
            if (impressions > 0) {
              const { data: pubPost } = await supabase
                .from('published_posts')
                .insert({ linkedin_post_url: row['Post URL'] || row['url'] || '' })
                .select()
                .single()

              postId = pubPost?.id || null
            }

            const { error: insertError } = await supabase
              .from('post_metrics')
              .insert({
                published_post_id: postId,
                followers_total: totalFollowers,
                usa_followers: Number(row['USA Followers'] || row['usa_followers'] || 0),
                uk_followers: Number(row['UK Followers'] || row['uk_followers'] || 0),
                impressions,
                reactions,
                comments,
                reposts
              })

            if (!insertError) processedCount++
          }
        }

        alert(`Successfully imported ${processedCount} metric updates!`)
        window.location.reload()

      } catch (err: any) {
        alert(`Failed to parse CSV: ${err.message || err}`)
      } finally {
        setLoading(false)
      }
    }

    reader.readAsText(file)
  }

  const parseCSVLine = (line: string) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const targetQualifiedPct = stats.total_followers > 0 
    ? Math.round(((stats.usa_followers + stats.uk_followers) / stats.total_followers) * 100)
    : 0

  return (
    <div className="page fade-up">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="section-label">CODE × CRAFT METRICS</p>
          <h1 className="page-title">Performance Analytics</h1>
          <p className="page-subtitle">Qualified USA + UK audience expansion metrics</p>
        </div>
        <button 
          onClick={handleSyncMetrics} 
          disabled={syncing}
          className="btn btn-primary btn-sm"
        >
          {syncing ? 'Syncing...' : '🔄 Sync Real-Time Metrics'}
        </button>
      </div>

      {/* KPI North-Star Board */}
      <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)', padding: '2rem', marginBottom: '2.5rem' }}>
        <p className="section-label" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>🏆 North-Star KPI Target</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '3.6rem', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1 }}>
          {stats.usa_followers + stats.uk_followers > 0 ? `${(stats.usa_followers + stats.uk_followers).toLocaleString()}` : '—'}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
          Combined qualified target market followers from USA and UK ({targetQualifiedPct > 0 ? `${targetQualifiedPct}%` : '—'} of total audience)
        </p>
      </div>

      {/* Stats Block Grid */}
      <div className="stat-grid" style={{ marginBottom: '2.5rem' }}>
        {[
          { label: 'Total Followers', value: stats.total_followers > 0 ? stats.total_followers.toLocaleString() : '—', desc: 'Total network size' },
          { label: 'USA Followers', value: stats.usa_followers > 0 ? stats.usa_followers.toLocaleString() : '—', desc: 'Primary target region' },
          { label: 'UK Followers', value: stats.uk_followers > 0 ? stats.uk_followers.toLocaleString() : '—', desc: 'Secondary target region' },
          { label: 'Total Impressions', value: stats.impressions > 0 ? stats.impressions.toLocaleString() : '—', desc: 'Total content impressions' },
          { label: 'Total Engagement', value: stats.reactions + stats.comments + stats.reposts > 0 ? (stats.reactions + stats.comments + stats.reposts).toLocaleString() : '—', desc: 'Reactions, comments & reposts' }
        ].map(item => (
          <div key={item.label} className="stat-card" style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <p className="stat-label">{item.label}</p>
            <p className="stat-value" style={{ fontWeight: 400 }}>{item.value}</p>
            <p className="stat-sub">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* CSV Import Form */}
      <div className="card" style={{ border: '1px solid var(--border)', padding: '2rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 400, marginBottom: '0.5rem' }}>Import Creator Performance CSV</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          LinkedIn personal profiles do not allow real-time API integrations. Import your CSV reports to synchronize follower metrics.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {[
            { step: '01', desc: 'Export Creator Analytics from LinkedIn settings panel.' },
            { step: '02', desc: 'Download CSV file to your local computer directory.' },
            { step: '03', desc: 'Select and drop the export CSV file into the space below.' }
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>{s.step}</span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ 
          border: '1px dashed var(--border)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '3rem 2rem', 
          textAlign: 'center', 
          position: 'relative',
          background: 'rgba(140, 123, 108, 0.02)'
        }}>
          {loading ? (
            <p style={{ color: 'var(--accent)', fontWeight: 600 }}>Syncing metrics database...</p>
          ) : (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Drop your exported creator CSV file here</p>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCSVUpload} 
                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%' }}
              />
              <button className="btn btn-secondary btn-sm">Choose File</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
