import { useState, type ReactNode } from 'react'
import { useI18n } from '@/i18n'

interface SidebarDrawerProps {
  children: ReactNode
}

export function SidebarDrawer({ children }: SidebarDrawerProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="mobile-drawer-toggle btn btn-primary"
        onClick={() => setOpen(true)}
      >
        {t('mobile.openTeam')}
      </button>

      <div className={`sidebar-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            {t('mobile.close')}
          </button>
        </div>
        <div className="drawer-body">
          {children}
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label={t('mobile.close')}
          onClick={() => setOpen(false)}
        />
      )}

      <div className="desktop-sidebar">{children}</div>
    </>
  )
}
