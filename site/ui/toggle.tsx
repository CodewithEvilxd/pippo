import { SunIcon, MoonIcon, VolumeIcon, VolumeMuteIcon } from './icons'

type ThemeToggleProps = {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative flex items-center h-10 w-19.5 rounded-xl border-[2.5px] border-(--line) bg-(--paper-2) p-1 shadow-(--ex4) transition-all hover:-translate-y-0.5 hover:shadow-(--ex6) focus-visible:outline-none"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label={`Current theme: ${theme}. Click to switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sliding pill indicator */}
      <span
        className={`absolute top-0.75 bottom-0.75 w-8 rounded-lg border-2 border-(--line) bg-(--lime) shadow-[1px_1px_0_var(--ex)] transition-transform duration-200 ease-out ${
          isDark ? 'translate-x-9' : 'translate-x-0'
        }`}
      />

      {/* Sun icon */}
      <span
        className={`relative z-10 flex h-full w-8 items-center justify-center transition-colors duration-150 ${
          !isDark ? 'text-(--lime-ink)' : 'text-(--muted)'
        }`}
      >
        <SunIcon size={16} />
      </span>

      {/* Moon icon */}
      <span
        className={`relative z-10 flex h-full w-8 items-center justify-center transition-colors duration-150 ${
          isDark ? 'text-(--lime-ink)' : 'text-(--muted)'
        }`}
      >
        <MoonIcon size={15} />
      </span>
    </button>
  )
}

type SoundToggleProps = {
  enabled: boolean
  onToggle: () => void
}

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex items-center justify-center h-10 w-10 rounded-xl border-[2.5px] border-(--line) bg-(--paper-2) shadow-(--ex4) transition-all hover:-translate-y-0.5 hover:shadow-(--ex6) active:translate-y-0 active:shadow-[1px_1px_0_var(--ex)] focus-visible:outline-none ${
        enabled ? 'text-(--text)' : 'text-(--muted)'
      }`}
      title={enabled ? 'Mute sound effects' : 'Enable sound effects'}
      aria-label={enabled ? 'Sound enabled. Click to mute' : 'Sound muted. Click to enable'}
    >
      {enabled ? <VolumeIcon size={17} /> : <VolumeMuteIcon size={17} />}
      {enabled && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-(--lime) border border-(--line) shadow-[0_0_6px_var(--lime)]" />
      )}
    </button>
  )
}
