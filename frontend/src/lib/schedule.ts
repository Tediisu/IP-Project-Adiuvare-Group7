export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export type Day = (typeof DAYS)[number]

export type WeekStart = 'Mon' | 'Sun' | 'Sat'

export const COLOR_TAGS = [
  '#eb5e28',
  '#4285f4',
  '#0f9d58',
  '#f4b400',
  '#9b59b6',
  '#e74c3c',
  '#1abc9c',
  '#e67e22',
] as const

/** Days in display order for the chosen first day of the week. */
export function orderedDays(weekStart: WeekStart): Day[] {
  const start = DAYS.indexOf(weekStart)
  return [...DAYS.slice(start), ...DAYS.slice(0, start)]
}

/** "HH:MM" or "HH:MM:SS" → minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Minutes since midnight → "HH:MM". */
export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Minutes since midnight → "7:30 AM". 24:00 renders as "12:00 AM". */
export function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function formatTime(time: string): string {
  return formatMinutes(toMinutes(time))
}

/** Sort days into Mon–Sun order. */
export function sortDays(days: Day[]): Day[] {
  return [...days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
}

/** The parts of a schedule item needed to check for overlaps. */
export interface TimeSlot {
  title: string
  days: readonly Day[]
  start_time: string
  end_time: string
}

export interface Conflict<T extends TimeSlot> {
  a: T
  b: T
  /** Days both items meet on. */
  days: Day[]
  /** The overlapping window, in minutes since midnight. */
  start: number
  end: number
}

/** Where two items overlap, or null if they never meet at the same time. */
export function findOverlap<T extends TimeSlot>(a: T, b: T): Conflict<T> | null {
  const days = sortDays(a.days.filter((d) => b.days.includes(d)))
  if (days.length === 0) return null
  const start = Math.max(toMinutes(a.start_time), toMinutes(b.start_time))
  const end = Math.min(toMinutes(a.end_time), toMinutes(b.end_time))
  // Back-to-back classes (one ends as the next starts) are not a conflict.
  if (start >= end) return null
  return { a, b, days, start, end }
}

/** Every overlapping pair in a list. */
export function findConflicts<T extends TimeSlot>(items: T[]): Conflict<T>[] {
  const conflicts: Conflict<T>[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const overlap = findOverlap(items[i], items[j])
      if (overlap) conflicts.push(overlap)
    }
  }
  return conflicts
}

/** "Mon, Wed · 9:00 AM – 10:00 AM" */
export function describeOverlap(conflict: Conflict<TimeSlot>): string {
  return `${conflict.days.join(', ')} · ${formatMinutes(conflict.start)} – ${formatMinutes(conflict.end)}`
}
