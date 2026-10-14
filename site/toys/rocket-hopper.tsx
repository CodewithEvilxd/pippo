import { useState, useEffect, useRef, useCallback } from 'react'
import { Pippo } from '../../src/pippo'
import { sheets } from '../utils/characters'
import { playRocketLaunchSound, playRocketLandSound } from '../utils/sound'

interface SmokeParticle {
  id: number
  x: number
  y: number
  size: number
  dx: number
  dy: number
  rot: number
  isLaunch: boolean
}

interface SparkParticle {
  id: number
  x: number
  y: number
  size: number
  sdx: number
  sdy: number
}

interface RocketButtonHopperProps {
  btn1Ref: React.RefObject<HTMLElement | null>
  btn2Ref: React.RefObject<HTMLElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  onToast?: (msg: string) => void
}

export function RocketButtonHopper({
  btn1Ref,
  btn2Ref,
  containerRef,
  onToast,
}: RocketButtonHopperProps) {
  // 0 = Button 1 (Pick a Mascot), 1 = Button 2 (Make Your Own)
  const [currentPerch, setCurrentPerch] = useState<0 | 1>(0)
  const [visual, setVisual] = useState({ x: 0, y: 0, rot: 0, sx: 1, sy: 1 })
  const [thrusterActive, setThrusterActive] = useState(false)
  const [smokeList, setSmokeList] = useState<SmokeParticle[]>([])
  const [sparkList, setSparkList] = useState<SparkParticle[]>([])
  const [speech, setSpeech] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Simulation physics state (exact Piixpal perch.js vector dynamics)
  const sim = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    sx: 1,
    sy: 1,
    perch: 0 as 0 | 1,
    state: 'sit' as 'sit' | 'fly' | 'land',
    orbit: 0,
    cx: 0,
    cy: 0,
    calm: 0,
    idleTimer: 3.0,
    placed: false,
  })

  const ptr = useRef({
    x: -9999,
    y: -9999,
    seen: false,
  })

  const particleIdRef = useRef(0)
  const sparkIdRef = useRef(0)
  const speechTimeoutRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const lastSmokeTimeRef = useRef<number>(0)

  // Speech bubble helper (matching Piixpal a.say)
  const say = useCallback((text: string, durationMs = 750) => {
    if (speechTimeoutRef.current) {
      window.clearTimeout(speechTimeoutRef.current)
    }
    setSpeech(text)
    speechTimeoutRef.current = window.setTimeout(() => {
      setSpeech(null)
      speechTimeoutRef.current = null
    }, durationMs)
  }, [])

  // Seat coordinate on button relative to container:
  // Centered horizontally above the button, with rocket fins resting directly on top border
  const seatOf = useCallback(
    (btnIndex: 0 | 1) => {
      const container = containerRef.current
      const targetBtn = btnIndex === 0 ? btn1Ref.current : btn2Ref.current
      if (!container || !targetBtn) return { x: 0, y: 0 }

      const cRect = container.getBoundingClientRect()
      const bRect = targetBtn.getBoundingClientRect()

      // Center horizontally on the button (rocket width = 46px)
      const x = Math.round(bRect.left - cRect.left + (bRect.width - 46) / 2)
      // Perch landing legs firmly on the top border rim of the button:
      const y = Math.round(bRect.top - cRect.top - 28)
      return { x, y }
    },
    [btn1Ref, btn2Ref, containerRef]
  )

  // Threatened check: is cursor near this button?
  const isThreatened = useCallback(
    (btnIndex: 0 | 1) => {
      const p = ptr.current
      if (!p.seen) return false
      const targetBtn = btnIndex === 0 ? btn1Ref.current : btn2Ref.current
      if (!targetBtn) return false

      const r = targetBtn.getBoundingClientRect()
      const margin = 26
      return (
        p.x > r.left - margin &&
        p.x < r.right + margin &&
        p.y > r.top - 62 - margin &&
        p.y < r.bottom + margin
      )
    },
    [btn1Ref, btn2Ref]
  )

  // Spawn trailing exhaust smoke puff from the tip of the flame
  const addExhaustSmoke = useCallback(
    (x: number, y: number, size: number, dx: number, dy: number, isLaunch = false) => {
      const id = ++particleIdRef.current
      const rot = (Math.random() - 0.5) * 50
      setSmokeList((prev) => [
        ...prev.slice(-24),
        { id, x, y, size, dx, dy, rot, isLaunch },
      ])
      setTimeout(() => {
        setSmokeList((prev) => prev.filter((p) => p.id !== id))
      }, 650)
    },
    []
  )

  // Spawn fiery spark ember from flame tip
  const addSpark = useCallback((x: number, y: number, sdx: number, sdy: number) => {
    const id = ++sparkIdRef.current
    const size = Math.floor(Math.random() * 2) + 3
    setSparkList((prev) => [...prev.slice(-8), { id, x, y, size, sdx, sdy }])
    setTimeout(() => {
      setSparkList((prev) => prev.filter((p) => p.id !== id))
    }, 240)
  }, [])

  // Takeoff blastoff initiation
  const takeoff = useCallback(
    (customText?: string) => {
      const s = sim.current
      if (s.state !== 'sit') return

      s.state = 'fly'
      s.calm = 0
      s.orbit = Math.random() * Math.PI * 2

      // Destination target button
      const otherPerch: 0 | 1 = s.perch === 0 ? 1 : 0
      const startSeat = seatOf(s.perch)
      const endSeat = seatOf(otherPerch)

      // Flight mid-air waypoint center (arches high above both buttons)
      s.cx = (startSeat.x + endSeat.x) / 2
      s.cy = Math.min(startSeat.y, endSeat.y) - 68

      // Escape direction: blast away from cursor!
      let flyAwayDir = endSeat.x >= startSeat.x ? 1 : -1
      const container = containerRef.current
      if (container && ptr.current.seen) {
        const cRect = container.getBoundingClientRect()
        const rocketScreenX = cRect.left + s.x + 23
        flyAwayDir = ptr.current.x > rocketScreenX ? -1 : 1
      }

      s.vy = -340
      s.vx = flyAwayDir * 170
      s.sy = 1.25
      s.sx = 0.8

      // Launchpad exhaust blast: supersonic deflection outward along the button rim surface!
      const launchX = s.x + 23
      const launchY = s.y + 36
      for (let i = 0; i < 9; i++) {
        const spreadX = (Math.random() - 0.5) * 32
        const dir = spreadX < 0 ? -1 : 1
        const driftX = dir * (Math.random() * 28 + 14)
        const driftY = (Math.random() - 0.5) * 6
        const size = Math.random() * 5 + 13
        addExhaustSmoke(launchX + spreadX, launchY, size, driftX, driftY, true)
      }

      for (let i = 0; i < 4; i++) {
        addSpark(
          launchX,
          launchY,
          (Math.random() - 0.5) * 45,
          Math.random() * 25 + 10
        )
      }

      setThrusterActive(true)
      playRocketLaunchSound()

      const blastBubbles = ['!', 'WHOOSH!', 'BLASTOFF!', 'ZOOM!']
      say(customText || blastBubbles[Math.floor(Math.random() * blastBubbles.length)], 700)
      if (onToast) onToast('Rocket blastoff!')
    },
    [seatOf, say, onToast, containerRef, addExhaustSmoke, addSpark]
  )

  // Global cursor tracking
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      ptr.current.x = e.clientX
      ptr.current.y = e.clientY
      ptr.current.seen = true
    }
    const handlePointerLeave = () => {
      ptr.current.seen = false
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  // Main animation loop
  useEffect(() => {
    let animId: number

    const tick = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05) || 0.016
      lastTimeRef.current = now

      const s = sim.current
      const currentSeat = seatOf(s.perch)

      // Initial placement
      if (!s.placed) {
        if (currentSeat.x !== 0 || currentSeat.y !== 0) {
          s.x = currentSeat.x
          s.y = currentSeat.y
          s.placed = true
          setMounted(true)
          setVisual({ x: s.x, y: s.y, rot: 0, sx: 1, sy: 1 })
        }
      }

      // -------------------------------------------------------------
      // STATE 1: SITTING ON BUTTON RIM (Perched on top border)
      // -------------------------------------------------------------
      if (s.state === 'sit') {
        s.x = currentSeat.x
        s.y = currentSeat.y
        s.rot = 0
        s.sx += (1 - s.sx) * 0.18
        s.sy += (1 - s.sy) * 0.18

        // Check if cursor threatens button or comes within 52px of rocket
        const container = containerRef.current
        if (container) {
          const cRect = container.getBoundingClientRect()
          const rocketScreenX = cRect.left + s.x + 23
          const rocketScreenY = cRect.top + s.y + 23
          const d = Math.hypot(ptr.current.x - rocketScreenX, ptr.current.y - rocketScreenY)

          if (isThreatened(s.perch) || (ptr.current.seen && d < 52)) {
            takeoff()
          }
        }

        // Sitting idle behaviors
        s.idleTimer -= dt
        if (s.idleTimer <= 0) {
          const r = Math.random()
          if (r < 0.4) {
            // Little pre-flight twitch
            s.sx = 1.07
            s.sy = 0.94
          } else if (r < 0.75) {
            const idleNotes = ['READY!', 'ALL CLEAR', '*BEEP*', 'SYSTEMS OK']
            say(idleNotes[Math.floor(Math.random() * idleNotes.length)], 850)
          }
          s.idleTimer = Math.random() * 2.5 + 2.5
        }

        setVisual({ x: s.x, y: s.y, rot: 0, sx: s.sx, sy: s.sy })
      }

      // -------------------------------------------------------------
      // STATE 2 & 3: FLYING & APPROACHING TARGET (Full Vector Physics)
      // -------------------------------------------------------------
      else {
        const otherPerch: 0 | 1 = s.perch === 0 ? 1 : 0
        const destinationSeat = seatOf(otherPerch)
        let goal = { x: destinationSeat.x, y: destinationSeat.y }

        if (s.state === 'fly') {
          // Lissajous sky orbit (Piixpal loop curve)
          s.orbit += dt * 2.8
          goal = {
            x: s.cx + Math.cos(s.orbit) * 65,
            y: s.cy + Math.sin(s.orbit * 2) * 22,
          }

          const threat = isThreatened(s.perch)
          s.calm = threat ? 0 : s.calm + dt

          // Once calm for 0.4s, steer towards the destination button
          if (s.calm > 0.4) {
            s.state = 'land'
          }
        }

        if (s.state === 'land') {
          goal = { x: destinationSeat.x, y: destinationSeat.y }

          // WAVE-OFF / ABORT: If destination button is threatened by mouse,
          // pull up immediately and resume orbit!
          if (isThreatened(otherPerch)) {
            s.cx = s.x
            s.cy = s.y - 60
            s.state = 'fly'
            s.calm = 0
            say('ABORT!', 550)
          }
        }

        // Vector velocity steering towards goal
        const dx = goal.x - s.x
        const dy = goal.y - s.y
        const dist = Math.hypot(dx, dy) || 1
        const MAX_SPEED = 540

        const wantSpeed =
          s.state === 'land' ? Math.min(MAX_SPEED, dist * 6.0 + 35) : MAX_SPEED * 0.75
        const steerRate = 1 - Math.exp(-5.2 * dt)

        s.vx += ((dx / dist) * wantSpeed - s.vx) * steerRate
        s.vy += ((dy / dist) * wantSpeed - s.vy) * steerRate

        s.x += s.vx * dt
        s.y += s.vy * dt

        // Natural flight banking alignment:
        let targetTilt = 0
        if (s.state === 'fly') {
          targetTilt = Math.max(-28, Math.min(28, (s.vx / MAX_SPEED) * 45))
        } else {
          const landingProgress = Math.min(1, dist / 110)
          targetTilt = Math.max(-18, Math.min(18, (s.vx / MAX_SPEED) * 35 * landingProgress))
        }
        s.rot += (targetTilt - s.rot) * (1 - Math.exp(-7.5 * dt))

        // -------------------------------------------------------------
        // TRUE ROCKET PHYSICS: SMOKE ONLY EMITS FROM THE TIP OF THE FLAME!
        // -------------------------------------------------------------
        // Rocket center is at s.x + 23, s.y + 23.
        // Flame is 38px long, extending from nozzle (y=36) to flame tip (y=74).
        // Distance from body center (23, 23) to flame tip (23, 74) is 51px.
        const rotRad = (s.rot * Math.PI) / 180
        const flameTipX = s.x + 23 - Math.sin(rotRad) * 51
        const flameTipY = s.y + 23 + Math.cos(rotRad) * 51

        // Continuous trailing smoke plume emitted directly at flame tip:
        if (now - lastSmokeTimeRef.current > 28) {
          lastSmokeTimeRef.current = now

          // Smoke is ejected along the backward exhaust vector with aerodynamic turbulence:
          const exhaustSpeed = Math.random() * 20 + 16
          const edx = -Math.sin(rotRad) * exhaustSpeed + (Math.random() - 0.5) * 6
          const edy = Math.cos(rotRad) * exhaustSpeed + (Math.random() - 0.5) * 4
          const puffSize = Math.random() * 4 + 11

          addExhaustSmoke(flameTipX, flameTipY, puffSize, edx, edy, false)

          // Glowing incandescent sparks shooting from flame tip
          if (Math.random() < 0.45) {
            addSpark(
              flameTipX,
              flameTipY,
              -Math.sin(rotRad) * 65 + (Math.random() - 0.5) * 16,
              Math.cos(rotRad) * 65 + Math.random() * 16
            )
          }
        }

        // Touchdown condition: within 6px of target seat
        if (s.state === 'land' && dist < 6) {
          s.x = destinationSeat.x
          s.y = destinationSeat.y
          s.vx = 0
          s.vy = 0
          s.rot = 0
          s.state = 'sit'
          s.perch = otherPerch
          setCurrentPerch(otherPerch)
          setThrusterActive(false)
          playRocketLandSound()
          say('TOUCHDOWN!', 750)

          // Touchdown cushion squash
          s.sy = 0.78
          s.sx = 1.22

          // Landing cushion smoke puff settling on button rim
          for (let i = 0; i < 4; i++) {
            const spreadX = (Math.random() - 0.5) * 20
            const dir = spreadX < 0 ? -1 : 1
            addExhaustSmoke(
              destinationSeat.x + 23 + spreadX,
              destinationSeat.y + 36,
              Math.random() * 4 + 12,
              dir * (Math.random() * 16 + 8),
              (Math.random() - 0.5) * 4,
              true
            )
          }
        }

        setVisual({ x: s.x, y: s.y, rot: s.rot, sx: s.sx, sy: s.sy })
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [seatOf, isThreatened, takeoff, addExhaustSmoke, addSpark, say])

  // Direct click blastoff
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    takeoff('BLASTOFF!')
  }

  if (!mounted) return null

  return (
    <>
      {/* Real Rocket Exhaust Smoke Plume Trailing Behind the Flame */}
      {smokeList.map((s) => (
        <span
          key={s.id}
          className={`rocket-smoke-cloud ${s.isLaunch ? 'smoke-launch' : 'smoke-trail'}`}
          style={
            {
              left: `${s.x}px`,
              top: `${s.y}px`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              '--dx': `${s.dx}px`,
              '--dy': `${s.dy}px`,
              '--rot': `${s.rot}deg`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        />
      ))}

      {/* Incandescent Fiery Exhaust Sparks */}
      {sparkList.map((sp) => (
        <span
          key={sp.id}
          className="rocket-spark-ember"
          style={
            {
              left: `${sp.x}px`,
              top: `${sp.y}px`,
              width: `${sp.size}px`,
              height: `${sp.size}px`,
              '--sdx': `${sp.sdx}px`,
              '--sdy': `${sp.sdy}px`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        />
      ))}

      {/* The Flying Rocket Mascot */}
      <div
        className="rocket-hopper-wrap"
        style={{
          transform: `translate3d(${visual.x}px, ${visual.y}px, 0)`,
        }}
        onClick={handleClick}
        title="Rocket hopper! Hover near it or the buttons to watch it blast off."
        aria-label={`Rocket mascot perched on Button ${currentPerch + 1}`}
      >
        {/* Speech Balloon Bubble */}
        {speech && (
          <div className="rocket-speech-bubble" aria-live="polite">
            {speech}
          </div>
        )}

        <div
          className="rocket-hopper-body"
          style={{
            transform: `rotate(${visual.rot}deg) scale(${visual.sx}, ${visual.sy})`,
          }}
        >
          {/* Rocket Pippo Sprite Mascot - Clean, crisp body with no milky haze! */}
          <Pippo {...sheets('rocket')} label="hopper rocket" size={46} />

          {/* Authentic Supersonic Rocket Exhaust Plume */}
          {thrusterActive && (
            <svg
              className="rocket-thruster-flame"
              viewBox="0 0 22 38"
              aria-hidden="true"
            >
              <defs>
                {/* Outer incandescent fire gradient */}
                <linearGradient id="rocketOuterFire" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffee55" />
                  <stop offset="20%" stopColor="#ff7700" />
                  <stop offset="65%" stopColor="#ff2200" />
                  <stop offset="100%" stopColor="rgba(230, 20, 0, 0)" />
                </linearGradient>

                {/* Inner plasma jet gradient */}
                <linearGradient id="rocketInnerFire" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="25%" stopColor="#fff875" />
                  <stop offset="70%" stopColor="#ff9900" />
                  <stop offset="100%" stopColor="rgba(255, 120, 0, 0)" />
                </linearGradient>

                {/* Core throat plasma gradient */}
                <linearGradient id="rocketCoreFire" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor="#d0ffff" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                </linearGradient>
              </defs>

              {/* Outer Roaring Flame Plume */}
              <path
                className="rocket-flame-outer"
                d="M4 0 C1 10, 0 20, 11 38 C22 20, 21 10, 18 0 Z"
                fill="url(#rocketOuterFire)"
              />

              {/* Middle Hot Flame Core */}
              <path
                className="rocket-flame-inner"
                d="M6 0 C3 8, 2 15, 11 29 C20 15, 19 8, 16 0 Z"
                fill="url(#rocketInnerFire)"
              />

              {/* Supersonic Shock Diamond */}
              <polygon
                className="rocket-flame-diamond"
                points="11,6 13.5,9.5 11,13 8.5,9.5"
                fill="#ffffff"
              />

              {/* Throat Core Plasma */}
              <path
                className="rocket-flame-core"
                d="M8 0 C6.5 5, 6 10, 11 18 C16 10, 15.5 5, 14 0 Z"
                fill="url(#rocketCoreFire)"
              />

              {/* Nozzle Exit Lip */}
              <path
                d="M3.5 0 L18.5 0 C17.5 2.5, 4.5 2.5, 3.5 0 Z"
                fill="#1e2229"
              />
            </svg>
          )}
        </div>
      </div>
    </>
  )
}
