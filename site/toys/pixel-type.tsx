import React, { useEffect, useRef } from 'react'

/* =========================================================================
   Piixpal Engine Utilities
   Ported directly from https://github.com/diiviikk5/Piixpal (src/core.js & src/elements/type.js)
   ========================================================================= */

const reduceMQ = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
const reduced = () => !!reduceMQ?.matches
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

/* Shared pointer tracking in client coordinates */
const ptr = {
  cx: -1e5,
  cy: -1e5,
  seen: false,
  last: 0,
  down: false,
  vx: 0,
  vy: 0,
  get x() {
    return this.cx + (typeof window !== 'undefined' ? window.scrollX : 0)
  },
  get y() {
    return this.cy + (typeof window !== 'undefined' ? window.scrollY : 0)
  },
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch' && !ptr.down) return
      const t = performance.now()
      ptr.cx = e.clientX
      ptr.cy = e.clientY
      ptr.seen = true
      ptr.last = t
    },
    { passive: true },
  )

  window.addEventListener(
    'pointerdown',
    (e) => {
      ptr.down = true
      ptr.cx = e.clientX
      ptr.cy = e.clientY
      ptr.seen = true
      ptr.last = performance.now()
    },
    { passive: true },
  )

  window.addEventListener(
    'pointerup',
    () => {
      ptr.down = false
    },
    { passive: true },
  )

  document.addEventListener(
    'pointerleave',
    () => {
      ptr.cx = ptr.cy = -1e5
    },
    { passive: true },
  )
}

/* One shared animation loop for all type elements; sleeps when idle */
const subs = new Set<(dt: number) => void>()
let raf = 0
let lastT = 0
const frame = (t: number) => {
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 1 / 60)
  lastT = t
  subs.forEach((fn) => fn(dt))
  raf = subs.size ? requestAnimationFrame(frame) : ((lastT = 0), 0)
}
const sub = (fn: (dt: number) => void) => {
  subs.add(fn)
  if (!raf) raf = requestAnimationFrame(frame)
}
const unsub = (fn: (dt: number) => void) => {
  subs.delete(fn)
}

/* Cell shapes supported by Piixpal */
const CELL_SHAPES: Record<string, (g: CanvasRenderingContext2D, x: number, y: number, s: number) => void> = {
  square: (g, x, y, s) => g.rect(x, y, s, s),
  dot: (g, x, y, s) => {
    const r = s * 0.46
    g.moveTo(x + s / 2 + r, y + s / 2)
    g.arc(x + s / 2, y + s / 2, r, 0, Math.PI * 2)
  },
  round: (g, x, y, s) => {
    if (g.roundRect) g.roundRect(x, y, s, s, s * 0.32)
    else g.rect(x, y, s, s)
  },
  plus: (g, x, y, s) => {
    const t = s / 3
    g.rect(x + t, y, t, s)
    g.rect(x, y + t, t, t)
    g.rect(x + 2 * t, y + t, t, t)
  },
  diamond: (g, x, y, s) => {
    g.moveTo(x + s / 2, y)
    g.lineTo(x + s, y + s / 2)
    g.lineTo(x + s / 2, y + s)
    g.lineTo(x, y + s / 2)
    g.closePath()
  },
}

interface Cell {
  x: number
  y: number
  oy: number
  vy: number
  lift: number
  lv: number
  delay: number
  landed: boolean
}

interface Wave {
  x: number
  y: number
  r: number
  max: number
  amp: number
}

/* =========================================================================
   PiixTypeElement
   Custom element implementing chunky pixel typography with extruded shadows,
   cursor proximity lift, pointer ripples, and surface contour detection.
   ========================================================================= */
export class PiixTypeElement extends HTMLElement {
  static get observedAttributes() {
    return ['text', 'rows', 'cell', 'font', 'weight', 'color', 'shade', 'outline', 'depth', 'gap', 'fit', 'align', 'intro', 'shape']
  }

  _cells: Cell[] = []
  _cols = 0
  _rowsN = 0
  _top: (number | null)[] = []
  _cell = 4.2
  _depth = 2
  _gap = 1
  _head = 12
  _dpr = 1
  _on = false
  _hot = false
  _tok = 0
  _waves: Wave[] = []
  _t = 0
  _rt?: ReturnType<typeof setTimeout>
  _ro?: ResizeObserver
  _fitRo?: ResizeObserver
  _cv!: HTMLCanvasElement
  _g!: CanvasRenderingContext2D
  _introDone = false
  _reflow = () => {
    if (!this._cols) return
    this._layout()
    this.dispatchEvent(new CustomEvent('piix:layout', { bubbles: true }))
  }

  /* Property reflection for React 19 compatibility */
  get text(): string {
    return (this.getAttribute('text') ?? this.textContent ?? '').trim()
  }
  set text(v: string) {
    if (v !== this.getAttribute('text')) this.setAttribute('text', v)
  }

  get rows(): string {
    return this.getAttribute('rows') ?? '18'
  }
  set rows(v: string | number) {
    this.setAttribute('rows', String(v))
  }

  get cell(): string {
    return this.getAttribute('cell') ?? '4.2'
  }
  set cell(v: string | number) {
    this.setAttribute('cell', String(v))
  }

  get font(): string {
    return this.getAttribute('font') ?? ''
  }
  set font(v: string) {
    this.setAttribute('font', v)
  }

  get weight(): string {
    return this.getAttribute('weight') ?? '800'
  }
  set weight(v: string | number) {
    this.setAttribute('weight', String(v))
  }

  get color(): string {
    return this.getAttribute('color') ?? ''
  }
  set color(v: string) {
    this.setAttribute('color', v)
  }

  get shade(): string {
    return this.getAttribute('shade') ?? ''
  }
  set shade(v: string) {
    this.setAttribute('shade', v)
  }

  get depth(): string {
    return this.getAttribute('depth') ?? '1'
  }
  set depth(v: string | number) {
    this.setAttribute('depth', String(v))
  }

  get gap(): string {
    return this.getAttribute('gap') ?? '0.08'
  }
  set gap(v: string | number) {
    this.setAttribute('gap', String(v))
  }

  get fit(): boolean {
    return this.hasAttribute('fit')
  }
  set fit(v: boolean | string) {
    if (v) this.setAttribute('fit', '')
    else this.removeAttribute('fit')
  }

  get align(): string {
    return this.getAttribute('align') ?? 'left'
  }
  set align(v: string) {
    this.setAttribute('align', v)
  }

  get intro(): string {
    return this.getAttribute('intro') ?? 'rain'
  }
  set intro(v: string) {
    this.setAttribute('intro', v)
  }

  get shape(): string {
    return this.getAttribute('shape') ?? 'square'
  }
  set shape(v: string) {
    this.setAttribute('shape', v)
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._tick = this._tick.bind(this)
    this._pm = this._pm.bind(this)
    this._pd = this._pd.bind(this)
  }

  connectedCallback() {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `<style>
:host{display:block;line-height:0;position:relative}
canvas{display:block;pointer-events:none;image-rendering:pixelated}
</style><canvas aria-hidden="true"></canvas>`
    this._cv = this.shadowRoot.querySelector('canvas')!
    this._g = this._cv.getContext('2d')!
    this.setAttribute('role', 'img')

    this._ro = new ResizeObserver(this._reflow)
    this._ro.observe(this)
    if (this.hasAttribute('fit')) {
      const badge = this.closest('.sticker-badge')
      if (badge) {
        this._fitRo = new ResizeObserver(this._reflow)
        this._fitRo.observe(badge)
      }
    }

    window.addEventListener('pointermove', this._pm, { passive: true })
    window.addEventListener('resize', this._reflow, { passive: true })
    this.addEventListener('pointerdown', this._pd)
    this._raster()
  }

  disconnectedCallback() {
    if (this._ro) this._ro.disconnect()
    if (this._fitRo) this._fitRo.disconnect()
    window.removeEventListener('pointermove', this._pm)
    window.removeEventListener('resize', this._reflow)
    this.removeEventListener('pointerdown', this._pd)
    unsub(this._tick)
    this._on = false
  }

  attributeChangedCallback(n: string) {
    if (!this._cv) return
    if (['text', 'rows', 'font', 'weight', 'align'].includes(n)) {
      clearTimeout(this._rt)
      this._rt = setTimeout(() => this._raster(), 40)
    } else if (n === 'fit') {
      this._fitRo?.disconnect()
      if (this.hasAttribute('fit')) {
        const badge = this.closest('.sticker-badge')
        if (badge) {
          this._fitRo = new ResizeObserver(this._reflow)
          this._fitRo.observe(badge)
        }
      }
      if (this._cols) this._reflow()
    } else if (this._cols) {
      this._layout()
    }
  }

  /* rain the pixels in again manually */
  replay() {
    this._introDone = false
    this._seedIntro()
    this._wake()
  }

  /* true once every pixel has landed */
  get piixSettled() {
    return !!this._cols && this._cells.every((p) => p.landed)
  }

  /* ripple effect when clicked or stepped on */
  piixImpact(x: number, y: number, power = 1) {
    if (!this._cols || reduced()) return
    const r = this._cv.getBoundingClientRect()
    this._waves.push({
      x: (x - window.scrollX - r.left) / this._cell,
      y: (y - window.scrollY - r.top - this._head) / this._cell,
      r: 0,
      max: 5 + 5 * power,
      amp: 0.5 + 0.4 * power,
    })
    this._wake()
  }

  /* doc-y of the top letter pixel at doc-x */
  piixSurface(x: number) {
    if (!this._cols) return null
    const r = this._cv.getBoundingClientRect()
    const c = Math.floor((x - window.scrollX - r.left) / this._cell)
    const top = this._top[c]
    return top == null ? null : r.top + window.scrollY + this._head + top * this._cell
  }

  /* returns all surface contour points for crawlers */
  piixSurfacePoints() {
    if (!this._cols) return []
    const points: Array<{ x: number; y: number; hop?: boolean }> = []
    let previousColumn = -1
    for (let c = 0; c < this._cols; c++) {
      const top = this._top[c]
      if (top != null) {
        points.push({
          x: c * this._cell + this._cell / 2,
          y: top * this._cell,
          hop: previousColumn >= 0 && c - previousColumn - 1 >= Math.max(2, Math.round(10 / this._cell)),
        })
        previousColumn = c
      }
    }
    return points
  }

  async _raster() {
    const tok = ++this._tok
    const lines = this.text.split(/\||\n/).map((s) => s.trim()).filter(Boolean)
    if (!lines.length) {
      this._cols = 0
      return
    }

    const rows = +this.getAttribute('rows')! || 18
    const weight = this.getAttribute('weight') || 800
    const fam = this.getAttribute('font') || window.getComputedStyle(this).fontFamily || 'system-ui, sans-serif'
    const font = `${weight} ${rows}px ${fam}`

    try {
      if (document.fonts) {
        await document.fonts.load(font, lines.join(''))
      }
    } catch {
      // fallback
    }

    if (tok !== this._tok) return

    const c = document.createElement('canvas')
    const x = c.getContext('2d', { willReadFrequently: true })
    if (!x) return

    x.font = font
    const ws = lines.map((l) => Math.ceil(x.measureText(l).width))
    const W = Math.max(...ws) + 2
    const lh = Math.round(rows * 1.02)
    c.width = W
    c.height = lh * lines.length + 2

    x.font = font
    x.fillStyle = '#000'
    x.textBaseline = 'alphabetic'
    const align = this.getAttribute('align') || 'left'
    lines.forEach((l, i) => {
      const ox = align === 'center' ? Math.round((W - ws[i]) / 2) : align === 'right' ? W - ws[i] - 1 : 1
      x.fillText(l, ox, Math.round(i * lh + rows * 0.8) + 1)
    })

    const d = x.getImageData(0, 0, c.width, c.height).data
    const cells: Cell[] = []
    for (let yy = 0; yy < c.height; yy++) {
      for (let xx = 0; xx < c.width; xx++) {
        if (d[(yy * c.width + xx) * 4 + 3] > 110) {
          cells.push({ x: xx, y: yy, oy: 0, vy: 0, lift: 0, lv: 0, delay: 0, landed: true })
        }
      }
    }

    if (!cells.length) return

    /* crop empty margins */
    const minX = Math.min(...cells.map((p) => p.x))
    const minY = Math.min(...cells.map((p) => p.y))
    for (const p of cells) {
      p.x -= minX
      p.y -= minY
    }

    this._cols = Math.max(...cells.map((p) => p.x)) + 1
    this._rowsN = Math.max(...cells.map((p) => p.y)) + 1
    this._cells = cells
    this._top = new Array(this._cols).fill(null)
    for (const p of cells) {
      if (this._top[p.x] == null || p.y < this._top[p.x]!) {
        this._top[p.x] = p.y
      }
    }

    this.setAttribute('aria-label', lines.join(' '))
    this._layout()

    /* Intro rain effect runs ONCE on load, never loops or vanishes */
    if (this.getAttribute('intro') !== 'none' && !this._introDone) {
      this._seedIntro()
      this._introDone = true
    }

    this._wake()
    this.dispatchEvent(new CustomEvent('piix:type', { bubbles: true }))
  }

  _layout() {
    let cell = +this.getAttribute('cell')! || 8
    if (this.hasAttribute('fit')) {
      const badge = this.closest('.sticker-badge') as HTMLElement | null
      const parent = this.parentElement as HTMLElement | null
      const badgeStyle = badge ? window.getComputedStyle(badge) : null
      const badgePadding = badgeStyle
        ? Number.parseFloat(badgeStyle.paddingLeft) + Number.parseFloat(badgeStyle.paddingRight)
        : 0
      const avail = badge
        ? badge.clientWidth - badgePadding
        : parent?.clientWidth || this.clientWidth
      if (avail) {
        cell = Math.max(2, Math.min(cell, Math.floor(avail / (this._cols + 1))))
      }
    }
    this._cell = cell
    this._depth = Math.round(cell * (this.getAttribute('depth') != null ? +this.getAttribute('depth')! : 1) * 0.6)
    const gap = this.getAttribute('gap')
    this._gap = Math.round(cell * clamp(gap != null ? +gap : 0.1, 0, 0.45))
    this._head = cell * 3

    const w = this._cols * cell + this._depth
    const h = this._rowsN * cell + this._depth + this._head
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this._dpr = dpr

    this._cv.width = Math.round(w * dpr)
    this._cv.height = Math.round(h * dpr)
    this._cv.style.width = `${w}px`
    this._cv.style.height = `${h}px`
    this._cv.style.marginTop = `${-this._head}px`
    this.style.width = `${w}px`
    this.style.height = `${this._rowsN * cell + this._depth}px`

    this._render()
  }

  _seedIntro() {
    if (reduced()) return
    const H = (this._rowsN + 6) * this._cell
    for (const p of this._cells) {
      p.landed = false
      p.vy = 0
      p.oy = -H - rnd(0, this._cell * 8)
      p.delay = p.x * 0.012 + rnd(0, 0.18) + (this._rowsN - p.y) * 0.004
    }
    this._t = 0
  }

  _wake() {
    if (!this._on) {
      this._on = true
      sub(this._tick)
    }
  }

  _pm() {
    if (!this._cols || reduced()) return
    const r = this._cv.getBoundingClientRect()
    const m = this._cell * 8
    if (ptr.cx > r.left - m && ptr.cx < r.right + m && ptr.cy > r.top - m && ptr.cy < r.bottom + m) {
      this._hot = true
      this._wake()
    }
  }

  _pd(e: MouseEvent | PointerEvent) {
    if (!this._cols || reduced()) return
    const r = this._cv.getBoundingClientRect()
    this._waves.push({
      x: (e.clientX - r.left) / this._cell,
      y: (e.clientY - r.top - this._head) / this._cell,
      r: 0,
      max: this._cols + 24,
      amp: 1.6,
    })
    this._wake()
  }

  _tick(dt: number) {
    if (!this._cols) return
    const cell = this._cell
    const G = 5200
    let busy = false
    this._t = (this._t || 0) + dt
    const r = this._cv.getBoundingClientRect()
    const px = (ptr.cx - r.left) / cell
    const py = (ptr.cy - r.top - this._head) / cell
    const R = 7
    const hot = this._hot && ptr.seen

    this._waves.forEach((w) => {
      w.r += dt * 60
    })
    this._waves = this._waves.filter((w) => w.r < w.max)
    if (this._waves.length) busy = true

    let near = false
    for (const p of this._cells) {
      /* falling in */
      if (!p.landed) {
        busy = true
        if (this._t >= p.delay) {
          p.vy += G * dt
          p.oy += p.vy * dt
          if (p.oy >= 0) {
            if (p.vy > 500) {
              p.oy = 0
              p.vy = -p.vy * 0.22
            } else {
              p.oy = 0
              p.vy = 0
              p.landed = true
            }
          }
        }
      }

      /* lift around the cursor, and on passing ripples */
      let goal = 0
      if (hot) {
        const dx = p.x + 0.5 - px
        const dy = p.y + 0.5 - py
        const d = Math.hypot(dx, dy)
        if (d < R) {
          const k = 1 - d / R
          goal = k * k * cell * 1.5
          near = true
        }
      }

      for (const w of this._waves) {
        const d = Math.hypot(p.x - w.x, p.y - w.y)
        const band = Math.abs(d - w.r)
        if (band < 2.5) {
          goal = Math.max(goal, (1 - band / 2.5) * cell * w.amp * Math.max(0, 1 - w.r / w.max))
        }
      }

      p.lv += ((goal - p.lift) * 320 - p.lv * 22) * dt
      p.lift += p.lv * dt
      if (Math.abs(p.lift) > 0.05 || Math.abs(p.lv) > 0.5) busy = true
    }

    if (!near) this._hot = false
    this._render()
    if (!busy && !this._hot) {
      unsub(this._tick)
      this._on = false
    }
  }

  _render() {
    if (!this._cols) return
    const g = this._g
    const cell = this._cell
    const gap = this._gap
    const s = Math.max(1, cell - gap)
    const dep = this._depth
    const head = this._head

    g.setTransform(this._dpr, 0, 0, this._dpr, 0, 0)
    g.clearRect(0, 0, this._cv.width, this._cv.height)

    const color = this.getAttribute('color') || 'currentColor'
    const ink = color === 'currentColor' ? (window.getComputedStyle(this).color || '#17121f') : color
    const shade = this.getAttribute('shade') || '#c6f432'
    const outline = this.getAttribute('outline') || ''
    const shape = this.getAttribute('shape') || 'square'
    const put = CELL_SHAPES[shape] || CELL_SHAPES.square

    /* shadow layer stays on the ground */
    if (shade && dep) {
      g.fillStyle = shade
      g.beginPath()
      for (const p of this._cells) {
        if (!p.landed && p.oy < -cell) continue
        put(g, p.x * cell + dep, head + p.y * cell + dep + Math.round(Math.min(0, p.oy)), s)
      }
      g.fill()
    }

    /* optional dark pixel rim keeps light faces readable on bright badges */
    if (outline) {
      const rim = Math.min(0.42, Math.max(0.32, gap * 1.2))
      g.fillStyle = outline
      g.beginPath()
      for (const p of this._cells) {
        const y = head + p.y * cell + Math.round(p.oy - p.lift)
        if (y + s < 0) continue
        put(g, p.x * cell - rim, y - rim, s + rim * 2)
      }
      g.fill()
    }

    /* ink face layer lifts up */
    g.fillStyle = ink
    g.beginPath()
    for (const p of this._cells) {
      const y = head + p.y * cell + Math.round(p.oy - p.lift)
      if (y + s < 0) continue
      put(g, p.x * cell, y, s)
    }
    g.fill()
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('piix-type')) {
  customElements.define('piix-type', PiixTypeElement)
}

/* =========================================================================
   TypeScript JSX Declarations
   ========================================================================= */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'piix-type': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        text?: string
        rows?: number | string
        cell?: number | string
        font?: string
        weight?: number | string
        color?: string
        shade?: string
        outline?: string
        depth?: number | string
        gap?: number | string
        fit?: boolean | string
        shape?: string
        intro?: string
        align?: string
      }
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'piix-type': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        text?: string
        rows?: number | string
        cell?: number | string
        font?: string
        weight?: number | string
        color?: string
        shade?: string
        outline?: string
        depth?: number | string
        gap?: number | string
        fit?: boolean | string
        shape?: string
        intro?: string
        align?: string
      }
    }
  }
}

/* =========================================================================
   React Wrapper Component
   Mounts the Web Component dynamically to avoid React 19 custom-element
   property collisions while supporting reactive props and surface callbacks.
   ========================================================================= */
export interface PixelTypeProps {
  text: string
  rows?: number | string
  cell?: number | string
  font?: string
  weight?: string | number
  color?: string
  shade?: string
  outline?: string
  depth?: number | string
  gap?: number | string
  shape?: 'square' | 'round' | 'dot' | 'plus' | 'diamond'
  intro?: 'rain' | 'none'
  fit?: boolean
  className?: string
  style?: React.CSSProperties
  onSurfaceReady?: (points: Array<{ x: number; y: number; hop?: boolean }>) => void
}

export function PixelType({
  text,
  rows = 18,
  cell = 8,
  font = '',
  weight = 800,
  color = 'currentColor',
  shade = '#c6f432',
  outline = '',
  depth = 1,
  gap = 0.1,
  shape = 'square',
  intro = 'rain',
  fit = false,
  className = '',
  style,
  onSurfaceReady,
}: PixelTypeProps) {
  const mountRef = useRef<HTMLSpanElement>(null)
  const elRef = useRef<PiixTypeElement | null>(null)
  const surfaceCallbackRef = useRef(onSurfaceReady)
  surfaceCallbackRef.current = onSurfaceReady

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let el = elRef.current
    if (!el) {
      el = document.createElement('piix-type') as PiixTypeElement
      elRef.current = el
      container.appendChild(el)
    }

    el.setAttribute('text', text)
    el.setAttribute('rows', String(rows))
    el.setAttribute('cell', String(cell))
    el.setAttribute('font', font)
    el.setAttribute('weight', String(weight))
    el.setAttribute('color', color)
    el.setAttribute('shade', shade)
    if (outline) el.setAttribute('outline', outline)
    else el.removeAttribute('outline')
    el.setAttribute('depth', String(depth))
    el.setAttribute('gap', String(gap))
    el.setAttribute('shape', shape)
    el.setAttribute('intro', intro)
    if (fit) el.setAttribute('fit', '')
    else el.removeAttribute('fit')

    const handleTypeEvent = () => {
      if (surfaceCallbackRef.current && el?.piixSurfacePoints) {
        const pts = el.piixSurfacePoints()
        if (pts.length) {
          surfaceCallbackRef.current(pts)
        }
      }
    }

    el.addEventListener('piix:type', handleTypeEvent)
    el.addEventListener('piix:layout', handleTypeEvent)
    if (el.piixSurfacePoints && el.piixSurfacePoints().length) {
      handleTypeEvent()
    }

    return () => {
      el?.removeEventListener('piix:type', handleTypeEvent)
      el?.removeEventListener('piix:layout', handleTypeEvent)
    }
  }, [text, rows, cell, font, weight, color, shade, outline, depth, gap, shape, intro, fit])

  return (
    <span
      ref={mountRef}
      className={`pixel-type-host ${className}`}
      style={{
        display: fit ? 'block' : 'inline-block',
        width: fit ? '100%' : undefined,
        lineHeight: 0,
        verticalAlign: 'middle',
        userSelect: 'none',
        cursor: 'pointer',
        ...style,
      }}
    />
  )
}
