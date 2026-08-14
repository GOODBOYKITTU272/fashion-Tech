'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',           icon: '⚡', label: "Today's Inbox" },
  { href: '/editor',     icon: '✏️', label: 'Post Editor'   },
  { href: '/calendar',   icon: '📅', label: 'Calendar'      },
  { href: '/analytics',  icon: '📊', label: 'Analytics'     },
  { href: '/settings',   icon: '⚙️', label: 'Settings'      },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h1>Pranavi CE</h1>
          <p>Code × Craft × Design</p>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-item ${pathname === n.href ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p><strong>Pranavi</strong></p>
          <p>Fashion Content Engine v1</p>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      <div className={`mobile-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      {/* MAIN */}
      <div className="main-content">
        {/* MOBILE HEADER */}
        <header className="mobile-header">
          <span className="mobile-logo">Pranavi CE</span>
          <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
        </header>

        {children}

        {/* BOTTOM NAV (mobile) */}
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} className={`bottom-nav-item ${pathname === n.href ? 'active' : ''}`}>
                <span className="nav-icon">{n.icon}</span>
                {n.label.split(' ')[0]}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
