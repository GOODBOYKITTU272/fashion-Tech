'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const AUTHORIZED_EMAIL = 'pranaviyadav57@gmail.com'

const NAV_ITEMS = [
  { href: '/',          label: 'Today',      icon: '⚡' },
  { href: '/calendar',  label: 'Calendar',   icon: '📅' },
  { href: '/editor',    label: 'Create',     icon: '✏️' },
  { href: '/research',  label: 'Research',   icon: '📡' },
  { href: '/analytics', label: 'Analytics',  icon: '📊' },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  // Don't render Shell wrapper for login page
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (isLoginPage) {
      setAuthenticated(false)
      return
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user?.email !== AUTHORIZED_EMAIL) {
        setAuthenticated(false)
        router.replace('/login')
      } else {
        setAuthenticated(true)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || session.user?.email !== AUTHORIZED_EMAIL) {
        setAuthenticated(false)
        if (pathname !== '/login') {
          router.replace('/login')
        }
      } else {
        setAuthenticated(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname, isLoginPage, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  // Show minimal loading state while verifying auth session
  if (authenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Loading Fashion Engine...</p>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="shell-layout">
      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">✧</span>
          <div>
            <p className="brand-name">Code × Craft</p>
            <p className="brand-tagline">Studio Workspace</p>
          </div>
        </div>

        <nav className="nav-list">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}

          <div className="editorial-divider" style={{ margin: '1rem 0' }}></div>

          <Link
            href="/settings"
            className={`nav-item ${pathname.startsWith('/settings') ? 'active' : ''}`}
          >
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">P</div>
          <div className="user-info">
            <p className="user-name">Pranavi</p>
            <p className="user-role">Fashion Design Studio</p>
          </div>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            title="Sign Out"
            style={{ padding: '0.35rem 0.5rem', border: 'none' }}
          >
            🚪
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>✧</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 500 }}>Code × Craft</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="hamburger-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="mobile-drawer">
          <nav className="mobile-nav">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-nav-item ${active ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <Link
              href="/settings"
              className={`mobile-nav-item ${pathname.startsWith('/settings') ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="mobile-nav-item"
              style={{ color: 'var(--danger)', marginTop: '1rem', borderTop: '1px solid var(--border)' }}
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-nav">
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          {NAV_ITEMS.filter(item => item.label !== 'Research').map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`bottom-nav-item ${active ? 'active' : ''}`}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                <span className="bottom-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
