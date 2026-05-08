import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import Navbar from '../components/Navbar.jsx'
import BookingModal from '../components/BookingModal.jsx'

export default function HomePage() {
  const [tables, setTables] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [settings, setSettings] = useState({})
  const [showBook, setShowBook] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [t, l, s] = await Promise.all([
        supabase.from('tables').select('*').order('type').order('name'),
        supabase.from('leaderboard').select('*').order('hours_played', { ascending: false }).limit(10),
        supabase.from('admin_settings').select('*'),
      ])
      if (t.data) setTables(t.data)
      if (l.data) setLeaderboard(l.data)
      if (s.data) {
        const obj = {}
        s.data.forEach(r => { obj[r.key] = r.value })
        setSettings(obj)
      }
      setLoading(false)
    }
    load()

    // Realtime: update table availability live
    const sub = supabase
      .channel('tables-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, payload => {
        setTables(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [])

  const miniSnooker = tables.filter(t => t.type === 'Mini Snooker')
  const pool = tables.filter(t => t.type === 'Pool')

  const tierColor = (tier) => tier === 'gold' ? '#f59e0b' : tier === 'silver' ? '#9ca3af' : '#b45309'
  const tierEmoji = (tier) => tier === 'gold' ? '🥇' : tier === 'silver' ? '🪙' : '🥉'
  const rankDisplay = (i) => i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
  const rankBg = (i) => i === 0 ? 'linear-gradient(135deg,#b45309,#78350f)' : i === 1 ? 'linear-gradient(135deg,#374151,#1f2937)' : i === 2 ? 'linear-gradient(135deg,#92400e,#78350f)' : '#111d16'

  if (loading) return <div className="loader">LOADING...</div>

  return (
    <div>
      <Navbar settings={settings} />

      {/* ── Hero ── */}
      <section style={{
        textAlign: 'center', padding: '56px 20px 40px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #0b2d18 0%, #080e0a 75%)'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: '#0d2418', border: '1px solid #1a4428',
          color: '#5cb87a', fontSize: 12, fontWeight: 600,
          padding: '6px 14px', borderRadius: 20, marginBottom: 20, letterSpacing: '.5px'
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.8s infinite', display: 'inline-block' }} />
          Online booking • {settings.hours || '12 PM – 12 AM'}
        </div>

        <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(54px,13vw,92px)', lineHeight: .95, color: '#e8f5ec', marginBottom: 14 }}>
          Reserve Your<br />
          <span style={{ color: 'var(--green)' }}>Table</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 380, margin: '0 auto 28px', lineHeight: 1.65 }}>
          Book a pool or snooker table online.<br />Pay via UPI & your slot is confirmed instantly.
        </p>
        <button className="btn-green" onClick={() => setShowBook(true)}
          style={{ fontSize: 16, padding: '15px 34px', borderRadius: 12 }}>
          🎱 Book Your Table Now
        </button>

        <div style={{
          width: 74, height: 74, borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 36%, #1e1e1e, #000)',
          border: '2px solid #1a1a1a', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: "'Bebas Neue', cursive",
          fontSize: 30, color: 'white', margin: '44px auto 8px',
          boxShadow: '0 0 50px rgba(34,197,94,.15)'
        }}>8</div>
        <div style={{ color: '#1e3228', fontSize: 11, letterSpacing: 5, textTransform: 'uppercase' }}>
          Rack 'em up.
        </div>
      </section>

      {/* ── Leaderboard ── */}
      <section style={{ padding: '32px 20px', maxWidth: 620, margin: '0 auto' }}>
        <div className="card">
          <div className="section-title">🏆 Leaderboard — Top 10</div>
          {leaderboard.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < leaderboard.length - 1 ? '1px solid #111d16' : 'none' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: rankBg(i), display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontFamily: "'Bebas Neue', cursive",
                fontSize: i < 3 ? 16 : 14, color: i < 3 ? '#fde68a' : 'var(--text-dim)'
              }}>
                {rankDisplay(i)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 15 }}>{p.player_name}</div>
                <div style={{ fontSize: 12, color: tierColor(p.tier), marginTop: 2 }}>
                  {tierEmoji(p.tier)} {p.tier}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, color: 'var(--green)' }}>{p.hours_played}h</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>played</div>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>No players yet — add via admin panel</div>
          )}
        </div>
      </section>

      {/* ── Table Availability ── */}
      <section style={{ padding: '0 20px 32px', maxWidth: 620, margin: '0 auto' }}>
        <div className="card">
          <div className="section-title">Table Availability</div>

          {miniSnooker.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                🟡 Mini Snooker
              </div>
              {miniSnooker.map(t => <TableRow key={t.id} table={t} onBook={() => setShowBook(true)} />)}
            </>
          )}

          {pool.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginTop: 18, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                🎱 Pool
              </div>
              {pool.map(t => <TableRow key={t.id} table={t} onBook={() => setShowBook(true)} />)}
            </>
          )}
        </div>
      </section>

      {/* ── Find Us ── */}
      <section style={{ padding: '0 20px 32px', maxWidth: 620, margin: '0 auto' }}>
        <div className="section-title">📍 Find Us</div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>📍</span>
          <div>
            <div style={{ fontWeight: 600 }}>{settings.address || 'CUE Pool & Snooker Club'}</div>
            <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--green)', marginTop: 4, display: 'block' }}>
              Open in Google Maps →
            </a>
          </div>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: 20, color: '#1e3228', fontSize: 12, borderTop: '1px solid var(--border)' }}>
        © 2026 {settings.clubName || 'CUE8'} Pool & Snooker Club — All rights reserved.
      </footer>

      {showBook && <BookingModal onClose={() => setShowBook(false)} />}
    </div>
  )
}

function TableRow({ table, onBook }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #111d16' }}>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{table.name}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>₹{table.price_per_hour}/hr</div>
        <button onClick={onBook} style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 12, padding: 0, marginTop: 4, cursor: 'pointer' }}>
          Book future slot →
        </button>
      </div>
      <span className={table.is_available ? 'badge badge-green' : 'badge badge-orange'}>
        {table.is_available ? 'Available' : 'Busy Now'}
      </span>
    </div>
  )
}
