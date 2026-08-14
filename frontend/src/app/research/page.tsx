'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ResearchSignal {
  id: string
  source_name: string
  url: string
  title: string
  category: string
  platform: string | null
  relevance_status: string | null
  relevance_score: number | null
  relevance_reason: string | null
  captured_at: string
}

const CATEGORIES = ['All', 'Craft', 'Fashion Tech', 'Materials', 'AI', '3D Design', 'Sustainability', 'Womenswear']

export default function ResearchPage() {
  const [signals, setSignals] = useState<ResearchSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')

  async function loadSignals() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('research_signals')
        .select('*')
        .order('captured_at', { ascending: false })
        .limit(40)

      if (error) throw error
      setSignals(data || [])
    } catch (err) {
      console.error('Failed to load research signals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSignals()
  }, [])

  const filteredSignals = signals.filter(sig => {
    if (activeCategory === 'All') return true
    
    // Fuzzy match on category or content
    const tag = activeCategory.toLowerCase()
    return (
      (sig.category && sig.category.toLowerCase().includes(tag)) ||
      (sig.title && sig.title.toLowerCase().includes(tag))
    )
  })

  return (
    <div className="page fade-up">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <p className="section-label">STUDIO RESEARCH DESK</p>
          <h1 className="page-title">Research Intelligence</h1>
          <p className="page-subtitle">Curated signals gathered from textile design, technology, and garment craft indexes</p>
        </div>
      </div>

      {/* Category Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '0.6rem', 
        flexWrap: 'wrap', 
        marginBottom: '2rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '1rem' 
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="btn btn-secondary btn-sm"
            style={{
              background: activeCategory === cat ? 'var(--text-primary)' : 'var(--bg-surface)',
              color: activeCategory === cat ? 'var(--bg)' : 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '0.4rem 1.1rem',
              fontSize: '0.72rem',
              fontWeight: 600
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>Scanning global indexes...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredSignals.length > 0 ? (
            filteredSignals.map(sig => (
              <div key={sig.id} className="card card-pad-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{sig.source_name}</span>
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{sig.category || 'Signals'}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                      {new Date(sig.captured_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <h3 style={{ 
                    fontFamily: 'var(--font-sans)', 
                    fontSize: '0.96rem', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    marginBottom: '0.4rem'
                  }}>
                    <a href={sig.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      {sig.title}
                    </a>
                  </h3>
                  {sig.relevance_reason && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <b>Why it matters:</b> {sig.relevance_reason}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={`score-ring ${(sig.relevance_score || 0) >= 70 ? 'score-high' : 'score-mid'}`}>
                    {sig.relevance_score || 70}%
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card text-muted" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <p>No research signals found matching index filter &quot;{activeCategory}&quot;.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
