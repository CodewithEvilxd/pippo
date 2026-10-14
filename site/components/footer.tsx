import { Pippo } from '../../src/pippo'
import { sheets, CHARACTERS } from '../utils/characters'
import { playClickSound, playBoopSound } from '../utils/sound'
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  GithubIcon,
  TwitterIcon,
  MailIcon,
  SparklesIcon,
} from '../ui/icons'

interface FooterProps {
  picked: string
  onUse: (char: string) => void
  onMakeYourOwn: () => void
}

function FooterRaven() {
  return (
    <img
      className="footer-perched-mascot"
      aria-hidden="true"
      alt=""
      draggable={false}
      src={`${import.meta.env.BASE_URL}sprites/raven-footer-perch.png`}
    />
  )
}

export function Footer({ picked, onUse, onMakeYourOwn }: FooterProps) {
  const scrollToTop = () => {
    playBoopSound(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="site-footer" role="contentinfo" aria-label="Site footer">
      <FooterRaven />

      <div className="footer-inner-wrap">
        {/* Main Footer Grid */}
        <div className="footer-main-grid">
          {/* Brand & Mini Mascot Card */}
          <div className="footer-brand-pane">
            <div className="footer-brand-row">
              <a href="#top" className="footer-brand-lockup" onClick={scrollToTop} aria-label="Pippo, back to top">
                <span className="footer-wordmark">pippo<span>.</span></span>
              </a>
              <span className="footer-badge">
                <SparklesIcon size={12} className="text-(--lime)" />
                <span>BROWSER PAL</span>
              </span>
            </div>

            <p className="footer-bio">
              Animated page companions that follow your cursor and react when clicked.
            </p>

            {/* Interactive Perch Box */}
            <div className="footer-perch-box">
              <div className="footer-mascot-pod">
                <Pippo {...sheets(picked || 'frog')} label="footer companion" size={54} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-(--text)">
                  Your current pal
                </div>
                <div className="text-xs text-(--muted) truncate">
                  {picked} is right here with you.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-paper btn-xs shrink-0"
                onClick={scrollToTop}
                title="Scroll back to top"
              >
                <span>Top</span>
                <ArrowUpIcon size={12} />
              </button>
            </div>
          </div>

          {/* Navigation Links Column */}
          <div className="footer-nav-group">
            <h4 className="footer-group-title">EXPLORE</h4>
            <ul className="footer-nav-list">
              <li>
                <a href="#how-it-works" onClick={playClickSound} className="footer-link">
                  <span>How Pippo works</span>
                </a>
              </li>
              <li>
                <a href="#play" onClick={playClickSound} className="footer-link">
                  <span>See the interactions</span>
                </a>
              </li>
              <li>
                <a href="#characters" onClick={playClickSound} className="footer-link">
                  <span>Meet the characters ({CHARACTERS.length})</span>
                </a>
              </li>
              <li>
                <a href="#styles" onClick={playClickSound} className="footer-link">
                  <span>Browse art styles</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Integration & Guides Column */}
          <div className="footer-nav-group">
            <h4 className="footer-group-title">BUILD</h4>
            <ul className="footer-nav-list">
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onUse(picked)}
                >
                  <span>Use {picked} in your app</span>
                  <ArrowUpRightIcon size={12} />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={onMakeYourOwn}
                >
                  <span>Create a mascot</span>
                  <ArrowUpRightIcon size={12} />
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/codewithevilxd/pippo"
                  target="_blank"
                  rel="noreferrer"
                  onClick={playClickSound}
                  className="footer-link"
                >
                  <span>Install & setup</span>
                  <ArrowUpRightIcon size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/codewithevilxd/pippo/releases"
                  target="_blank"
                  rel="noreferrer"
                  onClick={playClickSound}
                  className="footer-link"
                >
                  <span>Releases & sprite sheets</span>
                  <ArrowUpRightIcon size={12} />
                </a>
              </li>
            </ul>
          </div>

          {/* Social & Connect Column */}
          <div className="footer-nav-group">
            <h4 className="footer-group-title">CONNECT</h4>
            <div className="footer-social-stack">
              <a
                href="https://github.com/codewithevilxd/pippo"
                target="_blank"
                rel="noreferrer"
                onClick={playClickSound}
                className="footer-social-card"
              >
                <div className="footer-social-icon-box">
                  <GithubIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-(--text)">GitHub</div>
                  <div className="text-[11px] text-(--muted)">Source & updates</div>
                </div>
                <ArrowUpRightIcon size={13} className="text-(--muted)" />
              </a>

              <a
                href="https://twitter.com/codewithevilxd"
                target="_blank"
                rel="noreferrer"
                onClick={playClickSound}
                className="footer-social-card"
              >
                <div className="footer-social-icon-box">
                  <TwitterIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-(--text)">Twitter / X</div>
                  <div className="text-[11px] text-(--muted)">News & demos</div>
                </div>
                <ArrowUpRightIcon size={13} className="text-(--muted)" />
              </a>

              <a
                href="mailto:codewithevilxd@gmail.com"
                onClick={playClickSound}
                className="footer-social-card"
              >
                <div className="footer-social-icon-box">
                  <MailIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-(--text)">Email</div>
                  <div className="text-[11px] text-(--muted)">Questions & feedback</div>
                </div>
                <ArrowUpRightIcon size={13} className="text-(--muted)" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="footer-bottom-row">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-(--muted)">
            <span className="footer-status-pill">
              <span className="footer-status-dot" />
              <span>Follows your cursor</span>
            </span>
            <span>•</span>
            <span>MIT License</span>
            <span>•</span>
            <span>Reacts to clicks</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-(--muted)">
              MIT © CodeWithEvilXD
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
