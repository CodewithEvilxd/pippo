import { useEffect, useRef, useState } from 'react'
import { playClickSound } from '../utils/sound'

type PullBulbProps = {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export function PullBulb({ theme, onToggle }: PullBulbProps) {
  const [pulled, setPulled] = useState(false)
  const pullTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (pullTimer.current) clearTimeout(pullTimer.current)
  }, [])

  const handlePull = () => {
    playClickSound()
    setPulled(true)
    onToggle()
    if (pullTimer.current) clearTimeout(pullTimer.current)
    pullTimer.current = setTimeout(() => {
      setPulled(false)
      pullTimer.current = null
    }, 220)
  }

  const isDark = theme === 'dark'
  const isLit = !isDark

  return (
    <button
      type="button"
      className="pull-bulb-container"
      onClick={handlePull}
      title={isDark ? 'Pull chain for light mode' : 'Pull chain for dark mode'}
      aria-label={`Pull lamp chain to switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
    >
      {/* Lamp Socket & Bulb SVG */}
      <svg
        className={`pull-bulb-svg ${isLit ? 'is-lit' : ''}`}
        width="28"
        height="38"
        viewBox="0 0 28 38"
        aria-hidden="true"
      >
        {/* Glow halo when lit */}
        {isLit && (
          <circle cx="14" cy="24" r="13" fill="var(--lime)" opacity="0.25" filter="blur(3px)" />
        )}
        {/* Base bracket */}
        <rect x="10" y="0" width="8" height="6" rx="1.5" fill="var(--line)" />
        {/* Socket */}
        <rect x="9" y="5" width="10" height="7" rx="1" fill="var(--paper-2)" stroke="var(--line)" strokeWidth="1.6" />
        {/* Glass Bulb */}
        <path
          d="M7 14 C4 18, 4 24, 7 28 C9.5 31, 18.5 31, 21 28 C24 24, 24 18, 21 14 Z"
          fill={isLit ? 'var(--lime)' : 'var(--card)'}
          stroke="var(--line)"
          strokeWidth="1.8"
        />
        {/* Filament */}
        <path
          d="M11 20 L13 17 L15 17 L17 20"
          fill="none"
          stroke={isLit ? 'var(--lime-ink)' : 'var(--line)'}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>

      {/* Hanging Pull Chain Cord */}
      <div
        className={`pull-chain-cord ${pulled ? 'is-pulled' : ''}`}
        style={{
          height: pulled ? '36px' : '22px',
          transition: 'height 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <span className="chain-bead" />
        <span className="chain-bead" />
        <span className="chain-bead" />
        <span className="chain-ring" />
      </div>
    </button>
  )
}
