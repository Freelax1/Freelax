/** Group consecutive items by calendar month (for mobile section headers when sorted by date). */
export function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string | Date,
): { label: string; items: T[] }[] {
  return items.reduce<{ label: string; items: T[] }[]>((acc, item) => {
    const label = new Date(getDate(item)).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    })
    const last = acc[acc.length - 1]
    if (last?.label === label) last.items.push(item)
    else acc.push({ label, items: [item] })
    return acc
  }, [])
}
