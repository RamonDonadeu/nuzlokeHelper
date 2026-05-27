import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PokemonSummary } from '@/types/pokemon'
import type {
  AppPersistedState,
  EvolutionChoice,
  PokemonSlot,
  ProfileConfig,
  ProfileSettings,
  RunProfile,
  SlotListName,
} from '@/types/profile'
import {
  clampLevelCap,
  createProfile,
  findSlotInProfile,
  getProfileGeneration,
  MAX_TEAM_SIZE,
  MIN_POKEMON_LEVEL,
} from '@/types/profile'
import {
  fetchEvolutionOptions,
  findEvolutionsAtLevel,
  findEvolutionsAvailableAtLevel,
  fetchPokemonFormData,
  type EvolutionOption,
} from '@/lib/evolution'
import { fetchPokemon } from '@/lib/pokeapi'
import { normalizePokemonTypes } from '@/lib/pokemonTypes'
import { loadAppState, saveAppState } from '@/lib/storage'
import { defaultNature } from '@/lib/stats'
import type { ParsedShowdownSet } from '@/lib/showdown'
import { parseShowdownPaste, showdownSetsToSlots } from '@/lib/showdown'

function touchProfile(profile: RunProfile): RunProfile {
  return { ...profile, updatedAt: new Date().toISOString() }
}

function updateActiveProfile(
  state: AppPersistedState,
  updater: (profile: RunProfile) => RunProfile,
): AppPersistedState {
  return {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === state.activeProfileId ? touchProfile(updater(p)) : p,
    ),
  }
}

function summaryToSlot(summary: PokemonSummary, level = 5): PokemonSlot {
  return {
    slotId: crypto.randomUUID(),
    speciesId: summary.id,
    currentSpeciesId: summary.id,
    name: summary.name,
    displayName: summary.displayName,
    types: normalizePokemonTypes(summary.types),
    baseStats: summary.stats,
    sprite: summary.sprite,
    level,
    nature: defaultNature(),
  }
}

async function enrichEvolutionOptions(
  matches: EvolutionOption[],
): Promise<EvolutionChoice['options']> {
  return Promise.all(
    matches.map(async (m) => {
      const form = await fetchPokemonFormData(m.toName)
      return {
        speciesId: form.id,
        name: form.name,
        displayName: form.displayName,
        sprite: form.sprite,
        types: form.types,
        baseStats: form.baseStats,
        minLevel: m.minLevel,
      }
    }),
  )
}

export function useProfiles() {
  const [state, setState] = useState<AppPersistedState>(() => loadAppState())
  const [pendingEvolution, setPendingEvolution] = useState<EvolutionChoice | null>(null)

  useEffect(() => {
    saveAppState(state)
  }, [state])

  const activeProfile = useMemo(
    () => state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0],
    [state],
  )

  useEffect(() => {
    const slotsToHydrate: Array<{ slotId: string; name: string; list: SlotListName }> = []
    for (const list of ['team', 'box', 'deathBox', 'opponentTeam'] as const) {
      for (const slot of activeProfile[list]) {
        if (normalizePokemonTypes(slot.types).length === 0 && slot.name.trim()) {
          slotsToHydrate.push({ slotId: slot.slotId, name: slot.name, list })
        }
      }
    }
    if (slotsToHydrate.length === 0) return

    let cancelled = false
    void Promise.all(
      slotsToHydrate.map(async ({ slotId, name, list }) => {
        try {
          const pokemon = await fetchPokemon(name)
          if (pokemon.types.length === 0) return null
          return { slotId, list, types: pokemon.types }
        } catch {
          return null
        }
      }),
    ).then((updates) => {
      if (cancelled) return
      const valid = updates.filter(
        (update): update is { slotId: string; list: SlotListName; types: PokemonSlot['types'] } =>
          update !== null,
      )
      if (valid.length === 0) return

      setState((s) =>
        updateActiveProfile(s, (profile) => {
          let next = profile
          for (const { slotId, list, types } of valid) {
            next = {
              ...next,
              [list]: next[list].map((member) =>
                member.slotId === slotId ? { ...member, types } : member,
              ),
            }
          }
          return next
        }),
      )
    })

    return () => {
      cancelled = true
    }
  }, [activeProfile])

  const generation = useMemo(
    () => getProfileGeneration(activeProfile.settings),
    [activeProfile.settings],
  )

  const versionGroup = useMemo(() => {
    const config = activeProfile.settings.config
    return config.kind === 'official' ? config.versionGroup : `gen-${config.baseGeneration}`
  }, [activeProfile.settings.config])

  const setLocale = useCallback((locale: 'en' | 'es') => {
    setState((s) => ({ ...s, locale }))
  }, [])

  const switchProfile = useCallback((id: string) => {
    setState((s) => ({ ...s, activeProfileId: id }))
    setPendingEvolution(null)
  }, [])

  const createNewProfile = useCallback((name: string, settings?: ProfileSettings) => {
    const profile = createProfile(name, settings)
    setState((s) => ({
      ...s,
      profiles: [...s.profiles, profile],
      activeProfileId: profile.id,
    }))
  }, [])

  const deleteProfile = useCallback((id: string) => {
    setState((s) => {
      if (s.profiles.length <= 1) return s
      const profiles = s.profiles.filter((p) => p.id !== id)
      const activeProfileId = s.activeProfileId === id ? profiles[0].id : s.activeProfileId
      return { ...s, profiles, activeProfileId }
    })
  }, [])

  const updateSettings = useCallback((partial: Partial<ProfileSettings>) => {
    const { levelCap, ...rest } = partial
    setState((s) =>
      updateActiveProfile(s, (p) => ({
        ...p,
        settings: {
          ...p.settings,
          ...rest,
          ...(levelCap !== undefined ? { levelCap: clampLevelCap(levelCap) } : {}),
        },
      })),
    )
  }, [])

  const setLevelCap = useCallback((levelCap: number) => {
    setState((s) =>
      updateActiveProfile(s, (p) => ({
        ...p,
        settings: {
          ...p.settings,
          levelCap: clampLevelCap(levelCap),
        },
      })),
    )
  }, [])

  const updateProfileConfig = useCallback((config: ProfileConfig) => {
    setState((s) =>
      updateActiveProfile(s, (p) => ({
        ...p,
        settings: { ...p.settings, config },
      })),
    )
  }, [])

  const renameProfile = useCallback((name: string) => {
    setState((s) => updateActiveProfile(s, (p) => ({ ...p, name })))
  }, [])

  const addToTeam = useCallback((summary: PokemonSummary) => {
    setState((s) =>
      updateActiveProfile(s, (p) => {
        if (p.team.length >= MAX_TEAM_SIZE) return p
        if (p.team.some((m) => m.currentSpeciesId === summary.id)) return p
        return { ...p, team: [...p.team, summaryToSlot(summary)] }
      }),
    )
  }, [])

  const addToBox = useCallback((summary: PokemonSummary) => {
    setState((s) =>
      updateActiveProfile(s, (p) => ({
        ...p,
        box: [...p.box, summaryToSlot(summary)],
      })),
    )
  }, [])

  const removeFromTeam = useCallback((slotId: string) => {
    setState((s) =>
      updateActiveProfile(s, (p) => ({
        ...p,
        team: p.team.filter((m) => m.slotId !== slotId),
      })),
    )
  }, [])

  const sendAllTeamToBox = useCallback(() => {
    setState((s) =>
      updateActiveProfile(s, (p) => {
        if (p.team.length === 0) return p
        return {
          ...p,
          team: [],
          box: [...p.box, ...p.team],
        }
      }),
    )
  }, [])

  const moveSlot = useCallback(
    (slotId: string, from: 'team' | 'box' | 'deathBox', to: 'team' | 'box' | 'deathBox') => {
      setState((s) =>
        updateActiveProfile(s, (p) => {
          if (from === to) return p
          const slot = p[from].find((m) => m.slotId === slotId)
          if (!slot) return p
          if (to === 'team' && p.team.length >= MAX_TEAM_SIZE) return p

          return {
            ...p,
            [from]: p[from].filter((m) => m.slotId !== slotId),
            [to]: [...p[to], slot],
          }
        }),
      )
    },
    [],
  )

  const moveToBox = useCallback((slotId: string, from: 'team' | 'deathBox') => {
    moveSlot(slotId, from, 'box')
  }, [moveSlot])

  const moveToDeath = useCallback((slotId: string) => {
    moveSlot(slotId, 'team', 'deathBox')
  }, [moveSlot])

  const faintFromBox = useCallback((slotId: string) => {
    moveSlot(slotId, 'box', 'deathBox')
  }, [moveSlot])

  const removeFromBox = useCallback((slotId: string) => {
    setState((s) =>
      updateActiveProfile(s, (p) => ({
        ...p,
        box: p.box.filter((m) => m.slotId !== slotId),
      })),
    )
  }, [])

  const removeFromDeathBox = useCallback((slotId: string) => {
    setState((s) =>
      updateActiveProfile(s, (p) => ({
        ...p,
        deathBox: p.deathBox.filter((m) => m.slotId !== slotId),
      })),
    )
  }, [])

  const moveToTeam = useCallback((slotId: string, from: 'box' | 'deathBox') => {
    moveSlot(slotId, from, 'team')
  }, [moveSlot])

  const revive = useCallback((slotId: string) => {
    if (!activeProfile.settings.allowRevival) return
    moveSlot(slotId, 'deathBox', 'box')
  }, [activeProfile.settings.allowRevival, moveSlot])

  const updateSlot = useCallback((slotId: string, patch: Partial<PokemonSlot>, list: 'team' | 'box' | 'deathBox' | 'opponentTeam' = 'team') => {
    setState((s) =>
      updateActiveProfile(s, (p) => ({
        ...p,
        [list]: p[list].map((m) => (m.slotId === slotId ? { ...m, ...patch } : m)),
      })),
    )
  }, [])

  const checkEvolutionPrompt = useCallback(
    async (slot: PokemonSlot, newLevel: number, list: SlotListName) => {
      try {
        const pokemon = await fetchPokemon(slot.name)
        const options = await fetchEvolutionOptions(pokemon.speciesUrl)
        const matches = findEvolutionsAtLevel(options, slot.name, newLevel)
        if (matches.length === 0) return

        setPendingEvolution({
          slotId: slot.slotId,
          fromLevel: slot.level,
          toLevel: newLevel,
          list,
          source: 'levelUp',
          options: await enrichEvolutionOptions(matches),
        })
      } catch {
        // ignore fetch errors
      }
    },
    [],
  )

  const levelUpSlot = useCallback(
    async (slotId: string, list: 'team' | 'box' = 'team') => {
      let leveled: PokemonSlot | undefined

      setState((s) =>
        updateActiveProfile(s, (p) => {
          const slot = p[list].find((m) => m.slotId === slotId)
          if (!slot) return p
          const newLevel = Math.min(slot.level + 1, p.settings.levelCap)
          if (newLevel === slot.level) return p
          leveled = { ...slot, level: newLevel }
          return {
            ...p,
            [list]: p[list].map((m) => (m.slotId === slotId ? leveled! : m)),
          }
        }),
      )

      if (leveled) {
        await checkEvolutionPrompt(leveled, leveled.level, list)
      }
    },
    [checkEvolutionPrompt],
  )

  const levelDownSlot = useCallback((slotId: string, list: 'team' | 'box' = 'team') => {
    setState((s) =>
      updateActiveProfile(s, (p) => {
        const slot = p[list].find((m) => m.slotId === slotId)
        if (!slot) return p
        const newLevel = Math.max(slot.level - 1, MIN_POKEMON_LEVEL)
        if (newLevel === slot.level) return p
        return {
          ...p,
          [list]: p[list].map((m) => (m.slotId === slotId ? { ...m, level: newLevel } : m)),
        }
      }),
    )
  }, [])

  const moveAllToCap = useCallback(async () => {
    const leveledUp: PokemonSlot[] = []

    setState((s) =>
      updateActiveProfile(s, (p) => {
        const cap = p.settings.levelCap
        const team = p.team.map((slot) => {
          if (slot.level === cap) return slot
          const updated = { ...slot, level: cap }
          if (slot.level < cap) leveledUp.push(updated)
          return updated
        })
        return { ...p, team }
      }),
    )

    for (const slot of leveledUp) {
      await checkEvolutionPrompt(slot, slot.level, 'team')
    }
  }, [checkEvolutionPrompt])

  const setAllBoxToLevelCap = useCallback(() => {
    setState((s) =>
      updateActiveProfile(s, (p) => {
        const cap = p.settings.levelCap
        const box = p.box.map((slot) =>
          slot.level === cap ? slot : { ...slot, level: cap },
        )
        return { ...p, box }
      }),
    )
  }, [])

  const evolveSlotWithOption = useCallback(
    (
      slotId: string,
      list: SlotListName,
      level: number,
      option: EvolutionChoice['options'][number],
    ) => {
      updateSlot(
        slotId,
        {
          currentSpeciesId: option.speciesId,
          name: option.name,
          displayName: option.displayName,
          types: option.types,
          baseStats: option.baseStats,
          sprite: option.sprite,
          level,
        },
        list,
      )
    },
    [updateSlot],
  )

  const applyEvolution = useCallback(
    (choice: EvolutionChoice, optionIndex: number) => {
      const option = choice.options[optionIndex]
      if (!option) return

      evolveSlotWithOption(choice.slotId, choice.list, choice.toLevel, option)
      setPendingEvolution(null)
    },
    [evolveSlotWithOption],
  )

  const dismissEvolution = useCallback(() => {
    if (pendingEvolution?.source === 'levelUp') {
      updateSlot(
        pendingEvolution.slotId,
        { level: pendingEvolution.toLevel },
        pendingEvolution.list,
      )
    }
    setPendingEvolution(null)
  }, [pendingEvolution, updateSlot])

  const requestEvolution = useCallback(
    async (slotId: string) => {
      const found = findSlotInProfile(activeProfile, slotId)
      if (!found) return
      const { slot, list } = found
      if (list !== 'team' && list !== 'box') return

      try {
        const pokemon = await fetchPokemon(slot.name)
        const options = await fetchEvolutionOptions(pokemon.speciesUrl)
        const matches = findEvolutionsAvailableAtLevel(options, slot.name, slot.level)
        if (matches.length === 0) return

        const enriched = await enrichEvolutionOptions(matches)

        if (matches.length === 1) {
          evolveSlotWithOption(slotId, list, slot.level, enriched[0])
          return
        }

        setPendingEvolution({
          slotId,
          fromLevel: slot.level,
          toLevel: slot.level,
          list,
          source: 'manual',
          options: enriched,
        })
      } catch {
        // ignore fetch errors
      }
    },
    [activeProfile, evolveSlotWithOption],
  )

  const importShowdown = useCallback(
    async (text: string, target: 'team' | 'opponentTeam') => {
      const sets = parseShowdownPaste(text)
      const slots = await showdownSetsToSlots(sets, activeProfile.settings.levelCap)

      setState((s) =>
        updateActiveProfile(s, (p) => {
          if (target === 'team') {
            const room = MAX_TEAM_SIZE - p.team.length
            return { ...p, team: [...p.team, ...slots.slice(0, room)] }
          }
          return { ...p, opponentTeam: slots }
        }),
      )
    },
    [activeProfile.settings.levelCap],
  )

  const setOpponentTeam = useCallback((slots: PokemonSlot[]) => {
    setState((s) => updateActiveProfile(s, (p) => ({ ...p, opponentTeam: slots })))
  }, [])

  const isFull = activeProfile.team.length >= MAX_TEAM_SIZE
  const hasMember = useCallback(
    (speciesId: number) => activeProfile.team.some((m) => m.currentSpeciesId === speciesId),
    [activeProfile.team],
  )

  return {
    state,
    locale: state.locale,
    setLocale,
    profiles: state.profiles,
    activeProfile,
    generation,
    versionGroup,
    switchProfile,
    createNewProfile,
    deleteProfile,
    updateSettings,
    setLevelCap,
    updateProfileConfig,
    renameProfile,
    team: activeProfile.team,
    box: activeProfile.box,
    deathBox: activeProfile.deathBox,
    opponentTeam: activeProfile.opponentTeam,
    addToTeam,
    addToBox,
    removeFromTeam,
    sendAllTeamToBox,
    moveToBox,
    moveToDeath,
    faintFromBox,
    removeFromBox,
    removeFromDeathBox,
    moveToTeam,
    revive,
    updateSlot,
    levelUpSlot,
    levelDownSlot,
    moveAllToCap,
    setAllBoxToLevelCap,
    pendingEvolution,
    applyEvolution,
    dismissEvolution,
    requestEvolution,
    importShowdown,
    setOpponentTeam,
    isFull,
    hasMember,
  }
}

export type { ParsedShowdownSet }
