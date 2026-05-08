import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const TABS = [
  ['revenue',     '💰 Revenue'],
  ['bookings',    '📋 Bookings'],
  ['tables',      '🎱 Tables'],
  ['leaderboard', '🏆 Leaderboard'],
  ['settings',    '⚙️ Settings'],
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('revenue')
  const navigate = useNavigate()

  const logout = () => {
    sessionStorage.removeItem('cue8_admin')
    navigate('/')
  }

  return (
    <div className="admin-wrap">
      <div className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.jpg" alt="Logo" style={{ height: 32, borderRadius: 6, objectFit: 'contain' }} />
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Admin Panel</span>
        </div>
        <button className="btn-ghost" onClick={logout}>Logout</button>
      </div>
      <div className="admin-tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="admin-body">
        {tab === 'revenue'     && <RevenuePanel />}
        {tab === 'bookings'    && <BookingsPanel />}
        {tab === 'tables'      && <TablesPanel />}
        {tab === 'leaderboard' && <LeaderboardPanel />}
        {tab === 'settings'    && <SettingsPanel />}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   REVENUE PANEL
───────────────────────────────────────────── */
function RevenuePanel() {
  const [bookings, setBookings] = useState([])
  const [tables, setTables]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  const reload = async () => {
    const [b, t] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('tables').select('*'),
    ])
    if (b.data) setBookings(b.data)
    if (t.data) setTables(t.data)
  }

  useEffect(() => {
    reload().then(() => setLoading(false))
  }, [])

  // ── Auto-reset today's bookings at midnight ──
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        // Midnight hit — delete today's (yesterday's) paid bookings
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yDate = yesterday.toLocaleDateString('en-GB')
        supabase.from('bookings').delete()
          .eq('date', yDate)
          .eq('payment_status', 'paid')
          .then(() => reload())
      }
    }
    const timer = setInterval(checkMidnight, 60000) // check every minute
    return () => clearInterval(timer)
  }, [])

  if (loading) return <div className="empty-state">Loading revenue data...</div>

  const paid = bookings.filter(b => b.payment_status === 'paid')
  const pending = bookings.filter(b => b.payment_status === 'pending' && b.status !== 'cancelled')

  // Today
  const today = new Date().toLocaleDateString('en-GB')
  const todayPaid = paid.filter(b => b.date === today)

  // This week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekPaid = paid.filter(b => {
    const [d, m, y] = b.date.split('/'); return new Date(`${y}-${m}-${d}`) >= weekAgo
  })

  // This month
  const now = new Date()
  const monthPaid = paid.filter(b => {
    const [d, m, y] = b.date.split('/'); return parseInt(m) === now.getMonth() + 1 && parseInt(y) === now.getFullYear()
  })

  const sum = arr => arr.reduce((a, b) => a + (b.amount || 0), 0)

  // Per table revenue
  const tableRevenue = tables.map(t => ({
    id: t.id,
    name: t.name,
    type: t.type,
    total: sum(paid.filter(b => b.table_id === t.id)),
    bookings: paid.filter(b => b.table_id === t.id).length,
  })).sort((a, b) => b.total - a.total)

  // Online vs Cash
  const onlinePaid = paid.filter(b => b.payment_method === 'online')
  const cashPaid   = paid.filter(b => b.payment_method === 'cash')

  // ── Reset handler ──
  const handleReset = async (key) => {
    if (resetConfirm !== key) {
      setResetConfirm(key)
      setResetMsg('')
      // Auto-cancel confirmation after 4 seconds
      setTimeout(() => setResetConfirm(prev => prev === key ? '' : prev), 4000)
      return
    }
    setResetConfirm('')
    try {
      if (key === 'today') {
        for (const b of todayPaid) await supabase.from('bookings').delete().eq('id', b.id)
        setResetMsg(`✓ ${todayPaid.length} today's bookings cleared`)
      } else if (key === 'week') {
        for (const b of weekPaid) await supabase.from('bookings').delete().eq('id', b.id)
        setResetMsg(`✓ ${weekPaid.length} this week's bookings cleared`)
      } else if (key === 'month') {
        for (const b of monthPaid) await supabase.from('bookings').delete().eq('id', b.id)
        setResetMsg(`✓ ${monthPaid.length} this month's bookings cleared`)
      } else if (key === 'all') {
        await supabase.from('bookings').delete().eq('payment_status', 'paid')
        setResetMsg(`✓ All ${paid.length} paid bookings cleared`)
      } else if (key === 'online') {
        for (const b of onlinePaid) await supabase.from('bookings').delete().eq('id', b.id)
        setResetMsg(`✓ ${onlinePaid.length} online payment records cleared`)
      } else if (key === 'cash') {
        for (const b of cashPaid) await supabase.from('bookings').delete().eq('id', b.id)
        setResetMsg(`✓ ${cashPaid.length} cash payment records cleared`)
      } else if (key.startsWith('table_')) {
        const tableId = parseInt(key.replace('table_', ''))
        const tBookings = paid.filter(b => b.table_id === tableId)
        for (const b of tBookings) await supabase.from('bookings').delete().eq('id', b.id)
        const tName = tables.find(t => t.id === tableId)?.name || 'Table'
        setResetMsg(`✓ ${tBookings.length} bookings for ${tName} cleared`)
      }
      await reload()
    } catch (e) {
      setResetMsg('❌ Reset failed: ' + (e.message || 'Unknown error'))
    }
    setTimeout(() => setResetMsg(''), 5000)
  }

  const resetBtn = (resetKey) => (
    <button
      onClick={() => handleReset(resetKey)}
      style={{
        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
        background: resetConfirm === resetKey ? '#2a0a0a' : 'transparent',
        border: `1px solid ${resetConfirm === resetKey ? '#dc2626' : '#2a2a2a'}`,
        color: resetConfirm === resetKey ? '#fca5a5' : '#3a5e48',
        cursor: 'pointer', transition: 'all .2s ease', marginTop: 6,
      }}
    >
      {resetConfirm === resetKey ? '⚠️ Confirm?' : '↺ Reset'}
    </button>
  )

  const statCard = (label, value, sub, color = 'var(--green)', resetKey) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', flex: 1, minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{label}</div>
        {resetKey === 'today' && (
          <span style={{ fontSize: 9, color: '#3a5e48', background: '#0a1a10', padding: '2px 6px', borderRadius: 4 }}>auto-resets</span>
        )}
      </div>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 32, color, lineHeight: 1 }}>₹{value.toLocaleString()}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
      {resetKey && resetBtn(resetKey)}
    </div>
  )

  return (
    <div>
      <div className="panel-header"><h2>Revenue Dashboard</h2></div>

      {/* Reset feedback */}
      {resetMsg && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13,
          background: resetMsg.startsWith('✓') ? '#0b1f14' : '#1f0b0b',
          border: `1px solid ${resetMsg.startsWith('✓') ? '#1a4428' : '#4a1515'}`,
          color: resetMsg.startsWith('✓') ? 'var(--green)' : '#ef4444',
          animation: 'fadeUp .3s ease',
        }}>
          {resetMsg}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {statCard('Today', sum(todayPaid), `${todayPaid.length} bookings`, 'var(--green)', 'today')}
        {statCard('This Week', sum(weekPaid), `${weekPaid.length} bookings`, '#f59e0b', 'week')}
        {statCard('This Month', sum(monthPaid), `${monthPaid.length} bookings`, '#818cf8', 'month')}
        {statCard('All Time', sum(paid), `${paid.length} paid bookings`, 'var(--green)', 'all')}
      </div>

      {/* Pending cash */}
      {pending.length > 0 && (
        <div style={{ background: '#1a130a', border: '1px solid #5a3a06', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>⏳ Pending Cash Payments</div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: '#f59e0b' }}>
            ₹{sum(pending).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            {pending.length} bookings — go to Bookings tab to mark as paid
          </div>
        </div>
      )}

      {/* Online vs Cash breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>📱 Online Payments</div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: 'var(--green)' }}>₹{sum(onlinePaid).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{onlinePaid.length} transactions</div>
          {resetBtn('online')}
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>💵 Cash Collected</div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: '#f59e0b' }}>₹{sum(cashPaid).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{cashPaid.length} transactions</div>
          {resetBtn('cash')}
        </div>
      </div>

      {/* Per table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, color: 'var(--text)', letterSpacing: 1 }}>
          Revenue by Table
        </div>
      </div>
      {tableRevenue.map(t => (
        <div key={t.name} className="acard" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t.type} • {t.bookings} paid bookings</div>
          </div>
          {/* Revenue bar */}
          <div style={{ flex: 2 }}>
            <div style={{ background: '#111d16', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, background: 'var(--green)',
                width: `${Math.min(100, (t.total / Math.max(1, sum(paid))) * 100)}%`,
                transition: 'width .5s ease'
              }} />
            </div>
          </div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: 'var(--green)', minWidth: 70, textAlign: 'right' }}>
            ₹{t.total.toLocaleString()}
          </div>
          {resetBtn(`table_${t.id}`)}
        </div>
      ))}

      {paid.length === 0 && (
        <div className="empty-state" style={{ marginTop: 20 }}>No paid bookings yet. Revenue will appear here once payments come in.</div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   BOOKINGS PANEL
───────────────────────────────────────────── */
function BookingsPanel() {
  const [bookings, setBookings] = useState([])
  const [tables, setTables]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    async function load() {
      const [b, t] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('tables').select('*'),
      ])
      if (b.data) setBookings(b.data)
      if (t.data) setTables(t.data)
      setLoading(false)
    }
    load()
  }, [])

  const getTable = id => tables.find(t => t.id === id)

  const updateBooking = async (id, updates) => {
    await supabase.from('bookings').update(updates).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const deleteBooking = async (id, name) => {
    if (!confirm(`Delete booking for "${name}"? This cannot be undone.`)) return
    await supabase.from('bookings').delete().eq('id', id)
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  const filtered = filter === 'all' ? bookings
    : filter === 'pending_payment' ? bookings.filter(b => b.payment_status === 'pending' && b.status === 'active')
    : bookings.filter(b => b.status === filter)

  const payBadge = (b) => {
    if (b.payment_status === 'paid')
      return <span className="badge badge-green">{b.payment_method === 'online' ? '📱 Online' : '💵 Cash'} Paid</span>
    if (b.payment_status === 'pending')
      return <span className="badge badge-orange">⏳ Pay at Desk</span>
    return <span className="badge badge-orange">✕ Failed</span>
  }

  const statusBadge = s => {
    if (s === 'active')    return <span className="badge badge-green">active</span>
    if (s === 'completed') return <span className="badge badge-purple">done</span>
    return <span className="badge badge-orange">cancelled</span>
  }

  return (
    <div>
      <div className="panel-header">
        <h2>All Bookings</h2>
        <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>{bookings.length} total</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all', 'All'], ['active', 'Active'], ['pending_payment', '⏳ Pending Payment'], ['completed', 'Done'], ['cancelled', 'Cancelled']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: filter === k ? 'var(--green-btn)' : 'var(--bg-card)',
            border: `1px solid ${filter === k ? 'var(--green-dim)' : 'var(--border)'}`,
            color: filter === k ? '#a3e6b8' : 'var(--text-dim)',
          }}>{l}</button>
        ))}
      </div>

      {loading && <div className="empty-state">Loading...</div>}
      {!loading && filtered.length === 0 && <div className="empty-state">No bookings found.</div>}

      {filtered.map(b => {
        const tbl = getTable(b.table_id)
        return (
          <div key={b.id} className="acard">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div className="acard-name">{b.customer_name}</div>
                <div className="acard-sub">{b.phone}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                  {tbl?.name} • {b.date} at {b.start_time} • {b.booking_type === 'per_game' ? <span style={{ color: '#c4b5fd', fontWeight: 600 }}>🎱 Per Game</span> : `${b.duration_minutes} min`}
                </div>
                <div style={{ marginTop: 6, fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: 'var(--green)' }}>
                  ₹{b.amount || 0}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                {statusBadge(b.status)}
                {payBadge(b)}
              </div>
            </div>
            <div className="row-actions">
              {b.status === 'active' && (
                <>
                  <button className="mini-btn btn-done" onClick={() => updateBooking(b.id, { status: 'completed' })}>✓ Mark Done</button>
                  <button className="mini-btn btn-cancel-action" onClick={() => updateBooking(b.id, { status: 'cancelled' })}>✕ Cancel</button>
                </>
              )}
              {b.payment_status === 'pending' && b.status !== 'cancelled' && (
                <button
                  onClick={() => updateBooking(b.id, { payment_status: 'paid', payment_method: 'cash' })}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#0b2416', border: '1px solid #1a4428', color: 'var(--green)', cursor: 'pointer' }}>
                  💵 Mark Cash Paid
                </button>
              )}
              <button
                onClick={() => deleteBooking(b.id, b.customer_name)}
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#1a0a0a', border: '1px solid #4a1515', color: '#ef4444', cursor: 'pointer' }}>
                🗑 Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   TABLES PANEL
───────────────────────────────────────────── */
function TablesPanel() {
  const [tables, setTables]     = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [newTable, setNewTable] = useState({ name: '', type: 'Pool', price_per_hour: 150 })

  // Game sessions state
  const [addingSession, setAddingSession] = useState(false)
  const [sessErr, setSessErr] = useState('')
  const [endingSession, setEndingSession] = useState(null) // { id, end_time, amount }
  const [newSession, setNewSession] = useState({
    table_id: '', date: new Date().toLocaleDateString('en-GB'),
    start_time: '12:00 PM', price: 100,
  })

  const SESS_TIMES = []
  for (let h = 12; h <= 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 24 && m > 0) break
      const hh = h > 12 ? h - 12 : h === 0 ? 12 : h
      const ap = h >= 12 && h < 24 ? 'PM' : 'AM'
      SESS_TIMES.push(`${hh}:${String(m).padStart(2, '0')} ${ap}`)
    }
  }

  const reload = async () => {
    const [t, s] = await Promise.all([
      supabase.from('tables').select('*').order('name'),
      supabase.from('game_sessions').select('*').order('created_at', { ascending: false }),
    ])
    if (t.data) setTables(t.data)
    if (s.data) setSessions(s.data)
  }

  useEffect(() => {
    reload().then(() => setLoading(false))
  }, [])

  const toggleAvail = async t => {
    await supabase.from('tables').update({ is_available: !t.is_available }).eq('id', t.id)
    setTables(prev => prev.map(x => x.id === t.id ? { ...x, is_available: !x.is_available } : x))
  }

  const deleteTable = async id => {
    if (!confirm('Delete this table?')) return
    await supabase.from('tables').delete().eq('id', id)
    setTables(prev => prev.filter(t => t.id !== id))
    setSessions(prev => prev.filter(s => s.table_id !== id))
  }

  const addTable = async () => {
    if (!newTable.name.trim()) return
    const { data, error } = await supabase.from('tables').insert({
      name: newTable.name.trim().toUpperCase(),
      type: newTable.type,
      price_per_hour: parseInt(newTable.price_per_hour),
      is_available: true,
    }).select().single()
    if (!error && data) {
      setTables(prev => [...prev, data])
      setNewTable({ name: '', type: 'Pool', price_per_hour: 150 })
      setAdding(false)
    }
  }

  // ── Game Session CRUD ──
  const addSession = async () => {
    setSessErr('')
    if (!newSession.table_id) { setSessErr('Please select a table'); return }
    if (!newSession.date.trim()) { setSessErr('Please enter a date'); return }
    const { data, error } = await supabase.from('game_sessions').insert({
      table_id:   parseInt(newSession.table_id),
      date:       newSession.date.trim(),
      start_time: newSession.start_time,
      end_time:   newSession.start_time, // same as start; admin closes manually
      price:      parseInt(newSession.price) || 100,
      status:     'open',
    }).select().single()
    if (error) {
      console.error('addSession error:', error)
      setSessErr(error.message || 'Failed to create session')
      return
    }
    if (data) {
      setSessions(prev => [data, ...prev])
      setAddingSession(false)
      setSessErr('')
    }
  }

  const closeSession = async (id) => {
    await supabase.from('game_sessions').update({ status: 'closed' }).eq('id', id)
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'closed' } : s))
  }

  const endGame = async () => {
    if (!endingSession) return
    const { id, end_time, amount } = endingSession
    const sess = sessions.find(s => s.id === id)
    if (!sess) return
    const finalAmount = parseInt(amount) || 0
    // Update session
    await supabase.from('game_sessions').update({
      status: 'closed', end_time, price: finalAmount,
    }).eq('id', id)
    // Create a booking record
    await supabase.from('bookings').insert({
      table_id:         sess.table_id,
      customer_name:    sess.booked_by || 'Walk-in',
      phone:            '',
      date:             sess.date,
      start_time:       sess.start_time,
      duration_minutes: 0,
      amount:           finalAmount,
      payment_method:   'cash',
      payment_status:   'pending',
      status:           'active',
      booking_type:     'per_game',
      session_id:       id,
    })
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'closed', end_time, price: finalAmount } : s))
    setEndingSession(null)
  }

  const deleteSession = async (id) => {
    if (!confirm('Delete this game session?')) return
    await supabase.from('game_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  const reopenSession = async (id) => {
    await supabase.from('game_sessions').update({ status: 'open', booked_by: null }).eq('id', id)
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'open', booked_by: null } : s))
  }

  const getTableName = (id) => tables.find(t => t.id === id)?.name || 'Table'

  const openSessions  = sessions.filter(s => s.status === 'open')
  const closedSessions = sessions.filter(s => s.status === 'closed')

  return (
    <div>
      {/* ── Tables Section ── */}
      <div className="panel-header">
        <h2>Tables</h2>
        <button className="btn-green" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => setAdding(a => !a)}>+ Add Table</button>
      </div>
      {adding && (
        <div className="add-form">
          <div className="form-grid">
  <div><label className="form-label">Table Name</label><input className="inp-sm" value={newTable.name} onChange={e => setNewTable(n => ({ ...n, name: e.target.value }))} placeholder="e.g. ZEUS" /></div>
  <div><label className="form-label">Type</label>
    <select className="inp-sm" value={newTable.type} onChange={e => setNewTable(n => ({ ...n, type: e.target.value }))}>
      <option>Pool</option><option>Mini Snooker</option>
    </select>
  </div>
  <div><label className="form-label">₹/hr (base)</label><input className="inp-sm" type="number" value={newTable.price_per_hour} onChange={e => setNewTable(n => ({ ...n, price_per_hour: e.target.value }))} /></div>
</div>
<div className="form-grid" style={{ marginTop: 8 }}>
  <div>
    <label className="form-label">₹ for 15 min <span style={{color:'#3a5e48'}}>(blank = auto)</span></label>
    <input className="inp-sm" type="number" value={newTable.price_15 || ''} onChange={e => setNewTable(n => ({ ...n, price_15: e.target.value }))} placeholder="e.g. 60" />
  </div>
  <div>
    <label className="form-label">₹ for 30 min <span style={{color:'#3a5e48'}}>(blank = auto)</span></label>
    <input className="inp-sm" type="number" value={newTable.price_30 || ''} onChange={e => setNewTable(n => ({ ...n, price_30: e.target.value }))} placeholder="e.g. 100" />
  </div>
  <div style={{display:'flex',alignItems:'flex-end'}}>
    <div style={{fontSize:11,color:'#3a5e48',padding:'0 4px'}}>
      Auto calc:<br/>
      15min = ₹{Math.round((newTable.price_per_hour||0)*0.25)}<br/>
      30min = ₹{Math.round((newTable.price_per_hour||0)*0.5)}
    </div>
  </div>
</div>
          <button className="btn-green" style={{ fontSize: 13, padding: '9px 18px' }} onClick={addTable}>Add Table</button>
        </div>
      )}
      {loading && <div className="empty-state">Loading...</div>}
      {tables.map(t => (
        <div key={t.id} className="acard admin-row">
          <div style={{ flex: 1 }}>
            <div className="acard-name">{t.name}</div>
            <div className="acard-sub">{t.type} — ₹{t.price_per_hour}/hr</div>
          </div>
          <button className={`toggle-btn ${t.is_available ? 't-avail' : 't-busy'}`} onClick={() => toggleAvail(t)}>
            {t.is_available ? '● Available' : '● Busy'}
          </button>
          <button className="btn-del" onClick={() => deleteTable(t.id)}>🗑</button>
        </div>
      ))}

      {/* ── Game Sessions Section ── */}
      <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div className="panel-header">
          <h2>🎱 Game Sessions</h2>
          <button className="btn-green" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => setAddingSession(a => !a)}>+ Add Session</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
          Create per-game slots that customers can book. Each session = 1 game on a specific table.
        </div>

        {addingSession && (
          <div className="add-form" style={{ marginBottom: 16 }}>
            <div className="form-grid">
              <div>
                <label className="form-label">Table</label>
                <select className="inp-sm" value={newSession.table_id} onChange={e => setNewSession(n => ({ ...n, table_id: e.target.value }))}>
                  <option value="">Select table...</option>
                  {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Date (DD/MM/YYYY)</label>
                <input className="inp-sm" value={newSession.date} onChange={e => setNewSession(n => ({ ...n, date: e.target.value }))} placeholder="09/05/2026" />
              </div>
              <div>
                <label className="form-label">₹ Price per game</label>
                <input className="inp-sm" type="number" value={newSession.price} onChange={e => setNewSession(n => ({ ...n, price: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 8, maxWidth: 180 }}>
              <label className="form-label">Start Time</label>
              <select className="inp-sm" value={newSession.start_time} onChange={e => setNewSession(n => ({ ...n, start_time: e.target.value }))}>
                {SESS_TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {sessErr && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>❌ {sessErr}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn-green" style={{ fontSize: 13, padding: '9px 18px' }} onClick={addSession}>Create Session</button>
              <button onClick={() => { setAddingSession(false); setSessErr('') }} style={{ fontSize: 13, padding: '9px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Open / Active sessions */}
        {openSessions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', marginBottom: 8 }}>🟢 Active ({openSessions.length})</div>
            {openSessions.map(s => (
              <div key={s.id}>
                <div className="acard" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{getTableName(s.table_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {s.booked_by && <span style={{ color: '#c4b5fd' }}>{s.booked_by} • </span>}
                      Started {s.start_time} • {s.date}
                    </div>
                  </div>
                  <button
                    onClick={() => setEndingSession(endingSession?.id === s.id ? null : { id: s.id, end_time: '12:00 PM', amount: '' })}
                    style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: '#0f2e1c', border: '1px solid var(--green-dim)', color: 'var(--green)', cursor: 'pointer' }}
                  >
                    {endingSession?.id === s.id ? 'Cancel' : '⏹ End Game'}
                  </button>
                  <button className="btn-del" onClick={() => deleteSession(s.id)}>🗑</button>
                </div>
                {/* Inline End Game form */}
                {endingSession?.id === s.id && (
                  <div style={{ background: '#0b1f14', border: '1px solid #1a4428', borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 10 }}>End Game — {getTableName(s.table_id)} ({s.booked_by})</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div>
                        <label className="form-label">End Time</label>
                        <select className="inp-sm" value={endingSession.end_time} onChange={e => setEndingSession(es => ({ ...es, end_time: e.target.value }))}>
                          {SESS_TIMES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">₹ Final Amount</label>
                        <input className="inp-sm" type="number" placeholder="e.g. 150" value={endingSession.amount} onChange={e => setEndingSession(es => ({ ...es, amount: e.target.value }))} style={{ width: 100 }} />
                      </div>
                      <button className="btn-green" style={{ fontSize: 13, padding: '8px 16px' }} onClick={endGame}>✓ Confirm End</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Closed / booked sessions */}
        {closedSessions.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>🔴 Closed / Booked ({closedSessions.length})</div>
            {closedSessions.map(s => (
              <div key={s.id} className="acard" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, opacity: 0.7 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{getTableName(s.table_id)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {s.date} • {s.start_time}
                    {s.booked_by && <span style={{ color: '#818cf8' }}> • booked by {s.booked_by}</span>}
                  </div>
                </div>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, color: 'var(--text-dim)', minWidth: 50, textAlign: 'right' }}>
                  ₹{s.price}
                </div>
                <button onClick={() => reopenSession(s.id)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#0b2416', border: '1px solid #1a4428', color: 'var(--green)', cursor: 'pointer' }}>
                  Reopen
                </button>
                <button className="btn-del" onClick={() => deleteSession(s.id)}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {sessions.length === 0 && !loading && (
          <div className="empty-state">No game sessions yet. Create one above to let customers book per game.</div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   LEADERBOARD PANEL
───────────────────────────────────────────── */
function LeaderboardPanel() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [newP, setNewP]       = useState({ player_name: '', hours_played: 0, tier: 'silver' })

  useEffect(() => {
    supabase.from('leaderboard').select('*').order('hours_played', { ascending: false }).then(({ data }) => {
      if (data) setPlayers(data); setLoading(false)
    })
  }, [])

  const update = async (id, field, value) => {
    await supabase.from('leaderboard').update({ [field]: value }).eq('id', id)
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p).sort((a, b) => b.hours_played - a.hours_played))
  }

  const deletePlayer = async id => {
    await supabase.from('leaderboard').delete().eq('id', id)
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  const addPlayer = async () => {
    if (!newP.player_name.trim()) return
    const { data, error } = await supabase.from('leaderboard').insert({
      player_name: newP.player_name.trim(),
      hours_played: parseFloat(newP.hours_played) || 0,
      tier: newP.tier,
    }).select().single()
    if (!error && data) {
      setPlayers(prev => [...prev, data].sort((a, b) => b.hours_played - a.hours_played))
      setNewP({ player_name: '', hours_played: 0, tier: 'silver' })
      setAdding(false)
    }
  }

  return (
    <div>
      <div className="panel-header">
        <h2>Leaderboard</h2>
        <button className="btn-green" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => setAdding(a => !a)}>+ Add Player</button>
      </div>
      {adding && (
        <div className="add-form">
          <div className="form-grid">
            <div><label className="form-label">Player Name</label><input className="inp-sm" value={newP.player_name} onChange={e => setNewP(n => ({ ...n, player_name: e.target.value }))} placeholder="Name" /></div>
            <div><label className="form-label">Hours Played</label><input className="inp-sm" type="number" step="0.5" value={newP.hours_played} onChange={e => setNewP(n => ({ ...n, hours_played: e.target.value }))} /></div>
            <div><label className="form-label">Tier</label>
              <select className="inp-sm" value={newP.tier} onChange={e => setNewP(n => ({ ...n, tier: e.target.value }))}>
                <option value="gold">Gold</option><option value="silver">Silver</option><option value="bronze">Bronze</option>
              </select>
            </div>
          </div>
          <button className="btn-green" style={{ fontSize: 13, padding: '9px 18px' }} onClick={addPlayer}>Add Player</button>
        </div>
      )}
      {loading && <div className="empty-state">Loading...</div>}
      {players.map((p, i) => (
        <div key={p.id} className="acard admin-row">
          <span style={{ color: 'var(--text-dim)', fontFamily: "'Bebas Neue',cursive", fontSize: 20, width: 30 }}>#{i + 1}</span>
          <input className="inp-sm" value={p.player_name} onChange={e => update(p.id, 'player_name', e.target.value)} style={{ flex: 1, minWidth: 100 }} />
          <input className="inp-sm" type="number" step="0.5" value={p.hours_played} onChange={e => update(p.id, 'hours_played', parseFloat(e.target.value))} style={{ width: 80 }} />
          <select className="inp-sm" value={p.tier} onChange={e => update(p.id, 'tier', e.target.value)} style={{ width: 110 }}>
            <option value="gold">🥇 Gold</option><option value="silver">🪙 Silver</option><option value="bronze">🥉 Bronze</option>
          </select>
          <button className="btn-del" onClick={() => deletePlayer(p.id)}>🗑</button>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SETTINGS PANEL
───────────────────────────────────────────── */
function SettingsPanel() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const [saved, setSaved]       = useState(false)
  const [resetting, setResetting] = useState('')
  const [resetMsg, setResetMsg]   = useState('')

  useEffect(() => {
    supabase.from('admin_settings').select('*').then(({ data }) => {
      if (data) { const obj = {}; data.forEach(r => { obj[r.key] = r.value }); setSettings(obj) }
      setLoading(false)
    })
  }, [])

  const set = (k, v) => { setSettings(s => ({ ...s, [k]: v })); setSaved(false) }

  const save = async () => {
    const upserts = Object.entries(settings).map(([key, value]) => ({ key, value }))
    await supabase.from('admin_settings').upsert(upserts, { onConflict: 'key' })
    setSaved(true)
  }

  const doReset = async (type) => {
    const messages = {
      bookings: 'DELETE all bookings? This cannot be undone!',
      leaderboard: 'RESET all leaderboard hours to 0? This cannot be undone!',
      tables: 'Set ALL tables to Available?',
      everything: '⚠️ NUCLEAR RESET: Delete ALL bookings, reset leaderboard hours to 0, and set all tables to Available? THIS CANNOT BE UNDONE!',
    }
    if (!confirm(messages[type])) return
    if (type === 'everything' && !confirm('Are you ABSOLUTELY sure? This will wipe all data!')) return

    setResetting(type)
    setResetMsg('')
    try {
      if (type === 'bookings' || type === 'everything') {
        await supabase.from('bookings').delete().neq('id', 0)
      }
      if (type === 'leaderboard' || type === 'everything') {
        await supabase.from('leaderboard').update({ hours_played: 0 }).neq('id', 0)
      }
      if (type === 'tables' || type === 'everything') {
        await supabase.from('tables').update({ is_available: true }).neq('id', 0)
      }
      const msgs = {
        bookings: '✓ All bookings deleted.',
        leaderboard: '✓ Leaderboard hours reset to 0.',
        tables: '✓ All tables set to Available.',
        everything: '✓ Full reset complete — bookings cleared, leaderboard zeroed, tables available.',
      }
      setResetMsg(msgs[type])
    } catch (e) {
      setResetMsg('❌ Reset failed: ' + (e.message || 'Unknown error'))
    }
    setResetting('')
  }

  if (loading) return <div className="empty-state">Loading...</div>

  const dangerBtn = (label, emoji, desc, type, color = '#ef4444') => (
    <button
      onClick={() => doReset(type)}
      disabled={!!resetting}
      style={{
        width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: 10,
        background: resetting === type ? '#1a1a1a' : '#1a0a0a',
        border: `1px solid ${color}22`,
        color: 'var(--text)', cursor: resetting ? 'not-allowed' : 'pointer',
        textAlign: 'left', opacity: resetting && resetting !== type ? 0.4 : 1,
        transition: 'all .2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22 }}>{emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color }}>{label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{desc}</div>
        </div>
        {resetting === type && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Resetting...</span>}
      </div>
    </button>
  )

  return (
    <div>
      <div className="panel-header"><h2>Club Settings</h2></div>
      <div className="acard">
        {[['clubName', 'Club Name'], ['hours', 'Booking Hours'], ['phone', 'Contact Phone'], ['address', 'Club Address']].map(([k, label]) => (
          <div key={k} style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{label}</label>
            <input value={settings[k] || ''} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
        <button className="btn-green" onClick={save} style={{ padding: '11px 28px', fontSize: 15 }}>
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
        <div className="save-note" style={{ marginTop: 12 }}>✓ Changes reflect on the public site immediately after saving.</div>
      </div>

      {/* ── Danger Zone ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{
          fontFamily: "'Bebas Neue',cursive", fontSize: 20, color: '#ef4444',
          marginBottom: 14, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8
        }}>
          ⚠️ Danger Zone
        </div>
        <div style={{
          background: '#0d0808', border: '1px solid #2a1515', borderRadius: 14, padding: '18px 16px',
        }}>
          {dangerBtn('Reset All Bookings', '🗑️', 'Delete every booking record permanently', 'bookings')}
          {dangerBtn('Reset Leaderboard', '🏆', 'Set all player hours back to 0', 'leaderboard', '#f59e0b')}
          {dangerBtn('Reset Table Availability', '🎱', 'Set all tables back to Available', 'tables', '#3b82f6')}
          <div style={{ height: 1, background: '#2a1515', margin: '14px 0' }} />
          {dangerBtn('☢️ Full Reset — Everything', '💣', 'Wipe bookings + zero leaderboard + reset tables', 'everything', '#dc2626')}

          {resetMsg && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13,
              background: resetMsg.startsWith('✓') ? '#0b1f14' : '#1f0b0b',
              border: `1px solid ${resetMsg.startsWith('✓') ? '#1a4428' : '#4a1515'}`,
              color: resetMsg.startsWith('✓') ? 'var(--green)' : '#ef4444',
            }}>
              {resetMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
