'use client'

import Button from '@/components/ui/button'
import {
  getListTableEmptyActions,
  getListTableEmptyMessage,
  type ListTableEmptyAction,
  type ListTableEmptyFilters,
} from '@/lib/list-table-empty'

function ListTableEmptyContent({
  title,
  hint,
  actions,
}: {
  title: string
  hint: string
  actions: ListTableEmptyAction[]
}) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-sm text-text-muted mt-1.5 max-w-md mx-auto leading-relaxed">{hint}</p>
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {actions.map(a => (
            <Button key={a.label} type="button" intent="secondary" size="xs" onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export interface ListTableEmptyProps extends ListTableEmptyFilters {
  colSpan: number
  onClearSearch?: () => void
  onClearStatus?: () => void
  onClearCategory?: () => void
  onClearIr35?: () => void
  onClearAll?: () => void
}

/** Empty tbody row when filters/search return no rows (data still exists). */
export function ListTableEmptyRow({
  colSpan,
  onClearSearch,
  onClearStatus,
  onClearCategory,
  onClearIr35,
  onClearAll,
  ...filters
}: ListTableEmptyProps) {
  const { title, hint } = getListTableEmptyMessage(filters)
  const actions = getListTableEmptyActions(filters, {
    onClearSearch,
    onClearStatus,
    onClearCategory,
    onClearIr35,
    onClearAll,
  })

  return (
    <tr>
      <td colSpan={colSpan} className="border-t border-border-subtle align-middle">
        <ListTableEmptyContent title={title} hint={hint} actions={actions} />
      </td>
    </tr>
  )
}

/** Mobile list area when filters/search return no rows. */
export function ListTableEmptyCard({
  onClearSearch,
  onClearStatus,
  onClearCategory,
  onClearIr35,
  onClearAll,
  ...filters
}: Omit<ListTableEmptyProps, 'colSpan'>) {
  const { title, hint } = getListTableEmptyMessage(filters)
  const actions = getListTableEmptyActions(filters, {
    onClearSearch,
    onClearStatus,
    onClearCategory,
    onClearIr35,
    onClearAll,
  })

  return (
    <div className="bg-surface-card rounded-xl border border-border-default">
      <ListTableEmptyContent title={title} hint={hint} actions={actions} />
    </div>
  )
}
