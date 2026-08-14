export default function Home() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Today's Opportunities</h1>
          <p className="text-muted">Review your top 5 ranked topics and generate drafts.</p>
        </div>
        <button className="btn-primary">Force Sync Sources</button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Mock Topic Card 1 */}
        <article className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Educational • 92/100 Score</span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>The Evolution of Digital Draping in CLO3D</h3>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                Source: The Interline • Freshness: 2hrs ago • High US/UK Relevance
              </p>
            </div>
            <div style={{ background: 'rgba(138, 75, 175, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, color: 'var(--primary)' }}>
              #1
            </div>
          </div>
          
          <p style={{ lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
            Recent updates to physics engines in 3D fashion software are drastically reducing the gap between virtual prototyping and physical garment behavior...
          </p>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary">Generate Draft</button>
            <button style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>Dismiss</button>
          </div>
        </article>

        {/* Mock Topic Card 2 */}
        <article className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Craft Story • 88/100 Score</span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>Reviving Handloom: Rahul Mishra's Latest Collection</h3>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                Source: Vogue Runway • Freshness: 12hrs ago • Perfect Brand Alignment
              </p>
            </div>
            <div style={{ background: 'rgba(227, 166, 122, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, color: 'var(--accent)' }}>
              #2
            </div>
          </div>
          
          <p style={{ lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
            Exploring how traditional Indian artisanship is being positioned on the global haute couture stage, bridging ancient techniques with modern silhouettes...
          </p>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary">Generate Draft</button>
            <button style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}>Dismiss</button>
          </div>
        </article>

      </div>
    </div>
  );
}
