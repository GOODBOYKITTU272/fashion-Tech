'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'

export default function ZernioAnalytics() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: metrics } = await supabase
        .from('post_metrics')
        .select(`
          *,
          published_posts (
            linkedin_post_url,
            content_calendar (
              content_ideas (
                topic
              )
            )
          )
        `)
        .order('snapshot_at', { ascending: false })
      
      if (metrics) setData(metrics)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return <div style={{ padding: '2rem' }}>Loading native metrics...</div>
  if (data.length === 0) return null

  // Calculate aggregates
  const totalPosts = data.length
  let totalReach = 0
  let totalLikes = 0
  let totalComments = 0
  let totalFollowers = data[0]?.followers_total || 0

  data.forEach(m => {
    totalReach += m.reach || m.impressions || 0
    totalLikes += m.reactions || 0
    totalComments += m.comments || 0
  })

  const totalEngagements = totalLikes + totalComments
  const avgER = totalReach > 0 ? ((totalEngagements / totalReach) * 100).toFixed(2) : 0

  // Chart data
  const chartData = data.map((m, i) => ({
    name: new Date(m.snapshot_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Posts: 1,
    Likes: m.reactions || 0,
    Engagement: m.reactions + m.comments,
    original: m
  })).reverse() // chronological

  const topPost = data.sort((a, b) => ((b.reach || b.impressions || 0) - (a.reach || a.impressions || 0)))[0]

  return (
    <div style={{ marginTop: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-primary)', margin: 0 }}>Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>View post performance metrics</p>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Engagement rate</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 600, margin: 0 }}>{avgER}%</p>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Total reach</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 600, margin: 0 }}>{totalReach.toLocaleString()}</p>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Total followers</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 600, margin: 0 }}>{totalFollowers.toLocaleString()}</p>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Posts this period</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 600, margin: 0 }}>{totalPosts}</p>
        </div>
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Best post</p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>{topPost?.reactions || 0}</p>
            <a href={topPost?.published_posts?.linkedin_post_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>View ↗</a>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.2rem 0' }}>Posts per platform</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2rem 0' }}>Top 1 by post count in this window</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{name: 'LinkedIn', Posts: totalPosts}]}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                <Bar dataKey="Posts" fill="#2d64bc" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.2rem 0' }}>Posts over time</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2rem 0' }}>Posts per week · last 30 days</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                <Bar dataKey="Posts" fill="#2d64bc" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.2rem 0' }}>Likes per platform</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2rem 0' }}>Top 1 platforms by likes in this window</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 12, height: 12, background: '#2d64bc', borderRadius: 2 }}></div>
              <span style={{ fontSize: '0.9rem' }}>LinkedIn</span>
            </div>
            <span style={{ fontWeight: 600 }}>{totalLikes}</span>
          </div>
        </div>
        
        <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.2rem 0' }}>Likes over time</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2rem 0' }}>Likes per week · last 30 days</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                <Bar dataKey="Likes" fill="#2d64bc" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Engagement over time */}
      <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.2rem 0' }}>Engagement over time</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2rem 0' }}>Per week · last 30 days</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.8rem' }}>
             <div>❤️ {totalLikes} Likes</div>
             <div>💬 {totalComments} Comments</div>
             <div>🔄 0 Shares</div>
             <div>👁️ {totalReach} Views</div>
             <div>📈 {avgER}% ER</div>
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
              <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
              <Line type="monotone" dataKey="Engagement" stroke="#00b4d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap & Follower Evolution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.2rem 0' }}>Best Time to Post</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2rem 0' }}>Based on engagement hotspots</p>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: '4px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gathering time-series data...</p>
          </div>
        </div>
        <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.2rem 0' }}>Follower evolution</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 2rem 0' }}>Followers per account · top 1</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                <Tooltip />
                <Line type="stepAfter" dataKey="original.followers_total" stroke="#2d64bc" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0' }}>Platform Breakdown</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', fontWeight: 500 }}>Platform</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Posts</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Likes</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Comments</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Shares</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Saves</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Views</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Impr.</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Reach</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>ER</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>in LinkedIn</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{totalPosts}</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{totalLikes}</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{totalComments}</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>0</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>0</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>0</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{data.reduce((a,c) => a + (c.impressions||0), 0)}</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{totalReach}</td>
              <td style={{ padding: '1rem 0.75rem', textAlign: 'right', color: '#28a745', fontWeight: 600 }}>{avgER}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Top Performing Posts Table */}
      <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '2rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0' }}>Top Performing Posts</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', fontWeight: 500 }}>Post</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Likes</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Comments</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Shares</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Saves</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Views</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Impr.</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Reach</th>
              <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>ER</th>
            </tr>
          </thead>
          <tbody>
            {data.map(m => {
              const snippet = m.published_posts?.content_calendar?.content_ideas?.topic || "LinkedIn Post"
              const er = m.reach > 0 ? (((m.reactions + m.comments) / m.reach) * 100).toFixed(2) : "0.00"
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem 0.75rem', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <a href={m.published_posts?.linkedin_post_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {snippet}
                    </a>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {new Date(m.snapshot_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{m.reactions || 0}</td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{m.comments || 0}</td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{m.reposts || 0}</td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{m.saves || 0}</td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{m.views || 0}</td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{m.impressions || 0}</td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>{m.reach || 0}</td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'right', color: '#28a745', fontWeight: 600 }}>{er}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
