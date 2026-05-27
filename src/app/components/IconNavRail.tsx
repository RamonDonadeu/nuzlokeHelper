import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'

type Tab = 'types' | 'pc' | 'battle'

interface IconNavRailProps {
  activeTab: Tab
  onTabNavigate: (tab: Tab) => void
}

const TABS: { id: Tab; icon: ReactNode }[] = [
  {
    id: 'types',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: 'pc',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
  {
    id: 'battle',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M10.5 10.5l3 3" />
        <path d="M14 6h4v4" />
        <path d="M6 18H2v-4" />
      </svg>
    ),
  },
]

export function IconNavRail({ activeTab, onTabNavigate }: IconNavRailProps) {
  const { t } = useI18n()

  return (
    <nav className="icon-nav-rail" aria-label={t('nav.main')}>
      {TABS.map(({ id, icon }) => (
        <button
          key={id}
          type="button"
          className={`icon-nav-item ${activeTab === id ? 'active' : ''}`}
          onClick={() => onTabNavigate(id)}
          aria-label={t(`tabs.${id}`)}
          aria-current={activeTab === id ? 'page' : undefined}
        >
          <span className="icon-nav-icon" aria-hidden="true">
            {icon}
          </span>
          <span className="icon-nav-label">{t(`tabs.${id}`)}</span>
        </button>
      ))}
    </nav>
  )
}
