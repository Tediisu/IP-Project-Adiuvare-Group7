import { useEffect, useState } from 'react'
import type { ScheduleItem } from '../api/items'
import { toMinutes, type WeekStart } from '../lib/schedule'

export interface GridSettings {
  /** 0–12 */
  startHour: number
  /** 13–24 */
  endHour: number
  /** minutes per row */
  interval: 15 | 30 | 60
  weekStart: WeekStart
}

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  startHour: 8,
  endHour: 20,
  interval: 30,
  weekStart: 'Mon',
}

const STORAGE_KEY = 'gridSettings'

/** Whole hours the items span: earliest start rounded down, latest end rounded up. */
export function itemHourRange(items: ScheduleItem[]): { start: number; end: number } | null {
  if (items.length === 0) return null
  const start = Math.min(...items.map((i) => toMinutes(i.start_time)))
  const end = Math.max(...items.map((i) => toMinutes(i.end_time)))
  return { start: Math.floor(start / 60), end: Math.min(24, Math.ceil(end / 60)) }
}

/** Widen (never narrow) the visible hours so every item fits on the grid. */
export function fitToItems(settings: GridSettings, items: ScheduleItem[]): GridSettings {
  const range = itemHourRange(items)
  if (!range) return settings
  const startHour = Math.min(settings.startHour, range.start)
  const endHour = Math.max(settings.endHour, range.end)
  if (startHour === settings.startHour && endHour === settings.endHour) return settings
  return { ...settings, startHour, endHour }
}

function loadSettings(): GridSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_GRID_SETTINGS, ...JSON.parse(raw) }
  } catch {
    // storage unavailable or corrupt
  }
  return DEFAULT_GRID_SETTINGS
}

export function useGridSettings() {
  const [settings, setSettings] = useState<GridSettings>(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // storage unavailable
    }
  }, [settings])

  return [settings, setSettings] as const
}
