import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { EvolutionPrompt } from '@/features/team/components/EvolutionPrompt'
import { AbilitySearchPanel } from '@/features/search/components/AbilitySearchPanel'
import { ItemSearchPanel } from '@/features/search/components/ItemSearchPanel'
import { MoveSearchPanel } from '@/features/search/components/MoveSearchPanel'
import { PCView } from '@/features/pc/components/PCView'
import { PokemonCard } from '@/features/search/components/PokemonCard'
import { PokemonEditor } from '@/features/team/components/PokemonEditor'
import { IconNavRail } from '@/app/components/IconNavRail'
import { LanguageSelector } from '@/shared/components/LanguageSelector'
import { ProfileSettingsModal } from '@/features/profiles/components/ProfileSettingsModal'
import { SidebarDrawer } from '@/app/components/SidebarDrawer'
import { SearchMatchup } from '@/features/search/components/SearchMatchup'
import { StatComparison } from '@/features/search/components/StatComparison'
import { BattleView } from '@/features/battle/components/BattleView'
import { TeamPanel } from '@/features/team/components/TeamPanel'
import { TeamInfoView } from '@/features/team/components/TeamInfoView'
import { TeamView } from '@/features/team/components/TeamView'
import { ToastProvider, useToast } from '@/shared/components/Toast'
import { I18nProvider, useI18n } from '@/i18n'
import { usePokemonDetails } from '@/features/search/hooks/usePokemonDetails'
import { useMoveDetails } from '@/features/search/hooks/useMoveDetails'
import { useMoveSearch } from '@/features/search/hooks/useMoveSearch'
import { useAbilityDetails } from '@/features/search/hooks/useAbilityDetails'
import { useAbilitySearch } from '@/features/search/hooks/useAbilitySearch'
import { useItemDetails } from '@/features/search/hooks/useItemDetails'
import { useItemSearch } from '@/features/search/hooks/useItemSearch'
import { usePokemonSearch } from '@/features/search/hooks/usePokemonSearch'
import { useSearchMatchup } from '@/features/search/hooks/useSearchMatchup'
import { useProfiles } from '@/features/profiles/hooks/useProfiles'
import {
  getLocalizedPokemonName,
  getLocalizedPokemonNameBySlug,
  getSpeciesSlugFromUrl,
  displayMoveName,
  displayAbilityName,
  displayItemName,
} from '@/lib/localizedNames'
import { findSlotInProfile } from '@/types/profile'

type Tab = 'types' | 'pc' | 'battle'
type SearchResultFilter = 'pokemon' | 'moves' | 'abilities' | 'items'

const SEARCH_CATEGORY_ORDER: SearchResultFilter[] = ['pokemon', 'moves', 'abilities', 'items']

export default function App() {
  const profiles = useProfiles()

  return (
    <I18nProvider locale={profiles.locale} setLocale={profiles.setLocale}>
      <ToastProvider>
        <AppContent {...profiles} />
      </ToastProvider>
    </I18nProvider>
  )
}

function AppContent({
  setLocale,
  profiles,
  activeProfile,
  versionGroup,
  switchProfile,
  createNewProfile,
  deleteProfile,
  updateSettings,
  setLevelCap,
  updateProfileConfig,
  team,
  opponentTeam,
  box,
  deathBox,
  addToTeam,
  addToBox,
  sendAllTeamToBox,
  moveToBox,
  moveToDeath,
  faintFromBox,
  removeFromBox,
  removeFromDeathBox,
  moveToTeam,
  replaceTeamSlotWithBox,
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
  isFull,
  hasMember,
  setOpponentTeam,
}: ReturnType<typeof useProfiles>) {
  const { t, locale } = useI18n()
  const { showToast, showErrorToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchResultFilter, setSearchResultFilter] = useState<SearchResultFilter>('pokemon')
  const [searchOverrideName, setSearchOverrideName] = useState<string | null>(null)
  const [searchOverrideMove, setSearchOverrideMove] = useState<string | null>(null)
  const [searchOverrideAbility, setSearchOverrideAbility] = useState<string | null>(null)
  const [searchOverrideItem, setSearchOverrideItem] = useState<string | null>(null)
  const [confirmSendAllToPC, setConfirmSendAllToPC] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchSectionRef = useRef<HTMLElement>(null)
  const isSearchRoute = location.pathname === '/search'
  const showTeamInfoOnSearch = isSearchRoute && query.trim().length < 2

  const buildSearchPath = useCallback((q: string) => {
    const trimmed = q.trim()
    if (trimmed.length >= 2) {
      return `/search?q=${encodeURIComponent(trimmed)}`
    }
    return '/search'
  }, [])

  useEffect(() => {
    if (!isSearchRoute) return
    const urlQ = new URLSearchParams(location.search).get('q')
    if (urlQ === null) return
    setQuery((prev) => (prev === urlQ ? prev : urlQ))
  }, [isSearchRoute, location.search])

  useEffect(() => {
    if (!isSearchRoute) return
    const trimmed = query.trim()
    const params = new URLSearchParams(location.search)
    if (trimmed.length < 2) {
      if (!params.has('q')) return
      params.delete('q')
      const search = params.toString()
      navigate({ pathname: '/search', search: search ? `?${search}` : '' }, { replace: true })
      return
    }
    if (params.get('q') === trimmed) return
    params.set('q', trimmed)
    navigate({ pathname: '/search', search: `?${params.toString()}` }, { replace: true })
  }, [query, isSearchRoute, location.search, navigate])

  const handleSearchChange = (value: string) => {
    setQuery(value)
    const trimmed = value.trim()
    if (trimmed.length >= 2 && !isSearchRoute) {
      navigate(buildSearchPath(trimmed))
    }
  }

  const teamDetailMatch = matchPath('/team/:slotId', location.pathname)
  const pcDetailMatch = matchPath('/pc/:pokemonId', location.pathname)
  const teamSlotId = teamDetailMatch?.params.slotId ?? null
  const pcSlotId = pcDetailMatch?.params.pokemonId ?? null
  const selectedSlotId = teamSlotId ?? pcSlotId
  const isBattleRoute = location.pathname === '/battle'
  const isTeamRoute = location.pathname === '/team' || Boolean(teamSlotId)
  const isTeamInfoRoute =
    location.pathname === '/team-info' ||
    location.pathname === '/' ||
    location.pathname === '/team-typing' ||
    showTeamInfoOnSearch
  const activeTab: Tab | null = isTeamRoute
    ? null
    : location.pathname === '/pc' || Boolean(pcSlotId)
      ? 'pc'
      : isBattleRoute
        ? 'battle'
        : isTeamInfoRoute
          ? 'types'
          : null
  const scrollSearchToTop = useCallback(() => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const selectedSlotInfo = selectedSlotId ? findSlotInProfile(activeProfile, selectedSlotId) : null

  const {
    results,
    bestMatch,
    isPending: searchPending,
  } = usePokemonSearch(isSearchRoute ? query : '')
  const moveSearch = useMoveSearch(query, locale, query.trim().length >= 2)
  const abilitySearch = useAbilitySearch(query, locale, query.trim().length >= 2)
  const itemSearch = useItemSearch(query, locale, query.trim().length >= 2)

  const searchDisplayName = searchOverrideName ?? bestMatch?.name ?? null
  const selectedMoveName = searchOverrideMove ?? moveSearch.results[0]?.canonicalName ?? null
  const selectedAbilityName = searchOverrideAbility ?? abilitySearch.results[0]?.canonicalName ?? null
  const selectedItemName = searchOverrideItem ?? itemSearch.results[0]?.canonicalName ?? null

  const {
    pokemon: searchPokemon,
    evolutions: searchEvolutions,
    loading: searchDetailsLoading,
    error: searchDetailsError,
  } = usePokemonDetails(searchDisplayName)
  const {
    move: searchMove,
    loading: searchMoveLoading,
    error: searchMoveError,
  } = useMoveDetails(selectedMoveName)
  const { ability: searchAbility, loading: searchAbilityLoading, error: searchAbilityError } =
    useAbilityDetails(selectedAbilityName)
  const { item: searchItem, loading: searchItemLoading, error: searchItemError } =
    useItemDetails(selectedItemName)

  const searchMatchup = useSearchMatchup(team, searchPokemon)

  useEffect(() => {
    setSearchResultFilter('pokemon')
    setSearchOverrideName(null)
    setSearchOverrideMove(null)
    setSearchOverrideAbility(null)
    setSearchOverrideItem(null)
  }, [query])

  const handleSelectSlot = (slotId: string, tab?: Tab) => {
    navigate(tab === 'pc' ? `/pc/${slotId}` : `/team/${slotId}`)
  }

  const handleTabClick = (tab: Tab) => {
    if (tab === 'pc') {
      navigate('/pc')
      return
    }
    if (tab === 'battle') {
      navigate('/battle')
      return
    }
    navigate('/team-info')
  }

  const handleMobileTeamNav = () => {
    navigate('/team')
  }

  const otherMatches =
    bestMatch && !searchOverrideName
      ? results.filter((result) => result.name !== bestMatch.name)
      : results.filter((result) => result.name !== searchDisplayName)

  const handleSearchResultClick = (name: string) => {
    setSearchOverrideName(name)
    requestAnimationFrame(scrollSearchToTop)
  }

  const handleMoveResultClick = (canonicalName: string) => {
    setSearchOverrideMove(canonicalName)
    requestAnimationFrame(scrollSearchToTop)
  }

  const handleAbilityResultClick = (canonicalName: string) => {
    setSearchOverrideAbility(canonicalName)
    requestAnimationFrame(scrollSearchToTop)
  }

  const handleItemResultClick = (canonicalName: string) => {
    setSearchOverrideItem(canonicalName)
    requestAnimationFrame(scrollSearchToTop)
  }

  useEffect(() => {
    if (!searchOverrideName || searchDetailsLoading) return
    scrollSearchToTop()
  }, [searchOverrideName, searchDetailsLoading, scrollSearchToTop])

  const showTeamFullError = useCallback(
    (name: string) => {
      showErrorToast(t('toast.cannotAddToTeam', { name }))
    },
    [showErrorToast, t],
  )

  const handleAddToTeam = () => {
    if (!searchPokemon || hasMember(searchPokemon.id)) return
    if (isFull) {
      const name = getLocalizedPokemonName(
        searchPokemon.name,
        getSpeciesSlugFromUrl(searchPokemon.speciesUrl),
        locale,
        searchPokemon.displayName,
      )
      showTeamFullError(name)
      return
    }
    addToTeam(searchPokemon)
  }

  const handleMoveToTeam = (slotId: string) => {
    if (isFull) {
      const slot = box.find((member) => member.slotId === slotId)
      if (slot) showTeamFullError(slot.nickname ?? slot.displayName)
      return
    }
    moveToTeam(slotId, 'box')
  }

  const handleStartFightFromSearch = () => {
    navigate('/battle', { state: { startFight: true } })
  }

  const handleSendToPC = () => {
    if (!searchPokemon) return
    addToBox(searchPokemon)
    const name = getLocalizedPokemonName(
      searchPokemon.name,
      getSpeciesSlugFromUrl(searchPokemon.speciesUrl),
      locale,
      searchPokemon.displayName,
    )
    showToast(t('toast.addedToPC', { name }))
  }

  const handleMoveTeamToPC = (slotId: string) => {
    const slot = team.find((member) => member.slotId === slotId)
    if (!slot) return
    moveToBox(slotId, 'team')
    showToast(t('toast.addedToPC', { name: slot.nickname ?? slot.displayName }))
  }

  const handleSendAllToPC = () => {
    if (team.length === 0) {
      showErrorToast(t('team.sendAllToPCEmpty'))
      return
    }
    setConfirmSendAllToPC(true)
  }

  const handleConfirmSendAllToPC = () => {
    const count = team.length
    sendAllTeamToBox()
    showToast(t('toast.allSentToPC', { count }))
    setConfirmSendAllToPC(false)
  }

  const addLabel = hasMember(searchPokemon?.id ?? 0)
    ? t('search.alreadyOnTeam')
    : isFull
      ? t('search.teamFull')
      : t('search.addToTeam')

  const showSearchResults = isSearchRoute && query.trim().length >= 2

  const pokemonMatchCount = results.length
  const moveMatchCount = moveSearch.results.length
  const abilityMatchCount = abilitySearch.results.length
  const itemMatchCount = itemSearch.results.length

  const searchCategoryCounts: Record<SearchResultFilter, number> = {
    pokemon: pokemonMatchCount,
    moves: moveMatchCount,
    abilities: abilityMatchCount,
    items: itemMatchCount,
  }

  const searchCategoryPending: Record<SearchResultFilter, boolean> = {
    pokemon: searchPending,
    moves: moveSearch.isPending,
    abilities: abilitySearch.isPending,
    items: itemSearch.isPending,
  }

  const searchesSettled =
    showSearchResults &&
    !searchPending &&
    !moveSearch.isPending &&
    !abilitySearch.isPending &&
    !itemSearch.isPending

  useEffect(() => {
    if (!searchesSettled) return
    const activeCount = searchCategoryCounts[searchResultFilter]
    if (activeCount > 0) return
    const firstWithMatches = SEARCH_CATEGORY_ORDER.find((key) => searchCategoryCounts[key] > 0)
    if (firstWithMatches) {
      setSearchResultFilter(firstWithMatches)
    }
  }, [
    searchesSettled,
    searchResultFilter,
    pokemonMatchCount,
    moveMatchCount,
    abilityMatchCount,
    itemMatchCount,
  ])

  const showPokemonResults = searchResultFilter === 'pokemon'
  const showMoveResults = searchResultFilter === 'moves'
  const showAbilityResults = searchResultFilter === 'abilities'
  const showItemResults = searchResultFilter === 'items'

  const searchCategoryLabels: Record<SearchResultFilter, string> = {
    pokemon: t('search.filterPokemon'),
    moves: t('search.filterMoves'),
    abilities: t('search.filterAbilities'),
    items: t('search.filterItems'),
  }

  const otherMoveMatches =
    searchOverrideMove && selectedMoveName
      ? moveSearch.results.filter((result) => result.canonicalName !== selectedMoveName)
      : moveSearch.results.slice(1)
  const otherAbilityMatches =
    searchOverrideAbility && selectedAbilityName
      ? abilitySearch.results.filter((result) => result.canonicalName !== selectedAbilityName)
      : abilitySearch.results.slice(1)
  const otherItemMatches =
    searchOverrideItem && selectedItemName
      ? itemSearch.results.filter((result) => result.canonicalName !== selectedItemName)
      : itemSearch.results.slice(1)

  const teamPanelProps = {
    team,
    levelCap: activeProfile.settings.levelCap,
    selectedSlotId,
    onSelectSlot: (slotId: string) => handleSelectSlot(slotId),
    onUpdateLevelCap: setLevelCap,
    onMoveAllToCap: () => void moveAllToCap(),
    onSendAllToPC: handleSendAllToPC,
    onLevelUp: (id: string) => void levelUpSlot(id),
    onLevelDown: levelDownSlot,
    onMoveToBox: handleMoveTeamToPC,
    onMarkDead: moveToDeath,
    onEvolve: (id: string) => void requestEvolution(id),
  }

  const sidebar = <TeamPanel {...teamPanelProps} />

  return (
    <div className="app-shell">
      <header className="app-top-bar">
        <LanguageSelector locale={locale} onChange={setLocale} />
        <div className="top-bar-title">
          <h1>{t('appTitle')}</h1>
          <p className="muted top-bar-subtitle">{t('appSubtitle')}</p>
        </div>
        <button
          type="button"
          className="profile-trigger"
          onClick={() => setProfileOpen(true)}
          aria-label={t('profile.openSettings')}
        >
          <span className="profile-trigger-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </span>
          <span className="profile-trigger-name">{activeProfile.name}</span>
          <span className="profile-trigger-gear" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </span>
        </button>
      </header>

      <div className="app-body">
        <div className="app-main-area">
          <div className={`app-layout${isBattleRoute ? ' app-layout-battle' : ''}`}>
            <SidebarDrawer open={false} onOpenChange={() => {}}>
              {sidebar}
            </SidebarDrawer>

            <main className="main-content">
          {!isBattleRoute && (
            <div className="main-search-bar">
              <input
                type="search"
                className="search-input"
                placeholder={t('search.placeholder')}
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                aria-label={t('search.title')}
              />
            </div>
          )}

          <Routes>
            <Route
              path="/search"
              element={
                <>
                  {showTeamInfoOnSearch && (
                    <TeamInfoView team={team} levelCap={activeProfile.settings.levelCap} />
                  )}
                  {showSearchResults && (
            <section ref={searchSectionRef} className="card search-section">
              {showSearchResults && (
                <div
                  className="search-category-tabs"
                  role="tablist"
                  aria-label={t('search.filterLabel')}
                >
                  {SEARCH_CATEGORY_ORDER.map((category) => {
                    const count = searchCategoryCounts[category]
                    const pending = searchCategoryPending[category]
                    const disabled = !pending && count === 0
                    const isActive = searchResultFilter === category
                    return (
                      <button
                        key={category}
                        type="button"
                        role="tab"
                        id={`search-tab-${category}`}
                        aria-selected={isActive}
                        aria-controls={`search-panel-${category}`}
                        aria-disabled={disabled}
                        disabled={disabled}
                        className={`search-category-tab ${isActive ? 'active' : ''}`}
                        onClick={() => setSearchResultFilter(category)}
                      >
                        <span className="search-category-tab-label">
                          {searchCategoryLabels[category]}
                        </span>
                        <span className="search-category-tab-count" aria-hidden="true">
                          {pending ? '…' : count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div
                role="tabpanel"
                id={`search-panel-${searchResultFilter}`}
                aria-labelledby={`search-tab-${searchResultFilter}`}
              >
              {showPokemonResults && query.trim().length >= 2 && searchPending && (
                <p className="muted search-status">{t('search.searching')}</p>
              )}
              {showMoveResults && query.trim().length >= 2 && moveSearch.isPending && (
                <p className="muted search-status">{t('search.searchingMoves')}</p>
              )}
              {showAbilityResults && query.trim().length >= 2 && abilitySearch.isPending && (
                <p className="muted search-status">{t('search.searchingAbilities')}</p>
              )}
              {showItemResults && query.trim().length >= 2 && itemSearch.isPending && (
                <p className="muted search-status">{t('search.searchingItems')}</p>
              )}

              {showPokemonResults && searchDisplayName && searchDetailsLoading && (
                <p className="muted search-status">{t('compare.loading')}</p>
              )}

              {showPokemonResults && searchDetailsError && (
                <p className="error-note">{searchDetailsError}</p>
              )}
              {showMoveResults && searchMoveError && (
                <p className="error-note">{searchMoveError}</p>
              )}
              {showAbilityResults && searchAbilityError && (
                <p className="error-note">{searchAbilityError}</p>
              )}
              {showItemResults && searchItemError && <p className="error-note">{searchItemError}</p>}

              {showPokemonResults && searchPokemon && !searchDetailsLoading && (
                <div className="search-best-match">
                  <h3 className="search-best-match-label">{t('search.bestMatch')}</h3>
                  <PokemonCard
                    pokemon={searchPokemon}
                    profileVersionGroup={versionGroup}
                    evolutions={searchEvolutions}
                    evolutionLineLabel={t('compare.evolutionLine')}
                    onAdd={handleAddToTeam}
                    addDisabled={hasMember(searchPokemon.id)}
                    addLabel={addLabel}
                    onStartFight={handleStartFightFromSearch}
                    startFightLabel={t('battle.startFight')}
                    onSendToPC={handleSendToPC}
                    sendToPCLabel={t('search.sendToPC')}
                    onEvolutionSelect={handleSearchResultClick}
                  />
                </div>
              )}

              {showPokemonResults && otherMatches.length > 0 && !searchPending && (
                <div className="search-other-matches">
                  <h3 className="search-other-matches-label">{t('search.otherMatches')}</h3>
                  <ul className="search-results">
                    {otherMatches.map((result) => (
                      <li key={result.name}>
                        <button
                          type="button"
                          className={searchDisplayName === result.name ? 'active' : ''}
                          onClick={() => handleSearchResultClick(result.name)}
                        >
                          {getLocalizedPokemonNameBySlug(result.name, locale)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showMoveResults && searchMove && !searchMoveLoading && (
                <div className="search-best-match">
                  <h3 className="search-best-match-label">{t('search.bestMoveMatch')}</h3>
                  <MoveSearchPanel move={searchMove} team={team} />
                </div>
              )}
              {showAbilityResults && searchAbility && !searchAbilityLoading && (
                <div className="search-best-match">
                  <h3 className="search-best-match-label">{t('search.bestAbilityMatch')}</h3>
                  <AbilitySearchPanel
                    ability={searchAbility}
                    profileVersionGroup={versionGroup}
                  />
                </div>
              )}
              {showItemResults && searchItem && !searchItemLoading && (
                <div className="search-best-match">
                  <h3 className="search-best-match-label">{t('search.bestItemMatch')}</h3>
                  <ItemSearchPanel item={searchItem} />
                </div>
              )}

              {showMoveResults && otherMoveMatches.length > 0 && !moveSearch.isPending && (
                <div className="search-other-matches">
                  <h3 className="search-other-matches-label">{t('search.otherMoveMatches')}</h3>
                  <ul className="search-results">
                    {otherMoveMatches.map((result) => (
                      <li key={result.slug}>
                        <button
                          type="button"
                          className={selectedMoveName === result.canonicalName ? 'active' : ''}
                          onClick={() => handleMoveResultClick(result.canonicalName)}
                        >
                          {displayMoveName(result.canonicalName, locale)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showAbilityResults && otherAbilityMatches.length > 0 && !abilitySearch.isPending && (
                <div className="search-other-matches">
                  <h3 className="search-other-matches-label">{t('search.otherAbilityMatches')}</h3>
                  <ul className="search-results">
                    {otherAbilityMatches.map((result) => (
                      <li key={result.slug}>
                        <button
                          type="button"
                          className={selectedAbilityName === result.canonicalName ? 'active' : ''}
                          onClick={() => handleAbilityResultClick(result.canonicalName)}
                        >
                          {displayAbilityName(result.canonicalName, locale)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showItemResults && otherItemMatches.length > 0 && !itemSearch.isPending && (
                <div className="search-other-matches">
                  <h3 className="search-other-matches-label">{t('search.otherItemMatches')}</h3>
                  <ul className="search-results">
                    {otherItemMatches.map((result) => (
                      <li key={result.slug}>
                        <button
                          type="button"
                          className={selectedItemName === result.canonicalName ? 'active' : ''}
                          onClick={() => handleItemResultClick(result.canonicalName)}
                        >
                          {displayItemName(result.canonicalName, locale)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {searchesSettled && searchCategoryCounts[searchResultFilter] === 0 && (
                <p className="muted">{t('search.noResults')}</p>
              )}

              {showPokemonResults && searchPokemon && !searchDetailsLoading && (
                <>
                  <StatComparison
                    candidate={searchPokemon}
                    team={team}
                    levelCap={activeProfile.settings.levelCap}
                    threatenedSlotIds={searchMatchup.threatenedSlotIds}
                  />
                  <SearchMatchup
                    team={team}
                    candidate={searchPokemon}
                    loading={searchMatchup.loading}
                    offenses={searchMatchup.offenses}
                    threats={searchMatchup.threats}
                  />
                </>
              )}
              </div>
            </section>
                  )}
                </>
              }
            />
            <Route
              path="/team-info"
              element={
                <TeamInfoView team={team} levelCap={activeProfile.settings.levelCap} />
              }
            />
            <Route path="/" element={<Navigate to="/team-info" replace />} />
            <Route path="/team-typing" element={<Navigate to="/team-info" replace />} />
            <Route path="/team" element={<TeamView {...teamPanelProps} />} />
            <Route
              path="/team/:slotId"
              element={
                selectedSlotInfo ? (
                  <PokemonEditor
                    slot={selectedSlotInfo.slot}
                    list={selectedSlotInfo.list}
                    levelCap={activeProfile.settings.levelCap}
                    profileVersionGroup={versionGroup}
                    backLabel={
                      (location.state as { returnTo?: string } | null)?.returnTo === '/battle'
                        ? t('editor.backToBattle')
                        : undefined
                    }
                    onBack={() => {
                      const returnTo = (location.state as { returnTo?: string } | null)?.returnTo
                      navigate(returnTo ?? '/team')
                    }}
                    onSave={(patch) => updateSlot(selectedSlotInfo.slot.slotId, patch, selectedSlotInfo.list)}
                    onEvolve={(id) => void requestEvolution(id)}
                  />
                ) : (
                  <Navigate to="/team" replace />
                )
              }
            />
            <Route
              path="/pc"
              element={
                <PCView
                  box={box}
                  deathBox={deathBox}
                  team={team}
                  allowRevival={activeProfile.settings.allowRevival}
                  levelCap={activeProfile.settings.levelCap}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={(id) => handleSelectSlot(id, 'pc')}
                  onMoveToTeam={handleMoveToTeam}
                  onFaint={faintFromBox}
                  onDelete={removeFromBox}
                  onRevive={revive}
                  onDeleteDeath={removeFromDeathBox}
                  onSetAllToLevelCap={setAllBoxToLevelCap}
                  onEvolve={(id) => void requestEvolution(id)}
                />
              }
            />
            <Route
              path="/battle"
              element={
                <BattleView
                  team={team}
                  pc={box}
                  enemyTeam={opponentTeam}
                  levelCap={activeProfile.settings.levelCap}
                  onEnemyTeamChange={setOpponentTeam}
                  onAllySlotPatch={(slotId, patch) => updateSlot(slotId, patch, 'team')}
                  onMovePcToTeam={(slotId) => moveToTeam(slotId, 'box')}
                  onSwapPcWithTeamSlot={replaceTeamSlotWithBox}
                />
              }
            />
            <Route
              path="/pc/:pokemonId"
              element={
                selectedSlotInfo ? (
                  <PokemonEditor
                    slot={selectedSlotInfo.slot}
                    list={selectedSlotInfo.list}
                    levelCap={activeProfile.settings.levelCap}
                    profileVersionGroup={versionGroup}
                    backLabel={t('editor.backToPC')}
                    onBack={() => navigate('/pc')}
                    onSave={(patch) => updateSlot(selectedSlotInfo.slot.slotId, patch, selectedSlotInfo.list)}
                    onEvolve={(id) => void requestEvolution(id)}
                  />
                ) : (
                  <Navigate to="/pc" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/search" replace />} />
          </Routes>

            </main>
          </div>
        </div>

        <nav className="mobile-bottom-dock" aria-label={t('nav.main')}>
          <button
            type="button"
            className={`icon-nav-item mobile-team-nav-item${isTeamRoute ? ' active' : ''}`}
            onClick={handleMobileTeamNav}
            aria-label={t('mobile.teamNav')}
            aria-current={isTeamRoute ? 'page' : undefined}
          >
            <span className="icon-nav-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </span>
            <span className="icon-nav-label">{t('mobile.teamNav')}</span>
          </button>
          <IconNavRail activeTab={activeTab} onTabNavigate={handleTabClick} />
        </nav>
      </div>

      <ProfileSettingsModal
        open={profileOpen}
        profiles={profiles}
        activeProfile={activeProfile}
        onClose={() => setProfileOpen(false)}
        onSwitch={switchProfile}
        onCreate={createNewProfile}
        onDelete={deleteProfile}
        onUpdateSettings={updateSettings}
        onUpdateConfig={updateProfileConfig}
      />

      {confirmSendAllToPC && (
        <ConfirmDialog
          title={t('team.sendAllToPC')}
          message={t('team.sendAllToPCConfirm')}
          onConfirm={handleConfirmSendAllToPC}
          onCancel={() => setConfirmSendAllToPC(false)}
        />
      )}

      {pendingEvolution && (
        <EvolutionPrompt
          choice={pendingEvolution}
          onEvolve={(index) => applyEvolution(pendingEvolution, index)}
          onDismiss={dismissEvolution}
        />
      )}
    </div>
  )
}
