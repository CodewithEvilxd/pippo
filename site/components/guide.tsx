import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { highlight, type Lang } from '../ui/highlight'
import { playClickSound, playChimeSound } from '../utils/sound'
import { CloseIcon, DownloadIcon, CheckIcon, CopyIcon, SparklesIcon } from '../ui/icons'

export type GuideKind = 'use' | 'make'

type Step = {
  title: string
  body: ReactNode
}

type GuideProps = {
  kind: GuideKind | null
  character: string
  onClose: () => void
}

function Snippet(props: { children: string; lang?: Lang }) {
  const { children, lang } = props
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      playChimeSound()
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative mt-2">
      <pre className="rounded-xl border-2 border-(--line) bg-(--paper-2) p-4 pr-20 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-(--text) overflow-x-auto shadow-(--ex4)">
        <code>{highlight(children, lang ?? 'bash')}</code>
      </pre>

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy'}
        className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-lg border border-(--line) bg-(--card) px-2.5 py-1 font-mono text-[11px] font-bold text-(--text) shadow-[1px_1px_0_var(--ex)] transition-all hover:-translate-y-0.5"
      >
        {copied ? (
          <>
            <CheckIcon size={12} className="text-emerald-500" />
            <span>copied</span>
          </>
        ) : (
          <>
            <CopyIcon size={12} />
            <span>copy</span>
          </>
        )}
      </button>
    </div>
  )
}

function stepsToUse(character: string): Step[] {
  const extension = character === 'kibo' || character === 'hinata' || character === 'gwen' ? 'png' : 'webp'
  const version = character === 'kibo' ? '?v=2' : character === 'hinata' || character === 'gwen' ? '?v=1' : ''
  return [
    {
      title: 'Install the component',
      body: <Snippet>npm i pippo-mascot</Snippet>,
    },
    {
      title: 'Download the two sheets',
      body: (
        <>
          <p className="mt-1 text-sm font-medium text-(--muted)">
            A character consists of two sprite sheet files. Place both into your app's{' '}
            <span className="font-mono font-bold text-(--text)">public/sprites/</span> folder.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {['directions', 'reactions'].map((sheet) => (
              <a
                key={sheet}
                href={`${import.meta.env.BASE_URL}sprites/${character}-${sheet}.${extension}${version}`}
                download
                onClick={() => playClickSound()}
                className="flex items-center justify-between rounded-xl border-2 border-(--line) bg-(--card) px-4 py-2.5 font-mono text-[13px] font-bold text-(--text) shadow-(--ex4) transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <DownloadIcon size={15} />
                  <span>{character}-{sheet}.{extension}</span>
                </div>
                <span className="text-xs text-(--muted)">Download</span>
              </a>
            ))}
          </div>
        </>
      ),
    },
    {
      title: 'Render in your page',
      body: (
        <>
          <Snippet lang="tsx">{`import { Pippo } from 'pippo-mascot'

<Pippo
  directions="/sprites/${character}-directions.${extension}"
  reactions="/sprites/${character}-reactions.${extension}"
/>`}</Snippet>
          <p className="mt-3 text-xs text-(--muted) font-medium">
            Any two image URLs work. Put the files wherever you like, or import them directly in Next.js or Vite.
          </p>
        </>
      ),
    },
  ]
}

const MAKE_STEPS: Step[] = [
  {
    title: 'Install the skill',
    body: (
      <>
        <Snippet>npx skills add codewithevilxd/pippo --skill pippo --global --yes</Snippet>
      </>
    ),
  },
  {
    title: 'Ask for a character',
    body: (
      <>
        <Snippet lang="prompt">/pippo a chibi otter with chocolate-brown fur</Snippet>
        <p className="mt-3 text-xs text-(--muted) font-medium">Attach a selfie to turn yourself into a chibi mascot:</p>
        <Snippet lang="prompt">/pippo make a mascot from my photo</Snippet>
        <p className="mt-3 text-xs text-(--muted) font-medium">Specify a custom visual style:</p>
        <Snippet lang="prompt">/pippo a chibi fox in the riso style</Snippet>
      </>
    ),
  },
  {
    title: 'Automated verification',
    body: (
      <p className="mt-1 text-sm font-medium text-(--muted)">
        The pipeline generates nine head angles and nine expressions, compiles them into aligned WebP sheets, and checks whether the character jumps or drifts between frames.
      </p>
    ),
  },
  {
    title: 'Mount on your page',
    body: (
      <>
        <Snippet lang="tsx">{`import { Pippo } from 'pippo-mascot'

<Pippo
  directions="/sprites/otter-directions.webp"
  reactions="/sprites/otter-reactions.webp"
/>`}</Snippet>
        <p className="mt-3 text-xs text-(--muted) font-medium">
          Requires an image generation tool or an <span className="font-mono font-bold">OPENAI_API_KEY</span>.
        </p>
      </>
    ),
  },
]

export function Guide(props: GuideProps) {
  const { kind, character, onClose } = props
  const steps = stepsToUse(character)

  useEffect(() => {
    if (!kind) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [kind, onClose])

  if (!kind) return null

  const useThisOne = kind === 'use'

  return (
    <div className="guide-overlay fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
        onClick={() => {
          playClickSound()
          onClose()
        }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={useThisOne ? `How to use ${character}` : 'How to make your own'}
        className="guide-drawer relative z-10 flex h-full w-full max-w-155 flex-col overflow-y-auto border-l-[3px] border-(--line) bg-(--card) p-8 shadow-(--ex14)"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-(--line) pb-5">
          <div>
            <span className="chip text-[11px] py-0.5 px-2 mb-2 flex items-center gap-1 w-fit">
              <SparklesIcon size={12} />
              <span>{useThisOne ? 'INTEGRATION GUIDE' : 'CREATION GUIDE'}</span>
            </span>
            <h2 className="text-3xl font-black tracking-tight capitalize">
              {useThisOne ? `Adopt ${character}` : 'Create your own'}
            </h2>
            <p className="mt-1 text-sm font-medium text-(--muted)">
              {useThisOne ? 'Three quick steps to put this buddy on your site.' : 'An AI agent draws and aligns it for you.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound()
              onClose()
            }}
            aria-label="Close"
            className="w-10 h-10 rounded-xl border-2 border-(--line) bg-(--paper-2) grid place-items-center text-(--text) shadow-(--ex4) hover:shadow-(--ex6) transition-all"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <ol className="mt-8 flex flex-col gap-8">
          {(useThisOne ? steps : MAKE_STEPS).map((step, index) => (
            <li key={step.title}>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-(--line) bg-(--lime) font-mono text-xs font-black text-(--lime-ink) shadow-(--ex4)">
                  0{index + 1}
                </span>
                <h3 className="font-black text-lg">{step.title}</h3>
              </div>
              <div className="mt-3 pl-10 text-[15px]">{step.body}</div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}
