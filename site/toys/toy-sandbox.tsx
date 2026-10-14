import { useState, useEffect, useRef, useCallback } from 'react'
import {
  playBoopSound,
  playSqueakSound,
  playThudSound,
} from '../utils/sound'
import { RotateCwIcon } from '../ui/icons'

export type ToyType = 'ball' | 'duck' | 'dice' | 'pebble' | 'cube' | 'can'

interface ToySpec {
  name: string
  label: string
  color: string
  bounce: number
  friction: number
  weight: 'light' | 'normal' | 'heavy'
  description: string
}

const TOYS: Record<ToyType, ToySpec> = {
  ball: {
    name: 'Beach Ball',
    label: 'ball',
    color: 'var(--lime)',
    bounce: 0.78,
    friction: 0.985,
    weight: 'light',
    description: 'High bounce elasticity with spinning angular momentum.',
  },
  duck: {
    name: 'Rubber Duck',
    label: 'duck',
    color: '#ffdd00',
    bounce: 0.58,
    friction: 0.98,
    weight: 'light',
    description: 'Bounces gently and squeaks on every tactile surface impact!',
  },
  dice: {
    name: 'Lucky Dice',
    label: 'dice',
    color: '#ffffff',
    bounce: 0.48,
    friction: 0.97,
    weight: 'normal',
    description: 'Tumble physics that rolls and lands on a random face 1-6.',
  },
  pebble: {
    name: 'Heavy Pebble',
    label: 'pebble',
    color: '#9e9e9e',
    bounce: 0.18,
    friction: 0.95,
    weight: 'heavy',
    description: 'Solid heavy rock that lands with a deep audible bass thud.',
  },
  cube: {
    name: 'Jelly Cube',
    label: 'cube',
    color: 'var(--pink)',
    bounce: 0.74,
    friction: 0.98,
    weight: 'normal',
    description: 'Wobbly jelly cube that squashes upon landing.',
  },
  can: {
    name: 'Soda Can',
    label: 'can',
    color: '#ef4444',
    bounce: 0.35,
    friction: 0.99,
    weight: 'normal',
    description: 'Rolls smoothly across edges and floors.',
  },
}

export function ToySandbox() {
  const [activeToy, setActiveToy] = useState<ToyType>('duck')
  const [diceFace, setDiceFace] = useState(6)
  const [isDragging, setIsDragging] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const suppressClickRef = useRef(false)

  // Toy simulation state
  const phys = useRef({
    x: 160,
    y: 60,
    vx: 120,
    vy: -180,
    rot: 0,
    vrot: 2.5,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    lastPointerTime: 0,
    pointerVx: 0,
    pointerVy: 0,
    didDrag: false,
    squashX: 1,
    squashY: 1,
    squashUntil: 0,
  })

  const renderToy = (p = phys.current) => {
    if (!bodyRef.current) return
    bodyRef.current.style.transform = `translate(${p.x - 24}px, ${p.y - 24}px) rotate(${p.rot.toFixed(1)}deg) scale(${p.squashX}, ${p.squashY})`
  }

  // Reset physics on toy switch
  const selectToy = useCallback((t: ToyType) => {
    setActiveToy(t)
    playBoopSound(1)
    const p = phys.current
    p.x = 160
    p.y = 50
    p.vx = (Math.random() - 0.5) * 280
    p.vy = -260
    p.vrot = (Math.random() - 0.5) * 8
    p.rot = 0
    p.isDragging = false
    p.squashX = 1
    p.squashY = 1
    p.squashUntil = 0
    setIsDragging(false)
    renderToy(p)
    if (t === 'dice') {
      setDiceFace(Math.floor(Math.random() * 6) + 1)
    }
  }, [])

  // Pointer drag & fling
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const p = phys.current
    p.isDragging = true
    p.dragStartX = e.clientX
    p.dragStartY = e.clientY
    p.lastPointerX = e.clientX
    p.lastPointerY = e.clientY
    p.lastPointerTime = performance.now()
    p.vx = 0
    p.vy = 0
    p.vrot = 0
    p.pointerVx = 0
    p.pointerVy = 0
    p.didDrag = false
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const p = phys.current
    if (!p.isDragging || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const now = performance.now()
    const dt = Math.max((now - p.lastPointerTime) / 1000, 0.005)

    p.pointerVx = (e.clientX - p.lastPointerX) / dt
    p.pointerVy = (e.clientY - p.lastPointerY) / dt
    if (Math.hypot(e.clientX - p.dragStartX, e.clientY - p.dragStartY) > 6) {
      p.didDrag = true
    }
    p.lastPointerX = e.clientX
    p.lastPointerY = e.clientY
    p.lastPointerTime = now

    p.x = Math.max(24, Math.min(rect.width - 24, e.clientX - rect.left))
    p.y = Math.max(24, Math.min(rect.height - 24, e.clientY - rect.top))
    renderToy(p)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const p = phys.current
    if (!p.isDragging) return
    p.isDragging = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}

    // A tap is handled by the stage kick. Only a real drag gets flung.
    if (p.didDrag) {
      p.vx = Math.max(-800, Math.min(800, p.pointerVx * 0.75))
      p.vy = Math.max(-800, Math.min(800, p.pointerVy * 0.75))
      p.vrot = (Math.random() - 0.5) * 12
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
      playBoopSound(2)
    } else {
      p.vx = 0
      p.vy = 0
      p.vrot = 0
    }
    setIsDragging(false)
  }

  const handlePointerCancel = (e: React.PointerEvent) => {
    const p = phys.current
    if (!p.isDragging) return
    p.isDragging = false
    p.vx = 0
    p.vy = 0
    p.vrot = 0
    p.didDrag = false
    suppressClickRef.current = true
    window.setTimeout(() => { suppressClickRef.current = false }, 0)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    setIsDragging(false)
  }

  // Click on stage: give a kick upward!
  const handleStageClick = () => {
    if (phys.current.isDragging || suppressClickRef.current) return
    const p = phys.current
    p.vy = -380
    p.vx += (Math.random() - 0.5) * 260
    p.vrot += (Math.random() - 0.5) * 14
    playBoopSound(1)
  }

  // Physics animation loop
  useEffect(() => {
    let animId: number
    let lastTime = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033) || 0.016
      lastTime = now
      const p = phys.current
      const spec = TOYS[activeToy]

      if (!p.isDragging && stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect()
        const width = rect.width || 340
        const height = rect.height || 220
        const radius = 24

        // Gravity
        const gravity = spec.weight === 'heavy' ? 2400 : spec.weight === 'light' ? 1400 : 1900
        p.vy += gravity * dt

        // Position update
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vrot * dt * 57.3

        // Floor collision
        const floorY = height - 8 - radius
        if (p.y >= floorY) {
          p.y = floorY
          if (Math.abs(p.vy) > 60) {
            // Sound on impact
            if (activeToy === 'duck') playSqueakSound()
            else if (activeToy === 'pebble') playThudSound()
            else playBoopSound(1)

            // Squash on bounce
            const impactScale = Math.min(0.4, Math.abs(p.vy) / 1200)
            p.squashX = 1 + impactScale
            p.squashY = 1 - impactScale
            p.squashUntil = now + 120

            if (activeToy === 'dice') {
              setDiceFace(Math.floor(Math.random() * 6) + 1)
            }
          }
          p.vy = -p.vy * spec.bounce
          p.vx *= Math.pow(spec.friction, dt * 60)
          p.vrot *= 0.88

          if (Math.abs(p.vy) < 18) {
            p.vy = 0
          }
        }

        // Left / Right Wall collisions
        if (p.x <= radius) {
          p.x = radius
          p.vx = -p.vx * spec.bounce
          p.vrot *= -0.7
        } else if (p.x >= width - radius) {
          p.x = width - radius
          p.vx = -p.vx * spec.bounce
          p.vrot *= -0.7
        }

        // Ceiling collision
        if (p.y <= radius) {
          p.y = radius
          p.vy = -p.vy * spec.bounce
        }

      }

      if (now >= p.squashUntil) {
        p.squashX = 1
        p.squashY = 1
      }
      renderToy(p)

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [activeToy])

  const curSpec = TOYS[activeToy]

  return (
    <div className="toy-sandbox-wrapper">
      {/* Toy Selection Pills */}
      <div className="toy-picker-bar" role="group" aria-label="Select physics toy">
        {(Object.keys(TOYS) as ToyType[]).map((key) => {
          const item = TOYS[key]
          const isSelected = activeToy === key
          return (
            <button
              key={key}
              type="button"
              className={`toy-pill-btn ${isSelected ? 'is-active' : ''}`}
              onClick={() => selectToy(key)}
            >
              <span>{item.name}</span>
            </button>
          )
        })}
      </div>

      {/* Physics Interactive Stage */}
      <div
        ref={stageRef}
        className="toy-stage"
        onClick={handleStageClick}
        title="Drag & fling or click to kick the toy! Real gravity & audio collisions."
      >
        {/* Floor Line */}
        <div className="toy-stage-floor" aria-hidden="true" />

        {/* Floating Toy Item */}
        <div
          ref={bodyRef}
          className={`toy-physics-body toy-${activeToy}`}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Visual representations */}
          {activeToy === 'ball' && (
            <div className="toy-beach-ball">
              <span className="ball-stripe" />
              <span className="ball-stripe" />
            </div>
          )}

          {activeToy === 'duck' && (
            <div className="toy-duck-sprite">
              <span className="duck-bill" />
              <span className="duck-eye" />
            </div>
          )}

          {activeToy === 'dice' && (
            <div className="toy-dice-cube">
              <span>{diceFace}</span>
            </div>
          )}

          {activeToy === 'pebble' && (
            <div className="toy-pebble-rock">
              <span className="pebble-speck" />
            </div>
          )}

          {activeToy === 'cube' && (
            <div className="toy-jelly-cube">
              <span className="jelly-shine" />
            </div>
          )}

          {activeToy === 'can' && (
            <div className="toy-soda-can">
              <span className="can-stripe" />
            </div>
          )}
        </div>

        {/* Hint overlay */}
        <div className="toy-stage-hint">
          <span>throw me or click to kick</span>
        </div>
      </div>

      {/* Description & Specs */}
      <div className="toy-meta-row">
        <span className="toy-meta-desc">{curSpec.description}</span>
        <button
          type="button"
          className="btn btn-paper btn-xs"
          onClick={() => selectToy(activeToy)}
          title="Reset toy position"
        >
          <RotateCwIcon size={12} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  )
}
