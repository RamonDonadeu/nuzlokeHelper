import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'

export type BattleMobileTab = 'fight' | 'rosters' | 'prep' | 'stats'

interface BattleMobileShellProps {
  activeTab: BattleMobileTab
  onTabChange: (tab: BattleMobileTab) => void
  showPrepTab: boolean
  showStatsTab: boolean
  fightPanel: ReactNode
  rostersPanel: ReactNode
  prepPanel: ReactNode
  statsPanel: ReactNode
}

export function BattleMobileShell({
  activeTab,
  onTabChange,
  showPrepTab,
  showStatsTab,
  fightPanel,
  rostersPanel,
  prepPanel,
  statsPanel,
}: BattleMobileShellProps) {
  const { t } = useI18n()

  const tabs: Array<{ id: BattleMobileTab; label: string; hidden?: boolean }> = [
    { id: 'fight', label: t('battle.mobileTabFight') },
    { id: 'rosters', label: t('battle.mobileTabRosters') },
    { id: 'prep', label: t('battle.mobileTabPrep'), hidden: !showPrepTab },
    { id: 'stats', label: t('battle.mobileTabStats'), hidden: !showStatsTab },
  ]
  const visibleTabs = tabs.filter((tab) => !tab.hidden)

  return (
    <div className="battle-mobile-shell">
      <div
        className="battle-mobile-tabs"
        role="tablist"
        aria-label={t('battle.mobileTabsLabel')}
        style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
      >
        {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`battle-mobile-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
        ))}
      </div>
      <div className="battle-mobile-panel" role="tabpanel">
        {activeTab === 'fight' ? fightPanel : null}
        {activeTab === 'rosters' ? rostersPanel : null}
        {activeTab === 'prep' ? prepPanel : null}
        {activeTab === 'stats' ? statsPanel : null}
      </div>
    </div>
  )
}
