import { useState, useRef } from 'react'
import { Cast } from './components/cast'
import { Guide, type GuideKind } from './components/guide'
import { Hero } from './components/hero'
import { Layers } from './components/layers'
import { Styles } from './components/styles'
import { InteractivePlay } from './toys/interactive-play'
import { SpiderThread } from './toys/spider-thread'
import { ScrollyBar } from './toys/scrolly-bar'
import { PullBulb } from './toys/pull-bulb'
import { Footer } from './components/footer'
import { Comparison } from './components/comparison'
import { CHARACTERS, DEFAULT_CHARACTER } from './utils/characters'
import { isSoundEnabled, setSoundEnabled, playClickSound, playChimeSound } from './utils/sound'
import { SoundToggle } from './ui/toggle'
import { StarIcon, ArrowUpRightIcon, CheckIcon } from './ui/icons'

function App() {
  const [picked, setPicked] = useState<string>(DEFAULT_CHARACTER)
  const [guide, setGuide] = useState<GuideKind | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    try {
      const saved = localStorage.getItem('pippo_theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // Fall back to the system setting when storage is unavailable.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const currentTheme = useRef(theme)
  const [sound, setSound] = useState<boolean>(() => isSoundEnabled())
  const [toast, setToast] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleTheme = () => {
    playClickSound()
    const next = currentTheme.current === 'light' ? 'dark' : 'light'
    currentTheme.current = next
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('pippo_theme', next)
    } catch {
      // Theme still changes for this session when storage is unavailable.
    }
  }

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    if (next) playChimeSound()
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2400)
  }

  const openUse = (character: string) => {
    setMobileMenuOpen(false)
    playClickSound()
    setPicked(character)
    setGuide('use')
  }

  return (
    <div className="min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notice" role="status">
          <CheckIcon size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Sticky Navigation */}
      <header className="site-nav" aria-label="Main navigation">
        <div className="nav-container">
          <a className="brand-wrap" href="#top" aria-label="Pippo home" onClick={playClickSound}>
            <span className="brand-window" aria-hidden="true">
              <i /><i /><i />
              <svg className="brand-window-cursor" viewBox="0 0 24 30" aria-hidden="true">
                <path d="M2 2v22l6-6 4 10 5-2-5-10 9-1L2 2Z" />
              </svg>
            </span>
            <img className="brand-mascot" src={`${import.meta.env.BASE_URL}pippo-header-mascot.png?v=2`} alt="" aria-hidden="true" />
            <span className="brand-text">pippo<span>.</span></span>
          </a>

          <nav className="nav-links hidden md:flex" aria-label="Site links">
            <a href="#how-it-works" onClick={playClickSound}>How it works</a>
            <a href="#play" onClick={playClickSound}>Superpowers</a>
            <a href="#characters" onClick={playClickSound}>Characters ({CHARACTERS.length})</a>
            <a href="#styles" onClick={playClickSound}>Styles</a>
            <a href="#why-pippo" onClick={playClickSound}>Comparison</a>
            <a href="#quickstart" onClick={playClickSound}>Quickstart</a>
          </nav>

          <div className="nav-actions">
            {/* Audio Toggle */}
            <SoundToggle enabled={sound} onToggle={toggleSound} />

            {/* Piixpal-style Pull Bulb Chain (Pull for Dark / Light mode) */}
            <PullBulb theme={theme} onToggle={toggleTheme} />

            {/* GitHub Star */}
            <a
              className="btn btn-paper btn-sm hidden sm:inline-flex"
              href="https://github.com/codewithevilxd/pippo"
              target="_blank"
              rel="noreferrer"
              onClick={playClickSound}
            >
              <StarIcon size={14} />
              <span>Star</span>
            </a>

            {/* Main Action */}
            <button
              type="button"
              className="btn btn-lime btn-sm nav-get-pippo"
              onClick={() => openUse(picked)}
            >
              <span>Get Pippo</span>
              <ArrowUpRightIcon size={14} />
            </button>

            <button
              type="button"
              className="mobile-menu-toggle"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-site-menu"
              onClick={() => {
                playClickSound()
                setMobileMenuOpen((open) => !open)
              }}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav id="mobile-site-menu" className="mobile-nav-panel" aria-label="Mobile site links">
            <a href="#how-it-works" onClick={() => { playClickSound(); setMobileMenuOpen(false) }}>How it works</a>
            <a href="#play" onClick={() => { playClickSound(); setMobileMenuOpen(false) }}>Superpowers</a>
            <a href="#characters" onClick={() => { playClickSound(); setMobileMenuOpen(false) }}>Characters ({CHARACTERS.length})</a>
            <a href="#styles" onClick={() => { playClickSound(); setMobileMenuOpen(false) }}>Styles</a>
            <a href="#why-pippo" onClick={() => { playClickSound(); setMobileMenuOpen(false) }}>Comparison</a>
            <a href="#quickstart" onClick={() => { playClickSound(); setMobileMenuOpen(false) }}>Quickstart</a>
            <button type="button" className="btn btn-lime btn-sm" onClick={() => openUse(picked)}>
              <span>Get Pippo</span>
              <ArrowUpRightIcon size={14} />
            </button>
          </nav>
        )}

        {/* Anchor the hanging Kibo to the full navbar edge at every width */}
        <SpiderThread />
      </header>

      <main id="top">
        {/* Hero Section */}
        <Hero
          character={picked}
          onPick={setPicked}
          onMakeYourOwn={() => {
            playClickSound()
            setGuide('make')
          }}
          onUse={() => openUse(picked)}
          onToast={showToast}
        />

        {/* Rotated Neon Marquee Ribbon (-2deg) */}
        <div className="marquee-ribbon-wrap" aria-hidden="true">
          <div className="marquee-ribbon">
            <div className="marquee-track">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="marquee-item">
                  <span>CURSOR FOLLOWING</span>
                  <span className="marquee-diamond" />
                  <span>65 HAND-DRAWN FRIENDS</span>
                  <span className="marquee-diamond" />
                  <span>PURE CSS SPRITES</span>
                  <span className="marquee-diamond" />
                  <span>ZERO ANIMATION LIBS</span>
                  <span className="marquee-diamond" />
                  <span>100% ACCESSIBLE</span>
                  <span className="marquee-diamond" />
                  <span>PRELOADED ASSETS</span>
                  <span className="marquee-diamond" />
                  <span>REACT & NEXT.JS READY</span>
                  <span className="marquee-diamond" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3D Isometric Exploded View */}
        <Layers character={picked} />

        {/* Piixpal Superpowers & Pals Hub */}
        <InteractivePlay onToast={showToast} />

        {/* Character Gallery / Cast */}
        <Cast
          picked={picked}
          onPick={setPicked}
          onUse={openUse}
          onMakeYourOwn={() => {
            playClickSound()
            setGuide('make')
          }}
          onToast={showToast}
        />

        {/* Art Styles Showcase */}
        <Styles onUse={openUse} />

        {/* Why Pippo vs Heavy Animations (Comparison Matrix & Quickstart) */}
        <Comparison onUse={openUse} picked={picked} />
      </main>

      {/* Modern Crafted Footer */}
      <Footer
        picked={picked}
        onUse={openUse}
        onMakeYourOwn={() => {
          playClickSound()
          setGuide('make')
        }}
      />

      {/* Scrolly Reading Progress Bar Runner */}
      <ScrollyBar />

      {/* Slide-over Guide Modal */}
      <Guide kind={guide} character={picked} onClose={() => setGuide(null)} />
    </div>
  )
}

export default App

