import { Pippo } from '../../src/pippo'
import { STYLES, sheets } from '../utils/characters'
import { playClickSound, playBoopSound } from '../utils/sound'
import { SparklesIcon, ArrowUpRightIcon } from '../ui/icons'

type StylesProps = { onUse: (character: string) => void }

export function Styles({ onUse }: StylesProps) {
  return (
    <section id="styles" className="section-wrapper">
      <div className="section-head">
        <span className="section-kicker">
          <SparklesIcon size={14} />
          FINISHES & AESTHETICS
        </span>
        <h2>Same pal,<br /><span>six distinct looks.</span></h2>
        <p>Pick a finish that matches your brand: classic storybook, vintage ink, or retro arcade pixel art.</p>
      </div>

      <div className="styles-grid">
        {STYLES.map((style) => (
          <div key={style.name} className="style-card-box">
            {/* Stamp label */}
            <span className="chip text-[10px] py-0.5 px-2 mb-2">
              {style.name}
            </span>

            {/* Live interactive mascot */}
            <div
              className="my-3 cursor-pointer"
              onClick={() => playBoopSound()}
            >
              <Pippo
                {...sheets(style.character)}
                label={`${style.name} fox`}
                size={130}
              />
            </div>

            {/* Style info */}
            <strong className="text-base font-black capitalize tracking-tight">
              {style.name}
            </strong>
            <span className="text-xs text-(--muted) font-medium mt-0.5 mb-3">
              {style.note}
            </span>

            <button
              type="button"
              className="btn btn-lime btn-sm w-full text-xs"
              onClick={() => {
                playClickSound()
                onUse(style.character)
              }}
              aria-label={`Use ${style.name} style`}
            >
              <span>Use {style.name}</span>
              <ArrowUpRightIcon size={12} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
