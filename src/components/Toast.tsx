import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

const TOAST_DURATION_MS = 2500
const ERROR_TOAST_DURATION_MS = 3000

type ToastVariant = 'default' | 'error'

interface ToastState {
  message: string
  id: number
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string) => void
  showErrorToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    window.clearTimeout(timeoutRef.current)
    setToast({ message, id: Date.now(), variant: 'default' })
  }, [])

  const showErrorToast = useCallback((message: string) => {
    window.clearTimeout(timeoutRef.current)
    setToast({ message, id: Date.now(), variant: 'error' })
  }, [])

  useEffect(() => {
    if (!toast) return
    const duration = toast.variant === 'error' ? ERROR_TOAST_DURATION_MS : TOAST_DURATION_MS
    timeoutRef.current = window.setTimeout(() => setToast(null), duration)
    return () => window.clearTimeout(timeoutRef.current)
  }, [toast])

  const isError = toast?.variant === 'error'

  return (
    <ToastContext.Provider value={{ showToast, showErrorToast }}>
      {children}
      {toast && (
        <div
          className={`toast${isError ? ' toast-error' : ''}`}
          role={isError ? 'alert' : 'status'}
          aria-live={isError ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
