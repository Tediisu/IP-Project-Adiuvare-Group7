import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import calendarIcon from '../assets/icons/logo-calendar-sm.svg'
import moonIcon from '../assets/icons/moon-sm.svg'
import syncIcon from '../assets/icons/sync.svg'
import {
  createItem,
  deleteAllItems,
  deleteItem,
  listItems,
  type ScheduleItem,
  type ScheduleItemInput,
  updateItem,
} from '../api/items'
import AuthModal from '../components/AuthModal'
import ConfirmModal from '../components/dashboard/ConfirmModal'
import GoogleCalendarModal from '../components/dashboard/GoogleCalendarModal'
import GridSettingsModal from '../components/dashboard/GridSettingsModal'
import ImportImageModal from '../components/dashboard/ImportImageModal'
import ItemFormModal from '../components/dashboard/ItemFormModal'
import ManageSchedulesModal from '../components/dashboard/ManageSchedulesModal'
import ScheduleGrid from '../components/dashboard/ScheduleGrid'
import { fitToItems, itemHourRange, useGridSettings } from '../hooks/useGridSettings'
import { useScheduleTitle } from '../hooks/useScheduleTitle'
import { useTheme } from '../hooks/useTheme'
import { type Day, describeOverlap, findConflicts } from '../lib/schedule'
import { getSession, initials, startGuestSession } from '../lib/session'
import './DashboardPage.css'

type Dialog =
  | { kind: 'add'; preset?: { day: Day; start: number } }
  | { kind: 'edit'; item: ScheduleItem }
  | { kind: 'manage' }
  | { kind: 'settings' }
  | { kind: 'import' }
  | { kind: 'new' }
  | { kind: 'deleteAll' }
  | { kind: 'gcal' }
  | { kind: 'account' }

function DashboardPage() {
  const [session, setSession] = useState(getSession)
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [settings, setSettings] = useGridSettings()
  const [scheduleTitle, renameSchedule] = useScheduleTitle()
  const { toggleTheme } = useTheme()

  useEffect(() => {
    listItems()
      .then(setItems)
      .catch((err: Error) => setError(err.message))
  }, [])

  // Grow the visible hours whenever an item falls outside them.
  useEffect(() => {
    setSettings((prev) => fitToItems(prev, items))
  }, [items, setSettings])

  if (!session) return <Navigate to="/" replace />

  const conflicts = findConflicts(items)

  const close = () => setDialog(null)

  async function run(action: () => Promise<void>) {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleSave(input: ScheduleItemInput, existing?: ScheduleItem) {
    // Errors propagate so the form can show them inline.
    if (existing) {
      const updated = await updateItem(existing.id, input)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } else {
      const created = await createItem(input)
      setItems((prev) => [...prev, created])
    }
    close()
  }

  function handleDelete(item: ScheduleItem) {
    run(async () => {
      await deleteItem(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    })
  }

  function handleClearAll() {
    run(async () => {
      await deleteAllItems()
      setItems([])
      close()
    })
  }

  function handleSaveAs() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schedule.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="brand-lockup">
          <div className="brand-mark">
            <img src={calendarIcon} alt="" width={21.997} height={21.997} />
          </div>
          <span>Adiuvare</span>
        </div>
        <div className="dashboard-actions">
          <div className="user-chip">
            <span className="status-dot" />
            <span className="avatar">{initials(session.name)}</span>
            <span className="user-name">{session.name}</span>
          </div>
          <button type="button" className="icon-button" aria-label="Toggle dark mode" onClick={toggleTheme}>
            <img className="invert-dark" src={moonIcon} alt="" width={20} height={20} />
          </button>
          <button type="button" className="btn btn-primary dashboard-account" onClick={() => setDialog({ kind: 'account' })}>
            Account
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <nav className="dashboard-sidebar" aria-label="Schedule actions">
          <button type="button" className="sidebar-btn" onClick={() => setDialog({ kind: 'add' })}>
            Add Item
          </button>
          <button type="button" className="sidebar-btn sidebar-btn-danger" onClick={() => setDialog({ kind: 'manage' })}>
            Delete
          </button>
          <hr />
          <button type="button" className="sidebar-btn" onClick={() => setDialog({ kind: 'import' })}>
            Import
          </button>
          <button type="button" className="sidebar-btn" onClick={handleSaveAs}>
            Save As
          </button>
          <button type="button" className="sidebar-btn" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="sidebar-btn" onClick={() => setDialog({ kind: 'new' })}>
            New
          </button>
          <hr />
          <button type="button" className="sidebar-btn sidebar-btn-sync" onClick={() => setDialog({ kind: 'gcal' })}>
            <img src={syncIcon} alt="" width={12.986} height={12.986} />
            Sync GCal
          </button>
        </nav>

        <div className="dashboard-content">
          {error && <p className="form-error dashboard-error">{error}</p>}
          {conflicts.length > 0 && (
            <div className="conflict-warning dashboard-conflicts" role="alert">
              <strong>
                ⚠ {conflicts.length === 1 ? 'Two classes overlap' : `${conflicts.length} schedule conflicts`}
              </strong>
              <ul>
                {conflicts.map((c) => (
                  <li key={`${c.a.id}-${c.b.id}`}>
                    <button type="button" className="conflict-link" onClick={() => setDialog({ kind: 'edit', item: c.a })}>
                      {c.a.title}
                    </button>{' '}
                    and{' '}
                    <button type="button" className="conflict-link" onClick={() => setDialog({ kind: 'edit', item: c.b })}>
                      {c.b.title}
                    </button>{' '}
                    — {describeOverlap(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ScheduleGrid
            items={items}
            settings={settings}
            onOpenSettings={() => setDialog({ kind: 'settings' })}
            onSelectItem={(item) => setDialog({ kind: 'edit', item })}
            onSelectSlot={(day, start) => setDialog({ kind: 'add', preset: { day, start } })}
            title={scheduleTitle}
            onRenameTitle={renameSchedule}
          />
        </div>
      </main>

      <Link to="/" className="back-to-landing">
        ← Back to Landing
      </Link>

      {dialog?.kind === 'add' && (
        <ItemFormModal
          preset={dialog.preset}
          otherItems={items}
          onClose={close}
          onSubmit={(input) => handleSave(input)}
        />
      )}
      {dialog?.kind === 'edit' && (
        <ItemFormModal
          item={dialog.item}
          otherItems={items.filter((i) => i.id !== dialog.item.id)}
          onClose={close}
          onSubmit={(input) => handleSave(input, dialog.item)}
          onDelete={async () => {
            // Errors propagate so the form can show them inline.
            await deleteItem(dialog.item.id)
            setItems((prev) => prev.filter((i) => i.id !== dialog.item.id))
            close()
          }}
        />
      )}
      {dialog?.kind === 'manage' && (
        <ManageSchedulesModal
          items={items}
          onClose={close}
          onEdit={(item) => setDialog({ kind: 'edit', item })}
          onDelete={handleDelete}
          onDeleteAll={() => setDialog({ kind: 'deleteAll' })}
        />
      )}
      {dialog?.kind === 'settings' && (
        <GridSettingsModal
          settings={settings}
          itemRange={itemHourRange(items)}
          onClose={close}
          onSave={(next) => {
            setSettings(fitToItems(next, items))
            close()
          }}
        />
      )}
      {dialog?.kind === 'import' && (
        <ImportImageModal
          onClose={close}
          onFile={() => {
            // TODO: send the image to the backend for schedule extraction once that endpoint exists.
            close()
          }}
        />
      )}
      {dialog?.kind === 'new' && (
        <ConfirmModal
          title="Start New Schedule?"
          message="This will clear all current events. This action cannot be undone."
          confirmLabel="Clear All"
          onConfirm={handleClearAll}
          onClose={close}
        />
      )}
      {dialog?.kind === 'deleteAll' && (
        <ConfirmModal
          title="Delete All Schedules?"
          message="This will remove every item from your schedule. This action cannot be undone."
          confirmLabel="Delete All"
          onConfirm={handleClearAll}
          onClose={close}
        />
      )}
      {dialog?.kind === 'gcal' && (
        <GoogleCalendarModal
          items={items}
          onClose={close}
          onConfirm={() => {
            // TODO: push the entries to Google Calendar once Google sign-in is wired up.
            close()
          }}
        />
      )}
      {dialog?.kind === 'account' && (
        <AuthModal
          onClose={close}
          onGuest={() => {
            setSession(startGuestSession())
            close()
          }}
        />
      )}
    </div>
  )
}

export default DashboardPage
