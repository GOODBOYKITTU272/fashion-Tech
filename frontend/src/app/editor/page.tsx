'use client'
import { useState } from 'react'

const REJECTION_REASONS = [
  'not relevant', 'weak', 'too generic', 'not my voice',
  'fact issue', 'bad timing', 'visual issue', 'duplicate', 'other'
]

const MOCK_HOOKS = [
  "Most fashion designers don't know this is happening to Indian craft traditions — and it's changing everything.",
  "The intersection of code and craft is closer than you think. Here's what I discovered.",
  "Why is Silicon Valley suddenly obsessed with Indian textiles? A thread on what's really happening.",
]

export default function EditorPage() {
  const [selectedHook, setSelectedHook] = useState(0)
  const [body, setBody] = useState(`Indian handloom is experiencing a renaissance — not in spite of technology, but because of it.

CLO3D is now being used to design garments that are specifically optimized for handloom weaving constraints. The result? Patterns that would have taken weeks to prototype physically can now be validated digitally in hours.

This isn't replacing the artisan. It's amplifying them.

What's exciting for me, transitioning from CS into fashion, is watching the two worlds I love finally speaking the same language.`)
  const [personalInput, setPersonalInput] = useState('')
  const [status, setStatus] = useState<'draft'|'approved'|'rejected'>('draft')
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Post Editor</h1>
          <p className="page-subtitle">Review, personalise, and approve your draft</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {status === 'approved' && <span className="badge badge-green" style={{ padding: '0.4rem 0.85rem' }}>✅ Approved</span>}
          {status === 'rejected' && <span className="badge badge-red" style={{ padding: '0.4rem 0.85rem' }}>❌ Rejected</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* LEFT — main editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Hooks */}
          <div className="card card-pad">
            <h2 className="section-title">Choose a Hook</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {MOCK_HOOKS.map((hook, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedHook(i)}
                  style={{
                    textAlign: 'left', padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
                    background: selectedHook === i ? 'var(--primary-dim)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedHook === i ? 'rgba(155,93,229,0.4)' : 'var(--border)'}`,
                    color: selectedHook === i ? 'var(--primary)' : 'var(--text-2)',
                    cursor: 'pointer', transition: 'all 0.2s', lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>{i + 1}.</span>
                  {hook}
                </button>
              ))}
            </div>
          </div>

          {/* Draft body */}
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Draft Body</h2>
              <span style={{ fontSize: '0.75rem', color: wordCount > 300 ? 'var(--red)' : 'var(--text-3)' }}>
                {wordCount} / 300 words
              </span>
            </div>
            <textarea
              className="form-textarea"
              value={body}
              onChange={e => setBody(e.target.value)}
              style={{ minHeight: '200px' }}
            />
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['#FashionTech', '#IndianCraft', '#CLO3D', '#CodeAndCraft', '#FashionDesign'].map(tag => (
                <span key={tag} className="badge badge-gray">{tag}</span>
              ))}
            </div>
          </div>

          {/* Personal input */}
          <div className="card card-pad" style={{ borderColor: 'rgba(244,162,97,0.3)', background: 'var(--accent-dim)' }}>
            <h2 className="section-title">
              🌟 Your Personal Input
              <span className="badge badge-accent" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>Important</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.75rem' }}>
              Add a real experience, observation, or note. The AI will never fabricate this — it must come from you.
            </p>
            <textarea
              className="form-textarea"
              placeholder="E.g. I actually visited a handloom workshop in Bangalore last month and the weaver showed me how they pre-calculate warp thread spacing..."
              value={personalInput}
              onChange={e => setPersonalInput(e.target.value)}
              style={{ minHeight: '80px', background: 'rgba(244,162,97,0.05)', borderColor: 'rgba(244,162,97,0.2)' }}
            />
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Actions */}
          <div className="card card-pad">
            <h2 className="section-title">Decision</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button className="btn btn-success" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => { setStatus('approved'); setShowReject(false) }}>
                ✅ Approve & Add to Calendar
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                💾 Save Draft
              </button>
              <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowReject(true)}>
                ❌ Reject
              </button>
            </div>

            {showReject && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>Rejection reason (required):</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {REJECTION_REASONS.map(r => (
                    <button key={r} onClick={() => { setRejectReason(r); setStatus('rejected'); setShowReject(false) }}
                      style={{ textAlign: 'left', padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
                        background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--red)', cursor: 'pointer' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {status === 'rejected' && rejectReason && (
              <p style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: '0.75rem' }}>Rejected: {rejectReason}</p>
            )}
          </div>

          {/* Carousel outline */}
          <div className="card card-pad">
            <h2 className="section-title">Carousel Outline</h2>
            {[
              { n: 1, type: 'Cover', text: 'Bold headline — craft + code' },
              { n: 2, type: 'Context', text: 'What is CLO3D? Why artisans?' },
              { n: 3, type: 'Insight', text: 'How digital prototyping changes timelines' },
              { n: 4, type: 'Example', text: 'Real case: warp thread calculation' },
              { n: 5, type: 'POV', text: 'Pranavi\'s perspective — CS in fashion' },
              { n: 6, type: 'CTA', text: 'What do you think? Follow for more' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)',
                  fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.n}
                </span>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600 }}>{s.type}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{s.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fact check */}
          <div className="card card-pad-sm" style={{ background: 'var(--yellow-dim)', borderColor: 'rgba(251,191,36,0.3)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--yellow)', fontWeight: 600 }}>⚠️ Fact Check Pending</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '0.25rem' }}>
              Verify CLO3D physics engine claim before publishing.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
