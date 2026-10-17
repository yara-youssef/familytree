// Tiny IndexedDB wrapper. IndexedDB is used instead of localStorage because
// photos are stored as data URLs and quickly exceed localStorage's ~5MB cap.
const DB_NAME = 'familytree'
const STORE = 'people'

let dbPromise = null

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function run(mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const result = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(result?.result)
    tx.onerror = () => reject(tx.error)
  })
}

export const getAll = () => run('readonly', (s) => s.getAll())
export const putMany = (items) => run('readwrite', (s) => items.forEach((i) => s.put(i)))
export const remove = (id) => run('readwrite', (s) => s.delete(id))
export const clear = () => run('readwrite', (s) => s.clear())
