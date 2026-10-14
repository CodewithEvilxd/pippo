import { useState, useEffect } from 'react'
import { Pippo } from '../../src/pippo'
import { sheets } from '../utils/characters'
import { playChimeSound } from '../utils/sound'

export function ScrollyBar() {
  const [progress, setProgress] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [direction, setDirection] = useState<'right' | 'left'>('right')
  const [reachedBottom, setReachedBottom] = useState(false)

  useEffect(() => {
    let scrollTimer: number
    let lastY = window.scrollY

    const handleScroll = () => {
      const currentY = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight

      if (docHeight > 0) {
        const pct = Math.min(100, Math.max(0, (currentY / docHeight) * 100))
        setProgress(pct)
        setReachedBottom(pct >= 98)
      }

      if (currentY > lastY + 2) {
        setDirection('right')
      } else if (currentY < lastY - 2) {
        setDirection('left')
      }
      lastY = currentY

      setIsScrolling(true)
      window.clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.clearTimeout(scrollTimer)
    }
  }, [])

  const handleCelebrateClick = () => {
    playChimeSound()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="scrolly-progress-container" aria-hidden="true">
      {/* Background Track */}
      <div className="scrolly-progress-track">
        {/* Filled Lime Progress Line */}
        <div
          className="scrolly-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Runner Companion riding on top of the bar */}
      <div
        className={`scrolly-runner ${isScrolling ? 'is-running' : 'is-idle'} ${reachedBottom ? 'is-celebrating' : ''}`}
        style={{
          left: `${progress}%`,
          transform: `translateX(-50%) scaleX(${direction === 'left' ? -1 : 1})`,
        }}
        onClick={handleCelebrateClick}
        title="Scrolly reading progress buddy! Click to bounce back to top."
      >
        <Pippo
          {...sheets('bunny')}
          label="scrolly running companion"
          size={32}
        />

        {reachedBottom && (
          <div className="scrolly-speech-bubble">
            <span>Top ⤴</span>
          </div>
        )}
      </div>
    </div>
  )
}
