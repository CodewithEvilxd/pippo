import { useEffect, useRef } from 'react'
import { PixelType } from './pixel-type'
import { playBoopSound } from '../utils/sound'

type GlyphSurface = { left: number; right: number; top: number }
type SurfaceRun = {
  left: number
  right: number
  segments: GlyphSurface[]
  pixelType?: HTMLElement & {
    piixSurface?: (x: number) => number | null
    piixImpact?: (x: number, y: number, power?: number) => void
    piixSettled?: boolean
  }
}
type Hop = { x0: number; y0: number; x1: number; y1: number; controlY: number; elapsed: number; duration: number; runIndex: number }
type MotionState = 'walk' | 'idle' | 'look' | 'sniff' | 'alarm' | 'scurry' | 'flip'

function buildTextSurfaceRuns(element: HTMLElement): SurfaceRun[] {
  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) return []

  const runs: SurfaceRun[] = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let node: Node | null

  while ((node = walker.nextNode())) {
    const parent = node.parentElement
    if (!parent || parent.closest('piix-type') || parent.closest('.sr-only')) continue
    const style = getComputedStyle(parent)
    if (style.visibility === 'hidden' || style.display === 'none') continue
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    measure.font = font
    const text = node.textContent ?? ''

    for (let index = 0; index < text.length; index += 1) {
      if (/\s/.test(text[index])) continue
      range.setStart(node, index)
      range.setEnd(node, index + 1)
      const rect = range.getClientRects()[0]
      if (!rect || rect.width < 0.5 || rect.height < 0.5) continue

      const metrics = measure.measureText(text[index])
      const fontAscent = metrics.fontBoundingBoxAscent || parseFloat(style.fontSize) * 0.8
      const glyphAscent = metrics.actualBoundingBoxAscent || fontAscent
      const segment = {
        left: rect.left,
        right: rect.right,
        top: rect.top + Math.max(0, fontAscent - glyphAscent),
      }
      const previous = runs[runs.length - 1]
      if (previous && Math.abs(previous.segments[0].top - segment.top) < rect.height * 0.6) {
        previous.segments.push(segment)
        previous.left = Math.min(previous.left, segment.left)
        previous.right = Math.max(previous.right, segment.right)
      } else {
        runs.push({ left: segment.left, right: segment.right, segments: [segment] })
      }
    }
  }

  return runs
}

function textSurfaceAt(run: SurfaceRun, x: number): number | null {
  const tops = run.segments.filter((segment) => x >= segment.left && x <= segment.right).map((segment) => segment.top)
  return tops.length ? Math.min(...tops) : null
}

function pixelSurfaceAt(run: SurfaceRun, x: number): number | null {
  if (!run.pixelType?.piixSurface) return null
  const docY = run.pixelType.piixSurface(x + window.scrollX)
  return docY == null ? null : docY - window.scrollY
}

function surfaceAt(run: SurfaceRun, x: number): number | null {
  return run.pixelType ? pixelSurfaceAt(run, x) : textSurfaceAt(run, x)
}

export function TextCrawler() {
  const labelRef = useRef<HTMLSpanElement>(null)
  const actorRef = useRef<HTMLSpanElement>(null)
  const walkRef = useRef<HTMLSpanElement>(null)
  const reactionRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const label = labelRef.current
    const actor = actorRef.current
    const walk = walkRef.current
    const reaction = reactionRef.current
    if (!label || !actor || !walk || !reaction) return

    const headline = label.closest('.hero-h1') as HTMLElement | null
    const plainText = headline?.querySelector<HTMLElement>('.hero-h1__plain') ?? null
    const interactionTarget = headline ?? label
    let pixelType = label.querySelector('piix-type') as SurfaceRun['pixelType'] | null

    let runs: SurfaceRun[] = []
    let runIndex = 0
    let x = 0
    let y = 0
    let face = -1
    let state: MotionState = 'walk'
    let stateTimer = 2.5
    let hop: Hop | null = null
    let placed = false
    let frameId = 0
    let previousTime = 0
    let frameElapsed = 0
    let visible = true
    let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    let pointer: { x: number; y: number } | null = null
    let reactionFrame = -1
    let reactionUntil = 0
    let actorSize = 22
    let baseSpeed = 56
    let smoothScaleX = 1
    let smoothScaleY = 1

    const fitActor = () => {
      const fontSize = Number.parseFloat(getComputedStyle(headline ?? label).fontSize) || 48
      actorSize = Math.max(28, Math.min(40, fontSize * 0.4))
      actor.style.width = `${actorSize}px`
      actor.style.height = `${actorSize}px`
      baseSpeed = actorSize * 2.5
    }

    const setReaction = (frame: number, until = 0) => {
      reactionFrame = frame
      reactionUntil = until
      reaction.style.backgroundPosition = frame < 0
        ? ''
        : `${(frame % 3) * 50}% ${Math.floor(frame / 3) * 50}%`
      reaction.style.opacity = frame < 0 ? '0' : '1'
      walk.style.opacity = frame < 0 ? '1' : '0'
    }

    const chooseSurface = (run: SurfaceRun, preferredX: number, direction: number): { x: number; y: number } | null => {
      const start = Math.max(run.left + actorSize * 0.3, Math.min(run.right - actorSize * 0.3, preferredX))
      const step = Math.max(1.5, actorSize / 12)
      for (let distance = 0; distance <= run.right - run.left; distance += step) {
        for (const sign of distance === 0 ? [0] : [direction, -direction]) {
          const candidateX = start + sign * distance
          if (candidateX < run.left || candidateX > run.right) continue
          const candidateY = surfaceAt(run, candidateX)
          if (candidateY != null) return { x: candidateX, y: candidateY }
        }
      }
      return null
    }

    const rebuild = () => {
      pixelType = label.querySelector('piix-type') as SurfaceRun['pixelType'] | null
      const nextRuns = plainText ? buildTextSurfaceRuns(plainText) : []
      if (pixelType) {
        const rect = pixelType.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          nextRuns.push({ left: rect.left, right: rect.right, segments: [], pixelType })
        }
      }
      runs = nextRuns.filter((run) => run.right - run.left > actorSize * 0.8)
      runIndex = Math.min(runIndex, Math.max(0, runs.length - 1))
      if (placed && runs.length) {
        hop = null
        const current = runs[runIndex]
        x = Math.max(current.left + actorSize * 0.3, Math.min(current.right - actorSize * 0.3, x))
        y = surfaceAt(current, x) ?? chooseSurface(current, x, face)?.y ?? y
      }
    }

    const currentRun = () => runs[runIndex]
    const pixelReady = () => {
      pixelType = label.querySelector('piix-type') as SurfaceRun['pixelType'] | null
      return Boolean(pixelType) && pixelType?.piixSettled !== false
    }

    const land = (targetRunIndex: number, targetX: number, targetY: number, duration = 0.34, drop = false) => {
      const rise = Math.max(actorSize * 0.65, y - targetY + actorSize * 0.25)
      hop = {
        x0: x,
        y0: y,
        x1: targetX,
        y1: targetY,
        controlY: drop ? y : Math.min(y, targetY) - rise * 1.35,
        elapsed: 0,
        duration: Math.max(0.28, Math.min(0.75, duration + Math.abs(targetX - x) / 900)),
        runIndex: targetRunIndex,
      }
      if (state !== 'flip') setReaction(-1)
    }

    const nearestLanding = (run: SurfaceRun, fromX: number): { x: number; y: number } | null => {
      const reach = actorSize * 3.1
      const step = Math.max(1.5, actorSize / 10)
      for (let distance = step; distance < reach; distance += step) {
        const candidateX = fromX + face * distance
        if (candidateX < run.left || candidateX > run.right) break
        const candidateY = surfaceAt(run, candidateX)
        if (candidateY != null && Math.abs(candidateY - y) < reach * 1.4) {
          const landingX = Math.max(run.left + actorSize * 0.2, Math.min(run.right - actorSize * 0.2, candidateX + face * actorSize * 0.15))
          return { x: landingX, y: surfaceAt(run, landingX) ?? candidateY }
        }
      }
      return null
    }

    const move = (speed: number, dt: number) => {
      const run = currentRun()
      if (!run) return
      const nextX = x + face * speed * dt
      const nextY = surfaceAt(run, nextX)
      const stepHeight = actorSize * 0.24
      if (nextY != null && Math.abs(nextY - y) <= stepHeight) {
        x = nextX
        y = nextY
        return
      }

      const destination = nextY == null
        ? nearestLanding(run, x)
        : { x: nextX + face * actorSize * 0.18, y: surfaceAt(run, nextX + face * actorSize * 0.18) ?? nextY }
      if (destination) {
        land(runIndex, destination.x, destination.y)
        return
      }

      // The next headline line begins under the current line's left edge.
      if (face < 0 && runIndex < runs.length - 1) {
        const nextIndex = runIndex + 1
        const nextRun = runs[nextIndex]
        const target = chooseSurface(nextRun, nextRun.left + actorSize * 0.4, 1)
        if (target) {
          face = 1
          land(nextIndex, target.x, target.y)
          return
        }
      }

      if (face < 0 && runIndex > 0) {
        const nextIndex = runIndex - 1
        const nextRun = runs[nextIndex]
        const target = chooseSurface(nextRun, nextRun.left + actorSize * 0.4, 1)
        if (target) {
          face = 1
          land(nextIndex, target.x, target.y)
          return
        }
      }

      face *= -1
      const edge = face > 0 ? run.left + actorSize * 0.35 : run.right - actorSize * 0.35
      const target = chooseSurface(run, edge, face)
      if (target) {
        x = target.x
        y = target.y
        setReaction(1, performance.now() + 700)
      }
    }

    const updatePosition = (hopLift = 0) => {
      const labelRect = label.getBoundingClientRect()
      actor.style.transform = `translate3d(${x - labelRect.left - actorSize / 2}px, ${y - labelRect.top - actorSize * 0.94 - hopLift}px, 0) scale(${smoothScaleX}, ${smoothScaleY})`
      actor.style.setProperty('--crawler-facing', face < 0 ? '1' : '0')
    }

    const enter = (next: MotionState, duration: number, frame = -1) => {
      state = next
      stateTimer = duration
      setReaction(frame, frame < 0 ? 0 : performance.now() + duration * 1000)
    }

    const place = () => {
      if (placed || !runs.length || !pixelReady()) return
      runIndex = 0
      face = -1
      const run = currentRun()!
      const start = chooseSurface(run, run.left + (run.right - run.left) * 0.78, face)
      if (!start) return
      x = start.x
      y = start.y
      placed = true
      if (reducedMotion) {
        enter('idle', 1e9, 0)
      } else {
        const landingY = y
        y -= actorSize * 2.8
        land(runIndex, x, landingY, 0.38, true)
      }
      updatePosition()
    }

    const onPointerMove = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY } }
    const onPointerLeave = () => { pointer = null }
    const onPoke = () => {
      playBoopSound()
      if (!placed || hop || state === 'flip') return
      enter('flip', 1.45, 6)
      land(runIndex, x + face * actorSize * 0.35, y, 0.28)
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !frameId) frameId = requestAnimationFrame(animate)
      else if (!visible && frameId) {
        cancelAnimationFrame(frameId)
        frameId = 0
        previousTime = 0
      }
    })
    observer.observe(interactionTarget)

    const resizeObserver = new ResizeObserver(() => {
      fitActor()
      rebuild()
      place()
    })
    resizeObserver.observe(label)
    resizeObserver.observe(interactionTarget)
    if (plainText) resizeObserver.observe(plainText)
    if (pixelType) resizeObserver.observe(pixelType)
    const mutationObserver = new MutationObserver(() => {
      rebuild()
      if (pixelType) resizeObserver.observe(pixelType)
      place()
    })
    mutationObserver.observe(label, { childList: true, subtree: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    interactionTarget.addEventListener('pointerleave', onPointerLeave)
    interactionTarget.addEventListener('click', onPoke)
    window.addEventListener('scroll', rebuild, { passive: true })
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
    const motionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches
      if (reducedMotion) {
        if (frameId) cancelAnimationFrame(frameId)
        frameId = 0
        hop = null
        enter('idle', 1e9, 0)
        updatePosition()
      } else if (visible && !frameId) frameId = requestAnimationFrame(animate)
    }
    motionQuery.addEventListener('change', motionChange)
    document.fonts?.ready.then(() => { rebuild(); place() })
    fitActor()
    rebuild()
    place()

    function animate(now: number) {
      frameId = 0
      if (!visible || reducedMotion) return
      const dt = Math.min((now - (previousTime || now)) / 1000, 0.04)
      previousTime = now
      place()
      if (!placed || !runs.length) {
        frameId = requestAnimationFrame(animate)
        return
      }

      if (hop) {
        hop.elapsed = Math.min(hop.duration, hop.elapsed + dt)
        const progress = hop.elapsed / hop.duration
        const inverse = 1 - progress
        x = hop.x0 * inverse * inverse + 2 * inverse * progress * ((hop.x0 + hop.x1) / 2) + hop.x1 * progress * progress
        y = hop.y0 * inverse * inverse + 2 * inverse * progress * hop.controlY + hop.y1 * progress * progress
        smoothScaleX += (0.94 - smoothScaleX) * 0.2
        smoothScaleY += (1.08 - smoothScaleY) * 0.2
        if (progress >= 1) {
          const landedRun = runs[hop.runIndex]
          runIndex = hop.runIndex
          x = hop.x1
          y = surfaceAt(landedRun, x) ?? hop.y1
          smoothScaleX = 1.12
          smoothScaleY = 0.82
          if (landedRun?.pixelType?.piixImpact) {
            landedRun.pixelType.piixImpact(x + window.scrollX, y + window.scrollY, 0.55)
          }
          hop = null
        }
        updatePosition(Math.sin(progress * Math.PI) * actorSize * 0.48)
        frameId = requestAnimationFrame(animate)
        return
      }

      smoothScaleX += (1 - smoothScaleX) * Math.min(1, dt * 7)
      smoothScaleY += (1 - smoothScaleY) * Math.min(1, dt * 7)
      const pointerDistance = pointer ? Math.hypot(pointer.x - x, pointer.y - (y - actorSize * 0.45)) : Infinity
      if (pointerDistance < actorSize * 2.8 && ['walk', 'idle', 'look', 'sniff'].includes(state)) {
        enter('alarm', 0.32, 2)
      }

      stateTimer -= dt
      if (state === 'alarm' && stateTimer <= 0) {
        face = (pointer?.x ?? x + face) > x ? -1 : 1
        enter('scurry', 1.1)
      } else if (state === 'flip' && stateTimer <= 0) {
        enter('walk', 2.5)
      } else if (state === 'scurry' && stateTimer <= 0) {
        enter('walk', 2.5)
      } else if (['idle', 'look', 'sniff'].includes(state) && stateTimer <= 0) {
        enter('walk', 2.5)
      } else if (state === 'walk' && stateTimer <= 0) {
        const choice = Math.random()
        if (choice < 0.4) enter('sniff', 1.4, 1)
        else if (choice < 0.75) enter('look', 1.7, 5)
        else enter('idle', 1.3, 0)
      }

      if (state === 'walk' || state === 'scurry') {
        const speed = state === 'scurry' ? baseSpeed * 3.2 : baseSpeed
        move(speed, dt)
        frameElapsed += dt * speed
        const frame = Math.floor(frameElapsed / Math.max(5, actorSize * 0.27)) % 4
        const row = face < 0 ? 1 : 0
        walk!.style.backgroundPosition = `${frame * (100 / 3)}% ${row * 100}%`
      }

      if (reactionFrame >= 0 && reactionFrame !== 0 && now > reactionUntil) setReaction(-1)
      updatePosition()
      actor!.setAttribute('aria-hidden', 'true')
      frameId = requestAnimationFrame(animate)
    }

    if (visible && !reducedMotion) frameId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', rebuild)
      interactionTarget.removeEventListener('pointerleave', onPointerLeave)
      interactionTarget.removeEventListener('click', onPoke)
      motionQuery.removeEventListener('change', motionChange)
    }
  }, [])

  return (
    <span className="sticker-badge__text" ref={labelRef}>
      <span className="sr-only">watch you.</span>
      <PixelType
        text="watch you."
        rows={22}
        cell={14}
        weight={800}
        color="currentColor"
        shade="#c6f432"
        shape="square"
        fit
      />
      <span className="text-crawler" ref={actorRef} aria-hidden="true">
        <span className="text-crawler__walk" ref={walkRef} />
        <span className="text-crawler__reaction" ref={reactionRef} />
      </span>
    </span>
  )
}
