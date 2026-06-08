import React from 'react'

/** Small inline help banner for the cards views (Vault / Showcase). */
const InfoNote: React.FC<{ children: React.ReactNode; accent?: string }> = ({
  children, accent = '#334155',
}) => (
  <div style={{
    display: 'flex', gap: '10px', alignItems: 'flex-start',
    padding: '11px 14px', marginBottom: '16px', borderRadius: '8px',
    border: `1px solid ${accent}`, background: 'rgba(30,41,59,0.35)',
    fontFamily: 'pressStart',
  }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
      <circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="2" />
      <path d="M12 11v5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1.2" fill="#94a3b8" />
    </svg>
    <span style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>{children}</span>
  </div>
)

export default InfoNote
