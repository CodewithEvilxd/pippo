import { useState, useEffect, useRef } from 'react'
import { Pippo } from '../../src/pippo'
import { playBoopSound, playChimeSound } from '../utils/sound'

export function SpiderThread() {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialThreadLength = typeof window === 'undefined'
    ? 84
    : Math.min(84, Math.max(42, window.innerWidth * 0.07))
  const [threadLength, setThreadLength] = useState(initialThreadLength)
  const [angleDeg, setAngleDeg] = useState(0)
  const [speech, setSpeech] = useState<string | null>(null)

  // Simulation state matching Piixpal's hang behavior
  const sim = useRef({
    L: initialThreadLength,
    Lv: 0,
    goal: initialThreadLength,
    th: 0, // pendulum angle (radians)
    w: 0, // angular velocity
    state: 'lower' as 'lower' | 'flee' | 'wait',
    timer: 0,
    speechTimer: 0,
    lastScrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    mouseX: -9999,
    mouseY: -9999,
    mouseVX: 0,
    lastPointerAt: 0,
  })

  // Global mouse position tracking for proximity flee
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const s = sim.current
      const elapsed = Math.max((e.timeStamp - s.lastPointerAt) / 1000, 0.001)
      s.mouseVX = s.lastPointerAt ? (e.clientX - s.mouseX) / elapsed : 0
      s.mouseX = e.clientX
      s.mouseY = e.clientY
      s.lastPointerAt = e.timeStamp
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [])

  // Physics animation loop (Piixpal pendulum + spring length)
  useEffect(() => {
    let animId: number
    let lastTime = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033) || 0.016
      lastTime = now

      const s = sim.current

      // 1. Scroll Inertia: Page scrolling pushes the mascot like a pendulum
      const currentScrollY = window.scrollY
      const scrollVelocity = (currentScrollY - s.lastScrollY) / Math.max(dt, 0.001)
      s.lastScrollY = currentScrollY
      s.w += Math.max(-2.2, Math.min(2.2, scrollVelocity * 0.000035))

      // 2. Pendulum gravity restoring force
      const g = 9.8 * 140
      s.w += (-g / Math.max(s.L, 20) * Math.sin(s.th) - s.w * 1.25) * dt
      s.th = Math.max(-1.15, Math.min(1.15, s.th + s.w * dt))

      // 3. Cursor proximity checking
      let dist = 9999
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const anchorX = rect.left + rect.width / 2
        const anchorY = rect.top
        const kiboX = anchorX + Math.sin(s.th) * s.L
        const kiboY = anchorY + Math.cos(s.th) * s.L
        dist = Math.hypot(s.mouseX - kiboX, s.mouseY - kiboY)
      }

      // A quick cursor brush nudges the pendulum, matching the upstream hang behavior.
      const pointerVX = s.mouseVX
      s.mouseVX = 0
      if (dist < 132) {
        s.w += Math.max(-0.25, Math.min(0.25, pointerVX * 0.00009))
      }

      const near = dist < 76
      s.timer -= dt

      if (s.speechTimer > 0) {
        s.speechTimer -= dt
        if (s.speechTimer <= 0) setSpeech(null)
      }

      // 4. State Machine: lower <-> flee <-> wait
      switch (s.state) {
        case 'lower':
          // Subtle breathing oscillation
          {
            const restLength = Math.min(84, Math.max(42, window.innerWidth * 0.07))
            s.goal = restLength + Math.sin(now / 240) * Math.min(8, restLength * 0.1)
          }
          if (near) {
            s.state = 'flee'
            s.speechTimer = 1.0
            setSpeech('!')
          }
          break
        case 'flee':
          s.goal = 10 // zips up to ceiling
          if (!near) {
            s.state = 'wait'
            s.timer = 1.5 // wait before descending
          }
          break
        case 'wait':
          s.goal = 10
          if (near) {
            s.state = 'flee'
          } else if (s.timer <= 0) {
            s.state = 'lower'
            setSpeech(null)
          }
          break
      }

      // Fast up (k=160), smooth down (k=26) spring physics
      const k = s.goal < s.L ? 160 : 26
      const damping = s.goal < s.L ? 18 : 7.5
      s.Lv += ((s.goal - s.L) * k - s.Lv * damping) * dt
      s.L = Math.max(6, s.L + s.Lv * dt)

      setThreadLength(Math.round(s.L))
      setAngleDeg(-s.th * 57.3)

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [])

  // Poke / click: Yo-yo spring bounce!
  const handlePoke = (e: React.MouseEvent) => {
    e.stopPropagation()
    playBoopSound(2)
    const s = sim.current
    s.Lv += 460 // shoots down and bounces up
    s.w += (Math.random() - 0.5) * 1.8
    s.speechTimer = 1.4
    setSpeech(Math.random() > 0.4 ? '*whee!*' : '!?')
    playChimeSound()
  }

  return (
    <div
      ref={containerRef}
      className="spider-thread-container"
      onClick={handlePoke}
      title="Dangling Kibo! Move mouse close to see it zip up, or click to yo-yo bounce!"
      aria-label="Interactive dangling Kibo mascot"
    >
      {/* Ceiling Anchor Bead */}
      <div className="spider-ceiling-anchor" aria-hidden="true" />

      {/* Swinging Pendulum Arm */}
      <div
        className="spider-pendulum-arm"
        style={{
          transform: `rotate(${angleDeg.toFixed(2)}deg)`,
          transformOrigin: 'top center',
        }}
      >
        {/* Silk thread string */}
        <div
          className="spider-silk-line"
          style={{ height: `${threadLength}px` }}
        />

        {/* Kibo Mascot at the bottom of the silk */}
        <div className="spider-avatar-wrap">
          <Pippo
            directions={`${import.meta.env.BASE_URL}sprites/kibo-thread-swing-directions.png`}
            reactions={`${import.meta.env.BASE_URL}sprites/kibo-thread-swing-reactions.png`}
            label="dangling kibo mascot"
            size={56}
          />

          {/* Speech bubble */}
          {speech && (
            <div className="spider-speech-bubble" aria-live="polite">
              <span>{speech}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
