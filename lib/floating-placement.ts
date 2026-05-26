export type FloatingSide = 'top' | 'bottom'
export type FloatingAlign = 'start' | 'center' | 'end'

export function computeFloatingPosition({
  triggerRect,
  floatingWidth,
  floatingHeight,
  gap = 10,
  padding = 12,
  preferredSide = 'top',
  align = 'center',
}: {
  triggerRect: DOMRect
  floatingWidth: number
  floatingHeight: number
  gap?: number
  padding?: number
  preferredSide?: FloatingSide
  align?: FloatingAlign
}): { side: FloatingSide; top: number; left: number } {
  const spaceAbove = triggerRect.top - padding
  const spaceBelow = window.innerHeight - triggerRect.bottom - padding
  const needs = floatingHeight + gap

  let side: FloatingSide = preferredSide

  if (side === 'top' && spaceAbove < needs && spaceBelow >= needs) {
    side = 'bottom'
  } else if (side === 'bottom' && spaceBelow < needs && spaceAbove >= needs) {
    side = 'top'
  } else if (spaceAbove < needs && spaceBelow > spaceAbove) {
    side = 'bottom'
  } else if (spaceBelow < needs && spaceAbove > spaceBelow) {
    side = 'top'
  }

  let top =
    side === 'top'
      ? triggerRect.top - gap - floatingHeight
      : triggerRect.bottom + gap

  let left: number
  if (align === 'start') {
    left = triggerRect.left
  } else if (align === 'end') {
    left = triggerRect.right - floatingWidth
  } else {
    left = triggerRect.left + (triggerRect.width - floatingWidth) / 2
  }

  left = Math.max(padding, Math.min(left, window.innerWidth - floatingWidth - padding))
  top = Math.max(padding, Math.min(top, window.innerHeight - floatingHeight - padding))

  return { side, top, left }
}
