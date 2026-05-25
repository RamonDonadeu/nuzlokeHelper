import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'

interface SidebarDrawerProps {
  children: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SidebarDrawer({ children, open, onOpenChange }: SidebarDrawerProps) {
  const { t } = useI18n()

  return (
    <>
      <div className={`sidebar-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <button type="button" className="btn btn-ghost" onClick={() => onOpenChange(false)}>
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
          onClick={() => onOpenChange(false)}
        />
      )}

      <div className="desktop-sidebar">{children}</div>
    </>
  )
}
