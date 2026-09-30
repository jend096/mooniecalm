export const AVATAR_SELECTIONS_STORAGE_KEY = 'mooniecalm_avatar_selections'

export interface AvatarSelections {
  eyes: string | null
  ears: string | null
  body_color: string | null
  fx_overlay: string | null
}

function emptySelections(): AvatarSelections {
  return { eyes: null, ears: null, body_color: null, fx_overlay: null }
}

function isEmptySelections(selections: AvatarSelections): boolean {
  return Object.values(selections).every(v => v === null)
}

export function readAvatarSelectionsFromStorage(): AvatarSelections {
  if (typeof window === 'undefined') return emptySelections()

  try {
    const raw = window.localStorage.getItem(AVATAR_SELECTIONS_STORAGE_KEY)
    if (!raw) return emptySelections()
    return { ...emptySelections(), ...JSON.parse(raw) }
  } catch {
    return emptySelections()
  }
}

function writeAvatarSelectionsToStorage(value: AvatarSelections) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(AVATAR_SELECTIONS_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) - selections just won't survive a refresh
  }
}

// Shared useState, kept in sync with localStorage so answers from
// question-1 through question-4 survive a hard refresh mid-flow. On first
// access after a refresh (when the in-memory useState is back to its empty
// default) it rehydrates from whatever was last persisted.
let hasWatcher = false

export function useAvatarSelections() {
  const state = useState<AvatarSelections>('avatarSelections', emptySelections)

  if (typeof window !== 'undefined') {
    if (isEmptySelections(state.value)) {
      const stored = readAvatarSelectionsFromStorage()
      if (!isEmptySelections(stored)) {
        state.value = stored
      }
    }

    if (!hasWatcher) {
      hasWatcher = true
      watch(state, (value) => writeAvatarSelectionsToStorage(value), { deep: true })
    }
  }

  return state
}
