import { ref } from 'vue'

// The family key only hides the app from casual visitors: it is checked in the
// browser, so anyone reading the source can find it. It is not real security.
const FAMILY_KEY = '1717'
const STORAGE_KEY = 'familytree:unlocked'

export const unlocked = ref(sessionStorage.getItem(STORAGE_KEY) === '1')

export function tryUnlock(key) {
  if (key.trim() !== FAMILY_KEY) return false
  sessionStorage.setItem(STORAGE_KEY, '1')
  unlocked.value = true
  return true
}

export function lock() {
  sessionStorage.removeItem(STORAGE_KEY)
  unlocked.value = false
}
