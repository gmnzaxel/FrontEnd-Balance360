import React from 'react'

/**
 * Balance360 Symbol Component (Linear Obsidian Edition)
 * Displays the exact reconstructed symbol with blurple gradient (#5e6ad2 to #8b5cf6)
 */
export const Balance360Symbol = ({ size = 32, className = '' }) => (
  <img
    src="/branding/balance360-icon.svg"
    alt="Balance360"
    width={size}
    height={size}
    className={className}
    style={{
      width: size,
      height: size,
      objectFit: 'contain',
      display: 'inline-block',
      verticalAlign: 'middle',
    }}
  />
)

const Balance360Logo = ({
  showSubtitle = true,
  symbolSize = 36,
  card = false,
  className = '',
}) => {
  const content = (
    <div
      className={`inline-flex items-center gap-3.5 select-none ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem' }}
    >
      <Balance360Symbol size={symbolSize} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            color: '#ffffff',
            fontWeight: 800,
            fontSize: symbolSize * 0.72,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <span>Balance</span>
          <span style={{ color: '#ffffff', fontWeight: 800 }}>360</span>
        </div>
        {showSubtitle && (
          <span
            style={{
              color: '#a1a1aa',
              fontSize: Math.max(10, symbolSize * 0.22),
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: '0.2rem',
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
            }}
          >
            Gestión Inteligente de Inventario y Ventas
          </span>
        )}
      </div>
    </div>
  )

  if (card) {
    return (
      <div
        style={{
          background: '#18181c',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.25rem 2rem',
          display: 'inline-block',
          boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.5)',
        }}
      >
        {content}
      </div>
    )
  }

  return content
}

export default Balance360Logo
