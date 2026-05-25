export interface VersionGroupOption {

  id: string

  label: string

  generation: number

}



export const OFFICIAL_VERSION_GROUPS: VersionGroupOption[] = [

  { id: 'red-blue', label: 'Red / Blue', generation: 1 },

  { id: 'yellow', label: 'Yellow', generation: 1 },

  { id: 'gold-silver', label: 'Gold / Silver', generation: 2 },

  { id: 'crystal', label: 'Crystal', generation: 2 },

  { id: 'ruby-sapphire', label: 'Ruby / Sapphire', generation: 3 },

  { id: 'emerald', label: 'Emerald', generation: 3 },

  { id: 'firered-leafgreen', label: 'FireRed / LeafGreen', generation: 3 },

  { id: 'diamond-pearl', label: 'Diamond / Pearl', generation: 4 },

  { id: 'platinum', label: 'Platinum', generation: 4 },

  { id: 'heartgold-soulsilver', label: 'HeartGold / SoulSilver', generation: 4 },

  { id: 'black-white', label: 'Black / White', generation: 5 },

  { id: 'black-2-white-2', label: 'Black 2 / White 2', generation: 5 },

  { id: 'x-y', label: 'X / Y', generation: 6 },

  { id: 'omega-ruby-alpha-sapphire', label: 'Omega Ruby / Alpha Sapphire', generation: 6 },

  { id: 'sun-moon', label: 'Sun / Moon', generation: 7 },

  { id: 'ultra-sun-ultra-moon', label: 'Ultra Sun / Ultra Moon', generation: 7 },

  { id: 'sword-shield', label: 'Sword / Shield', generation: 8 },

  { id: 'brilliant-diamond-shining-pearl', label: 'Brilliant Diamond / Shining Pearl', generation: 8 },

  { id: 'legends-arceus', label: 'Legends: Arceus', generation: 8 },

  { id: 'scarlet-violet', label: 'Scarlet / Violet', generation: 9 },

]



export const GENERATION_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const



/** PokeAPI version groups in approximate release order (used to pick "latest" text). */

const VERSION_GROUP_ORDER = [

  ...OFFICIAL_VERSION_GROUPS.map((group) => group.id),

  'colosseum',

  'xd',

  'lets-go-pikachu-lets-go-eevee',

]



const HACKROM_GENERATION_TO_VERSION_GROUP: Record<number, string> = {

  1: 'red-blue',

  2: 'gold-silver',

  3: 'emerald',

  4: 'diamond-pearl',

  5: 'black-white',

  6: 'x-y',

  7: 'sun-moon',

  8: 'sword-shield',

  9: 'scarlet-violet',

}



/** Map profile version group (official id or hackrom `gen-N`) to a PokeAPI version_group name. */

export function getApiVersionGroup(versionGroup: string): string {

  if (versionGroup.startsWith('gen-')) {

    const gen = Number(versionGroup.replace('gen-', ''))

    return HACKROM_GENERATION_TO_VERSION_GROUP[gen] ?? 'emerald'

  }

  return versionGroup

}



export function versionGroupToGeneration(versionGroup: string): number {

  const gen3 = ['ruby-sapphire', 'emerald', 'firered-leafgreen', 'colosseum', 'xd']

  const gen4 = ['diamond-pearl', 'platinum', 'heartgold-soulsilver']

  const gen5 = ['black-white', 'black-2-white-2']

  const gen6 = ['x-y', 'omega-ruby-alpha-sapphire']

  const gen7 = ['sun-moon', 'ultra-sun-ultra-moon', 'lets-go-pikachu-lets-go-eevee']

  const gen8 = ['sword-shield', 'brilliant-diamond-shining-pearl', 'legends-arceus']

  const gen9 = ['scarlet-violet']



  if (gen3.includes(versionGroup)) return 3

  if (gen4.includes(versionGroup)) return 4

  if (gen5.includes(versionGroup)) return 5

  if (gen6.includes(versionGroup)) return 6

  if (gen7.includes(versionGroup)) return 7

  if (gen8.includes(versionGroup)) return 8

  if (gen9.includes(versionGroup)) return 9

  if (versionGroup === 'red-blue' || versionGroup === 'yellow') return 1

  if (versionGroup === 'gold-silver' || versionGroup === 'crystal') return 2

  return 3

}



export function compareVersionGroups(a: string, b: string): number {

  const indexA = VERSION_GROUP_ORDER.indexOf(a)

  const indexB = VERSION_GROUP_ORDER.indexOf(b)

  const rankA = indexA === -1 ? -1 : indexA

  const rankB = indexB === -1 ? -1 : indexB

  return rankB - rankA

}


