import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EvolutionPrompt } from '@/components/EvolutionPrompt'
import { AbilitySearchPanel } from '@/components/AbilitySearchPanel'
import { ItemSearchPanel } from '@/components/ItemSearchPanel'
import { MoveSearchPanel } from '@/components/MoveSearchPanel'
import { PCView } from '@/components/PCView'
import { PokemonCard } from '@/components/PokemonCard'
import { PokemonEditor } from '@/components/PokemonEditor'
import { IconNavRail } from '@/components/IconNavRail'
import { LanguageSelector } from '@/components/LanguageSelector'
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal'
import { SidebarDrawer } from '@/components/SidebarDrawer'
import { SearchMatchup } from '@/components/SearchMatchup'
import { StatComparison } from '@/components/StatComparison'
import { BattleView } from '@/components/BattleView'
import { TeamPanel } from '@/components/TeamPanel'
import { TeamStatsComparison } from '@/components/TeamStatsComparison'
import { ToastProvider, useToast } from '@/components/Toast'
import { TypeAnalysis } from '@/components/TypeAnalysis'
import { I18nProvider, useI18n } from '@/i18n'
import { usePokemonDetails } from '@/hooks/usePokemonDetails'
import { useMoveDetails } from '@/hooks/useMoveDetails'
import { useMoveSearch } from '@/hooks/useMoveSearch'
import { useAbilityDetails } from '@/hooks/useAbilityDetails'
import { useAbilitySearch } from '@/hooks/useAbilitySearch'
import { useItemDetails } from '@/hooks/useItemDetails'
import { useItemSearch } from '@/hooks/useItemSearch'
import { usePokemonSearch } from '@/hooks/usePokemonSearch'
import { useSearchMatchup } from '@/hooks/useSearchMatchup'
import { useProfiles } from '@/hooks/useProfiles'
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
type SearchResultFilter = 'all' | 'pokemon' | 'moves' | 'abilities' | 'items'

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
  const [searchResultFilter, setSearchResultFilter] = useState<SearchResultFilter>('all')
  const [searchOverrideName, setSearchOverrideName] = useState<string | null>(null)
  const [searchOverrideMove, setSearchOverrideMove] = useState<string | null>(null)
  const [searchOverrideAbility, setSearchOverrideAbility] = useState<string | null>(null)
  const [searchOverrideItem, setSearchOverrideItem] = useState<string | null>(null)
  const [confirmSendAllToPC, setConfirmSendAllToPC] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [teamDrawerOpen, setTeamDrawerOpen] = useState(false)
  const searchSectionRef = useRef<HTMLElement>(null)

  const teamDetailMatch = matchPath('/team/:slotId', location.pathname)
  const pcDetailMatch = matchPath('/pc/:pokemonId', location.pathname)
  const teamSlotId = teamDetailMatch?.params.slotId ?? null
  const pcSlotId = pcDetailMatch?.params.pokemonId ?? null
  const selectedSlotId = teamSlotId ?? pcSlotId
  const isBattleRoute = location.pathname === '/battle'
  const activeTab: Tab =
    location.pathname === '/pc' || Boolean(pcSlotId)
      ? 'pc'
      : isBattleRoute
        ? 'battle'
        : 'types'
  const isTeamTypingRoute = location.pathname === '/' || location.pathname === '/team-typing'

  const scrollSearchToTop = useCallback(() => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const selectedSlotInfo = selectedSlotId ? findSlotInProfile(activeProfile, selectedSlotId) : null

  const {
    results,
    bestMatch,
    isPending: searchPending,
    searchedQuery,
  } = usePokemonSearch(query)
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
    setSearchResultFilter('all')
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
    navigate('/search')
  }

  const handleShowTeamStats = () => {
    if (team.length === 0) return
    setTeamDrawerOpen(false)
    navigate('/')
  }

  const handleMobileTeamNav = () => {
    if (isTeamTypingRoute) {
      navigate('/search')
      setTeamDrawerOpen(true)
      return
    }
    setTeamDrawerOpen(true)
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

  const showSearchResults = location.pathname === '/search' && query.trim().length >= 2

  const hasPokemonResults = results.length > 0
  const hasMoveResults = moveSearch.results.length > 0
  const hasAbilityResults = abilitySearch.results.length > 0
  const hasItemResults = itemSearch.results.length > 0
  const showSearchFilters =
    showSearchResults &&
    (hasPokemonResults || hasMoveResults || hasAbilityResults || hasItemResults) &&
    !searchPending &&
    !moveSearch.isPending &&
    !abilitySearch.isPending &&
    !itemSearch.isPending

  const showPokemonResults =
    searchResultFilter === 'all' || searchResultFilter === 'pokemon'
  const showMoveResults = searchResultFilter === 'all' || searchResultFilter === 'moves'
  const showAbilityResults = searchResultFilter === 'all' || searchResultFilter === 'abilities'
  const showItemResults = searchResultFilter === 'all' || searchResultFilter === 'items'

  const togglePokemonFilter = () => {
    setSearchResultFilter((prev) => (prev === 'pokemon' ? 'all' : 'pokemon'))
  }

  const toggleMoveFilter = () => {
    setSearchResultFilter((prev) => (prev === 'moves' ? 'all' : 'moves'))
  }

  const toggleAbilityFilter = () => {
    setSearchResultFilter((prev) => (prev === 'abilities' ? 'all' : 'abilities'))
  }

  const toggleItemFilter = () => {
    setSearchResultFilter((prev) => (prev === 'items' ? 'all' : 'items'))
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

  const sidebar = (
    <>
      <TeamPanel
        team={team}
        levelCap={activeProfile.settings.levelCap}
        selectedSlotId={selectedSlotId}
        onSelectSlot={handleSelectSlot}
        onUpdateLevelCap={setLevelCap}
        onMoveAllToCap={() => void moveAllToCap()}
        onSendAllToPC={handleSendAllToPC}
        onShowTeamStats={handleShowTeamStats}
        onLevelUp={(id) => void levelUpSlot(id)}
        onLevelDown={levelDownSlot}
        onMoveToBox={handleMoveTeamToPC}
        onMarkDead={moveToDeath}
        onEvolve={(id) => void requestEvolution(id)}
      />
    </>
  )

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
            {!isBattleRoute && (
              <SidebarDrawer
                open={teamDrawerOpen && !isTeamTypingRoute}
                onOpenChange={(open) => {
                  if (!isTeamTypingRoute) setTeamDrawerOpen(open)
                }}
              >
                {sidebar}
              </SidebarDrawer>
            )}

            <main className="main-content">
          {!isBattleRoute && (
            <div className="main-search-bar">
              <input
                type="search"
                className="search-input"
                placeholder={t('search.placeholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t('search.title')}
              />
            </div>
          )}

          <Routes>
            <Route
              path="/search"
              element={
                <>
                  {showSearchResults && (
            <section ref={searchSectionRef} className="card search-section">
              {showSearchFilters && (
                <div
                  className="search-result-filters"
                  role="group"
                  aria-label={t('search.filterLabel')}
                >
                  <button
                    type="button"
                    className={`tab-btn ${showPokemonResults ? 'active' : ''}`}
                    aria-pressed={showPokemonResults}
                    onClick={togglePokemonFilter}
                  >
                    {t('search.filterPokemon')}
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${showMoveResults ? 'active' : ''}`}
                    aria-pressed={showMoveResults}
                    onClick={toggleMoveFilter}
                  >
                    {t('search.filterMoves')}
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${showAbilityResults ? 'active' : ''}`}
                    aria-pressed={showAbilityResults}
                    onClick={toggleAbilityFilter}
                  >
                    {t('search.filterAbilities')}
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${showItemResults ? 'active' : ''}`}
                    aria-pressed={showItemResults}
                    onClick={toggleItemFilter}
                  >
                    {t('search.filterItems')}
                  </button>
                </div>
              )}

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

              {searchedQuery.length >= 2 &&
                !searchPending &&
                !moveSearch.isPending &&
                !abilitySearch.isPending &&
                !itemSearch.isPending &&
                (showPokemonResults && results.length === 0) &&
                (showMoveResults && moveSearch.results.length === 0) &&
                (showAbilityResults && abilitySearch.results.length === 0) &&
                (showItemResults && itemSearch.results.length === 0) && (
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
            </section>
                  )}
                  <TypeAnalysis team={team} />
                </>
              }
            />
            <Route
              path="/"
              element={
                <TeamStatsComparison
                  team={team}
                  levelCap={activeProfile.settings.levelCap}
                  onBack={() => navigate('/search')}
                />
              }
            />
            <Route path="/team-typing" element={<Navigate to="/" replace />} />
            <Route
              path="/team/:slotId"
              element={
                selectedSlotInfo ? (
                  <PokemonEditor
                    slot={selectedSlotInfo.slot}
                    list={selectedSlotInfo.list}
                    levelCap={activeProfile.settings.levelCap}
                    profileVersionGroup={versionGroup}
                    onBack={() => navigate('/search')}
                    onSave={(patch) => updateSlot(selectedSlotInfo.slot.slotId, patch, selectedSlotInfo.list)}
                    onEvolve={(id) => void requestEvolution(id)}
                  />
                ) : (
                  <Navigate to="/search" replace />
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
                  enemyTeam={opponentTeam}
                  onEnemyTeamChange={setOpponentTeam}
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

        <div className="mobile-bottom-dock">
          {!isBattleRoute && (
            <button
              type="button"
              className={`mobile-bottom-nav-item mobile-team-nav-item${teamDrawerOpen && !isTeamTypingRoute ? ' active' : ''}`}
              onClick={handleMobileTeamNav}
              aria-label={t('mobile.openTeam')}
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
          )}
          <IconNavRail activeTab={activeTab} onTabNavigate={handleTabClick} />
        </div>
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
