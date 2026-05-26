export type TaxDeadlineMilestone = {
  id: string
  label: string
  displayDate: string
  at: Date
}

export type TaxDeadlineStatus = 'past' | 'next' | 'upcoming'

/** UK SA calendar milestones for the active tax year (sorted chronologically). */
export function buildTaxDeadlineMilestones(endYear: number): TaxDeadlineMilestone[] {
  return [
    {
      id: 'year-end',
      label: 'Tax year end',
      displayDate: `5 April ${endYear}`,
      at: new Date(endYear, 3, 5),
    },
    {
      id: 'paper',
      label: 'Paper SA deadline',
      displayDate: `31 October ${endYear}`,
      at: new Date(endYear, 9, 31),
    },
    {
      id: 'online',
      label: 'Online SA + payment',
      displayDate: `31 January ${endYear + 1}`,
      at: new Date(endYear + 1, 0, 31),
    },
    {
      id: 'poa',
      label: 'Payments on account',
      displayDate: `31 July ${endYear + 1}`,
      at: new Date(endYear + 1, 6, 31),
    },
  ].sort((a, b) => a.at.getTime() - b.at.getTime())
}

export function resolveTaxDeadlineStatuses(
  milestones: TaxDeadlineMilestone[],
  now = new Date(),
): Map<string, TaxDeadlineStatus> {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  let nextAssigned = false
  const statuses = new Map<string, TaxDeadlineStatus>()

  for (const m of milestones) {
    const endOfDay = new Date(m.at)
    endOfDay.setHours(23, 59, 59, 999)

    if (endOfDay < today) {
      statuses.set(m.id, 'past')
    } else if (!nextAssigned) {
      statuses.set(m.id, 'next')
      nextAssigned = true
    } else {
      statuses.set(m.id, 'upcoming')
    }
  }

  return statuses
}
