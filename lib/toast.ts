// Lightweight module-level toast system.
// Call toast() from anywhere — no context or props needed.
// The <Toaster /> component in the dashboard layout renders them.

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id:      string
  message: string
  type:    ToastType
}

type Listener = (item: ToastItem) => void

let _listener: Listener | null = null

export function toast(message: string, type: ToastType = 'success') {
  const item: ToastItem = {
    id:      Math.random().toString(36).slice(2),
    message,
    type,
  }
  _listener?.(item)
}

/** Internal — called by <Toaster /> on mount. Do not call directly. */
export function _registerToastListener(fn: Listener | null) {
  _listener = fn
}
