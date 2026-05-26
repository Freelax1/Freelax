export const NARRATIVE_SECTION_HEADERS = [
  'SNAPSHOT',
  'BASED ON',
  "WHAT'S GOING WELL",
  'WHERE TO IMPROVE',
  'TAX REDUCTION OPPORTUNITIES',
  'KEY DEADLINE',
] as const

export const NARRATIVE_BULLET_SECTIONS = new Set([
  "WHAT'S GOING WELL",
  'WHERE TO IMPROVE',
  'TAX REDUCTION OPPORTUNITIES',
])

export function parseNarrativeSections(text: string): { header: string; content: string }[] {
  const sections: { header: string; content: string }[] = []
  let currentHeader = ''
  let currentLines: string[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if ((NARRATIVE_SECTION_HEADERS as readonly string[]).includes(trimmed)) {
      if (currentHeader) sections.push({ header: currentHeader, content: currentLines.join('\n').trim() })
      currentHeader = trimmed
      currentLines = []
    } else if (currentHeader) {
      currentLines.push(line)
    }
  }
  if (currentHeader) sections.push({ header: currentHeader, content: currentLines.join('\n').trim() })
  return sections
}

export function narrativePreview(text: string, maxLen = 220): string {
  const plain = text.replace(/\n+/g, ' ').trim()
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen).trim()}…`
}
