import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EvolutionPrompt } from '@/components/EvolutionPrompt'
import { MoveComparison } from '@/components/MoveComparison'
import { PCView } from '@/components/PCView'
import { PokemonCard } from '@/components/PokemonCard'
import { PokemonEditor } from '@/components/PokemonEditor'
import { IconNavRail } from '@/components/IconNavRail'
import { LanguageSelector } from '@/components/LanguageSelector'
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal'
import { ShowdownPanel } from '@/components/ShowdownPanel'
import { SidebarDrawer } from '@/components/SidebarDrawer'
import { StatComparison } from '@/components/StatComparison'
import { TeamPanel } from '@/components/TeamPanel'
import { TeamStatsComparison } from '@/components/TeamStatsComparison'
import { ToastProvider, useToast } from '@/components/Toast'
import { TypeAnalysis } from '@/components/TypeAnalysis'
import { I18nProvider, useI18n } from '@/i18n'
import { usePokemonDetails } from '@/hooks/usePokemonDetails'
import { usePokemonSearch } from '@/hooks/usePokemonSearch'
import { useProfiles } from '@/hooks/useProfiles'
import {
  getLocalizedPokemonName,
  getLocalizedPokemonNameBySlug,
  getSpeciesSlugFromUrl,
} from '@/lib/localizedNames'
import { findSlotInProfile } from '@/types/profile'

type Tab = 'search' | 'types' | 'showdown' | 'pc'

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
  generation,
  versionGroup,
  switchProfile,
  createNewProfile,
  deleteProfile,
  updateSettings,
  setLevelCap,
  updateProfileConfig,
  team,
  box,
  deathBox,
  opponentTeam,
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
  importShowdown,
  isFull,
  hasMember,
}: ReturnType<typeof useProfiles>) {
  const { t, locale } = useI18n()
  const { showToast, showErrorToast } = useToast()
  const [query, setQuery] = useState('')
  const [searchOverrideName, setSearchOverrideName] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('search')
  const [showTeamStats, setShowTeamStats] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [confirmSendAllToPC, setConfirmSendAllToPC] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchSectionRef = useRef<HTMLElement>(null)

  const scrollSearchToTop = useCallback(() => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const selectedSlotInfo = selectedSlotId
    ? findSlotInProfile(activeProfile, selectedSlotId)
    : null

  const {
    results,
    bestMatch,
    isPending: searchPending,
    searchedQuery,
  } = usePokemonSearch(query)

  const searchDisplayName = searchOverrideName ?? bestMatch?.name ?? null

  const {
    pokemon: searchPokemon,
    evolutions: searchEvolutions,
    loading: searchDetailsLoading,
    error: searchDetailsError,
  } = usePokemonDetails(searchDisplayName)

  useEffect(() => {
    setSearchOverrideName(null)
  }, [query])

  useEffect(() => {
    if (selectedSlotId && !findSlotInProfile(activeProfile, selectedSlotId)) {
      setSelectedSlotId(null)
    }
  }, [activeProfile, selectedSlotId])

  const handleSelectSlot = (slotId: string, tab: Tab = 'search') => {
    setShowTeamStats(false)
    setSelectedSlotId(slotId)
    setActiveTab(tab)
  }

  const handleTabClick = (tab: Tab) => {
    setShowTeamStats(false)
    if (tab === 'search' || tab === 'pc') {
      setSelectedSlotId(null)
    }
    setActiveTab(tab)
  }

  const handleShowTeamStats = () => {
    if (team.length === 0) return
    setSelectedSlotId(null)
    setShowTeamStats(true)
    setActiveTab('search')
  }

  const otherMatches =
    bestMatch && !searchOverrideName
      ? results.filter((result) => result.name !== bestMatch.name)
      : results.filter((result) => result.name !== searchDisplayName)

  const handleSearchResultClick = (name: string) => {
    setSearchOverrideName(name)
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
        <IconNavRail activeTab={activeTab} onTabClick={handleTabClick} />

        <div className="app-main-area">
          <div className="app-layout">
            <SidebarDrawer>{sidebar}</SidebarDrawer>

            <main className="main-content">
          {showTeamStats && (
            <TeamStatsComparison
              team={team}
              levelCap={activeProfile.settings.levelCap}
              onBack={() => setShowTeamStats(false)}
            />
          )}

          {!showTeamStats && (activeTab === 'search' || activeTab === 'pc') && selectedSlotInfo && (
            <PokemonEditor
              slot={selectedSlotInfo.slot}
              list={selectedSlotInfo.list}
              levelCap={activeProfile.settings.levelCap}
              profileVersionGroup={versionGroup}
              backLabel={activeTab === 'pc' ? t('editor.backToPC') : undefined}
              onBack={() => setSelectedSlotId(null)}
              onSave={(patch) => updateSlot(selectedSlotId!, patch, selectedSlotInfo.list)}
              onEvolve={(id) => void requestEvolution(id)}
            />
          )}

          {!showTeamStats && activeTab === 'search' && !selectedSlotInfo && (
            <section ref={searchSectionRef} className="card search-section">
              <h2>{t('search.title')}</h2>
              <p className="muted">{t('search.hint')}</p>
              <input
                type="search"
                className="search-input"
                placeholder={t('search.placeholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />

              {query.trim().length >= 2 && searchPending && (
                <p className="muted search-status">{t('search.searching')}</p>
              )}

              {searchDisplayName && searchDetailsLoading && (
                <p className="muted search-status">{t('compare.loading')}</p>
              )}

              {searchDetailsError && <p className="error-note">{searchDetailsError}</p>}

              {searchPokemon && !searchDetailsLoading && (
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

              {otherMatches.length > 0 && !searchPending && (
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

              {searchedQuery.length >= 2 && !searchPending && results.length === 0 && (
                <p className="muted">{t('search.noResults')}</p>
              )}

              {searchPokemon && !searchDetailsLoading && (
                <>
                  <StatComparison
                    candidate={searchPokemon}
                    evolutions={searchEvolutions}
                    team={team}
                    levelCap={activeProfile.settings.levelCap}
                    onEvolutionSelect={handleSearchResultClick}
                  />
                  <MoveComparison generation={generation} />
                </>
              )}
            </section>
          )}

          {!showTeamStats && activeTab === 'pc' && !selectedSlotInfo && (
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
          )}

          {!showTeamStats && activeTab === 'types' && <TypeAnalysis team={team} />}

          {!showTeamStats && activeTab === 'showdown' && (
            <ShowdownPanel team={team} opponentTeam={opponentTeam} onImport={importShowdown} />
          )}
            </main>
          </div>
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
