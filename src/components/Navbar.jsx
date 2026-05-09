import { useState, useRef, useEffect } from 'react'
import BookingModal from './BookingModal.jsx'

const PHONE = '+918830660374'
const PHONE_DISPLAY = '+91 88306 60374'
const WHATSAPP_LINK = 'https://api.whatsapp.com/send/?phone=%2B918830660374&text&type=phone_number&app_absent=0'

export default function Navbar({ settings }) {
  const [showBook, setShowBook] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const contactRef = useRef(null)

  // Close popup when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (contactRef.current && !contactRef.current.contains(e.target)) {
        setShowContact(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,14,10,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(34,197,94,0.15)',
        boxShadow: '0 2px 24px rgba(34,197,94,0.08)',
        padding: '13px 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.jpg" alt="Logo" style={{ height: 40, borderRadius: 8, objectFit: 'contain' }} />
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Pool & Snooker Club</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/admin/login">
            <button className="btn-ghost btn-glow-ghost">Admin</button>
          </a>

          <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
            <button className="btn-ghost btn-glow-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Map
            </button>
          </a>

          {/* Contact button with popup */}
          <div ref={contactRef} style={{ position: 'relative' }}>
            <button
              className="btn-ghost btn-glow-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={() => setShowContact(v => !v)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.41 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 5.55 5.55l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Contact
            </button>

            {showContact && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: '#0d1a12',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(34,197,94,0.1)',
                padding: '14px 16px',
                minWidth: 220,
                zIndex: 200,
                animation: 'fadeUp 0.2s ease',
              }}>
                {/* Arrow tip */}
                <div style={{
                  position: 'absolute', top: -7, right: 18,
                  width: 13, height: 13,
                  background: '#0d1a12',
                  border: '1px solid rgba(34,197,94,0.25)',
                  borderBottom: 'none', borderRight: 'none',
                  transform: 'rotate(45deg)',
                }} />

                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Reach us at
                </p>

                {/* Call */}
                <a
                  href={`tel:${PHONE}`}
                  style={{ textDecoration: 'none' }}
                  onClick={() => setShowContact(false)}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 9,
                    background: 'rgba(34,197,94,0.07)',
                    border: '1px solid rgba(34,197,94,0.15)',
                    marginBottom: 8,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(34,197,94,0.14)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(34,197,94,0.07)'}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(34,197,94,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.41 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 5.55 5.55l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 1 }}>Call us</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>{PHONE_DISPLAY}</div>
                    </div>
                  </div>
                </a>

                {/* WhatsApp */}
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                  onClick={() => setShowContact(false)}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 9,
                    background: 'rgba(37,211,102,0.07)',
                    border: '1px solid rgba(37,211,102,0.15)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(37,211,102,0.14)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(37,211,102,0.07)'}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(37,211,102,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {/* WhatsApp icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                      </svg>
                    </span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 1 }}>WhatsApp</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#25D366' }}>{PHONE_DISPLAY}</div>
                    </div>
                  </div>
                </a>
              </div>
            )}
          </div>

          <button className="btn-green btn-glow-green" onClick={() => setShowBook(true)}>
            Book a Table
          </button>
        </div>
      </nav>

      {showBook && <BookingModal onClose={() => setShowBook(false)} />}
    </>
  )
}
