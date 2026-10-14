import { useMemo, useState } from 'react'
import { Pippo } from '../../src/pippo'
import { CHARACTERS, sheets } from '../utils/characters'
import { copyText } from '../utils/clipboard'
import { playClickSound, playBoopSound, playChimeSound } from '../utils/sound'
import { SearchIcon, CloseIcon, CheckIcon, PlusIcon, ArrowUpRightIcon, CopyIcon, SparklesIcon } from '../ui/icons'

const ANIMALS = ['bear','bunny','cat','deer','dino','fox','frog','hamster','hedgehog','koala','mouse','otter','owl','panda','penguin','pug','raccoon','redpanda','sheep','sloth','tiger']
const PEOPLE = ['afro','astronaut','bald','ballerina','beard','builder','cap','chef','glasses','grandpa','granny','hijabi','hinata','gwen','nurse','pirate','scientist','sikh','skater','wizard']
const NATURE = ['kibo']

const FILTERS = ['All buddies', 'Animals', 'People', 'Robots', 'Nature'] as const
type Filter = (typeof FILTERS)[number]

type CastProps = {
  picked: string
  onPick: (character: string) => void
  onUse: (character: string) => void
  onMakeYourOwn: () => void
  onToast: (msg: string) => void
}

export function Cast({ picked, onPick, onUse, onMakeYourOwn, onToast }: CastProps) {
  const [filter, setFilter] = useState<Filter>('All buddies')
  const [query, setQuery] = useState('')

  const getCategory = (name: string): { label: string; badgeClass: string } => {
    if (NATURE.includes(name)) return { label: 'Nature', badgeClass: 'card-tag-nature' }
    if (ANIMALS.includes(name)) return { label: 'Animal', badgeClass: 'card-tag-animal' }
    if (PEOPLE.includes(name)) return { label: 'Person', badgeClass: 'card-tag-person' }
    return { label: 'Robot', badgeClass: 'card-tag-robot' }
  }

  const shown = useMemo(() => CHARACTERS.filter((name) => {
    const inGroup =
      filter === 'All buddies' ||
      (filter === 'Animals' && ANIMALS.includes(name)) ||
      (filter === 'People' && PEOPLE.includes(name)) ||
      (filter === 'Nature' && NATURE.includes(name)) ||
      (filter === 'Robots' && !ANIMALS.includes(name) && !PEOPLE.includes(name) && !NATURE.includes(name))

    return inGroup && name.toLowerCase().includes(query.trim().toLowerCase())
  }), [filter, query])

  const copyJsx = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const { directions, reactions } = sheets(name)
    const code = `<Pippo\n  directions="${directions}"\n  reactions="${reactions}"\n/>`
    if (await copyText(code)) {
      playChimeSound()
      onToast(`Copied <Pippo /> JSX for ${name}!`)
    } else {
      onToast(`Failed to copy JSX`)
    }
  }

  return (
    <section id="characters" className="section-wrapper">
      <div className="section-head">
        <span className="section-kicker">
          <SparklesIcon size={14} />
          CHARACTER ROSTER
        </span>
        <h2>Find your Pippo</h2>
        <p>Every little pal has its own personality. Poke one to say hello, or copy its JSX in one click.</p>
      </div>

      {/* Filter toolbar */}
      <div className="gallery-toolbar">
        <div className="category-tabs" role="group" aria-label="Filter characters">
          {FILTERS.map((item) => {
            const count = item === 'All buddies'
              ? CHARACTERS.length
              : item === 'Animals' ? ANIMALS.length
              : item === 'People' ? PEOPLE.length
              : item === 'Nature' ? NATURE.length
              : CHARACTERS.length - ANIMALS.length - PEOPLE.length - NATURE.length

            return (
              <button
                key={item}
                type="button"
                className={`category-tab ${filter === item ? 'active' : ''}`}
                onClick={() => {
                  playClickSound()
                  setFilter(item)
                }}
                aria-pressed={filter === item}
              >
                <span>{item}</span>
                <span className="opacity-70 text-xs font-mono">({count})</span>
              </button>
            )
          })}
        </div>

        <div className="search-field">
          <SearchIcon size={16} className="text-(--muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buddies..."
            aria-label="Search characters"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-(--muted) hover:text-(--text) transition-colors"
              aria-label="Clear search"
            >
              <CloseIcon size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Grid of characters */}
      <div className="characters-grid">
        {shown.map((character) => {
          const isSelected = character === picked
          const cat = getCategory(character)

          return (
            <div
              key={character}
              className={`mascot-card cursor-pointer ${isSelected ? 'is-selected' : ''}`}
              onClick={() => {
                playClickSound()
                onPick(character)
              }}
            >
              {/* Category pill */}
              <span className={`card-tag ${cat.badgeClass}`}>
                {cat.label}
              </span>

              {/* Interactive portrait */}
              <div
                className="mt-6 mb-2"
                onClick={(e) => {
                  e.stopPropagation()
                  playBoopSound()
                }}
              >
                <Pippo {...sheets(character)} label={character} size={118} />
              </div>

              {/* Character title */}
              <div className="mascot-card-title flex items-center gap-1.5">
                <span>{character}</span>
                {isSelected && (
                  <span className="text-emerald-500">
                    <CheckIcon size={14} />
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="card-actions-row">
                <button
                  type="button"
                  className="btn btn-paper btn-sm text-xs flex-1 px-2 gap-1.5"
                  onClick={(e) => copyJsx(character, e)}
                  title="Copy JSX Component Code"
                >
                  <CopyIcon size={13} />
                  <span>JSX</span>
                </button>
                <button
                  type="button"
                  className="btn btn-lime btn-sm text-xs flex-1 px-2 gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUse(character)
                  }}
                  title="View setup guide"
                >
                  <span>Use</span>
                  <ArrowUpRightIcon size={13} />
                </button>
              </div>
            </div>
          )
        })}

        {/* Create Your Own Card */}
        <div
          className="mascot-card border-dashed border-(--line) bg-(--paper-2)/60 justify-center text-center cursor-pointer min-h-55"
          onClick={onMakeYourOwn}
        >
          <div className="w-12 h-12 rounded-xl bg-(--lime) border-2 border-(--line) text-(--lime-ink) grid place-items-center mb-3 shadow-(--ex4)">
            <PlusIcon size={22} />
          </div>
          <strong className="text-base font-black">Draw Your Own</strong>
          <p className="text-xs text-(--muted) mt-1 max-w-35 font-medium flex items-center justify-center gap-1">
            <span>AI prompt or photo</span>
            <ArrowUpRightIcon size={12} />
          </p>
        </div>
      </div>

      {shown.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg font-bold text-(--muted)">No pals found matching "{query}".</p>
          <button
            type="button"
            className="btn btn-paper btn-sm mt-4"
            onClick={() => {
              setQuery('')
              setFilter('All buddies')
            }}
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  )
}
