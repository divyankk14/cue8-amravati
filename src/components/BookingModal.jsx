import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const TIMES = []
for (let h = 12; h <= 23; h++) {
  for (let m = 0; m < 60; m += 10) {
    const h12 = h > 12 ? h - 12 : h
    const ap  = h >= 12 ? 'PM' : 'AM'
    TIMES.push(`${h12}:${String(m).padStart(2, '0')} ${ap}`)
  }
}
TIMES.push('12:00 AM')

const DURATIONS = [
  { label: '15 min', mins: 15,  mult: 0.25 },
  { label: '30 min', mins: 30,  mult: 0.5  },
  { label: '1 hr',   mins: 60,  mult: 1    },
  { label: '1h 30m', mins: 90,  mult: 1.5  },
  { label: '2 hrs',  mins: 120, mult: 2    },
  { label: 'Custom', mins: null, mult: null },
]

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src   = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function timeToMins(t) {
  const [time, ap] = t.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (ap === 'PM' && h !== 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function nowTime12() {
  const now = new Date()
  let h = now.getHours(), m = now.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  const mm = String(Math.floor(m / 10) * 10).padStart(2, '0')
  return `${h12}:${mm} ${ap}`
}

async function sendConfirmationSMS({ name, phone, tableName, date, time, duration, cost, method }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return
  let to = phone.replace(/\s+/g, '')
  if (!to.startsWith('+')) to = '+91' + to.replace(/^0/, '')
  const msg =
    `CUE8 Booking Confirmed!\n` +
    `Hi ${name}, your table is booked.\n\n` +
    `Table: ${tableName}\nDate: ${date}\nTime: ${time}\n` +
    `Duration: ${duration}\nAmount: Rs.${cost}\n` +
    `Payment: ${method === 'online' ? 'Paid Online' : 'Pay at Desk'}\n\nSee you soon at CUE8!`
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
      body: JSON.stringify({ to, message: msg }),
    })
  } catch (e) { console.warn('SMS skipped:', e) }
}

export default function BookingModal({ onClose }) {
  const [tables, setTables]         = useState([])
  const [bookingType, setBookingType] = useState('hourly')
  const [form, setForm]             = useState({
    tableId: '', name: '', phone: '',
    date: new Date().toLocaleDateString('en-GB'),
    time: '12:00 PM', duration: '1 hr', customMins: 45,
  })
  const [pgForm, setPgForm]         = useState({ tableId: '', name: '', phone: '' })
  const [step, setStep]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState('')
  const [confirmed, setConfirmed]   = useState(null)
  const [gameStarted, setGameStarted] = useState(null)

  useEffect(() => {
    supabase.from('tables').select('*').order('name').then(({ data }) => {
      if (data) setTables(data)
    })
  }, [])

  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPg = (k, v) => setPgForm(f => ({ ...f, [k]: v }))

  // ── Hourly calc ──
  const selTable = tables.find(t => t.id === parseInt(form.tableId))
  const selDur   = DURATIONS.find(d => d.label === form.duration) || DURATIONS[2]
  const isCustom = selDur.label === 'Custom'
  const durMins  = isCustom ? parseInt(form.customMins) : selDur.mins
  const calcCost = () => {
    if (!selTable) return 0
    if (isCustom) return Math.round(selTable.price_per_hour * (form.customMins / 60))
    if (selDur.label === '15 min' && selTable.price_15) return parseInt(selTable.price_15)
    if (selDur.label === '30 min' && selTable.price_30) return parseInt(selTable.price_30)
    return Math.round(selTable.price_per_hour * selDur.mult)
  }
  const cost = calcCost()

  // ── Double-booking check ──
  const checkConflict = async () => {
    const { data: existing } = await supabase
      .from('bookings').select('start_time, duration_minutes')
      .eq('table_id', parseInt(form.tableId)).eq('date', form.date).eq('status', 'active')
    if (!existing || existing.length === 0) return false
    const newStart = timeToMins(form.time), newEnd = newStart + durMins
    for (const b of existing) {
      const exStart = timeToMins(b.start_time), exEnd = exStart + b.duration_minutes
      if (newStart < exEnd && newEnd > exStart) return true
    }
    return false
  }

  const goToPayment = async () => {
    if (!form.name.trim()) { setErr('Please enter your name'); return }
    if (!form.phone.trim()) { setErr('Please enter your phone'); return }
    if (!form.tableId) { setErr('Please select a table'); return }
    if (isCustom && (!form.customMins || form.customMins < 5)) { setErr('Minimum 5 minutes'); return }
    setErr(''); setLoading(true)
    const conflict = await checkConflict()
    setLoading(false)
    if (conflict) { setErr(`⚠️ ${selTable?.name} is already booked at ${form.time}. Choose another time.`); return }
    setStep(2)
  }

  const saveBooking = async (method, paymentStatus, razorpayId = null) => {
    const conflict = await checkConflict()
    if (conflict) return { error: 'CONFLICT' }
    const payload = {
      table_id: parseInt(form.tableId), customer_name: form.name.trim(),
      phone: form.phone.trim(), date: form.date, start_time: form.time,
      duration_minutes: durMins, amount: cost,
      payment_method: method, payment_status: paymentStatus,
      status: 'active', booking_type: 'hourly',
    }
    if (razorpayId) payload.razorpay_id = razorpayId
    const { data, error } = await supabase.from('bookings').insert(payload).select().single()
    if (error) console.error('Supabase insert error:', error)
    return { data, error }
  }

  const finishBooking = async (method, razorpayId = null) => {
    const { data, error } = await saveBooking(method, method === 'online' ? 'paid' : 'pending', razorpayId)
    if (error === 'CONFLICT') { setErr('⚠️ Someone just booked this slot. Pick another time.'); setStep(1); return }
    if (error) { setErr(`Booking failed: ${error.message || 'Please try again.'}`); return }
    const durLabel = isCustom ? `${form.customMins} min` : selDur.label
    sendConfirmationSMS({ name: form.name, phone: form.phone, tableName: selTable?.name, date: form.date, time: form.time, duration: durLabel, cost, method })
    setConfirmed({ ...form, cost, method, durLabel })
    setStep(3)
  }

  const confirmCash   = async () => { setLoading(true); await finishBooking('cash'); setLoading(false) }
  const confirmOnline = async () => {
    if (!RAZORPAY_KEY) { setErr('Online payments not set up yet. Please pay at the desk.'); return }
    setLoading(true)
    const loaded = await loadRazorpay()
    if (!loaded) { setErr('Payment gateway failed to load.'); setLoading(false); return }
    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY, amount: cost * 100, currency: 'INR',
      name: 'CUE8 Pool & Snooker',
      description: `${selTable?.name} – ${isCustom ? form.customMins + ' min' : selDur.label}`,
      prefill: { name: form.name, contact: form.phone },
      theme: { color: '#22c55e' },
      handler: async (res) => { await finishBooking('online', res.razorpay_payment_id); setLoading(false) },
      modal: { ondismiss: () => setLoading(false) }
    })
    rzp.on('payment.failed', () => { setLoading(false); setErr('Payment failed. Try again or pay at the desk.') })
    rzp.open()
  }

  // ── Per Game: Start session (with conflict check) ──
  const startGame = async () => {
    if (!pgForm.name.trim()) { setErr('Please enter your name'); return }
    if (!pgForm.phone.trim()) { setErr('Please enter your phone'); return }
    if (!pgForm.tableId) { setErr('Please select a table'); return }
    setErr(''); setLoading(true)

    const startTime = nowTime12()
    const today = new Date().toLocaleDateString('en-GB')
    const startMins = timeToMins(startTime)

    // Check for conflicting hourly bookings on this table right now
    const { data: existing } = await supabase
      .from('bookings')
      .select('start_time, duration_minutes, customer_name')
      .eq('table_id', parseInt(pgForm.tableId))
      .eq('date', today)
      .eq('status', 'active')

    if (existing) {
      for (const b of existing) {
        const bStart = timeToMins(b.start_time)
        const bEnd   = bStart + (b.duration_minutes || 60)
        if (startMins >= bStart && startMins < bEnd) {
          setLoading(false)
          setErr(`⚠️ This table is booked until approx. ${b.start_time} + ${b.duration_minutes} min (${b.customer_name}). Try another table.`)
          return
        }
      }
    }

    // Also check if there's already an open session on this table
    const { data: openSess } = await supabase
      .from('game_sessions')
      .select('id, booked_by')
      .eq('table_id', parseInt(pgForm.tableId))
      .eq('status', 'open')

    if (openSess && openSess.length > 0) {
      setLoading(false)
      setErr(`⚠️ This table already has an active game session (${openSess[0].booked_by}). Please choose another table.`)
      return
    }

    const { data, error } = await supabase.from('game_sessions').insert({
      table_id:   parseInt(pgForm.tableId),
      date:       today,
      start_time: startTime,
      end_time:   startTime,
      price:      0,
      status:     'open',
      booked_by:  pgForm.name.trim(),
    }).select().single()
    setLoading(false)
    if (error) { setErr(`Failed to start session: ${error.message}`); return }
    setGameStarted({ name: pgForm.name, phone: pgForm.phone, tableName: tables.find(t => t.id === parseInt(pgForm.tableId))?.name, startTime, date: today })
  }

  // ── Styles ──
  const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px 24px', overflowY: 'auto' }
  const box      = { background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 420, animation: 'fadeUp .3s ease' }
  const lbl      = { fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }
  const closeBtn = { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer' }

  // ── Per Game success screen ──
  if (gameStarted) return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...box, textAlign: 'center', padding: '36px 24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>🎱</div>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 32, color: '#c4b5fd', marginBottom: 10 }}>Game On!</div>
        <div style={{ color: 'var(--text-muted)', lineHeight: 2, fontSize: 14 }}>
          <b style={{ color: 'var(--text)' }}>{gameStarted.name}</b><br />
          {gameStarted.tableName} • Started at {gameStarted.startTime}<br />
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Admin will record end time & amount when done</span>
        </div>
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#150d28', border: '1px solid #7c3aed44', borderRadius: 10, fontSize: 12, color: '#c4b5fd' }}>
          💡 Show your name to the staff — they will finalize your bill at the end
        </div>
        <button className="btn-green" onClick={onClose} style={{ marginTop: 20, width: '100%', padding: 13, fontSize: 15 }}>Got it!</button>
      </div>
    </div>
  )

  // ── Step 3: Hourly success ──
  if (step === 3) return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...box, textAlign: 'center', padding: '36px 24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>{confirmed?.method === 'online' ? '🎉' : '✅'}</div>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 32, color: 'var(--green)', marginBottom: 10 }}>Booking Confirmed!</div>
        <div style={{ color: 'var(--text-muted)', lineHeight: 2, fontSize: 14 }}>
          <b style={{ color: 'var(--text)' }}>{confirmed?.name}</b><br />
          {selTable?.name} • {confirmed?.date} at {confirmed?.time}<br />
          Duration: {confirmed?.durLabel}<br />
          <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 20 }}>₹{confirmed?.cost}</span><br />
          <span style={{ display: 'inline-block', marginTop: 6, padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: confirmed?.method === 'online' ? '#0b2416' : '#2a1a06', border: `1px solid ${confirmed?.method === 'online' ? '#1a4428' : '#5a3a06'}`, color: confirmed?.method === 'online' ? 'var(--green)' : '#f59e0b' }}>
            {confirmed?.method === 'online' ? '✓ Paid Online' : '💵 Pay at Desk'}
          </span>
        </div>
        <button className="btn-green" onClick={onClose} style={{ marginTop: 20, width: '100%', padding: 13, fontSize: 15 }}>Done</button>
      </div>
    </div>
  )

  // ── Step 2: Payment ──
  if (step === 2) return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26 }}>💳 Choose Payment</div>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ background: '#0b1f14', border: '1px solid #1a3a28', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Booking Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{selTable?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{form.date} • {form.time} • {isCustom ? form.customMins + ' min' : selDur.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{form.name} • {form.phone}</div>
            </div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 30, color: 'var(--green)' }}>₹{cost}</div>
          </div>
        </div>
        <button onClick={confirmOnline} disabled={loading} style={{ width: '100%', padding: '16px 18px', borderRadius: 12, marginBottom: 12, background: '#0f2e1c', border: '2px solid var(--green-dim)', color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: loading ? 0.6 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26 }}>📱</span>
            <div><div style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>Pay Online</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>UPI • GPay • PhonePe • Card</div></div>
            <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 20 }}>→</span>
          </div>
        </button>
        <button onClick={confirmCash} disabled={loading} style={{ width: '100%', padding: '16px 18px', borderRadius: 12, background: '#1a130a', border: '2px solid #5a3a06', color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: loading ? 0.6 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26 }}>💵</span>
            <div><div style={{ fontWeight: 700, fontSize: 15, color: '#f59e0b' }}>Pay at Desk</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Cash • UPI at counter when you arrive</div></div>
            <span style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: 20 }}>→</span>
          </div>
        </button>
        {err && <div style={{ color: 'var(--orange)', fontSize: 13, marginTop: 12 }}>{err}</div>}
        {loading && <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>Processing...</div>}
        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, marginTop: 14, cursor: 'pointer' }}>← Back to booking details</button>
      </div>
    </div>
  )

  // ── Step 1: Booking Form ──
  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26 }}>🎱 Book a Table</div>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Booking type toggle */}
        <div style={{ display: 'flex', marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button onClick={() => { setBookingType('hourly'); setErr('') }} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: bookingType === 'hourly' ? 'var(--green-btn)' : 'var(--bg-card)', color: bookingType === 'hourly' ? '#a3e6b8' : 'var(--text-dim)', transition: 'all .2s' }}>
            ⏱ Hourly
          </button>
          <button onClick={() => { setBookingType('per_game'); setErr('') }} style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', background: bookingType === 'per_game' ? '#1a0f2e' : 'var(--bg-card)', color: bookingType === 'per_game' ? '#c4b5fd' : 'var(--text-dim)', transition: 'all .2s' }}>
            🎱 Per Game
          </button>
        </div>

        {/* ── HOURLY MODE ── */}
        {bookingType === 'hourly' && <>
          <label style={lbl}>Select Table</label>
          <select value={form.tableId} onChange={e => set('tableId', e.target.value)} style={{ marginBottom: 14 }}>
            <option value="">Choose a table...</option>
            {tables.map(t => <option key={t.id} value={t.id}>{t.name} — {t.type === 'Mini Snooker' ? '🟡' : '🎱'} {t.type} — ₹{t.price_per_hour}/hr</option>)}
          </select>

          <label style={lbl}>📅 Date</label>
          <input value={form.date} onChange={e => set('date', e.target.value)} style={{ marginBottom: 14 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ ...lbl, marginTop: 0 }}>🕐 Start Time</label>
              <select value={form.time} onChange={e => set('time', e.target.value)}>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, marginTop: 0 }}>Duration</label>
              <select value={form.duration} onChange={e => set('duration', e.target.value)}>
                {DURATIONS.map(d => <option key={d.label}>{d.label}</option>)}
              </select>
            </div>
          </div>

          {isCustom && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>⏱ Custom Duration (minutes)</label>
              <input type="number" min="5" max="480" step="5" value={form.customMins} onChange={e => set('customMins', e.target.value)} placeholder="e.g. 45" />
            </div>
          )}

          {selTable && (
            <div style={{ background: '#0b2416', border: '1px solid #1a4428', borderRadius: 9, padding: '11px 14px', marginBottom: 14, fontSize: 13, color: 'var(--green)' }}>
              ✓ {selTable.name} — <b>₹{cost}</b> for {isCustom ? form.customMins + ' min' : selDur.label}
            </div>
          )}
        </>}

        {/* ── PER GAME MODE ── */}
        {bookingType === 'per_game' && (
          <div style={{ background: '#0d0d1a', border: '1px solid #2a1f4a', borderRadius: 12, padding: '16px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#c4b5fd', fontWeight: 600, marginBottom: 4 }}>🎱 Walk-in Game Session</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.6 }}>
              Select your table and tap <b>Start Game</b>. The timer begins now — staff will record your end time and charge you when you finish.
            </div>
            <label style={lbl}>Select Table</label>
            <select value={pgForm.tableId} onChange={e => setPg('tableId', e.target.value)} style={{ marginBottom: 14 }}>
              <option value="">Choose a table...</option>
              {tables.map(t => <option key={t.id} value={t.id}>{t.name} — {t.type}</option>)}
            </select>
          </div>
        )}

        {/* Name + Phone — shared across both modes */}
        <label style={lbl}>👤 Your Name</label>
        <input
          value={bookingType === 'hourly' ? form.name : pgForm.name}
          onChange={e => bookingType === 'hourly' ? set('name', e.target.value) : setPg('name', e.target.value)}
          placeholder="Full name" style={{ marginBottom: 14 }}
        />

        <label style={lbl}>📞 Phone</label>
        <input
          value={bookingType === 'hourly' ? form.phone : pgForm.phone}
          onChange={e => bookingType === 'hourly' ? set('phone', e.target.value) : setPg('phone', e.target.value)}
          placeholder="+91 XXXXX XXXXX" style={{ marginBottom: 14 }}
        />

        {err && <div style={{ color: 'var(--orange)', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        {bookingType === 'hourly' ? (
          <button className="btn-green" onClick={goToPayment} disabled={!form.tableId || loading} style={{ width: '100%', padding: 13, fontSize: 15 }}>
            {loading ? 'Checking...' : form.tableId ? 'Continue to Payment →' : 'Select a table first'}
          </button>
        ) : (
          <button
            onClick={startGame}
            disabled={!pgForm.tableId || loading}
            style={{ width: '100%', padding: 13, fontSize: 15, borderRadius: 12, fontWeight: 700, border: 'none', cursor: pgForm.tableId ? 'pointer' : 'not-allowed', background: pgForm.tableId ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : '#1a1a2e', color: pgForm.tableId ? '#fff' : 'var(--text-dim)', transition: 'all .2s' }}
          >
            {loading ? 'Starting...' : pgForm.tableId ? '🎱 Start Game Now' : 'Select a table first'}
          </button>
        )}
      </div>
    </div>
  )
}