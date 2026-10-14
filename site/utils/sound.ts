// Lightweight Web Audio API sound effects for cute, tactile micro-interactions.
// Zero audio files loaded over network, 100% synthesized in real-time.

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let soundEnabled = true
const activeOscillators = new Set<OscillatorNode>()

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const saved = localStorage.getItem('pippo_sound')
    if (saved !== null) soundEnabled = saved === 'true'
  } catch {
    // Keep the in-memory setting when storage is unavailable.
  }
  return soundEnabled
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('pippo_sound', String(enabled))
    } catch {
      // Sound controls still work for this session when storage is unavailable.
    }
  }

  if (audioCtx && masterGain) {
    const now = audioCtx.currentTime
    masterGain.gain.cancelScheduledValues(now)
    masterGain.gain.setValueAtTime(enabled ? 1 : 0, now)
  }

  if (!enabled) {
    for (const oscillator of activeOscillators) {
      try {
        oscillator.stop()
      } catch {
        // The oscillator may already have stopped naturally.
      }
    }
    activeOscillators.clear()
  }
}

function connectSound(gain: GainNode, ctx: AudioContext) {
  if (!masterGain) {
    masterGain = ctx.createGain()
    masterGain.gain.value = soundEnabled ? 1 : 0
    masterGain.connect(ctx.destination)
  }
  gain.connect(masterGain)
}

function startSound(oscillator: OscillatorNode, when: number) {
  if (!soundEnabled) return
  activeOscillators.add(oscillator)
  oscillator.addEventListener('ended', () => activeOscillators.delete(oscillator), { once: true })
  oscillator.start(when)
}

function getAudioContext(): AudioContext | null {
  if (!soundEnabled) return null
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
      masterGain = audioCtx.createGain()
      masterGain.gain.value = soundEnabled ? 1 : 0
      masterGain.connect(audioCtx.destination)
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/** Cute bubbly "boop!" sound when clicking the mascot */
export function playBoopSound(combo: number = 1) {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    // Higher pitch as combo increases
    const baseFreq = 420 + Math.min(combo * 45, 360)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.08)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)

    osc.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.15)
  } catch {
    // Graceful fallback
  }
}

/** Crisp, satisfying tactile button click sound */
export function playClickSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.04)

    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.06)
  } catch {
    // Graceful fallback
  }
}

/** Triumphant "sparkle / star" chime for rewarding actions */
export function playChimeSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime + i * 0.045

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      osc.connect(gain)
      connectSound(gain, ctx)

      startSound(osc, now)
      osc.stop(now + 0.24)
    })
  } catch {
    // Graceful fallback
  }
}

/** Warm loving chord sound */
export function playHeartSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const freqs = [440, 554.37, 659.25, 880] // A4, C#5, E5, A5
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime + i * 0.04

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc.connect(gain)
      connectSound(gain, ctx)

      startSound(osc, now)
      osc.stop(now + 0.32)
    })
  } catch {
    // Graceful fallback
  }
}

/** Playful dizzy wobble sound */
export function playDizzySound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.linearRampToValueAtTime(620, now + 0.08)
    osc.frequency.linearRampToValueAtTime(280, now + 0.16)
    osc.frequency.linearRampToValueAtTime(540, now + 0.24)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26)

    osc.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.28)
  } catch {
    // Graceful fallback
  }
}

/** Cute rubber duck / toy squeak sound */
export function playSqueakSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(680, now)
    osc.frequency.exponentialRampToValueAtTime(1420, now + 0.04)
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.1)

    gain.gain.setValueAtTime(0.14, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.13)
  } catch {
    // Graceful fallback
  }
}

/** Heavy pebble / rock impact thud */
export function playThudSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.12)

    gain.gain.setValueAtTime(0.24, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.2)
  } catch {
    // Graceful fallback
  }
}

/** Quick pop sound for whack-a-mole or tongue snap */
export function playPopSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.035)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

    osc.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.08)
  } catch {
    // Graceful fallback
  }
}

/** Musical note sound for choir companions */
export function playMusicNoteSound(freq: number = 440) {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.38)
  } catch {
    // Graceful fallback
  }
}

/** Four-note choir phrase scheduled as one cancellable sound action. */
export function playChoirSequenceSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startAt = ctx.currentTime + index * 0.18

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startAt)
      gain.gain.setValueAtTime(0.12, startAt)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.35)

      osc.connect(gain)
      connectSound(gain, ctx)
      startSound(osc, startAt)
      osc.stop(startAt + 0.38)
    })
  } catch {
    // Graceful fallback
  }
}

/** Thruster roar / blastoff whoosh for rocket hops */
export function playRocketLaunchSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(80, now)
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.3)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(260, now)
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.25)

    gain.gain.setValueAtTime(0.14, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

    osc.connect(filter)
    filter.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.48)
  } catch {
    // Graceful fallback
  }
}

/** Soft cushion retro-thruster landing sound */
export function playRocketLandSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.12)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    connectSound(gain, ctx)

    startSound(osc, now)
    osc.stop(now + 0.16)
  } catch {
    // Graceful fallback
  }
}
