import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pranavi Fashion Content Engine",
  description: "Code × Craft × Contemporary Design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="dashboard-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div>
              <h2 className="text-gradient-primary">Pranavi</h2>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Content Engine</p>
            </div>
            
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <a href="/" style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--surface-hover)', fontWeight: 500 }}>
                Today's Inbox
              </a>
              <a href="#" style={{ padding: '0.75rem', borderRadius: '8px', color: 'var(--text-muted)' }}>
                Post Editor
              </a>
              <a href="#" style={{ padding: '0.75rem', borderRadius: '8px', color: 'var(--text-muted)' }}>
                Calendar
              </a>
              <a href="#" style={{ padding: '0.75rem', borderRadius: '8px', color: 'var(--text-muted)' }}>
                Analytics
              </a>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
