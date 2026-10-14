export const CHARACTERS = [
  // Nature
  'kibo',

  // Animals
  'bear',
  'bunny',
  'cat',
  'deer',
  'dino',
  'fox',
  'frog',
  'hamster',
  'hedgehog',
  'koala',
  'mouse',
  'otter',
  'owl',
  'panda',
  'penguin',
  'pug',
  'raccoon',
  'redpanda',
  'sheep',
  'sloth',
  'tiger',

  // People
  'afro',
  'astronaut',
  'bald',
  'ballerina',
  'beard',
  'builder',
  'cap',
  'chef',
  'glasses',
  'grandpa',
  'granny',
  'hijabi',
  'hinata',
  'gwen',
  'nurse',
  'pirate',
  'scientist',
  'sikh',
  'skater',
  'wizard',

  // Robots
  'clockwork',
  'crt',
  'cube',
  'drone',
  'gearbot',
  'knight',
  'lantern',
  'postbot',
  'radio',
  'rocket',
  'scout',
  'toaster',
  'tv',
] as const

export type CharacterName = (typeof CHARACTERS)[number]

export const DEFAULT_CHARACTER: CharacterName = 'kibo'

export const STYLES = [
  { name: 'colour', character: 'fox', note: 'the default' },
  { name: 'ink', character: 'fox-ink', note: 'black line' },
  { name: 'sketch', character: 'fox-sketch', note: 'pencil' },
  { name: 'riso', character: 'fox-riso', note: 'two-tone print' },
  { name: 'paper', character: 'fox-paper', note: 'cut paper' },
  { name: 'pixel', character: 'fox-pixel', note: '32 across' },
]

const CHARACTER_ALIASES: Record<string, string> = {
  // Characters · 18
  bitbug: 'hedgehog',
  boing: 'hamster',
  moss: 'kibo',
  lurk: 'fox',
  thread: 'kibo',
  pip: 'owl',
  bumble: 'bear',
  shel: 'pug',
  gecko: 'dino',
  mole: 'hamster',
  balloon: 'bunny',
  para: 'cat',
  roomba: 'toaster',
  kitty: 'cat',
  hiss: 'dino',
  pinch: 'raccoon',
  shibe: 'pug',
  capy: 'sloth',

  // Interactions · 10
  termi: 'frog',
  peeper: 'bear',
  gearbot: 'gearbot',
  rocket: 'rocket',
  router: 'radio',
  penguin: 'penguin',
  scrolly: 'skater',
  beep: 'radio',
  snip: 'builder',
  echo: 'lantern',

  // Groups · 8
  duck: 'dino',
  ducks: 'dino',
  ants: 'postbot',
  fish: 'otter',
  sparrows: 'owl',
  choir: 'bear',
  fireflies: 'lantern',
  sheep: 'sheep',
  bees: 'bear',
}

export function sheets(character: string) {
  const resolved = CHARACTER_ALIASES[character] || character
  const usesPng = resolved === 'kibo' || resolved === 'hinata' || resolved === 'gwen' || resolved === 'raven'
  const extension = usesPng ? 'png' : 'webp'
  const version = resolved === 'kibo' ? '?v=2' : resolved === 'hinata' || resolved === 'gwen' ? '?v=1' : ''
  return {
    directions: `${import.meta.env.BASE_URL}sprites/${resolved}-directions.${extension}${version}`,
    reactions: `${import.meta.env.BASE_URL}sprites/${resolved}-reactions.${extension}${version}`,
  }
}
