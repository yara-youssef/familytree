<script setup>
import { computed, ref } from 'vue'
import AdminTabs from '@/components/AdminTabs.vue'
import RelationPicker from '@/components/RelationPicker.vue'
import ImageLinkInput from '@/components/ImageLinkInput.vue'
import { fileToDataUrl } from '@/lib/image'
import { people, photos, getPerson, putPhotos, deletePhoto, newId } from '@/store/people'

const busy = ref(false)
const filter = ref('all') // 'all' | 'untagged' | person id
const editing = ref(null) // a copy of the photo being edited

const shown = computed(() => {
  const list = [...photos.value].reverse() // newest first
  if (filter.value === 'all') return list
  if (filter.value === 'untagged') return list.filter((ph) => ph.peopleIds.length === 0)
  return list.filter((ph) => ph.peopleIds.includes(filter.value))
})

const names = (ph) =>
  ph.peopleIds
    .map(getPerson)
    .filter(Boolean)
    .map((p) => p.name.split(' ')[0])
    .join(', ')

async function onUpload(e) {
  const files = [...e.target.files]
  e.target.value = ''
  if (!files.length) return
  busy.value = true
  try {
    const added = []
    for (const f of files) {
      added.push({ id: newId(), src: await fileToDataUrl(f, 1400), caption: '', peopleIds: [] })
    }
    await putPhotos(added)
    filter.value = 'all'
    // Go straight to tagging when a single photo was added
    if (added.length === 1) edit(added[0])
  } catch (err) {
    alert('Could not add photos: ' + err.message)
  } finally {
    busy.value = false
  }
}

async function onLink(url) {
  const photo = { id: newId(), src: url, caption: '', peopleIds: [] }
  await putPhotos([photo])
  filter.value = 'all'
  edit(photo)
}

const isLink = (src) => /^https?:/i.test(src)
const hostOf = (src) => {
  try {
    return new URL(src).hostname
  } catch {
    return src
  }
}

function edit(ph) {
  editing.value = JSON.parse(JSON.stringify(ph))
}

async function saveEdit() {
  await putPhotos([editing.value])
  editing.value = null
}

async function removeEditing() {
  if (!confirm('Delete this photo from everyone’s album?')) return
  await deletePhoto(editing.value.id)
  editing.value = null
}
</script>

<template>
  <div class="container">
    <header class="head">
      <div>
        <h1>Admin dashboard</h1>
        <p class="muted">
          Add a photo once and tag everyone in it — it shows up in each of their albums.
        </p>
      </div>
      <label class="btn primary" :class="{ disabled: busy }">
        {{ busy ? 'Adding…' : '+ Upload photos' }}
        <input type="file" accept="image/*" multiple hidden :disabled="busy" @change="onUpload" />
      </label>
    </header>

    <AdminTabs />

    <div class="add-link card">
      <span class="field-label">Add a photo that's already online</span>
      <p class="muted">
        Paste the picture's link instead of uploading it. Nothing is copied — the photo stays
        where it is online.
      </p>
      <ImageLinkInput button-label="Add photo" @add="onLink" />
    </div>

    <div class="toolbar">
      <select v-model="filter" aria-label="Show photos of">
        <option value="all">All photos ({{ photos.length }})</option>
        <option value="untagged">Not tagged yet</option>
        <option v-for="p in people" :key="p.id" :value="p.id">Photos of {{ p.name }}</option>
      </select>
    </div>

    <div v-if="shown.length" class="grid">
      <button v-for="ph in shown" :key="ph.id" class="tile card" @click="edit(ph)">
        <span class="tile-img">
          <img :src="ph.src" :alt="ph.caption" loading="lazy" />
          <span v-if="isLink(ph.src)" class="link-badge" title="Linked from the web">link</span>
        </span>
        <span class="tile-text">
          <strong v-if="ph.caption">{{ ph.caption }}</strong>
          <span :class="ph.peopleIds.length ? 'muted' : 'warn'">
            {{ ph.peopleIds.length ? names(ph) : 'No one tagged' }}
          </span>
        </span>
      </button>
    </div>
    <p v-else class="muted empty">No photos here yet.</p>

    <div v-if="editing" class="modal" @click.self="editing = null">
      <form class="card dialog" @submit.prevent="saveEdit">
        <img :src="editing.src" alt="" class="preview" />
        <p v-if="isLink(editing.src)" class="muted source">
          Linked from <a :href="editing.src" target="_blank" rel="noopener noreferrer">{{ hostOf(editing.src) }}</a>
        </p>
        <label class="field">
          <span>Caption</span>
          <input v-model="editing.caption" type="text" placeholder="e.g. Wedding day, 1963" />
        </label>
        <RelationPicker v-model="editing.peopleIds" label="People in this photo" :options="people" />
        <div class="dialog-actions">
          <button type="button" class="btn danger" @click="removeEditing">Delete photo</button>
          <span class="spacer"></span>
          <button type="button" class="btn" @click="editing = null">Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.head p {
  margin: 0;
}
.disabled {
  opacity: 0.6;
  pointer-events: none;
}
.toolbar {
  margin-bottom: 16px;
  max-width: 320px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
.tile {
  padding: 0;
  overflow: hidden;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}
.tile:hover {
  border-color: var(--accent);
}
.tile-img {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  background: var(--surface-2);
}
.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.link-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.7rem;
}
.add-link {
  padding: 16px;
  margin-bottom: 16px;
}
.add-link p {
  margin: 0 0 10px;
  font-size: 0.9rem;
}
.source {
  margin: -8px 0 14px;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}
.tile-text {
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  min-width: 0;
}
.tile-text > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.warn {
  color: var(--danger);
}
.empty {
  padding: 24px 0;
}
.modal {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(20, 12, 5, 0.55);
  display: grid;
  place-items: center;
  padding: 16px;
  overflow-y: auto;
}
.dialog {
  width: 100%;
  max-width: 520px;
  padding: 20px;
}
.preview {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 10px;
  background: var(--surface-2);
  margin-bottom: 16px;
}
.dialog-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.spacer {
  flex: 1;
}
</style>
