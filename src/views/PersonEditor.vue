<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import RelationPicker from '@/components/RelationPicker.vue'
import PersonPhoto from '@/components/PersonPhoto.vue'
import ImageLinkInput from '@/components/ImageLinkInput.vue'
import { fileToDataUrl } from '@/lib/image'
import {
  people,
  photos,
  getPerson,
  childrenOf,
  photosOf,
  savePerson,
  putPhotos,
  newId,
} from '@/store/people'

const props = defineProps({ id: { type: String, default: null } })
const router = useRouter()

const form = reactive({
  id: '',
  name: '',
  birthDate: '',
  bio: '',
  photo: '',
  parentIds: [],
  spouseIds: [],
  childIds: [],
  photoIds: [], // library photos this person is tagged in
  newPhotos: [], // pictures uploaded or linked here, added to the library on save
})
const showLibrary = ref(false)
const notFound = ref(false)
const busy = ref(false)
const error = ref('')

function load() {
  notFound.value = false
  if (!props.id) {
    Object.assign(form, {
      id: newId(), name: '', birthDate: '', bio: '', photo: '',
      parentIds: [], spouseIds: [], childIds: [], photoIds: [], newPhotos: [],
    })
    return
  }
  const p = getPerson(props.id)
  if (!p) {
    notFound.value = true
    return
  }
  Object.assign(form, {
    ...JSON.parse(JSON.stringify(p)),
    childIds: childrenOf(p.id).map((c) => c.id),
    photoIds: photosOf(p.id).map((ph) => ph.id),
    newPhotos: [],
  })
}
watch(() => props.id, load, { immediate: true })

const isNew = computed(() => !props.id)
const others = computed(() => people.value.filter((p) => p.id !== form.id))
// Someone can't be both a parent and a child of the same person.
const parentOptions = computed(() => others.value.filter((p) => !form.childIds.includes(p.id)))
const childOptions = computed(() => others.value.filter((p) => !form.parentIds.includes(p.id)))

const photoById = computed(() => new Map(photos.value.map((ph) => [ph.id, ph])))
const taggedPhotos = computed(() => form.photoIds.map((id) => photoById.value.get(id)).filter(Boolean))
const libraryChoices = computed(() =>
  [...photos.value].reverse().filter((ph) => !form.photoIds.includes(ph.id)),
)

const isLink = (src) => /^https?:/i.test(src)

async function onPhoto(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  busy.value = true
  try {
    form.photo = await fileToDataUrl(file, 600)
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

async function onAlbum(e) {
  const files = [...e.target.files]
  e.target.value = ''
  busy.value = true
  try {
    for (const f of files) form.newPhotos.push(await fileToDataUrl(f, 1400))
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

async function save() {
  error.value = ''
  if (!form.name.trim()) {
    error.value = 'Please enter a name.'
    return
  }
  busy.value = true
  try {
    const { childIds, photoIds, newPhotos, ...person } = form
    person.name = person.name.trim()
    person.birthDate = person.birthDate.trim()
    person.bio = person.bio.trim()
    await savePerson(person, childIds, photoIds)
    await putPhotos(newPhotos.map((src) => ({ id: newId(), src, caption: '', peopleIds: [form.id] })))
    router.push({ name: 'person', params: { id: form.id } })
  } catch (err) {
    error.value = 'Could not save: ' + err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="container narrow">
    <RouterLink to="/admin" class="back">← Admin dashboard</RouterLink>

    <div v-if="notFound" class="card pad">
      <h2>Person not found</h2>
      <RouterLink to="/admin" class="btn">Back</RouterLink>
    </div>

    <form v-else class="card pad" @submit.prevent="save">
      <h1>{{ isNew ? 'Add a family member' : `Edit ${getPerson(props.id)?.name}` }}</h1>

      <div class="photo-row">
        <PersonPhoto :person="form" :size="112" />
        <div>
          <span class="field-label">Picture</span>
          <div class="photo-actions">
            <label class="btn small">
              {{ form.photo ? 'Change picture' : 'Upload picture' }}
              <input type="file" accept="image/*" hidden @change="onPhoto" />
            </label>
            <button v-if="form.photo" type="button" class="btn small danger" @click="form.photo = ''">
              Remove
            </button>
          </div>
          <span class="or muted">or use a picture that's already online:</span>
          <ImageLinkInput button-label="Use link" @add="(url) => (form.photo = url)" />
        </div>
      </div>

      <label class="field">
        <span>Name</span>
        <input v-model="form.name" type="text" placeholder="Full name" required />
      </label>

      <label class="field">
        <span>Birthday</span>
        <input v-model="form.birthDate" type="text" placeholder="e.g. 1940-03-12, March 1940, 1940, or about 1940" />
        <small class="muted hint-inline">
          Write as much as you know. Use YEAR-MONTH-DAY (like 1940-03-12) to also show their age.
        </small>
      </label>

      <label class="field">
        <span>Short summary</span>
        <textarea
          v-model="form.bio"
          rows="3"
          maxlength="600"
          placeholder="A few words about them…"
        ></textarea>
      </label>

      <fieldset>
        <legend>Family connections</legend>
        <p class="muted hint">
          Connections draw the lines in the tree. People with no connections appear as their own
          separate tree.
        </p>
        <RelationPicker v-model="form.parentIds" label="Parents" :options="parentOptions" :max="2" />
        <RelationPicker v-model="form.spouseIds" label="Spouse / partner" :options="others" />
        <RelationPicker v-model="form.childIds" label="Children" :options="childOptions" />
      </fieldset>

      <fieldset>
        <legend>Album</legend>
        <p class="muted hint">
          Photos are shared: a photo can be in several people's albums. Tag more people from the
          <RouterLink to="/admin/photos">Photos</RouterLink> tab.
        </p>
        <div class="album">
          <div v-for="ph in taggedPhotos" :key="ph.id" class="thumb">
            <img :src="ph.src" :alt="ph.caption" :title="ph.caption" />
            <span v-if="ph.peopleIds.filter((x) => x !== form.id).length" class="badge">shared</span>
            <button
              type="button"
              aria-label="Remove from this album"
              title="Remove from this album"
              @click="form.photoIds = form.photoIds.filter((x) => x !== ph.id)"
            >✕</button>
          </div>
          <div v-for="(src, i) in form.newPhotos" :key="'new' + i" class="thumb">
            <img :src="src" alt="" />
            <span class="badge">{{ isLink(src) ? 'new link' : 'new' }}</span>
            <button type="button" aria-label="Remove photo" @click="form.newPhotos.splice(i, 1)">✕</button>
          </div>
          <label class="thumb add">
            <span>+ Upload pictures</span>
            <input type="file" accept="image/*" multiple hidden @change="onAlbum" />
          </label>
          <button
            v-if="libraryChoices.length"
            type="button"
            class="thumb add"
            @click="showLibrary = !showLibrary"
          >
            <span>{{ showLibrary ? 'Hide library' : '+ From photo library' }}</span>
          </button>
        </div>
        <div class="album-link">
          <span class="or muted">Or add a picture that's already online:</span>
          <ImageLinkInput @add="(url) => form.newPhotos.push(url)" />
        </div>
        <div v-if="showLibrary && libraryChoices.length" class="library">
          <p class="muted hint">Click a photo to add it to this album.</p>
          <div class="album">
            <button
              v-for="ph in libraryChoices"
              :key="ph.id"
              type="button"
              class="thumb pick"
              :title="ph.caption"
              @click="form.photoIds = [...form.photoIds, ph.id]"
            >
              <img :src="ph.src" :alt="ph.caption" />
            </button>
          </div>
        </div>
      </fieldset>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="form-actions">
        <RouterLink to="/admin" class="btn">Cancel</RouterLink>
        <button class="btn primary" type="submit" :disabled="busy">
          {{ busy ? 'Working…' : isNew ? 'Add person' : 'Save changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 720px;
}
.back {
  display: inline-block;
  margin-bottom: 16px;
  text-decoration: none;
  font-weight: 500;
}
.pad {
  padding: 28px;
}
@media (max-width: 560px) {
  .pad {
    padding: 20px 16px;
  }
}
.photo-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 8px 0 22px;
}
.photo-row > div {
  flex: 1;
  min-width: 0;
}
.or {
  display: block;
  margin: 10px 0 6px;
  font-size: 0.85rem;
}
.album-link {
  margin-top: 6px;
}
.photo-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
fieldset {
  border: none;
  border-top: 1px solid var(--border);
  padding: 18px 0 0;
  margin: 8px 0 18px;
}
legend {
  font-family: var(--serif);
  font-size: 1.2rem;
  font-weight: 600;
  padding-right: 10px;
}
.hint {
  margin: 0 0 14px;
  font-size: 0.9rem;
}
.album {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-2);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb button {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  font-size: 0.75rem;
}
.thumb.add {
  display: grid;
  place-items: center;
  border: 2px dashed var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.9rem;
}
.badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.7rem;
}
.thumb.pick {
  padding: 0;
  border: none;
  cursor: copy;
}
.thumb.pick:hover {
  outline: 3px solid var(--accent);
}
.library {
  margin-top: 14px;
  padding: 14px;
  border-radius: 12px;
  background: var(--surface-2);
}
.hint-inline {
  display: block;
  margin-top: 4px;
  font-size: 0.82rem;
}
button.thumb.add {
  font: inherit;
  font-size: 0.9rem;
}
.thumb.add:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.error {
  color: var(--danger);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
