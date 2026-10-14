import { useState } from 'react'
import { Pippo } from '../../src/pippo'
import { sheets } from '../utils/characters'
import { playClickSound, playChimeSound } from '../utils/sound'
import { LayersIcon, ArrowUpRightIcon, SparklesIcon } from '../ui/icons'

type LayersProps = { character: string }

const LAYERS = [
  {
    num: '01',
    title: 'The Host Surface',
    body: 'A single semantic <button> with inline CSS. Works anywhere in React without Tailwind or CSS dependencies.',
    badge: 'LAYER 1: DOM ELEMENT',
  },
  {
    num: '02',
    title: 'Dual 3×3 Sprite Atlases',
    body: 'Nine head angles and nine emotional reactions baked into two tiny WebP sheets. 0% / 50% / 100% position steps.',
    badge: 'LAYER 2: SPRITE MATRIX',
  },
  {
    num: '03',
    title: 'Pointer Math & Deadzone',
    body: 'Hardware-accelerated atan2 calculations split into 8 clean 45° sectors, with a 70px calm deadzone at the center.',
    badge: 'LAYER 3: VECTOR RADAR',
  },
  {
    num: '04',
    title: 'Squash & Reaction Payoff',
    body: 'Physical squash-and-stretch spring easing via the Web Animations API, with automatic dizzy state on rapid clicks.',
    badge: 'LAYER 4: ANIMATION ENGINE',
  },
]

export function Layers({ character }: LayersProps) {
  const [exploded, setExploded] = useState(false)
  const [mobileStageVisible, setMobileStageVisible] = useState(false)

  const toggleExploded = () => {
    playClickSound()
    const next = !exploded
    setExploded(next)
    if (next) playChimeSound()
  }

  const handleStageAction = () => {
    if (window.matchMedia('(max-width: 640px)').matches) {
      playClickSound()
      if (mobileStageVisible) {
        setMobileStageVisible(false)
        setExploded(false)
      } else {
        setMobileStageVisible(true)
        setExploded(true)
        playChimeSound()
      }
      return
    }

    toggleExploded()
  }

  return (
    <section id="how-it-works" className={`section-wrapper layers-section ${mobileStageVisible ? 'show-mobile-stage' : ''}`}>
      <div className="section-head">
        <span className="section-kicker">
          <LayersIcon size={14} />
          HOW IT WORKS
        </span>
        <h2>Every Pippo is<br /><span>four small ideas.</span></h2>
        <p>The art stays simple. The math does the charming. Explore the layers behind every Pippo.</p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="btn btn-lime btn-sm"
            onClick={handleStageAction}
            aria-pressed={exploded}
          >
            <span className="layers-button-desktop">{exploded ? 'Put it back together' : 'Pull it apart in 3D'}</span>
            <span className="layers-button-mobile">{mobileStageVisible ? 'Hide 3D layers' : 'Explore 3D layers'}</span>
            <ArrowUpRightIcon size={14} />
          </button>
        </div>
      </div>

      <div className="layers-content-grid grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Layer Explanations */}
        <div className="layer-explanations lg:col-span-5 flex flex-col gap-4">
          {LAYERS.map((layer) => (
            <div
              key={layer.num}
              onClick={() => {
                if (!window.matchMedia('(max-width: 640px)').matches && !exploded) toggleExploded()
              }}
              className={`layer-explanation p-5 rounded-2xl border-[2.5px] border-(--line) bg-(--card) transition-all cursor-pointer ${
                exploded
                  ? 'shadow-(--ex6) translate-x-2'
                  : 'shadow-(--ex4) hover:shadow-(--ex6)'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-(--lime) border-2 border-(--line) font-black text-xs text-(--lime-ink) grid place-items-center">
                  {layer.num}
                </span>
                <strong className="text-lg font-black tracking-tight">{layer.title}</strong>
              </div>
              <p className="mt-2 text-sm text-(--muted) font-medium leading-relaxed m-0">
                {layer.body}
              </p>
            </div>
          ))}
        </div>

        {/* Right 3D Isometric Viewport */}
        <div className="layer-demo lg:col-span-7 flex flex-col items-center justify-center">
          <div
            className="iso-viewport w-full"
            onClick={toggleExploded}
            role="button"
            tabIndex={0}
            aria-label="Toggle 3D isometric layer explosion"
          >
            <div className={`iso-stage ${exploded ? 'exploded' : ''}`}>
              {/* Layer 1: Host Page */}
              <div className="iso-layer layer-1 flex flex-col justify-between p-4 bg-(--paper-2)">
                <span className="iso-badge">01 · Webpage Host</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-(--line)" />
                  <span className="w-2.5 h-2.5 rounded-full bg-(--line)" />
                  <span className="w-2.5 h-2.5 rounded-full bg-(--line)" />
                </div>
                <div className="font-mono text-xs text-(--muted) opacity-60">
                  &lt;Pippo directions="..." reactions="..." /&gt;
                </div>
              </div>

              {/* Layer 2: 3x3 Sprite Grid */}
              <div className="iso-layer layer-2 p-3 bg-linear-to-br from-emerald-500/10 to-teal-500/10">
                <span className="iso-badge bg-(--pink) text-white">02 · Sprite Matrix</span>
                <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full p-2 border-2 border-dashed border-(--line)/30 rounded-xl">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-(--line)/20 rounded flex items-center justify-center font-mono text-[9px] text-(--muted)">
                      {i === 4 ? 'center' : `cell ${i}`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Layer 3: Mouse Tracker Radar */}
              <div className="iso-layer layer-3 flex items-center justify-center bg-cyan-500/10">
                <span className="iso-badge bg-(--violet) text-white">03 · Vector Radar</span>
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-(--pink) flex items-center justify-center relative">
                  <div className="w-12 h-12 rounded-full border-2 border-(--lime) bg-(--lime)/20 flex items-center justify-center font-mono text-[9px] font-bold text-(--text)">
                    DEADZONE
                  </div>
                  <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-(--line)/40" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-(--line)/40" />
                </div>
              </div>

              {/* Layer 4: The Mascot & Expression FX */}
              <div className="iso-layer layer-4 flex items-center justify-center bg-transparent border-none shadow-none pointer-events-none">
                <span className="iso-badge bg-(--lime) text-(--lime-ink)">04 · Live Mascot</span>
                <div className="pointer-events-auto filter drop-shadow-xl">
                  <Pippo key={character} {...sheets(character)} label={character} size={190} />
                </div>
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-(--muted) mt-2">
            <SparklesIcon size={12} />
            <span>{exploded ? 'Click stage to collapse back' : 'Click stage to inspect 3D layers'}</span>
          </span>
        </div>
      </div>
    </section>
  )
}
