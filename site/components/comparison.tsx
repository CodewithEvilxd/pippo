import { SparklesIcon, ArrowUpRightIcon } from '../ui/icons'

interface ComparisonProps {
  onUse: (character: string) => void
  picked: string
}

export function Comparison({ onUse, picked }: ComparisonProps) {
  return (
    <>
      {/* Why Pippo vs Heavy Alternatives (Comparison Matrix) */}
      <section id="why-pippo" className="section-wrapper">
        <div className="section-head text-center">
          <span className="section-kicker">
            <SparklesIcon size={14} />
            BUILT FOR SPEED &amp; CHARM
          </span>
          <h2>
            Why Pippo vs<br />
            heavy animations?
          </h2>
          <p className="max-w-2xl mx-auto">
            Most mascots bring heavy bundle baggage, canvas jank, or external loaders. Pippo is pure CSS craft.
          </p>
        </div>

        <div className="comparison-table-wrap overflow-x-auto">
          <table className="comparison-table w-full text-left border-collapse border-[2.5px] border-(--line) bg-(--card) rounded-2xl shadow-(--ex8) overflow-hidden">
            <thead>
              <tr className="bg-(--paper-2) border-b-[2.5px] border-(--line)">
                <th className="p-4 sm:p-5 font-black text-sm uppercase tracking-wider">Format</th>
                <th className="p-4 sm:p-5 font-black text-sm uppercase tracking-wider">Bundle Weight</th>
                <th className="p-4 sm:p-5 font-black text-sm uppercase tracking-wider">CPU / Memory</th>
                <th className="p-4 sm:p-5 font-black text-sm uppercase tracking-wider">Cursor Math</th>
                <th className="p-4 sm:p-5 font-black text-sm uppercase tracking-wider">First Click Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-(--line) text-sm sm:text-base font-medium">
              <tr className="bg-[color-mix(in_srgb,var(--lime)_14%,var(--card))] font-bold">
                <td data-label="Format" className="p-4 sm:p-5 flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-(--lime) border border-(--line)" />
                  <strong>Pippo (CSS Sprites)</strong>
                </td>
                <td data-label="Bundle Weight" className="p-4 sm:p-5 text-(--lime-ink) dark:text-(--lime) font-black">0 kb runtime (Zero libs)</td>
                <td data-label="CPU / Memory" className="p-4 sm:p-5 text-emerald-600 dark:text-emerald-400">Near-zero GPU transform</td>
                <td data-label="Cursor Math" className="p-4 sm:p-5">Native atan2 + deadzone</td>
                <td data-label="First Click Delay" className="p-4 sm:p-5">0ms (Preloaded in DOM)</td>
              </tr>
              <tr>
                <td data-label="Format" className="p-4 sm:p-5 font-bold text-(--muted)">Lottie / Bodymovin</td>
                <td data-label="Bundle Weight" className="p-4 sm:p-5 text-(--muted)">~60 kB - 180 kB runtime</td>
                <td data-label="CPU / Memory" className="p-4 sm:p-5 text-(--muted)">Heavy JSON DOM parsing</td>
                <td data-label="Cursor Math" className="p-4 sm:p-5 text-(--muted)">Requires manual frame scrubbing</td>
                <td data-label="First Click Delay" className="p-4 sm:p-5 text-(--muted)">Noticeable render pause</td>
              </tr>
              <tr>
                <td data-label="Format" className="p-4 sm:p-5 font-bold text-(--muted)">Rive Runtime</td>
                <td data-label="Bundle Weight" className="p-4 sm:p-5 text-(--muted)">~200 kB WASM engine</td>
                <td data-label="CPU / Memory" className="p-4 sm:p-5 text-(--muted)">Continuous Canvas redraw loop</td>
                <td data-label="Cursor Math" className="p-4 sm:p-5 text-(--muted)">Complex state-machine bindings</td>
                <td data-label="First Click Delay" className="p-4 sm:p-5 text-(--muted)">WASM compilation wait</td>
              </tr>
              <tr>
                <td data-label="Format" className="p-4 sm:p-5 font-bold text-(--muted)">Three.js / 3D Canvas</td>
                <td data-label="Bundle Weight" className="p-4 sm:p-5 text-(--muted)">~500 kB+ bundle</td>
                <td data-label="CPU / Memory" className="p-4 sm:p-5 text-(--muted)">High battery &amp; GPU consumption</td>
                <td data-label="Cursor Math" className="p-4 sm:p-5 text-(--muted)">Raycasting overhead</td>
                <td data-label="First Click Delay" className="p-4 sm:p-5 text-(--muted)">Heavy 3D model download</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3-Step Setup (Cascading Drift Stepper) */}
      <section id="quickstart" className="section-wrapper">
        <div className="section-head text-center">
          <span className="section-kicker">
            <SparklesIcon size={14} />
            SUPER SIMPLE / 03 STEPS
          </span>
          <h2>
            Your page buddy,<br />
            <span>ready in a minute.</span>
          </h2>
          <p className="max-w-2xl mx-auto">Three tiny steps from “that's cute” to “that's live on my site”.</p>
        </div>

        <div className="stepper-row">
          <div className="step-card">
            <span className="step-badge">01</span>
            <h3 className="step-title">Install package</h3>
            <p className="step-desc">
              Run{' '}
              <code className="bg-(--paper-2) border border-(--line) px-2 py-0.5 rounded font-mono font-bold">
                npm i pippo-mascot
              </code>{' '}
              in your React or Next.js project.
            </p>
          </div>

          <div className="step-card">
            <span className="step-badge">02</span>
            <h3 className="step-title">Grab sprite sheets</h3>
            <p className="step-desc">
              Download the 2 sprite sheets and drop them into your project's{' '}
              <code className="bg-(--paper-2) border border-(--line) px-2 py-0.5 rounded font-mono font-bold">
                public/sprites/
              </code>
              .
            </p>
          </div>

          <div className="step-card">
            <span className="step-badge">03</span>
            <h3 className="step-title">Say hello in React</h3>
            <p className="step-desc">
              Import{' '}
              <code className="bg-(--line) text-(--lime) px-2 py-0.5 rounded font-mono font-bold">
                &lt;Pippo /&gt;
              </code>{' '}
              and pass the two paths. That's literally it!
            </p>
            <button
              type="button"
              className="btn btn-dark btn-sm mt-5 w-full"
              onClick={() => onUse(picked)}
            >
              <span>View Full Code Snippet</span>
              <ArrowUpRightIcon size={14} />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
