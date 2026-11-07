// Client-side session until real authentication exists.
export interface Session {
  name: string
  guest: boolean
}

const STORAGE_KEY = 'session'

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function startGuestSession(): Session {
  const session = { name: 'Guest', guest: true }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // storage unavailable; the session still works for this page load
  }
  return session
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
