'use client'

import { useCallback, useLayoutEffect, useState, type RefObject } from 'react'
import {
  computeFloatingPosition,
  type FloatingAlign,
  type FloatingSide,
} from '@/lib/floating-placement'

export function useFloatingPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  {
    preferredSide = 'top',
    align = 'center',
    gap = 10,
    padding = 12,
    estimateWidth = 120,
    estimateHeight = 32,
  }: {
    preferredSide?: FloatingSide
    align?: FloatingAlign
    gap?: number
    padding?: number
    estimateWidth?: number
    estimateHeight?: number
  } = {},
) {
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [side, setSide] = useState<FloatingSide>(preferredSide)

  const update = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    const w = panelRef.current?.offsetWidth ?? estimateWidth
    const h = panelRef.current?.offsetHeight ?? estimateHeight
    const next = computeFloatingPosition({
      triggerRect: rect,
      floatingWidth: w,
      floatingHeight: h,
      gap,
      padding,
      preferredSide,
      align,
    })
    setSide(next.side)
    setCoords({ top: next.top, left: next.left })
  }, [
    anchorRef,
    panelRef,
    gap,
    padding,
    preferredSide,
    align,
    estimateWidth,
    estimateHeight,
  ])

  useLayoutEffect(() => {
    if (!open) return
    update()
    const onReflow = () => update()
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open, update])

  return { coords, side, update }
}
