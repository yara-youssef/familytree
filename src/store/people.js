import { ref, computed } from 'vue'
import * as db from '@/lib/db'
import { samplePeople } from '@/data/samples'

// Person shape:
// { id, name, birthDate: 'YYYY-MM-DD', bio, photo: dataUrl, album: [dataUrl],
//   parentIds: [id], spouseIds: [id] }
// Children are derived from other people's parentIds; spouse links are kept symmetric.

const SEEDED_KEY = 'familytree:seeded'

export const people = ref([])
export const loaded = ref(false)

export const byId = computed(() => new Map(people.value.map((p) => [p.id, p])))

const clone = (o) => JSON.parse(JSON.stringify(o))

export async function loadPeople() {
  let all = await db.getAll()
  if (all.length === 0 && !localStorage.getItem(SEEDED_KEY)) {
    all = samplePeople()
    await db.putMany(all)
  }
  localStorage.setItem(SEEDED_KEY, '1')
  people.value = sortPeople(all)
  loaded.value = true
}

function sortPeople(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

export function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()
}

export function getPerson(id) {
  return byId.value.get(id)
}

export function parentsOf(id) {
  const p = getPerson(id)
  return p ? p.parentIds.map(getPerson).filter(Boolean) : []
}

export function childrenOf(id) {
  return people.value.filter((p) => p.parentIds.includes(id))
}

export function spousesOf(id) {
  const p = getPerson(id)
  return p ? p.spouseIds.map(getPerson).filter(Boolean) : []
}

export function siblingsOf(id) {
  const p = getPerson(id)
  if (!p || p.parentIds.length === 0) return []
  return people.value.filter(
    (o) => o.id !== id && o.parentIds.some((pid) => p.parentIds.includes(pid)),
  )
}

/**
 * Save a person along with their relationships.
 * `childIds` lists who should have this person as a parent; other people's
 * parentIds and spouseIds are updated so the graph stays consistent.
 */
export async function savePerson(person, childIds) {
  const id = person.id
  const changed = new Map()
  const touch = (p) => {
    if (!changed.has(p.id)) changed.set(p.id, clone(p))
    return changed.get(p.id)
  }

  const self = clone(person)
  self.parentIds = [...new Set(self.parentIds)].filter((x) => x !== id)
  self.spouseIds = [...new Set(self.spouseIds)].filter((x) => x !== id)
  changed.set(id, self)

  for (const other of people.value) {
    if (other.id === id) continue
    const wantsChild = childIds.includes(other.id)
    const isChild = other.parentIds.includes(id)
    if (wantsChild && !isChild) touch(other).parentIds.push(id)
    if (!wantsChild && isChild) {
      const o = touch(other)
      o.parentIds = o.parentIds.filter((x) => x !== id)
    }

    const wantsSpouse = self.spouseIds.includes(other.id)
    const isSpouse = other.spouseIds.includes(id)
    if (wantsSpouse && !isSpouse) touch(other).spouseIds.push(id)
    if (!wantsSpouse && isSpouse) {
      const o = touch(other)
      o.spouseIds = o.spouseIds.filter((x) => x !== id)
    }
  }

  const updates = [...changed.values()]
  await db.putMany(updates)
  const map = new Map(people.value.map((p) => [p.id, p]))
  updates.forEach((u) => map.set(u.id, u))
  people.value = sortPeople([...map.values()])
}

export async function deletePerson(id) {
  const updates = []
  for (const other of people.value) {
    if (other.id === id) continue
    if (other.parentIds.includes(id) || other.spouseIds.includes(id)) {
      const o = clone(other)
      o.parentIds = o.parentIds.filter((x) => x !== id)
      o.spouseIds = o.spouseIds.filter((x) => x !== id)
      updates.push(o)
    }
  }
  await db.remove(id)
  await db.putMany(updates)
  const map = new Map(people.value.map((p) => [p.id, p]))
  map.delete(id)
  updates.forEach((u) => map.set(u.id, u))
  people.value = sortPeople([...map.values()])
}

export async function replaceAll(list) {
  await db.clear()
  await db.putMany(list)
  people.value = sortPeople(list)
}

export function resetToSamples() {
  return replaceAll(samplePeople())
}

export function exportJson() {
  return JSON.stringify({ version: 1, people: people.value }, null, 2)
}

export async function importJson(text) {
  const data = JSON.parse(text)
  const list = Array.isArray(data) ? data : data.people
  if (!Array.isArray(list)) throw new Error('No people found in file')
  const ids = new Set(list.map((p) => p.id))
  const normalized = list.map((p) => ({
    id: String(p.id),
    name: String(p.name || 'Unnamed'),
    birthDate: p.birthDate || '',
    bio: p.bio || '',
    photo: p.photo || '',
    album: Array.isArray(p.album) ? p.album : [],
    parentIds: (p.parentIds || []).filter((x) => ids.has(x)),
    spouseIds: (p.spouseIds || []).filter((x) => ids.has(x)),
  }))
  await replaceAll(normalized)
}
