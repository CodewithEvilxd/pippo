import { useState, useEffect, useRef } from 'react'
import { Pippo } from '../../src/pippo'
import { TextCrawler } from '../toys/text-crawler'
import { CHARACTERS, sheets } from '../utils/characters'
import { playBoopSound, playClickSound } from '../utils/sound'
import { ArrowLeftIcon, ArrowRightIcon, ArrowDownIcon, ArrowUpRightIcon, SparklesIcon, BoltIcon, StarIcon, RadarIcon } from '../ui/icons'
import { RocketButtonHopper } from '../toys/rocket-hopper'

type HeroProps = {
  character: string
  onPick: (character: string) => void
  onMakeYourOwn: () => void
  onUse: () => void
  onToast: (msg: string) => void
}

export function Hero({ character, onPick, onMakeYourOwn, onUse, onToast }: HeroProps) {
  const [boopCount, setBoopCount] = useState(0)
  const [cursorDir, setCursorDir] = useState<string>('center')
  const [cursorAngle, setCursorAngle] = useState<number>(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const ctaGroupRef = useRef<HTMLDivElement>(null)
  const btn1Ref = useRef<HTMLAnchorElement>(null)
  const btn2Ref = useRef<HTMLButtonElement>(null)

  // Track cursor direction & angle relative to the hero mascot for the live radar
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!stageRef.current) return
      const rect = stageRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const dist = Math.hypot(dx, dy)

      if (dist < 70) {
        setCursorDir('center')
        setCursorAngle(0)
        return
      }

      let deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI)
      if (deg < 0) deg += 360
      setCursorAngle(deg)

      // 8-sectors mapping
      const sectors = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right']
      const index = Math.round(deg / 45) % 8
      setCursorDir(sectors[index])
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])

  // Character cycle
  const currentIndex = CHARACTERS.indexOf(character as typeof CHARACTERS[number])
  const prevChar = () => {
    playClickSound()
    const nextIdx = (currentIndex - 1 + CHARACTERS.length) % CHARACTERS.length
    onPick(CHARACTERS[nextIdx])
  }
  const nextChar = () => {
    playClickSound()
    const nextIdx = (currentIndex + 1) % CHARACTERS.length
    onPick(CHARACTERS[nextIdx])
  }

  const handleHeroBoop = () => {
    const nextCount = boopCount + 1
    setBoopCount(nextCount)
    playBoopSound(nextCount)
    if (nextCount === 4) {
      onToast('Dizzy mode unlocked!')
    }
  }

  const [spawnedBuddies, setSpawnedBuddies] = useState<Array<{ id: number; name: string; x: number; y: number }>>([])

  const spawnBuddy = (name: string) => {
    playBoopSound(spawnedBuddies.length + 1)
    if (spawnedBuddies.length >= 6) {
      setSpawnedBuddies((prev) => prev.slice(1))
    }
    const x = Math.floor(Math.random() * 65) + 12
    const y = Math.floor(Math.random() * 60) + 12
    setSpawnedBuddies((prev) => [...prev, { id: Date.now() + Math.random(), name, x, y }])
    onToast(`Spawned ${name}!`)
  }

  const clearBuddies = () => {
    playClickSound()
    setSpawnedBuddies([])
  }

  return (
    <section className="hero-section">
      <div className="hero-grid">
        {/* Left Headline & Content */}
        <div>
          <div className="hero-chips-row">
            <span className="chip">
              <span className="chip-dot" />
              <span>Pippo v0.1 · Interactive Mascot Companion</span>
            </span>
          </div>

          <h1 className="hero-h1">
            <span className="hero-h1__plain">Web mascots that</span>{' '}
            <span className="sticker-badge">
              <TextCrawler />
            </span>
          </h1>

          <p className="hero-lead">
            Pippo turns its head toward your mouse, blinks when poked, and brings tactile soul to modern websites. Zero external animation dependencies.
          </p>

          <div className="hero-cta-group relative" ref={ctaGroupRef}>
            <a
              ref={btn1Ref}
              href="#characters"
              className="btn btn-lime btn-lg relative overflow-visible"
              onClick={playClickSound}
            >
              <span>Pick a Mascot</span>
              <ArrowDownIcon size={16} />
            </a>
            <button
              ref={btn2Ref}
              type="button"
              onClick={onMakeYourOwn}
              className="btn btn-paper btn-lg relative overflow-visible"
            >
              <SparklesIcon size={16} />
              <span>Make Your Own</span>
            </button>

            {/* Flying Rocket Perch Hopper between CTA buttons */}
            <RocketButtonHopper
              btn1Ref={btn1Ref}
              btn2Ref={btn2Ref}
              containerRef={ctaGroupRef}
              onToast={onToast}
            />
          </div>

          <div className="hero-proof">
            <div className="hero-proof-stars">
              <StarIcon size={14} />
              <StarIcon size={14} />
              <StarIcon size={14} />
            </div>
            <span>{CHARACTERS.length} hand-drawn buddies · MIT Licensed · 60fps Native</span>
          </div>

          {/* Piixpal-style Buddy Spawner Toolbar */}
          <div className="hero-spawn-bar">
            <span className="spawner-label">
              <SparklesIcon size={13} className="text-(--pink)" />
              <span>SPAWN COMPANIONS:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className="spawn-pill-btn" onClick={() => spawnBuddy('bunny')}>+ Bunny</button>
              <button type="button" className="spawn-pill-btn" onClick={() => spawnBuddy('cat')}>+ Cat</button>
              <button type="button" className="spawn-pill-btn" onClick={() => spawnBuddy('fox')}>+ Fox</button>
              <button type="button" className="spawn-pill-btn" onClick={() => spawnBuddy('dino')}>+ Dino</button>
              {spawnedBuddies.length > 0 && (
                <button type="button" className="spawn-pill-clear" onClick={clearBuddies}>
                  Clear ({spawnedBuddies.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Interactive Showcase Stage */}
        <div className="hero-stage-card" ref={stageRef} aria-label={`${character} mascot interactive preview`}>
          <div className="stage-topbar">
            <div className="window-dots" aria-hidden="true">
              <span className="window-dot window-dot-red" />
              <span className="window-dot window-dot-yellow" />
              <span className="window-dot window-dot-green" />
            </div>
            <span className="url-pill">your-awesome-site.dev/mascot</span>
            <span className="stage-live-badge">
              <i /> LIVE
            </span>
          </div>

          <div className="stage-canvas">
            {/* Background dashed orbits */}
            <span className="orbit-ring orbit-1" aria-hidden="true" />
            <span className="orbit-ring orbit-2" aria-hidden="true" />

            {/* Floating cute stickers (No emojis, clean FluxIcons) */}
            <div className="floating-sticker sticker-top-left">
              <SparklesIcon size={14} />
              <span>poke me!</span>
            </div>
            <div className="floating-sticker sticker-bottom-right">
              <span>cursor's bestie</span>
              <SparklesIcon size={14} />
            </div>
            <div className="floating-sticker sticker-top-right hidden sm:flex">
              <BoltIcon size={14} />
              <span>zero jank</span>
            </div>

            {/* Spawned Companions on Canvas */}
            {spawnedBuddies.map((buddy) => (
              <div
                key={buddy.id}
                className="hero-spawned-buddy"
                style={{
                  left: `${buddy.x}%`,
                  top: `${buddy.y}%`,
                }}
              >
                <Pippo
                  {...sheets(buddy.name)}
                  label={`spawned ${buddy.name}`}
                  size={76}
                />
              </div>
            ))}

            {/* Mascot Center Stage */}
            <div className="mascot-center" onClick={handleHeroBoop}>
              <Pippo
                key={character}
                {...sheets(character)}
                label={character}
                size={230}
              />
            </div>
          </div>

          <div className="stage-bottombar">
            {/* Character Selector Cycler */}
            <div className="character-cycler">
              <button
                type="button"
                className="btn btn-paper btn-sm btn-icon"
                onClick={prevChar}
                title="Previous character"
                aria-label="Previous character"
              >
                <ArrowLeftIcon size={15} />
              </button>
              <span className="font-black text-sm uppercase px-1.5">
                {character}
              </span>
              <button
                type="button"
                className="btn btn-paper btn-sm btn-icon"
                onClick={nextChar}
                title="Next character"
                aria-label="Next character"
              >
                <ArrowRightIcon size={15} />
              </button>
            </div>

            {/* Live Mouse Radar Indicator */}
            <div className="hidden sm:flex items-center gap-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
              <RadarIcon size={14} className="text-(--lime)" />
              <span className="tracking-wide">RADAR:</span>
              <span className="px-2 py-0.5 rounded-md bg-(--paper-2) border border-(--line) text-(--text) font-mono">
                {cursorDir} ({cursorAngle}°)
              </span>
            </div>

            {/* Boop Action */}
            <button
              type="button"
              className="btn btn-lime btn-sm"
              onClick={onUse}
            >
              <span>Use {character}</span>
              <ArrowUpRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
