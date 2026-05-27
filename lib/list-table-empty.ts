export type ListTableEmptyFilters = {
  entityPlural: string
  query?: string
  statusFilter?: string
  statusLabel?: string
  categoryFilter?: string
  categoryLabel?: string
  ir35Filter?: string
  ir35Label?: string
}

export function getListTableEmptyMessage(filters: ListTableEmptyFilters): {
  title: string
  hint: string
} {
  const {
    entityPlural,
    query = '',
    statusFilter = 'all',
    statusLabel,
    categoryFilter = 'all',
    categoryLabel,
    ir35Filter = 'all',
    ir35Label,
  } = filters

  const q = query.trim()
  const hasStatus = statusFilter !== 'all' && !!statusLabel
  const hasCategory = categoryFilter !== 'all' && !!categoryLabel
  const hasIr35 = ir35Filter !== 'all' && !!ir35Label

  let scope = entityPlural
  if (hasStatus && hasCategory) {
    scope = `${statusLabel!.toLowerCase()} ${entityPlural} in ${categoryLabel}`
  } else if (hasStatus && hasIr35) {
    scope = `${statusLabel!.toLowerCase()} ${entityPlural} (${ir35Label})`
  } else if (hasStatus) {
    scope = `${statusLabel!.toLowerCase()} ${entityPlural}`
  } else if (hasCategory) {
    scope = `${entityPlural} in ${categoryLabel}`
  } else if (hasIr35) {
    scope = `${entityPlural} (${ir35Label})`
  }

  let title: string
  if (q) {
    title = `No ${scope} match “${q}”`
  } else if (hasStatus || hasCategory || hasIr35) {
    title = `No ${scope}`
  } else {
    title = `No ${entityPlural} to show`
  }

  const hint =
    q || statusFilter !== 'all' || categoryFilter !== 'all' || ir35Filter !== 'all'
      ? 'Try a different search or clear your filters.'
      : 'Adjust your filters to see more.'

  return { title, hint }
}

export type ListTableEmptyAction = { label: string; onClick: () => void }

export function getListTableEmptyActions(
  filters: ListTableEmptyFilters,
  handlers: {
    onClearSearch?: () => void
    onClearStatus?: () => void
    onClearCategory?: () => void
    onClearIr35?: () => void
    onClearAll?: () => void
  },
): ListTableEmptyAction[] {
  const actions: ListTableEmptyAction[] = []
  const q = queryTrim(filters.query)
  const {
    entityPlural,
    statusFilter = 'all',
    categoryFilter = 'all',
    ir35Filter = 'all',
  } = filters

  const filterCount =
    (q ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (ir35Filter !== 'all' ? 1 : 0)

  if (filterCount > 1 && handlers.onClearAll) {
    actions.push({ label: 'Clear filters', onClick: handlers.onClearAll })
    return actions
  }

  if (q && handlers.onClearSearch) {
    actions.push({ label: 'Clear search', onClick: handlers.onClearSearch })
  }
  if (statusFilter !== 'all' && handlers.onClearStatus) {
    actions.push({ label: `Show all ${entityPlural}`, onClick: handlers.onClearStatus })
  }
  if (categoryFilter !== 'all' && handlers.onClearCategory) {
    actions.push({ label: 'All categories', onClick: handlers.onClearCategory })
  }
  if (ir35Filter !== 'all' && handlers.onClearIr35) {
    actions.push({ label: 'All projects', onClick: handlers.onClearIr35 })
  }

  return actions
}

function queryTrim(query?: string) {
  return (query ?? '').trim()
}
