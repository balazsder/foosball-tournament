import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let counter = 0
/** Compact unique id, stable within a session and good enough for storage keys. */
export function uid(prefix = 'id'): string {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`
}

/** Deterministic Fisher–Yates shuffle (optionally seeded for reproducible draws). */
export function shuffle<T>(input: T[], seed?: number): T[] {
  const arr = [...input]
  let s = seed ?? Math.floor(Math.random() * 2 ** 31)
  const rnd = () => {
    // mulberry32
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
