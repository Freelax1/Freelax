export type ToastType = 'success' | 'error' | 'info'

export interface ToastAction {
  label:   string
  onClick: () => void
}

export interface ToastItem {
  id:      string
  message: string
  type:    ToastType
  action?: ToastAction
}

type Listener = (item: ToastItem) => void

let _listener: Listener | null = null

export function toast(message: string, type: ToastType = 'success', action?: ToastAction) {
  const item: ToastItem = {
    id:      Math.random().toString(36).slice(2),
    message,
    type,
    action,
  }
  _listener?.(item)
}

/** Internal — called by <Toaster /> on mount. Do not call directly. */
export function _registerToastListener(fn: Listener | null) {
  _listener = fn
}
