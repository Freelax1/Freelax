import { Trash } from '@phosphor-icons/react'

interface ConfirmDeleteModalProps {
  title: string
  description: string
  warning?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

export default function ConfirmDeleteModal({
  title,
  description,
  warning,
  confirmLabel = 'Yes, delete',
  onConfirm,
  onCancel,
  loading,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 bg-black/45"
      onClick={onCancel}>
      <div className="bg-surface-card rounded-t-2xl sm:rounded-xl shadow-sheet-bottom sm:shadow-xl w-full sm:max-w-sm p-6 pb-10 sm:pb-6 animate-[sheet-up_280ms_cubic-bezier(0.4,0,0.2,1)_both] sm:animate-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-danger-100 rounded-full flex items-center justify-center shrink-0">
            <Trash weight="regular" className="w-5 h-5 text-danger-600" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary mt-0.5">{description}</p>
          </div>
        </div>
        {warning && (
          <div className="mt-3 mb-2 bg-warning-50 border border-warning-200 rounded-xl px-3 py-2.5">
            <p className="text-sm text-warning-800">{warning}</p>
          </div>
        )}
        <p className="text-sm text-text-secondary mt-3 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-border-default rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-sunken">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 bg-danger-600 text-white rounded-lg text-sm font-medium hover:bg-danger-700 disabled:opacity-50">
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
