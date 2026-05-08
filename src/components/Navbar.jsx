import { useState } from 'react'
import BookingModal from './BookingModal.jsx'

export default function Navbar({ settings }) {
  const [showBook, setShowBook] = useState(false)

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,14,10,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '13px 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.jpg" alt="Logo" style={{ height: 40, borderRadius: 8, objectFit: 'contain' }} />
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Pool & Snooker Club</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/admin/login">
            <button className="btn-ghost">Admin</button>
          </a>
          <button className="btn-green" onClick={() => setShowBook(true)}>
            Book a Table
          </button>
        </div>
      </nav>

      {showBook && <BookingModal onClose={() => setShowBook(false)} />}
    </>
  )
}
