import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@cue8.in'
  const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

  const login = async () => {
    setLoading(true)
    setErr('')
    // Small delay to feel real
    await new Promise(r => setTimeout(r, 500))
    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
      sessionStorage.setItem('cue8_admin', 'true')
      navigate('/admin')
    } else {
      setErr('Invalid email or password.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
      background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #0b2d18 0%, #080e0a 80%)'
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
        borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 360
      }} className="fade-up">
        <a href="/" style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 18, textDecoration: 'none' }}>
          ← Back to site
        </a>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <img src="/logo.jpg" alt="Logo" style={{ height: 80, borderRadius: 12, objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, marginBottom: 28 }}>
          Admin Dashboard
        </div>

        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Email</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="admin@cue8.in" style={{ marginBottom: 14 }}
        />

        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Password</label>
        <input
          type="password" value={pass} onChange={e => setPass(e.target.value)}
          placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && login()}
          style={{ marginBottom: 6 }}
        />

        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 14 }}>
          Set credentials in your .env file
        </div>

        {err && <div style={{ color: 'var(--orange)', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <button className="btn-green" onClick={login} disabled={loading}
          style={{ width: '100%', padding: 13, fontSize: 15 }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  )
}
