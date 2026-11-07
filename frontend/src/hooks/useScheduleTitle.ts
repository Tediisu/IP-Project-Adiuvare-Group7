import { useEffect, useState } from 'react'

export const DEFAULT_SCHEDULE_TITLE = 'My Schedule'

const STORAGE_KEY = 'scheduleTitle'
const MAX_LENGTH = 60

function loadTitle(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_SCHEDULE_TITLE
  } catch {
    return DEFAULT_SCHEDULE_TITLE
  }
}

/** The schedule's display name, remembered in the browser. Blank input falls back to the default. */
export function useScheduleTitle() {
  const [title, setTitle] = useState(loadTitle)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, title)
    } catch {
      // storage unavailable
    }
  }, [title])

  const rename = (next: string) => setTitle(next.trim().slice(0, MAX_LENGTH) || DEFAULT_SCHEDULE_TITLE)

  return [title, rename] as const
}
