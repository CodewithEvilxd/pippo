import { useState, useEffect, useRef, useCallback } from 'react'
import { Pippo } from '../../src/pippo'
import { sheets } from '../utils/characters'
import { ToySandbox } from './toy-sandbox'
import { copyText } from '../utils/clipboard'
import {
  playBoopSound,
  playClickSound,
  playChimeSound,
  playDizzySound,
  playPopSound,
  playMusicNoteSound,
  playChoirSequenceSound,
  playThudSound,
  playSqueakSound,
} from '../utils/sound'
import {
  SparklesIcon,
  CheckIcon,
  CopyIcon,
  GamepadIcon,
  UsersIcon,
  BoltIcon,
  ArrowUpRightIcon,
  MusicIcon,
  SmileIcon,
  BookOpenIcon,
  FlameIcon,
} from '../ui/icons'

type PalTab = 'characters' | 'interactions' | 'toys' | 'groups'

/* =========================================================================
   CHARACTER 1: FROG TONGUE SNAP (100% REAL snap.js VECTOR PHYSICS)
   ========================================================================= */
function FrogSnapPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [frogPos, setFrogPos] = useState({ x: 80, oy: 0, sx: 1, sy: 1, face: 1 })
  const [tongue, setTongue] = useState({ active: false, len: 0, ang: 0, mx: 0, my: 0 })
  const [frogSpeech, setFrogSpeech] = useState<string | null>(null)
  const [flyPos, setFlyPos] = useState<{ x: number; y: number; active: boolean; caught: boolean }>({
    x: 0,
    y: 0,
    active: false,
    caught: false,
  })
  const stageRef = useRef<HTMLDivElement>(null)

  const sim = useRef({
    x: 80,
    oy: 0,
    sx: 1,
    sy: 1,
    face: 1,
    state: 'sit' as 'sit' | 'aim' | 'out' | 'back',
    t: 0,
    cool: 0,
    happy: 0,
    tx: 0,
    ty: 0,
    hop: null as null | { x0: number; x1: number; p: number },
    mouseX: -9999,
    mouseY: -9999,
    mouseActive: false,
    flyCaught: false,
  })

  // Hop to exact clicked location with parabolic trajectory
  const handleFrogHop = (e: React.MouseEvent) => {
    const s = sim.current
    if (s.hop) return
    const rect = stageRef.current?.getBoundingClientRect()
    const clickX = rect ? e.clientX - rect.left : s.x
    const stageWidth = stageRef.current ? stageRef.current.clientWidth : 280
    const x0 = s.x
    const minX = 45
    const maxX = stageWidth - 55
    const targetX = Math.max(minX, Math.min(maxX, clickX))
    s.face = targetX > x0 ? 1 : -1
    s.hop = { x0, x1: targetX, p: 0 }
    s.happy = 0
    playBoopSound(1)
  }

  // Pointer move: aim & trigger tongue snap
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const s = sim.current
    s.mouseX = x
    s.mouseY = y
    s.mouseActive = true
    if (!s.flyCaught) {
      setFlyPos({ x, y, active: true, caught: false })
    }
  }

  const handlePointerLeave = () => {
    const s = sim.current
    s.mouseX = -9999
    s.mouseY = -9999
    s.mouseActive = false
    if (!s.flyCaught) {
      setFlyPos({ x: 0, y: 0, active: false, caught: false })
    }
  }

  // 60fps real physics animation loop
  useEffect(() => {
    let animId: number
    let lastTime = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033) || 0.016
      lastTime = now
      const s = sim.current

      // 1. Hop Parabolic Trajectory
      if (s.hop) {
        s.hop.p = Math.min(1, s.hop.p + dt / 0.38)
        const p = s.hop.p
        const q = 1 - p
        s.x = s.hop.x0 + (s.hop.x1 - s.hop.x0) * p
        s.oy = -(4 * p * q) * 48 // Parabolic jump arc
        s.sy = 1.22
        s.sx = 0.84
        if (p >= 1) {
          s.hop = null
          s.oy = 0
          s.sy = 0.72 // Squash on landing
          s.sx = 1.35
          playThudSound()
        }
      } else {
        // Spring squash recovery
        s.sx += (1 - s.sx) * 0.22
        s.sy += (1 - s.sy) * 0.22
      }

      const mx = s.x + s.face * 18
      const my = 85 + s.oy

      s.cool -= dt
      s.happy -= dt
      if (s.happy <= 0 && frogSpeech) setFrogSpeech(null)

      const dist = s.mouseActive ? Math.hypot(s.mouseX - mx, s.mouseY - my) : 9999

      // 2. State Machine: sit -> aim -> out -> back
      if (s.state === 'sit' && !s.hop) {
        if (s.mouseActive && Math.abs(s.mouseX - s.x) > 6) {
          s.face = s.mouseX > s.x ? 1 : -1
        }
        if (dist < 180 && s.cool <= 0 && s.mouseActive) {
          s.state = 'aim'
          s.t = 0.12
        }
      } else if (s.state === 'aim') {
        s.t -= dt
        if (s.t <= 0) {
          s.state = 'out'
          s.t = 0
          s.tx = s.mouseX
          s.ty = s.mouseY
          playPopSound()
        }
      }

      if (s.state === 'out' || s.state === 'back') {
        s.t += (dt / 0.1) * (s.state === 'out' ? 1 : -1)
        const k = Math.max(0, Math.min(1, s.t))
        const len = Math.hypot(s.tx - mx, s.ty - my) * k
        const ang = Math.atan2(s.ty - my, s.tx - mx)

        setTongue({
          active: true,
          len: Math.round(len),
          ang,
          mx,
          my,
        })

        if (s.state === 'out' && k >= 1) {
          s.state = 'back'
          s.flyCaught = true
          setFlyPos((f) => ({ ...f, caught: true }))
          s.happy = 1.2
          setFrogSpeech('*gulp!*')
          playChimeSound()
        }

        if (s.state === 'back' && k <= 0) {
          s.state = 'sit'
          s.cool = 0.95
          s.flyCaught = false
          setFlyPos((f) => ({ ...f, caught: false }))
          setTongue({ active: false, len: 0, ang: 0, mx, my })
        }
      }

      setFrogPos({
        x: s.x,
        oy: s.oy,
        sx: s.sx,
        sy: s.sy,
        face: s.face,
      })

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [frogSpeech])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">frog · tongue snap</span>
        <span className="play-status">{tongue.active ? 'SNAP!' : 'Aiming at cursor'}</span>
      </div>

      <div
        ref={stageRef}
        className="frog-pond-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleFrogHop}
        title="Move cursor near frog to trigger tongue snap! Click anywhere to make frog hop."
      >
        {/* Natural lily pads in pond */}
        <div className="frog-lily-pad pad-left" style={{ left: '40px', bottom: '16px' }} />
        <div className="frog-lily-pad pad-mid" style={{ left: '130px', bottom: '22px' }} />
        <div className="frog-lily-pad pad-right" style={{ left: '220px', bottom: '18px' }} />

        {/* Dynamic pad under current frog */}
        <div
          className="frog-lily-pad active-pad"
          style={{
            left: `${frogPos.x - 30}px`,
            bottom: '18px',
          }}
        />

        {/* Frog mascot with hop squash/stretch */}
        <div
          className="frog-mascot-wrap"
          style={{
            transform: `translate(${frogPos.x - 27}px, ${frogPos.oy}px) scale(${frogPos.sx}, ${frogPos.sy}) scaleX(${frogPos.face})`,
            bottom: '26px',
            position: 'absolute',
            left: 0,
          }}
        >
          <Pippo {...sheets('frog')} label="frog companion" size={54} />
          {frogSpeech && (
            <div className="speech-bubble" aria-live="polite">
              <span>{frogSpeech}</span>
            </div>
          )}
        </div>

        {/* Dynamic Vector Tongue Line */}
        {tongue.active && (
          <div
            className="frog-tongue-phys-line"
            style={{
              position: 'absolute',
              left: `${tongue.mx}px`,
              top: `${tongue.my}px`,
              width: `${tongue.len}px`,
              transform: `rotate(${tongue.ang}rad)`,
            }}
          >
            <span className="frog-tongue-tip" />
          </div>
        )}

        {/* Buzzing Fly with SVG wings */}
        {flyPos.active && !flyPos.caught && (
          <div className="frog-fly-target" style={{ left: flyPos.x, top: flyPos.y }}>
            <svg width="14" height="14" viewBox="0 0 16 16" className="fly-svg">
              <ellipse cx="8" cy="9" rx="4" ry="5" fill="var(--line)" />
              <ellipse cx="5" cy="5" rx="3" ry="4" fill="rgba(255,255,255,0.85)" stroke="var(--line)" strokeWidth="1" className="fly-wing-l" />
              <ellipse cx="11" cy="5" rx="3" ry="4" fill="rgba(255,255,255,0.85)" stroke="var(--line)" strokeWidth="1" className="fly-wing-r" />
            </svg>
          </div>
        )}
      </div>

      <p className="play-caption">
        A playful frog that snaps its sticky tongue directly at your cursor whenever you reach for it. Click anywhere to make it hop!
      </p>

      <div className="pal-code-snip">
        <code>&lt;piix-pal pal="frog" on=".pond"&gt;&lt;/piix-pal&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('frog', '<piix-pal pal="frog" on=".pond"></piix-pal>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   CHARACTER 2: LURK CARD PEEKER (peek.js CONTINUOUS GAZE & DUCK PHYSICS)
   ========================================================================= */
function LurkPeekerPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [status, setStatus] = useState('Ducked')
  const [speech, setSpeech] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const peekerRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const speechTimerRef = useRef<number | null>(null)

  const sim = useRef({
    at: 0.5,
    depth: 54,
    goal: 54,
    state: 'hidden' as 'hidden' | 'ears' | 'eyes' | 'out' | 'duck',
    timer: 0.7,
    mouseX: -9999,
    mouseY: -9999,
    mouseActive: false,
  })

  const announce = useCallback((message: string) => {
    setSpeech(message)
    if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current)
    speechTimerRef.current = window.setTimeout(() => {
      setSpeech(null)
      speechTimerRef.current = null
    }, 700)
  }, [])

  const pokeLurk = useCallback(() => {
    const s = sim.current
    if (s.state === 'hidden' || s.state === 'duck') return
    s.state = 'duck'
    s.goal = 54
    s.timer = 1.6
    announce('eep!')
    playBoopSound(1)
  }, [announce])

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    sim.current.mouseX = e.clientX - rect.left
    sim.current.mouseY = e.clientY - rect.top
    sim.current.mouseActive = true
  }

  const handlePointerLeave = () => {
    sim.current.mouseX = -9999
    sim.current.mouseY = -9999
    sim.current.mouseActive = false
  }

  useEffect(() => {
    let animId: number
    let lastTime = performance.now()
    let lastState = sim.current.state

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033) || 0.016
      lastTime = now
      const s = sim.current
      const width = stageRef.current ? stageRef.current.clientWidth : 280
      const lurkX = width * s.at
      const lurkY = 50

      const dist = s.mouseActive ? Math.hypot(s.mouseX - lurkX, s.mouseY - lurkY) : 9999

      // Proximity flee trigger (< 88px)
      if (dist < 88 && s.state !== 'hidden' && s.state !== 'duck') {
        s.state = 'duck'
        s.goal = 54
        s.timer = 1.6
        announce('eep!')
        playBoopSound(1)
      }

      s.timer -= dt

      // Progressive peek states
      switch (s.state) {
        case 'hidden':
          if (s.timer <= 0 && dist > 105) {
            s.state = 'ears'
            s.timer = 0.8
            s.goal = 34 // Cautious ears out
          }
          break
        case 'ears':
          if (s.timer <= 0) {
            s.state = 'eyes'
            s.timer = 0.9
            s.goal = 18 // Eyes tracking over border
          }
          break
        case 'eyes':
          if (s.timer <= 0) {
            s.state = 'out'
            s.timer = 3.6
            s.goal = 0 // Full face peek
          }
          break
        case 'out':
          if (s.timer <= 0) {
            s.state = 'duck'
            s.timer = 1.3
            s.goal = 54
          }
          break
        case 'duck':
          if (s.timer <= 0 && dist > 110) {
            // Relocate to a NEW random spot along card rim!
            s.at = Math.max(0.18, Math.min(0.82, Math.random()))
            s.state = 'hidden'
            s.timer = 0.6
          }
          break
      }

      // Fast duck (k=18), cautious rise (k=4.2)
      const speed = s.goal > s.depth ? 18 : 4.2
      s.depth += (s.goal - s.depth) * (1 - Math.exp(-speed * dt))
      if (peekerRef.current) {
        peekerRef.current.style.left = `${s.at * 100}%`
        peekerRef.current.style.transform = `translate(-50%, ${s.depth}px)`
      }

      // Continuous head tilt angle tracking cursor
      if (s.state === 'eyes' || s.state === 'out') {
        const tilt = Math.max(-16, Math.min(16, (s.mouseX - lurkX) * 0.14))
        if (headRef.current) headRef.current.style.transform = `rotate(${tilt}deg)`
      } else if (headRef.current) {
        headRef.current.style.transform = 'rotate(0deg)'
      }
      if (lastState !== s.state) {
        lastState = s.state
        setStatus(s.state === 'out' ? 'Peeking out' : s.state === 'eyes' ? 'Watching' : s.state === 'ears' ? 'Listening' : 'Ducked')
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(animId)
      if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current)
    }
  }, [announce])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">lurk · edge peeker</span>
        <span className="play-status">{status}</span>
      </div>

      <div
        ref={stageRef}
        className="lurk-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={pokeLurk}
        title="Hover & click to poke! Cautiously peeks ears and eyes over edge."
      >
        {/* Lurking mascot peeking over edge */}
        <div
          ref={peekerRef}
          className="lurk-peeker-box"
          style={{ left: '50%', transform: 'translate(-50%, 54px)' }}
        >
          <div
            ref={headRef}
            className="lurk-head-wrap"
            style={{ transform: 'rotate(0deg)', transition: 'transform 0.08s ease-out' }}
          >
            <Pippo {...sheets('fox')} label="lurk peeker" size={56} />
          </div>
          {speech && (
            <div className="speech-bubble" aria-live="polite">
              <span>{speech}</span>
            </div>
          )}
        </div>

        {/* Physical card bezel rim */}
        <div className="lurk-card-rim">
          <span className="rim-label">Hover &amp; click to poke</span>
        </div>
      </div>

      <p className="play-caption">
        A shy creature that hides behind card borders and peeks its ears and eyes over the edge.
      </p>

      <div className="pal-code-snip">
        <code>&lt;div class="card"&gt; &lt;piix-pal pal="lurk"&gt;&lt;/piix-pal&gt; &lt;/div&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('lurk', '<div class="card"><piix-pal pal="lurk"></piix-pal></div>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   CHARACTER 3: WHACK-A-MOLE (pop.js REAL TACTILE BONK PHYSICS)
   ========================================================================= */
function WhackAMolePlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [holeIndex, setHoleIndex] = useState(1)
  const [depth, setDepth] = useState(50) // 50 = buried, 0 = surfaced
  const [score, setScore] = useState(0)
  const [bonked, setBonked] = useState(false)
  const [speech, setSpeech] = useState<string | null>(null)

  const sim = useRef({
    hole: 1,
    depth: 50,
    goal: 50,
    state: 'hidden' as 'hidden' | 'up' | 'bonked',
    timer: 0.9,
    bonks: 0,
  })

  const bopMole = (index: number) => {
    const s = sim.current
    if (index !== s.hole || s.state !== 'up') return
    s.state = 'bonked'
    s.goal = 50
    s.timer = 1.1
    s.bonks++
    setScore(s.bonks)
    setBonked(true)
    setSpeech('*bonk!*')
    playPopSound()
    playChimeSound()
    setTimeout(() => {
      setBonked(false)
      setSpeech(null)
    }, 600)
  }

  useEffect(() => {
    let animId: number
    let lastTime = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033) || 0.016
      lastTime = now
      const s = sim.current

      s.timer -= dt

      switch (s.state) {
        case 'hidden':
          if (s.timer <= 0) {
            const nextHole = Math.floor(Math.random() * 3)
            s.hole = nextHole
            setHoleIndex(nextHole)
            s.state = 'up'
            s.goal = 0 // Rise out of hole
            s.timer = 1.3 + Math.random() * 0.7
          }
          break
        case 'up':
          if (s.timer <= 0) {
            s.state = 'hidden'
            s.goal = 50 // Retreat back down
            s.timer = 0.8 + Math.random() * 0.7
          }
          break
        case 'bonked':
          if (s.timer <= 0) {
            s.state = 'hidden'
            s.goal = 50
            s.timer = 0.7
          }
          break
      }

      // Smooth rise and retreat spring lerp
      const k = s.goal > s.depth ? 18 : 12
      s.depth += (s.goal - s.depth) * (1 - Math.exp(-k * dt))
      setDepth(Math.round(s.depth))

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">mole · whack-a-mole</span>
        <span className="play-status">Score: {score}</span>
      </div>

      <div className="mole-lawn-stage">
        {[0, 1, 2].map((i) => {
          const isCurrent = holeIndex === i
          return (
            <div key={i} className="mole-hole-wrap" onClick={() => bopMole(i)}>
              <div className="mole-hole-ground" />
              {isCurrent && (
                <div
                  className={`mole-popup-body ${bonked ? 'is-bopped' : ''}`}
                  style={{
                    transform: `translateY(${depth}px) scale(${bonked ? 0.78 : 1})`,
                    opacity: depth > 45 ? 0 : 1,
                  }}
                >
                  <Pippo {...sheets('hamster')} label="mole buddy" size={48} />
                  {speech && (
                    <div className="speech-bubble" aria-live="polite">
                      <span>{speech}</span>
                    </div>
                  )}
                  {bonked && (
                    <div className="mole-bonk-sparks" aria-hidden="true">
                      <span className="spark-line spark-1" />
                      <span className="spark-line spark-2" />
                      <span className="spark-line spark-3" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="play-caption">
        Pops out of lawn holes unexpectedly—click quickly to bop it and rack up points!
      </p>

      <div className="pal-code-snip">
        <code>&lt;section&gt; &lt;piix-pal pal="mole"&gt;&lt;/piix-pal&gt; &lt;/section&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('mole', '<section><piix-pal pal="mole"></piix-pal></section>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   CHARACTER 4: KITTY SWAT (lounge.js CONTINUOUS TRACKING & REAL SWAT ARC)
   ========================================================================= */
function KittySwatPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [face, setFace] = useState(1)
  const [swatting, setSwatting] = useState(false)
  const [headTilt, setHeadTilt] = useState(0)
  const [speech, setSpeech] = useState<string | null>(null)
  const [isSleeping, setIsSleeping] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  const sim = useRef({
    state: 'rest' as 'rest' | 'swat' | 'sleep' | 'purr',
    calmTimer: 0,
    swatCooldown: 0,
    mouseX: -9999,
    mouseY: -9999,
  })

  const petKitty = () => {
    sim.current.state = 'purr'
    setSpeech('*purr*')
    playBoopSound(2)
    setTimeout(() => {
      setSpeech(null)
      sim.current.state = 'rest'
    }, 1400)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const s = sim.current
    s.mouseX = x
    s.mouseY = y
    s.calmTimer = 0
    setIsSleeping(false)

    const catX = rect.width / 2
    const catY = rect.height / 2
    const dist = Math.hypot(x - catX, y - catY)
    const nextFace = x < catX ? -1 : 1
    setFace(nextFace)

    // Continuous head tilt angle
    const tilt = Math.max(-18, Math.min(18, (x - catX) * 0.14))
    setHeadTilt(tilt)

    // Trigger swat if close (< 82px)
    if (dist < 82 && s.swatCooldown <= 0 && s.state !== 'purr') {
      s.state = 'swat'
      s.swatCooldown = 0.45
      setSwatting(true)
      setSpeech('!')
      playBoopSound(1)
      setTimeout(() => {
        setSwatting(false)
        setSpeech(null)
        s.state = 'rest'
      }, 320)
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const s = sim.current
      s.swatCooldown -= 0.1
      s.calmTimer += 0.1
      if (s.calmTimer > 6 && s.state === 'rest') {
        s.state = 'sleep'
        setIsSleeping(true)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">kitty · swat at cursor</span>
        <span className="play-status">{isSleeping ? 'Dozing (zzz)' : swatting ? 'SWAT!' : 'Lounging'}</span>
      </div>

      <div
        ref={stageRef}
        className="kitty-lounge-stage"
        onPointerMove={handlePointerMove}
        onClick={petKitty}
        title="Brush past the paws to trigger swat! Click to pet."
      >
        <div className="kitty-sofa-shelf">
          <div
            className={`kitty-body ${swatting ? 'is-swatting' : ''}`}
            style={{
              transform: `scaleX(${face}) ${swatting ? 'scale(1.1) rotate(-6deg)' : ''}`,
            }}
          >
            <div style={{ transform: `rotate(${headTilt * face}deg)`, transition: 'transform 0.08s ease' }}>
              <Pippo {...sheets('cat')} label="kitty mascot" size={62} />
            </div>

            {/* Dynamic Swat Paw & Scratch streaks */}
            <div className={`kitty-swat-paw ${swatting ? 'is-active' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" className="paw-scratch-svg">
                <path d="M4 4 L14 14 M9 2 L19 12 M2 9 L12 19" stroke="var(--pink)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {speech && (
            <div className="speech-bubble" aria-live="polite">
              <span>{speech}</span>
            </div>
          )}

          {isSleeping && (
            <div className="kitty-sleep-badge" aria-live="polite">
              <span>z z</span>
            </div>
          )}
        </div>
        <span className="kitty-hint">Brush past the cat or click to pet</span>
      </div>

      <p className="play-caption">
        Lounges lazily on your element, taking a nap until your cursor dares to brush past its paws.
      </p>

      <div className="pal-code-snip">
        <code>&lt;h2&gt; Nap spot &lt;piix-pal pal="kitty"&gt;&lt;/piix-pal&gt; &lt;/h2&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('kitty', '<h2>Nap spot <piix-pal pal="kitty"></piix-pal></h2>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   CHARACTER 5: MOSS READER (mind.js 3-POKE HOPPING & ZERO EMOJI)
   ========================================================================= */
function MossReaderPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [side, setSide] = useState<'left' | 'right'>('right')
  const [hopArc, setHopArc] = useState({ x: 0, y: 0 })
  const [isHopping, setIsHopping] = useState(false)
  const [speech, setSpeech] = useState<string | null>(null)
  const [pageFlip, setPageFlip] = useState(false)

  const sim = useRef({
    pokes: 0,
    lastPoke: 0,
  })

  // Periodic page flip animation
  useEffect(() => {
    const flipTimer = setInterval(() => {
      setPageFlip(true)
      setTimeout(() => setPageFlip(false), 380)
    }, 4200)
    return () => clearInterval(flipTimer)
  }, [])

  // 3-Poke relocates Moss with true parabolic leap across the text!
  const handlePoke = useCallback(() => {
    if (isHopping) return
    const s = sim.current
    const now = Date.now()
    if (now - s.lastPoke > 4000) s.pokes = 0
    s.pokes++
    s.lastPoke = now

    if (s.pokes >= 3) {
      s.pokes = 0
      setSpeech('grr')
      playDizzySound()
      setIsHopping(true)

      const startX = side === 'right' ? 70 : -70
      const targetX = side === 'right' ? -70 : 70
      let startTime: number | null = null

      const hopTick = (t: number) => {
        if (startTime === null) startTime = t
        const p = Math.min(1, (t - startTime) / 550)
        const q = 1 - p
        const curX = startX + (targetX - startX) * p
        const curY = -(4 * p * q) * 44 // Parabolic leap arc
        setHopArc({ x: curX, y: curY })

        if (p < 1) {
          requestAnimationFrame(hopTick)
        } else {
          setSide((curr) => (curr === 'right' ? 'left' : 'right'))
          setHopArc({ x: 0, y: 0 })
          setIsHopping(false)
          setSpeech('...')
          playBoopSound(1)
          setTimeout(() => setSpeech(null), 1200)
        }
      }

      requestAnimationFrame(hopTick)
      return
    }

    setSpeech(s.pokes === 1 ? '...' : 'leave me be')
    playBoopSound(1)
    setTimeout(() => setSpeech(null), 1000)
  }, [isHopping, side])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">moss · minding its business</span>
        <span className="play-status">{isHopping ? 'Relocating!' : 'Deep in reading'}</span>
      </div>

      <div
        className="moss-reading-stage"
        onClick={handlePoke}
        title="Quietly reads its book. Poke it 3 times to make it hop to the other side!"
      >
        <div
          className="moss-reader-wrap"
          style={{
            transform: isHopping ? `translate(${hopArc.x}px, ${hopArc.y}px)` : 'none',
            alignSelf: side === 'right' ? 'flex-end' : 'flex-start',
            transition: isHopping ? 'none' : 'align-self 0.2s',
          }}
        >
          <Pippo {...sheets('moss')} label="moss buddy" size={54} />

          {/* Open Vector SVG Book (Pure SVG, NO emoji) */}
          <div className={`mini-vector-book ${pageFlip ? 'is-flipping' : ''}`}>
            <BookOpenIcon size={14} />
          </div>

          {speech && (
            <div className="speech-bubble" aria-live="polite">
              <span>{speech}</span>
            </div>
          )}
        </div>

        <p className="moss-book-text">"Some light reading for a slow afternoon on the internet..."</p>
      </div>

      <p className="play-caption">
        Sits quietly on your text reading its book, ignoring you (mostly). Click to interrupt!
      </p>

      <div className="pal-code-snip">
        <code>&lt;p&gt; Quiet reads &lt;piix-pal pal="moss"&gt;&lt;/piix-pal&gt; &lt;/p&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('moss', '<p>Quiet reads <piix-pal pal="moss"></piix-pal></p>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   CHARACTER 6: SHEL SNAIL (creep.js REAL IRIDESCENT SVG SLIME TRAIL)
   ========================================================================= */
function ShelSnailPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [x, setX] = useState(60)
  const [face, setFace] = useState(1)
  const [trailLen, setTrailLen] = useState(40)
  const [state, setState] = useState<'walk' | 'hide'>('walk')
  const [speech, setSpeech] = useState<string | null>(null)
  const [squash, setSquash] = useState(1)
  const stageRef = useRef<HTMLDivElement>(null)

  const sim = useRef({
    x: 60,
    face: 1,
    speed: 24, // px/sec
    run: 40,
    state: 'walk' as 'walk' | 'hide',
    hideTimer: 0,
    mouseX: -9999,
    mouseY: -9999,
    mouseActive: false,
    crawlTime: 0,
  })

  const pokeSnail = () => {
    const s = sim.current
    s.state = 'hide'
    s.hideTimer = 2.4
    setState('hide')
    setSpeech('eep!')
    playBoopSound(1)
    setTimeout(() => setSpeech(null), 800)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    sim.current.mouseX = e.clientX - rect.left
    sim.current.mouseY = e.clientY - rect.top
    sim.current.mouseActive = true
  }

  const handlePointerLeave = () => {
    sim.current.mouseX = -9999
    sim.current.mouseY = -9999
    sim.current.mouseActive = false
  }

  useEffect(() => {
    let animId: number
    let lastTime = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033) || 0.016
      lastTime = now
      const s = sim.current
      const stageWidth = stageRef.current ? stageRef.current.clientWidth : 280

      const dist = s.mouseActive ? Math.hypot(s.mouseX - s.x, s.mouseY - 70) : 9999

      if (dist < 64 && s.state === 'walk') {
        s.state = 'hide'
        s.hideTimer = 2.0
        setState('hide')
        setSpeech('...')
        setTimeout(() => setSpeech(null), 800)
      }

      if (s.state === 'hide') {
        s.hideTimer -= dt
        if (s.hideTimer <= 0 && dist > 75) {
          s.state = 'walk'
          setState('walk')
        }
      } else if (s.state === 'walk') {
        s.crawlTime += dt
        // Biological peristaltic crawl wave
        const wave = 1 + 0.1 * Math.sin(s.crawlTime * 5)
        setSquash(wave)

        // Creep forward
        s.x += s.face * s.speed * dt
        s.run = Math.min(s.run + s.speed * dt, 130)

        // Turn around at borders
        if (s.x > stageWidth - 45) {
          s.face = -1
          s.run = 10
        } else if (s.x < 35) {
          s.face = 1
          s.run = 10
        }

        setX(s.x)
        setFace(s.face)
        setTrailLen(s.run)
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">shel · shiny trail</span>
        <span className="play-status">{state === 'hide' ? 'Hiding in shell' : 'Slow & steady'}</span>
      </div>

      <div
        ref={stageRef}
        className="shel-trail-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={pokeSnail}
        title="Creeps along leaving a shiny iridescent trail. Hover close to make it hide!"
      >
        {/* Real Dynamic Iridescent Slime Trail SVG */}
        <svg
          className="shel-real-slime-svg"
          style={{
            position: 'absolute',
            left: 0,
            bottom: '36px',
            width: '100%',
            height: '14px',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <linearGradient id="slime-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="60%" stopColor="rgba(163, 230, 53, 0.45)" />
              <stop offset="100%" stopColor="var(--lime)" />
            </linearGradient>
          </defs>
          <line
            x1={face > 0 ? x - trailLen : x + trailLen}
            y1="7"
            x2={x}
            y2="7"
            stroke="url(#slime-grad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

        {/* Snail Mascot with Biological Crawl Wave */}
        <div
          className={`shel-creeper-body is-${state}`}
          style={{
            left: `${x}px`,
            bottom: '28px',
            position: 'absolute',
            transform: `translateX(-50%) scaleX(${face}) scale(${state === 'hide' ? 0.76 : squash})`,
            transition: state === 'hide' ? 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          }}
        >
          <Pippo {...sheets('pug')} label="shel companion" size={46} />
          {speech && (
            <div className="speech-bubble" aria-live="polite">
              <span>{speech}</span>
            </div>
          )}
        </div>

        <span className="shel-quote">"Slow and steady wins the race."</span>
      </div>

      <p className="play-caption">
        Creeps gradually along headings and paragraph rims, leaving an iridescent trail behind.
      </p>

      <div className="pal-code-snip">
        <code>&lt;h2&gt; Slow &amp; steady &lt;piix-pal pal="shel"&gt;&lt;/piix-pal&gt; &lt;/h2&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('shel', '<h2>Slow & steady <piix-pal pal="shel"></piix-pal></h2>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 2 INTERACTION: TERMI TERMINAL (MULTI-LINE HOVER HOPPING)
   ========================================================================= */
const TERMI_COMMANDS = [
  '$ npm i pippo-mascot',
  '✓ added 1 package in 0.08s',
  '$ cp public/sprites/* ./',
  '✓ 55 buddies downloaded and ready',
  '$ import { Pippo } from "pippo-mascot"',
  '✓ 0kb dependencies, GPU 60fps',
]

function TermiTerminalPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [activeLine, setActiveLine] = useState(0)
  const [hopY, setHopY] = useState(0)
  const [isHopping, setIsHopping] = useState(false)

  const handleHoverLine = useCallback((index: number) => {
    if (index === activeLine || isHopping) return
    setIsHopping(true)
    playBoopSound(1)

    const startY = activeLine * 24
    const targetY = index * 24
    let startTime: number | null = null

    const animHop = (now: number) => {
      if (startTime === null) startTime = now
      const p = Math.min(1, (now - startTime) / 220)
      const q = 1 - p
      const curY = startY + (targetY - startY) * p - (4 * p * q) * 16
      setHopY(curY)
      if (p < 1) {
        requestAnimationFrame(animHop)
      } else {
        setActiveLine(index)
        setHopY(targetY)
        setIsHopping(false)
      }
    }
    requestAnimationFrame(animHop)
  }, [activeLine, isHopping])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">termi · hover command lines</span>
        <span className="play-status">Line {activeLine + 1}</span>
      </div>

      <div className="termi-window-stage">
        <div className="termi-bar">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="termi-title">bash — pippo-mascot</span>
        </div>

        <div className="termi-body-multi">
          {/* Perched Frog hopping across lines */}
          <div
            className="termi-frog-companion"
            style={{
              transform: `translateY(${hopY}px)`,
            }}
          >
            <Pippo {...sheets('frog')} label="terminal frog" size={34} />
          </div>

          <div className="termi-lines-list">
            {TERMI_COMMANDS.map((cmd, idx) => (
              <div
                key={cmd}
                className={`termi-line-row ${idx === activeLine ? 'is-active-line' : ''}`}
                onMouseEnter={() => handleHoverLine(idx)}
                onClick={() => handleHoverLine(idx)}
              >
                <span className="termi-line-text">{cmd}</span>
                {idx === activeLine && <span className="termi-cursor" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="play-caption">
        Hover over any command line in the terminal and watch the little companion hop directly to your active line!
      </p>

      <div className="pal-code-snip">
        <code>&lt;piix-pal pal="termi" lines="npm i pippo|✓ 60fps"&gt;&lt;/piix-pal&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('termi', '<piix-pal pal="termi" lines="npm i pippo|✓ 60fps"></piix-pal>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 2 INTERACTION: PEEPER PASSWORD PROTECTOR
   ========================================================================= */
function PasswordPeeperPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [passwordActive, setPasswordActive] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [peekMode, setPeekMode] = useState(false)

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">peeper · type a secret</span>
        <span className="play-status">{passwordActive ? (peekMode ? 'Peeking through paws' : 'Eyes covered') : 'Watching'}</span>
      </div>

      <div className="peeper-stage">
        <div
          className={`peeper-mascot-box ${passwordActive ? 'is-covering' : ''} ${peekMode ? 'is-peeking' : ''}`}
          title={passwordActive ? "I'm not peeking!" : "I'm watching your typing"}
        >
          <Pippo {...sheets('bear')} label="peeper bear" size={78} />
          {passwordActive && (
            <div className="peeper-blindfold" aria-hidden="true">
              <span>{peekMode ? '*peek!*' : 'shh! not looking'}</span>
            </div>
          )}
        </div>

        <label className="play-input-label">
          <span>Super Secret Password</span>
          <div className="input-with-peek-btn">
            <input
              type={peekMode ? 'text' : 'password'}
              className="play-text-input"
              placeholder="type secret password..."
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              onFocus={() => {
                setPasswordActive(true)
                playBoopSound(1)
              }}
              onBlur={() => setPasswordActive(false)}
            />
            <button
              type="button"
              className="btn-peek-toggle"
              onClick={() => {
                setPeekMode(!peekMode)
                playClickSound()
              }}
            >
              <span>{peekMode ? 'Hide' : 'Peek'}</span>
            </button>
          </div>
        </label>
      </div>

      <p className="play-caption">
        Focus the password input and the mascot covers its eyes with tactile paws so your secrets stay safe.
      </p>

      <div className="pal-code-snip">
        <code>&lt;label&gt; Password &lt;piix-pal pal="peeper"&gt;&lt;/piix-pal&gt; &lt;/label&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('peeper', '<label><input type="password"><piix-pal pal="peeper"></piix-pal></label>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 2 INTERACTION: CAPTCHA ROBOT CRISIS
   ========================================================================= */
function CaptchaPanicPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [isRobotChecked, setIsRobotChecked] = useState(false)

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">gearbot · captcha panic</span>
        <span className="play-status">{isRobotChecked ? 'Identity Crisis!' : 'Normal bot'}</span>
      </div>

      <div className="robot-stage">
        <div className={`robot-mascot-box ${isRobotChecked ? 'is-panicking' : ''}`}>
          <Pippo {...sheets('gearbot')} label="gearbot robot" size={78} />
          {isRobotChecked && (
            <div className="speech-bubble" aria-live="polite">
              <span>WAIT... AM I A ROBOT?!</span>
            </div>
          )}
        </div>

        <label
          className="play-checkbox-label"
          onClick={() => {
            const next = !isRobotChecked
            setIsRobotChecked(next)
            if (next) playDizzySound()
            else playClickSound()
          }}
        >
          <span className={`custom-checkbox ${isRobotChecked ? 'is-checked' : ''}`}>
            {isRobotChecked && <CheckIcon size={14} />}
          </span>
          <span className="checkbox-text">I am definitely not a robot</span>
        </label>
      </div>

      <p className="play-caption">
        Tick the checkbox to give your robot companion a hilarious existential identity crisis.
      </p>

      <div className="pal-code-snip">
        <code>&lt;label&gt; &lt;input type="checkbox"&gt; &lt;piix-pal pal="beep"&gt;&lt;/piix-pal&gt; &lt;/label&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('beep', '<label><input type="checkbox"> Not a robot <piix-pal pal="beep"></piix-pal></label>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 2 INTERACTION: ROCKET DEPLOY
   ========================================================================= */
function RocketDeployPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [isLaunched, setIsLaunched] = useState(false)

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">rocket · click deploy</span>
        <span className="play-status">{isLaunched ? 'Orbit Achieved!' : 'Ready on pad'}</span>
      </div>

      <div className="rocket-stage">
        <div className={`rocket-mascot-box ${isLaunched ? 'is-launching' : ''}`}>
          <Pippo {...sheets('rocket')} label="rocket buddy" size={78} />
          {isLaunched && (
            <div className="rocket-smoke-plume" aria-hidden="true">
              <FlameIcon size={24} />
            </div>
          )}
        </div>

        <button
          type="button"
          className={`btn btn-lime btn-sm w-full ${isLaunched ? 'btn-launching' : ''}`}
          onClick={() => {
            if (isLaunched) return
            setIsLaunched(true)
            playChimeSound()
            setTimeout(() => setIsLaunched(false), 2400)
          }}
          disabled={isLaunched}
        >
          <span>{isLaunched ? 'Blasting Off...' : 'Ship To Production'}</span>
          <ArrowUpRightIcon size={14} />
        </button>
      </div>

      <p className="play-caption">
        Click deploy to send your mascot soaring into orbit with countdown and thruster smoke.
      </p>

      <div className="pal-code-snip">
        <code>&lt;button class="deploy"&gt; Deploy &lt;piix-pal pal="rocket"&gt;&lt;/piix-pal&gt; &lt;/button&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('rocket', '<button class="deploy">Deploy <piix-pal pal="rocket"></piix-pal></button>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 2 INTERACTION: WI-FI ROUTER OSCILLATION
   ========================================================================= */
function RouterSignalPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [routerBars, setRouterBars] = useState(2)

  const handleRouterMove = (e: React.PointerEvent) => {
    const target = e.currentTarget.getBoundingClientRect()
    const dist = Math.abs(e.clientX - (target.left + target.width / 2))
    const bars = Math.max(1, Math.min(4, Math.floor(4 - dist / 50)))
    setRouterBars(bars)
  }

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">router · wi-fi signal</span>
        <span className="play-status">Signal: {routerBars}/4 bars</span>
      </div>

      <div className="router-stage" onPointerMove={handleRouterMove}>
        <div className="router-device-wrap">
          <Pippo {...sheets('radio')} label="router pal" size={58} />
          <div className="router-signal-bars">
            {[1, 2, 3, 4].map((b) => (
              <span
                key={b}
                className={`bar ${b <= routerBars ? 'is-lit' : ''}`}
                style={{ height: `${b * 6}px` }}
              />
            ))}
          </div>
        </div>
        <span className="router-caption">Move mouse closer for full signal</span>
      </div>

      <p className="play-caption">
        A Wi-Fi router companion whose glowing signal waves fluctuate based on cursor proximity.
      </p>

      <div className="pal-code-snip">
        <code>&lt;piix-pal pal="router"&gt;&lt;/piix-pal&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('router', '<piix-pal pal="router"></piix-pal>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 2 INTERACTION: PENGUIN BELLY SLIDE
   ========================================================================= */
function PenguinSlidePlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [slideX, setSlideX] = useState(50)
  const [face, setFace] = useState(1)
  const [isSliding, setIsSliding] = useState(false)
  const isSlidingRef = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
  }, [])

  const triggerSlide = useCallback(() => {
    if (isSlidingRef.current) return
    isSlidingRef.current = true
    setIsSliding(true)
    playSqueakSound()

    const stageWidth = stageRef.current?.clientWidth ?? 280
    const target = face > 0 ? Math.max(20, stageWidth - 76) : 20
    const start = slideX
    let startTime: number | null = null

    const anim = (t: number) => {
      if (startTime === null) startTime = t
      const p = Math.min(1, (t - startTime) / 480)
      // Ease out deceleration
      const ease = 1 - Math.pow(1 - p, 2)
      setSlideX(start + (target - start) * ease)
      if (p < 1) {
        frameRef.current = requestAnimationFrame(anim)
      } else {
        setFace((f) => -f)
        isSlidingRef.current = false
        setIsSliding(false)
      }
    }
    frameRef.current = requestAnimationFrame(anim)
  }, [face, slideX])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">penguin · belly slide</span>
        <span className="play-status">{isSliding ? 'Sliding!' : 'Ready to slide'}</span>
      </div>

      <div ref={stageRef} className="penguin-ice-stage" onClick={triggerSlide}>
        <div
          className="penguin-slider-body"
          style={{
            transform: `translateX(${slideX}px) scaleX(${face})`,
            transition: 'transform 0.05s linear',
          }}
        >
          <Pippo {...sheets('penguin')} label="penguin companion" size={54} />
        </div>
        <div className="ice-trail-sparkle" />
      </div>

      <p className="play-caption">
        Belly-slides seamlessly along text blocks and cards, waddling happily on every turn.
      </p>

      <div className="pal-code-snip">
        <code>&lt;piix-pal pal="penguin" on=".ice"&gt;&lt;/piix-pal&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('penguin', '<piix-pal pal="penguin" on=".ice"></piix-pal>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 4 GROUP: DUCKS PARADE (KINEMATIC CHAIN FOLLOWING)
   ========================================================================= */
function DucksParadePlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [duckStep, setDuckStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDuckStep((s) => (s + 1) % 360)
    }, 40)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">ducks · family parade</span>
        <span className="play-status">4 in line</span>
      </div>

      <div className="ducks-parade-stage">
        <div className="duck-mother" style={{ transform: `translateY(${Math.sin(duckStep / 10) * 3}px)` }}>
          <Pippo {...sheets('dino')} label="mother duck" size={48} />
        </div>
        <div className="duck-child child-1" style={{ transform: `translateY(${Math.sin((duckStep + 20) / 10) * 3}px)` }}>
          <Pippo {...sheets('dino')} label="duckling 1" size={28} />
        </div>
        <div className="duck-child child-2" style={{ transform: `translateY(${Math.sin((duckStep + 40) / 10) * 3}px)` }}>
          <Pippo {...sheets('dino')} label="duckling 2" size={28} />
        </div>
        <div className="duck-child child-3" style={{ transform: `translateY(${Math.sin((duckStep + 60) / 10) * 3}px)` }}>
          <Pippo {...sheets('dino')} label="duckling 3" size={28} />
        </div>
      </div>

      <p className="play-caption">A devoted mother duck and her adorable ducklings waddling in a synchronized row.</p>

      <div className="pal-code-snip">
        <code>&lt;piix-pal pal="ducks" count="4"&gt;&lt;/piix-pal&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('ducks', '<piix-pal pal="ducks" count="4"></piix-pal>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 4 GROUP: THE CHOIR (HARMONIC SWAY & REAL PITCH NOTES)
   ========================================================================= */
function ChoirHarmonyPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [activeSinger, setActiveSinger] = useState<number | null>(null)
  const [choirActive, setChoirActive] = useState(false)

  const singSingle = (index: number, freq: number) => {
    setActiveSinger(index)
    playMusicNoteSound(freq)
    setTimeout(() => setActiveSinger(null), 500)
  }

  const handleChoirSing = () => {
    setChoirActive(true)
    playChoirSequenceSound()
    setTimeout(() => setChoirActive(false), 1200)
  }

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">choir · sway &amp; sing</span>
        <span className="play-status">{choirActive ? 'Singing harmony' : 'In tune'}</span>
      </div>

      <div className="choir-stage">
        <div className={`choir-row ${choirActive ? 'is-singing' : ''}`}>
          <div className={`choir-member ${activeSinger === 0 ? 'is-solo' : ''}`} onClick={() => singSingle(0, 523.25)}>
            <Pippo {...sheets('bear')} label="choir singer 1" size={46} />
            <span className="singer-pitch-badge">C</span>
          </div>
          <div className={`choir-member ${activeSinger === 1 ? 'is-solo' : ''}`} onClick={() => singSingle(1, 659.25)}>
            <Pippo {...sheets('fox')} label="choir singer 2" size={46} />
            <span className="singer-pitch-badge">E</span>
          </div>
          <div className={`choir-member ${activeSinger === 2 ? 'is-solo' : ''}`} onClick={() => singSingle(2, 783.99)}>
            <Pippo {...sheets('bunny')} label="choir singer 3" size={46} />
            <span className="singer-pitch-badge">G</span>
          </div>
          <div className={`choir-member ${activeSinger === 3 ? 'is-solo' : ''}`} onClick={() => singSingle(3, 1046.5)}>
            <Pippo {...sheets('kibo')} label="choir singer 4" size={46} />
            <span className="singer-pitch-badge">C+</span>
          </div>
        </div>

        <button type="button" className="btn btn-paper btn-xs mt-3" onClick={handleChoirSing}>
          <MusicIcon size={12} />
          <span>Sing harmony chord</span>
        </button>
      </div>

      <p className="play-caption">Sway in rhythm and sing in harmonic tuning from a shared musical tempo.</p>

      <div className="pal-code-snip">
        <code>&lt;piix-pal pal="choir" count="4" bpm="96"&gt;&lt;/piix-pal&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('choir', '<piix-pal pal="choir" count="4" bpm="96"></piix-pal>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 4 GROUP: DRIFTING FIREFLIES
   ========================================================================= */
function FirefliesNightPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">fireflies · ambient glow</span>
        <span className="play-status">12 glowing</span>
      </div>

      <div className="fireflies-night-stage" onClick={() => playBoopSound(1)}>
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="firefly-glow-dot"
            style={{
              top: `${15 + (i * 19) % 70}%`,
              left: `${10 + (i * 27) % 80}%`,
              animationDelay: `${i * 0.35}s`,
              animationDuration: `${2.2 + (i % 3) * 0.8}s`,
            }}
          />
        ))}
        <div className="fireflies-mascot-center">
          <Pippo {...sheets('lantern')} label="lantern buddy" size={54} />
        </div>
      </div>

      <p className="play-caption">Soft, warm luminous lights drifting gently around dark cards and nighttime elements.</p>

      <div className="pal-code-snip">
        <code>&lt;section class="dark"&gt; &lt;piix-pal pal="fireflies"&gt;&lt;/piix-pal&gt; &lt;/section&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('fireflies', '<section class="dark"><piix-pal pal="fireflies" count="12"></piix-pal></section>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   TAB 4 GROUP: SHEEP JUMPING FENCE
   ========================================================================= */
function SheepSleepPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [sheepCount, setSheepCount] = useState(1)

  useEffect(() => {
    const timer = setInterval(() => {
      setSheepCount((c) => (c % 99) + 1)
    }, 2400)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">sheep · count to sleep</span>
        <span className="play-status">Count: {sheepCount}</span>
      </div>

      <div className="sheep-fence-stage">
        <div className="wooden-fence-post" />
        <div className="leaping-sheep-wrap">
          <Pippo {...sheets('sheep')} label="jumping sheep" size={52} />
        </div>
      </div>

      <p className="play-caption">Sheep trot along in single file and jump the fence one by one forever.</p>

      <div className="pal-code-snip">
        <code>&lt;div class="loading"&gt; &lt;piix-pal pal="sheep"&gt;&lt;/piix-pal&gt; &lt;/div&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('sheep', '<div class="loading"><piix-pal pal="sheep"></piix-pal></div>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   CHARACTER 7: BITBUG (CRAWLS ON REAL LETTER OUTLINES)
   ========================================================================= */
function BitbugPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const letters = 'HELLOPALS'.split('')
  const [crawledIdx, setCrawledIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCrawledIdx((prev) => (prev + 1) % letters.length)
    }, 620)
    return () => clearInterval(timer)
  }, [letters.length])

  const handlePoke = () => {
    setIsFlipped(true)
    playBoopSound(1)
    setTimeout(() => setIsFlipped(false), 900)
  }

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">bitbug · letter crawler</span>
        <span className="play-status">{isFlipped ? 'Flipped over!' : 'Crawling outline'}</span>
      </div>

      <div className="bitbug-stage" onClick={handlePoke} title="A beetle that crawls glyph paths. Click to flip onto back!">
        <div className="bitbug-letters-wrap">
          {letters.map((char, i) => (
            <span key={i} className={`bitbug-char ${i === crawledIdx ? 'is-crawled' : ''}`}>
              {char}
            </span>
          ))}
        </div>
        <div
          className="bitbug-mascot-crawler"
          style={{
            left: `calc(18% + ${crawledIdx * 25}px)`,
            transform: isFlipped ? 'rotate(180deg) scale(0.9)' : 'none',
          }}
        >
          <Pippo {...sheets('bitbug')} label="bitbug companion" size={46} />
        </div>
      </div>

      <p className="play-caption">
        A lime beetle that crawls along the real outline of your letters. Poke it to flip it on its back!
      </p>

      <div className="pal-code-snip">
        <code>&lt;h1&gt; Hello &lt;piix-pal pal="bitbug"&gt;&lt;/piix-pal&gt; &lt;/h1&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('bitbug', '<h1>Hello <piix-pal pal="bitbug"></piix-pal></h1>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   CHARACTER 8: BOING (JELLY DROP BOUNCE SPLAT)
   ========================================================================= */
function BoingPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [jumpY, setJumpY] = useState(0)
  const [squash, setSquash] = useState({ sx: 1, sy: 1 })
  const [splat, setSplat] = useState(false)

  const doJump = useCallback(() => {
    let start: number | null = null
    const duration = 650
    const tick = (t: number) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / duration)
      const q = 1 - p
      const y = -(4 * p * q) * 58
      setJumpY(y)
      if (p < 0.2) setSquash({ sx: 0.85, sy: 1.2 })
      else if (p > 0.8) setSquash({ sx: 1.25, sy: 0.8 })
      else setSquash({ sx: 1, sy: 1 })

      if (p < 1) {
        requestAnimationFrame(tick)
      } else {
        setJumpY(0)
        setSquash({ sx: 1.35, sy: 0.65 })
        setSplat(true)
        playPopSound()
        setTimeout(() => {
          setSquash({ sx: 1, sy: 1 })
          setSplat(false)
        }, 220)
      }
    }
    requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    const timer = setInterval(doJump, 2800)
    return () => clearInterval(timer)
  }, [doJump])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">boing · jelly drop</span>
        <span className="play-status">{splat ? 'Splat!' : 'Bouncing'}</span>
      </div>

      <div className="boing-footer-stage" onClick={doJump} title="Click to trigger high bounce!">
        <div className="boing-floor-line" />
        {splat && <div className="boing-splat-ripple" />}
        <div
          className="boing-jelly-wrap"
          style={{
            transform: `translateY(${jumpY}px) scale(${squash.sx}, ${squash.sy})`,
          }}
        >
          <Pippo {...sheets('boing')} label="boing jelly" size={54} />
        </div>
      </div>

      <p className="play-caption">
        A jelly drop that bounces on your footer and lands with a splat. Drag and throw it, too!
      </p>

      <div className="pal-code-snip">
        <code>&lt;footer&gt; ... &lt;piix-pal pal="boing"&gt;&lt;/piix-pal&gt; &lt;/footer&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('boing', '<footer>... <piix-pal pal="boing"></piix-pal></footer>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   CHARACTER 9: THREAD (SPIDER DANGLING FROM NAV)
   ========================================================================= */
function ThreadPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [wireLength, setWireLength] = useState(75)
  const [swingAngle, setSwingAngle] = useState(0)

  useEffect(() => {
    let t0 = performance.now()
    let animId: number
    const tick = (now: number) => {
      const elapsed = (now - t0) / 1000
      setSwingAngle(Math.sin(elapsed * 2.4) * 12)
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [])

  const handlePoke = () => {
    setWireLength((prev) => (prev > 95 ? 50 : prev + 30))
    playBoopSound(2)
  }

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">thread · spider dangle</span>
        <span className="play-status">Dangle: {wireLength}px</span>
      </div>

      <div className="thread-dangle-stage" onClick={handlePoke} title="Click to reel in / descend silk thread!">
        <div className="thread-top-rail" />
        <div
          className="thread-silk-line"
          style={{
            height: `${wireLength}px`,
            transform: `rotate(${swingAngle}deg)`,
          }}
        >
          <div className="thread-spider-wrap">
            <Pippo {...sheets('thread')} label="thread spider" size={48} />
          </div>
        </div>
      </div>

      <p className="play-caption">
        A spider that dangles from your nav on a long thread. Tap to reel it up or let it drop!
      </p>

      <div className="pal-code-snip">
        <code>&lt;nav&gt; &lt;piix-pal pal="thread" length="90"&gt;&lt;/piix-pal&gt; &lt;/nav&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('thread', '<nav><piix-pal pal="thread" length="90"></piix-pal></nav>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   INTERACTION 7: SCROLLY (RIDES REAL PROGRESS TRACK)
   ========================================================================= */
function ScrollyRidePlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [pos, setPos] = useState(45)

  useEffect(() => {
    const updatePageProgress = () => {
      const root = document.documentElement
      const scrollable = root.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      setPos(Math.round((window.scrollY / scrollable) * 100))
    }
    updatePageProgress()
    window.addEventListener('scroll', updatePageProgress, { passive: true })
    window.addEventListener('resize', updatePageProgress)
    return () => {
      window.removeEventListener('scroll', updatePageProgress)
      window.removeEventListener('resize', updatePageProgress)
    }
  }, [])

  const handleDrag = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPos(Number(e.target.value))
  }

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">scrolly · scroll track rider</span>
        <span className="play-status">{pos}% scrolled</span>
      </div>

      <div className="scrolly-track-stage">
        <div className="scrolly-rail">
          <div className="scrolly-fill" style={{ width: `${pos}%` }} />
          <div className="scrolly-rider" style={{ left: `${pos}%` }}>
            <Pippo {...sheets('scrolly')} label="scrolly pal" size={46} />
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={pos}
          onChange={handleDrag}
          style={{ width: '100%', marginTop: '24px', cursor: 'pointer' }}
          aria-label="Scroll track simulator"
        />
      </div>

      <p className="play-caption">Rides your scroll bar or progress indicator in real-time as users browse.</p>

      <div className="pal-code-snip">
        <code>&lt;div class="scroll"&gt; &lt;piix-pal pal="scrolly"&gt;&lt;/piix-pal&gt; &lt;/div&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('scrolly', '<div class="scroll"><piix-pal pal="scrolly"></piix-pal></div>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   INTERACTION 8: BEEP (TACTILE BUTTON CLICKER)
   ========================================================================= */
function BeepCounterPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [clicks, setClicks] = useState(0)
  const [pressed, setPressed] = useState(false)

  const handleClick = () => {
    setClicks((c) => c + 1)
    setPressed(true)
    playClickSound()
    setTimeout(() => setPressed(false), 120)
  }

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">beep · tactile clicker</span>
        <span className="play-status">{clicks} clicks</span>
      </div>

      <div className="beep-button-stage">
        <button
          type="button"
          className={`beep-tactile-btn ${pressed ? 'is-pressed' : ''}`}
          onClick={handleClick}
          aria-label="Tactile push button"
        >
          <div className={`beep-led ${pressed ? '' : 'is-dim'}`} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700 }}>PUSH</span>
        </button>

        <Pippo {...sheets('beep')} label="beep counter companion" size={54} />
      </div>

      <p className="play-caption">Mechanical clicker button that springs back and counts user interactions.</p>

      <div className="pal-code-snip">
        <code>&lt;button&gt; Click &lt;piix-pal pal="beep"&gt;&lt;/piix-pal&gt; &lt;/button&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('beep', '<button>Click <piix-pal pal="beep"></piix-pal></button>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   INTERACTION 9: SNIP (BORDER SCISSORS TRIMMER)
   ========================================================================= */
function SnipBorderPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [snipPos, setSnipPos] = useState(15)

  useEffect(() => {
    const timer = setInterval(() => {
      setSnipPos((prev) => (prev > 80 ? 10 : prev + 12))
    }, 700)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">snip · border trimmer</span>
        <span className="play-status">Trimming perimeter</span>
      </div>

      <div className="snip-trimmer-stage" onClick={() => playPopSound()}>
        <div className="snip-dashed-box">
          <span>dashed card boundary</span>
          <div className="snip-scissor-rider" style={{ left: `${snipPos}%` }}>
            <Pippo {...sheets('snip')} label="snip trimmer" size={44} />
          </div>
        </div>
      </div>

      <p className="play-caption">Scampers along container borders cutting dashed coupons or dividing cards.</p>

      <div className="pal-code-snip">
        <code>&lt;div class="coupon"&gt; &lt;piix-pal pal="snip"&gt;&lt;/piix-pal&gt; &lt;/div&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('snip', '<div class="coupon"><piix-pal pal="snip"></piix-pal></div>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   INTERACTION 10: ECHO (ACOUSTIC PULSE SONAR)
   ========================================================================= */
function EchoSoundPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [echoKey, setEchoKey] = useState(0)

  const handlePulse = () => {
    setEchoKey((k) => k + 1)
    playMusicNoteSound(600)
  }

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">echo · audio pulse sonar</span>
        <span className="play-status">{echoKey ? `Ping ${echoKey}` : 'Ready to ping'}</span>
      </div>

      <div className="echo-sonar-stage" onClick={handlePulse} title="Click to ping audio pulse!">
        <div key={echoKey} className="echo-wave-ring" />
        <Pippo {...sheets('echo')} label="echo companion" size={54} />
      </div>

      <p className="play-caption">Visualizes audio feedback or keystrokes with expanding sonar shockwaves.</p>

      <div className="pal-code-snip">
        <code>&lt;input&gt; &lt;piix-pal pal="echo"&gt;&lt;/piix-pal&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('echo', '<input><piix-pal pal="echo"></piix-pal>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   GROUP 5: ANTS MARCHING IN TRAIL
   ========================================================================= */
function AntsMarchPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">ants · crumb carrier trail</span>
        <span className="play-status">Marching in line</span>
      </div>

      <div className="ants-march-stage">
        <div className="ants-trail-line">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`ant-carry-pair ant-carry-pair-${i}`}>
              <div className="ant-crumb-payload" />
              <Pippo {...sheets('ants')} label="worker ant" size={38} />
            </div>
          ))}
        </div>
      </div>

      <p className="play-caption">March along borders carrying crumbs across your elements in single file.</p>

      <div className="pal-code-snip">
        <code>&lt;div class="footer"&gt; &lt;piix-pal pal="ants"&gt;&lt;/piix-pal&gt; &lt;/div&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('ants', '<div class="footer"><piix-pal pal="ants"></piix-pal></div>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   GROUP 6: FISH SCHOOL
   ========================================================================= */
function FishSchoolPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">fish · fluid school</span>
        <span className="play-status">Swimming school</span>
      </div>

      <div className="fish-school-stage" onClick={() => playBoopSound(1)}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="fish-swimmer-unit"
            style={{ animationDelay: `${i * 0.45}s` }}
          >
            <Pippo {...sheets('fish')} label="swimming fish" size={44} />
          </div>
        ))}
      </div>

      <p className="play-caption">School of swimming fish undulating together through page currents.</p>

      <div className="pal-code-snip">
        <code>&lt;div class="stream"&gt; &lt;piix-pal pal="fish" count="4"&gt;&lt;/piix-pal&gt; &lt;/div&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('fish', '<div class="stream"><piix-pal pal="fish" count="4"></piix-pal></div>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   GROUP 7: SPARROWS FLOCK
   ========================================================================= */
function SparrowsFlockPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  const [frightened, setFrightened] = useState(false)

  const handleStartle = () => {
    setFrightened(true)
    playPopSound()
    setTimeout(() => setFrightened(false), 900)
  }

  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">sparrows · telephone wire</span>
        <span className="play-status">{frightened ? 'Startled!' : 'Perched on wire'}</span>
      </div>

      <div className="sparrows-flock-stage" onClick={handleStartle} title="Click to startle flock!">
        <div className="sparrow-wire">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="sparrow-percher"
              style={{
                transform: frightened ? `translateY(-30px) rotate(${i % 2 === 0 ? 15 : -15}deg)` : 'none',
              }}
            >
              <Pippo {...sheets('sparrows')} label="perched sparrow" size={42} />
            </div>
          ))}
        </div>
      </div>

      <p className="play-caption">Perch on border wires quietly and flutter into the air when clicked.</p>

      <div className="pal-code-snip">
        <code>&lt;header&gt; &lt;piix-pal pal="sparrows"&gt;&lt;/piix-pal&gt; &lt;/header&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('sparrows', '<header><piix-pal pal="sparrows"></piix-pal></header>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   GROUP 8: BEES SWARM
   ========================================================================= */
function BeesSwarmPlay({ onCopy }: { onCopy: (id: string, code: string) => void }) {
  return (
    <div className="play-card">
      <div className="play-card-head">
        <span className="play-tag">bees · pollination swarm</span>
        <span className="play-status">Orbiting flower</span>
      </div>

      <div className="bees-swarm-stage" onClick={() => playBoopSound(2)}>
        <div className="bee-flower-anchor">
          <SparklesIcon size={16} />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bee-orbiting-wrap"
            style={{ animationDelay: `${-(i * 1.05)}s` }}
          >
            <Pippo {...sheets('bees')} label={`worker bee ${i + 1}`} size={36} />
          </div>
        ))}
      </div>

      <p className="play-caption">Orbit around focal badges and buttons like busy pollinating bees.</p>

      <div className="pal-code-snip">
        <code>&lt;button&gt; Pollen &lt;piix-pal pal="bees"&gt;&lt;/piix-pal&gt; &lt;/button&gt;</code>
        <button
          type="button"
          className="btn-snip-copy"
          onClick={() => onCopy('bees', '<button>Pollen <piix-pal pal="bees"></piix-pal></button>')}
        >
          <CopyIcon size={13} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  )
}

/* =========================================================================
   MAIN INTERACTIVE PLAY HUB
   ========================================================================= */
export function InteractivePlay({ onToast }: { onToast?: (msg: string) => void }) {
  const [activeTab, setActiveTab] = useState<PalTab>('characters')
  const [showAllMobileDemos, setShowAllMobileDemos] = useState(false)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
  }, [])

  // Copy helper
  const handleCopyCode = useCallback(
    async (id: string, snippet: string) => {
      const copied = await copyText(snippet)
      if (!copied) {
        onToast?.('Could not copy code. Please copy it manually.')
        return
      }
      playClickSound()
      setCopiedCodeId(id)
      onToast?.('Copied code snippet to clipboard!')
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedCodeId(null)
        copyTimerRef.current = null
      }, 2000)
    },
    [onToast]
  )

  const changeTab = (tab: PalTab) => {
    playClickSound()
    setActiveTab(tab)
    setShowAllMobileDemos(false)
  }

  const mobileDemoToggle = (count: number) => (
    <button
      type="button"
      className="mobile-demo-toggle"
      aria-expanded={showAllMobileDemos}
      onClick={() => {
        playClickSound()
        setShowAllMobileDemos((show) => !show)
      }}
    >
      {showAllMobileDemos ? 'Show fewer demos' : `See all ${count} demos`}
      <span aria-hidden="true">{showAllMobileDemos ? '−' : '+'}</span>
    </button>
  )

  return (
    <section id="play" className="section-wrapper">
      {/* Section Header */}
      <div className="section-head text-center">
        <span className="section-kicker">
          <SparklesIcon size={14} />
          PALS &amp; SUPERPOWERS · LIVING COMPANIONS
        </span>
        <h2>Characters that live on your page.</h2>
        <p className="max-w-2xl mx-auto">
          Put one inside any element and it does the rest: crawls on headings, peeks over cards,
          snaps its tongue at cursors, and bounces on your footer. Pure CSS craft, zero external libs.
        </p>

        {/* Tab Selector Navigation */}
        <div className="pals-tab-bar" role="tablist" aria-label="Pal categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'characters'}
            aria-label="Characters, 9 demos"
            className={`pals-tab-btn ${activeTab === 'characters' ? 'is-active' : ''}`}
            onClick={() => changeTab('characters')}
          >
            <SmileIcon size={15} />
            <span className="pals-tab-copy"><span>Characters</span><span className="pals-tab-count">9</span></span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'interactions'}
            aria-label="Interactions, 10 demos"
            className={`pals-tab-btn ${activeTab === 'interactions' ? 'is-active' : ''}`}
            onClick={() => changeTab('interactions')}
          >
            <BoltIcon size={15} />
            <span className="pals-tab-copy"><span>Interactions</span><span className="pals-tab-count">10</span></span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'toys'}
            aria-label="Toys, 6 demos"
            className={`pals-tab-btn ${activeTab === 'toys' ? 'is-active' : ''}`}
            onClick={() => changeTab('toys')}
          >
            <GamepadIcon size={15} />
            <span className="pals-tab-copy"><span>Toys</span><span className="pals-tab-count">6</span></span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'groups'}
            aria-label="Groups, 8 demos"
            className={`pals-tab-btn ${activeTab === 'groups' ? 'is-active' : ''}`}
            onClick={() => changeTab('groups')}
          >
            <UsersIcon size={15} />
            <span className="pals-tab-copy"><span>Groups</span><span className="pals-tab-count">8</span></span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: CHARACTERS · 9
          ========================================================================= */}
      {activeTab === 'characters' && (
        <>
        <div className={`play-grid ${showAllMobileDemos ? 'show-all-demos' : ''}`}>
          {/* CARD 1: Frog Tongue Snap */}
          <FrogSnapPlay onCopy={handleCopyCode} />

          {/* CARD 2: Lurk Card Peeker */}
          <LurkPeekerPlay onCopy={handleCopyCode} />

          {/* CARD 3: Whack-a-Mole */}
          <WhackAMolePlay onCopy={handleCopyCode} />

          {/* CARD 4: Kitty Swat */}
          <KittySwatPlay onCopy={handleCopyCode} />

          {/* CARD 5: Moss Reader (Zero Emoji - Vector SVG Open Book) */}
          <MossReaderPlay onCopy={handleCopyCode} />

          {/* CARD 6: Shel Snail Trail */}
          <ShelSnailPlay onCopy={handleCopyCode} />

          {/* CARD 7: Bitbug Letter Crawler */}
          <BitbugPlay onCopy={handleCopyCode} />

          {/* CARD 8: Boing Jelly Splat */}
          <BoingPlay onCopy={handleCopyCode} />

          {/* CARD 9: Thread Silk Dangler */}
          <ThreadPlay onCopy={handleCopyCode} />
        </div>
        {mobileDemoToggle(9)}
        </>
      )}

      {/* =========================================================================
          TAB 2: INTERACTIONS · 10 (Termi, Peeper, Robot, Rocket, Router, Penguin, Scrolly, Beep, Snip, Echo)
          ========================================================================= */}
      {activeTab === 'interactions' && (
        <>
        <div className={`play-grid ${showAllMobileDemos ? 'show-all-demos' : ''}`}>
          <TermiTerminalPlay onCopy={handleCopyCode} />
          <PasswordPeeperPlay onCopy={handleCopyCode} />
          <CaptchaPanicPlay onCopy={handleCopyCode} />
          <RocketDeployPlay onCopy={handleCopyCode} />
          <RouterSignalPlay onCopy={handleCopyCode} />
          <PenguinSlidePlay onCopy={handleCopyCode} />
          <ScrollyRidePlay onCopy={handleCopyCode} />
          <BeepCounterPlay onCopy={handleCopyCode} />
          <SnipBorderPlay onCopy={handleCopyCode} />
          <EchoSoundPlay onCopy={handleCopyCode} />
        </div>
        {mobileDemoToggle(10)}
        </>
      )}

      {/* =========================================================================
          TAB 3: TOYS PHYSICS BOX · 6 (Ball, Duck, Dice, Pebble, Jelly Cube, Can)
          ========================================================================= */}
      {activeTab === 'toys' && (
        <div className="toys-full-card">
          <div className="play-card-head">
            <span className="play-tag">toys · tactile playground</span>
            <span className="play-status">6 physics toys</span>
          </div>

          <ToySandbox />

          <div className="pal-code-snip">
            <code>&lt;piix-pal pal="toss"&gt;&lt;/piix-pal&gt;</code>
            <button
              type="button"
              className="btn-snip-copy"
              onClick={() => handleCopyCode('toss', '<piix-pal pal="toss"></piix-pal>')}
            >
              {copiedCodeId === 'toss' ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
              <span>{copiedCodeId === 'toss' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: GROUPS & FLOCKS · 8 (Ducks, Choir, Fireflies, Sheep, Ants, Fish, Sparrows, Bees)
          ========================================================================= */}
      {activeTab === 'groups' && (
        <>
        <div className={`play-grid ${showAllMobileDemos ? 'show-all-demos' : ''}`}>
          <DucksParadePlay onCopy={handleCopyCode} />
          <ChoirHarmonyPlay onCopy={handleCopyCode} />
          <FirefliesNightPlay onCopy={handleCopyCode} />
          <SheepSleepPlay onCopy={handleCopyCode} />
          <AntsMarchPlay onCopy={handleCopyCode} />
          <FishSchoolPlay onCopy={handleCopyCode} />
          <SparrowsFlockPlay onCopy={handleCopyCode} />
          <BeesSwarmPlay onCopy={handleCopyCode} />
        </div>
        {mobileDemoToggle(8)}
        </>
      )}
    </section>
  )
}
