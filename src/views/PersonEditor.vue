<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import RelationPicker from '@/components/RelationPicker.vue'
import PersonPhoto from '@/components/PersonPhoto.vue'
import { fileToDataUrl } from '@/lib/image'
import { people, getPerson, childrenOf, savePerson, newId } from '@/store/people'

const props = defineProps({ id: { type: String, default: null } })
const router = useRouter()

const form = reactive({
  id: '',
  name: '',
  birthDate: '',
  bio: '',
  photo: '',
  album: [],
  parentIds: [],
  spouseIds: [],
  childIds: [],
})
const notFound = ref(false)
const busy = ref(false)
const error = ref('')

function load() {
  notFound.value = false
  if (!props.id) {
    Object.assign(form, {
      id: newId(), name: '', birthDate: '', bio: '', photo: '',
      album: [], parentIds: [], spouseIds: [], childIds: [],
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
  })
}
watch(() => props.id, load, { immediate: true })

const isNew = computed(() => !props.id)
const others = computed(() => people.value.filter((p) => p.id !== form.id))
// Someone can't be both a parent and a child of the same person.
const parentOptions = computed(() => others.value.filter((p) => !form.childIds.includes(p.id)))
const childOptions = computed(() => others.value.filter((p) => !form.parentIds.includes(p.id)))

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
    for (const f of files) form.album.push(await fileToDataUrl(f, 1400))
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
    const { childIds, ...person } = form
    person.name = person.name.trim()
    person.bio = person.bio.trim()
    await savePerson(person, childIds)
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
        </div>
      </div>

      <label class="field">
        <span>Name</span>
        <input v-model="form.name" type="text" placeholder="Full name" required />
      </label>

      <label class="field">
        <span>Birthday</span>
        <input v-model="form.birthDate" type="date" />
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
        <div class="album">
          <div v-for="(src, i) in form.album" :key="i" class="thumb">
            <img :src="src" alt="" />
            <button type="button" aria-label="Remove photo" @click="form.album.splice(i, 1)">✕</button>
          </div>
          <label class="thumb add">
            <span>+ Add pictures</span>
            <input type="file" accept="image/*" multiple hidden @change="onAlbum" />
          </label>
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
