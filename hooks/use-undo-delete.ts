'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from '@/lib/toast'

export function useUndoDelete<T extends { id: string }>(
  onDelete:  (item: T) => Promise<void>,
  getLabel:  (item: T) => string,
  onRemoved: () => void,
) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const timers  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const itemMap = useRef<Map<string, T>>(new Map())

  const scheduleDelete = useCallback((item: T) => {
    itemMap.current.set(item.id, item)
    setPendingIds(prev => new Set([...prev, item.id]))

    toast(`${getLabel(item)} deleted`, 'info', {
      label: 'Undo',
      onClick: () => {
        const timer = timers.current.get(item.id)
        if (timer) clearTimeout(timer)
        timers.current.delete(item.id)
        itemMap.current.delete(item.id)
        setPendingIds(prev => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
      },
    })

    const timer = setTimeout(async () => {
      timers.current.delete(item.id)
      const stored = itemMap.current.get(item.id)
      if (!stored) return
      itemMap.current.delete(item.id)
      setPendingIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      await onDelete(stored)
      onRemoved()
    }, 5000)

    timers.current.set(item.id, timer)
  }, [onDelete, getLabel, onRemoved])

  useEffect(() => {
    const t = timers.current
    return () => { t.forEach(clearTimeout) }
  }, [])

  return { pendingIds, scheduleDelete }
}
