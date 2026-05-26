import type { MutableRefObject, Ref } from 'react'

export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): (value: T | null) => void {
  return (value) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(value)
      else (ref as MutableRefObject<T | null>).current = value
    }
  }
}
