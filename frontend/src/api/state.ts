import type { GridSettings } from '../hooks/useGridSettings'
import type { Theme } from '../hooks/useTheme'
import { request } from './client'

/** UI state saved on the server so it is restored on any device the user signs in from. */
export interface AppState {
  gridSettings?: Partial<GridSettings>
  scheduleTitle?: string
  theme?: Theme
}

interface AppStateResponse {
  data: AppState
  updated_at: number | null
}

export function getAppState() {
  return request<AppStateResponse>('/state')
}

/** Merges the given keys into the saved state. `keepalive` lets the request finish while the page unloads. */
export function saveAppState(data: AppState, keepalive = false) {
  return request<AppStateResponse>('/state', {
    method: 'PATCH',
    body: JSON.stringify({ data }),
    keepalive,
  })
}
