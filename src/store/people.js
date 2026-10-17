import { ref, computed } from 'vue'
import * as db from '@/lib/db'
import { PEOPLE, PHOTOS } from '@/lib/db'
import { sampleFamily } from '@/data/samples'

// Person shape:
// { id, name, birthDate: free text, bio, photo: dataUrl, parentIds: [id], spouseIds: [id] }
// Children are derived from other people's parentIds; spouse links are kept symmetric.
//
// Album photos live in their own collection so one picture can belong to several people:
// { id, src: dataUrl, caption, peopleIds: [id] }

const SEEDED_KEY = 'familytree:seeded'

export const people = ref([])
export const photos = ref([])
export const loaded = ref(false)

export const byId = computed(() => new Map(people.value.map((p) => [p.id, p])))

const clone = (o) => JSON.parse(JSON.stringify(o))

export async function loadPeople() {
  let [all, allPhotos] = await Promise.all([db.getAll(PEOPLE), db.getAll(PHOTOS)])
  if (all.length === 0 && !localStorage.getItem(SEEDED_KEY)) {
    ;({ people: all, photos: allPhotos } = sampleFamily())
    await Promise.all([db.putMany(PEOPLE, all), db.putMany(PHOTOS, allPhotos)])
  } else if (all.some((p) => p.album)) {
    // Data saved before photos were shared: move each person's album into the library.
    ;({ people: all, photos: allPhotos } = normalize(all, allPhotos))
    await Promise.all([db.putMany(PEOPLE, all), db.putMany(PHOTOS, allPhotos)])
  }
  localStorage.setItem(SEEDED_KEY, '1')
  people.value = sortPeople(all)
  photos.value = allPhotos
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

export function photosOf(id) {
  return photos.value.filter((ph) => ph.peopleIds.includes(id))
}

/**
 * Save a person along with their relationships.
 * `childIds` lists who should have this person as a parent; other people's
 * parentIds and spouseIds are updated so the graph stays consistent.
 * `photoIds` lists the library photos this person appears in.
 */
export async function savePerson(person, childIds, photoIds) {
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
  await db.putMany(PEOPLE, updates)
  const map = new Map(people.value.map((p) => [p.id, p]))
  updates.forEach((u) => map.set(u.id, u))
  people.value = sortPeople([...map.values()])

  const photoUpdates = []
  for (const ph of photos.value) {
    const wants = photoIds.includes(ph.id)
    const has = ph.peopleIds.includes(id)
    if (wants !== has) {
      const p = clone(ph)
      p.peopleIds = wants ? [...p.peopleIds, id] : p.peopleIds.filter((x) => x !== id)
      photoUpdates.push(p)
    }
  }
  await putPhotos(photoUpdates)
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
  await db.remove(PEOPLE, id)
  await db.putMany(PEOPLE, updates)
  const map = new Map(people.value.map((p) => [p.id, p]))
  map.delete(id)
  updates.forEach((u) => map.set(u.id, u))
  people.value = sortPeople([...map.values()])

  // Their photos stay in the library, just without them tagged.
  await putPhotos(
    photos.value
      .filter((ph) => ph.peopleIds.includes(id))
      .map((ph) => ({ ...clone(ph), peopleIds: ph.peopleIds.filter((x) => x !== id) })),
  )
}

/** Add or update library photos. */
export async function putPhotos(list) {
  if (!list.length) return
  const items = list.map(clone)
  await db.putMany(PHOTOS, items)
  const map = new Map(photos.value.map((p) => [p.id, p]))
  items.forEach((p) => map.set(p.id, p))
  photos.value = [...map.values()]
}

export async function deletePhoto(id) {
  await db.remove(PHOTOS, id)
  photos.value = photos.value.filter((p) => p.id !== id)
}

export async function replaceAll(list, photoList) {
  await Promise.all([db.clear(PEOPLE), db.clear(PHOTOS)])
  await Promise.all([db.putMany(PEOPLE, list), db.putMany(PHOTOS, photoList)])
  people.value = sortPeople(list)
  photos.value = photoList
}

export function resetToSamples() {
  const { people: list, photos: photoList } = sampleFamily()
  return replaceAll(list, photoList)
}

export function exportJson() {
  return JSON.stringify({ version: 2, people: people.value, photos: photos.value }, null, 2)
}

export async function importJson(text) {
  const data = JSON.parse(text)
  const list = Array.isArray(data) ? data : data.people
  if (!Array.isArray(list)) throw new Error('No people found in file')
  const result = normalize(list, Array.isArray(data.photos) ? data.photos : [])
  await replaceAll(result.people, result.photos)
}

// Clean up imported or older data, moving any per-person `album` into shared photos.
function normalize(list, photoList) {
  const ids = new Set(list.map((p) => String(p.id)))
  const outPhotos = photoList.map((ph) => ({
    id: String(ph.id),
    src: String(ph.src || ''),
    caption: ph.caption || '',
    peopleIds: (ph.peopleIds || []).map(String).filter((x) => ids.has(x)),
  }))
  const bySrc = new Map(outPhotos.map((ph) => [ph.src, ph]))
  const outPeople = list.map((p) => {
    const id = String(p.id)
    for (const src of Array.isArray(p.album) ? p.album : []) {
      // The same picture in several albums becomes one shared photo.
      if (bySrc.has(src)) {
        const ph = bySrc.get(src)
        if (!ph.peopleIds.includes(id)) ph.peopleIds.push(id)
      } else {
        const ph = { id: newId(), src, caption: '', peopleIds: [id] }
        outPhotos.push(ph)
        bySrc.set(src, ph)
      }
    }
    return {
      id,
      name: String(p.name || 'Unnamed'),
      birthDate: String(p.birthDate || ''),
      bio: p.bio || '',
      photo: p.photo || '',
      parentIds: (p.parentIds || []).map(String).filter((x) => ids.has(x)),
      spouseIds: (p.spouseIds || []).map(String).filter((x) => ids.has(x)),
    }
  })
  return { people: outPeople, photos: outPhotos }
}
