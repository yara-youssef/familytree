// Tiny IndexedDB wrapper. IndexedDB is used instead of localStorage because
// photos are stored as data URLs and quickly exceed localStorage's ~5MB cap.
const DB_NAME = 'familytree'
export const PEOPLE = 'people'
export const PHOTOS = 'photos'

let dbPromise = null

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2)
      req.onupgradeneeded = () => {
        for (const name of [PEOPLE, PHOTOS]) {
          if (!req.result.objectStoreNames.contains(name)) {
            req.result.createObjectStore(name, { keyPath: 'id' })
          }
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function run(store, mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const result = fn(tx.objectStore(store))
    tx.oncomplete = () => resolve(result?.result)
    tx.onerror = () => reject(tx.error)
  })
}

export const getAll = (store) => run(store, 'readonly', (s) => s.getAll())
export const putMany = (store, items) =>
  run(store, 'readwrite', (s) => items.forEach((i) => s.put(i)))
export const remove = (store, id) => run(store, 'readwrite', (s) => s.delete(id))
export const clear = (store) => run(store, 'readwrite', (s) => s.clear())
