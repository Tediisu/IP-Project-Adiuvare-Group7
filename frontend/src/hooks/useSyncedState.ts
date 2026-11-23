import { useEffect, useRef, useState } from 'react'
import { type AppState, getAppState, saveAppState } from '../api/state'

const SAVE_DELAY_MS = 600

interface SyncRefs {
  /** Serialized snapshot waiting to be saved, or null when everything is saved. */
  pending: { current: string | null }
  /** Last serialized snapshot the server confirmed. */
  lastSaved: { current: string | null }
  /** Saves currently in flight. */
  inFlight: { current: number }
}

function flush({ pending, lastSaved, inFlight }: SyncRefs, keepalive: boolean): Promise<void> {
  const body = pending.current
  if (body === null) return Promise.resolve()
  pending.current = null
  inFlight.current += 1
  return saveAppState(JSON.parse(body) as AppState, keepalive)
    .then(() => {
      lastSaved.current = body
    })
    .catch(() => {
      // Retry with the next change or flush, unless something newer is already queued.
      if (pending.current === null) pending.current = body
    })
    .finally(() => {
      inFlight.current -= 1
    })
}

/**
 * Keeps `snapshot` saved on the server and restores it on load.
 *
 * - On mount (and when the tab becomes visible again) the saved state is fetched and handed to `onRestore`,
 *   so a user who switches computers picks up where they left off.
 * - Changes are saved shortly after they happen, and any unsaved change is flushed when the tab is hidden,
 *   closed, or the dashboard is left.
 * - Nothing is saved until the first restore finishes, so a fresh browser's defaults never overwrite the
 *   user's saved state.
 */
export function useSyncedState(snapshot: AppState, onRestore: (saved: AppState) => void) {
  const [restored, setRestored] = useState(false)
  const serialized = JSON.stringify(snapshot)

  const onRestoreRef = useRef(onRestore)
  const pending = useRef<string | null>(null)
  const lastSaved = useRef<string | null>(null)
  const inFlight = useRef(0)

  useEffect(() => {
    onRestoreRef.current = onRestore
  }, [onRestore])

  useEffect(() => {
    const refs = { pending, lastSaved, inFlight }
    let cancelled = false

    function restore() {
      return getAppState()
        .then(({ data }) => {
          if (!cancelled) onRestoreRef.current(data)
        })
        .catch(() => {
          // Offline or server error: keep the locally cached values.
        })
    }

    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        flush(refs, true)
      } else if (pending.current === null && inFlight.current === 0) {
        // Back on this tab: pick up anything saved from another device meanwhile.
        restore()
      }
    }
    const handlePageHide = () => flush(refs, true)

    restore().finally(() => {
      if (!cancelled) setRestored(true)
    })
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
      flush(refs, true)
    }
  }, [])

  useEffect(() => {
    if (!restored || serialized === lastSaved.current) return
    pending.current = serialized
    const timer = setTimeout(() => flush({ pending, lastSaved, inFlight }, false), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [restored, serialized])

  /** Save any unsaved change right away, e.g. before signing out. */
  return { saveNow: () => flush({ pending, lastSaved, inFlight }, false) }
}
