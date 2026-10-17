<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FamilyTree from '@/components/FamilyTree.vue'
import PersonPhoto from '@/components/PersonPhoto.vue'
import { familyAround } from '@/lib/layout'
import { formatDate, age } from '@/lib/format'
import {
  people,
  getPerson,
  parentsOf,
  childrenOf,
  spousesOf,
  siblingsOf,
  photosOf,
} from '@/store/people'

const props = defineProps({ id: { type: String, required: true } })

const person = computed(() => getPerson(props.id))
const personalTree = computed(() => familyAround(people.value, props.id))
const album = computed(() => photosOf(props.id))
const personAge = computed(() => age(person.value?.birthDate))

const relatives = computed(() =>
  [
    { label: 'Parents', list: parentsOf(props.id) },
    { label: spousesOf(props.id).length > 1 ? 'Spouses' : 'Spouse', list: spousesOf(props.id) },
    { label: 'Siblings', list: siblingsOf(props.id) },
    { label: 'Children', list: childrenOf(props.id) },
  ].filter((r) => r.list.length),
)

// Album lightbox
const viewing = ref(null)
const current = computed(() => (viewing.value === null ? null : album.value[viewing.value]))
const othersInPhoto = computed(() =>
  (current.value?.peopleIds ?? [])
    .filter((id) => id !== props.id)
    .map(getPerson)
    .filter(Boolean),
)
watch(() => props.id, () => (viewing.value = null))
function step(delta) {
  const n = album.value.length
  viewing.value = (viewing.value + delta + n) % n
}
function onKey(e) {
  if (viewing.value === null) return
  if (e.key === 'Escape') viewing.value = null
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="!person" class="container">
    <div class="card missing">
      <h2>Person not found</h2>
      <RouterLink to="/" class="btn">Back to the tree</RouterLink>
    </div>
  </div>

  <div v-else class="container">
    <RouterLink to="/" class="back">← Family tree</RouterLink>

    <section class="card hero">
      <PersonPhoto :person="person" :size="168" class="hero-photo" />
      <div class="hero-text">
        <h1>{{ person.name }}</h1>
        <p v-if="person.birthDate" class="dob">
          Born {{ formatDate(person.birthDate) }}
          <span v-if="personAge !== null" class="muted">· {{ personAge }} years old</span>
        </p>
        <p v-if="person.bio" class="bio">{{ person.bio }}</p>
        <p v-else class="bio muted">No bio yet.</p>

        <dl v-if="relatives.length" class="relatives">
          <div v-for="r in relatives" :key="r.label" class="rel-row">
            <dt>{{ r.label }}</dt>
            <dd>
              <RouterLink
                v-for="p in r.list"
                :key="p.id"
                :to="{ name: 'person', params: { id: p.id } }"
                class="chip"
              >
                <PersonPhoto :person="p" :size="24" />
                {{ p.name }}
              </RouterLink>
            </dd>
          </div>
        </dl>
        <RouterLink :to="{ name: 'admin-edit', params: { id: person.id } }" class="btn small edit">
          Edit profile
        </RouterLink>
      </div>
    </section>

    <section class="section">
      <h2>Album</h2>
      <div v-if="album.length" class="album">
        <button
          v-for="(ph, i) in album"
          :key="ph.id"
          class="thumb"
          :aria-label="ph.caption ? `Open photo: ${ph.caption}` : `Open photo ${i + 1}`"
          @click="viewing = i"
        >
          <img :src="ph.src" :alt="ph.caption" loading="lazy" />
          <span v-if="ph.peopleIds.length > 1" class="shared" title="Shared with others">
            +{{ ph.peopleIds.length - 1 }}
          </span>
        </button>
      </div>
      <p v-else class="muted">No pictures in the album yet.</p>
    </section>

    <section class="section">
      <h2>{{ person.name.split(' ')[0] }}'s family</h2>
      <FamilyTree :people="personalTree" :highlight-id="person.id" class="card" />
    </section>

    <div v-if="current" class="lightbox" @click.self="viewing = null">
      <button class="lb-btn close" aria-label="Close" @click="viewing = null">✕</button>
      <button
        v-if="album.length > 1"
        class="lb-btn prev"
        aria-label="Previous photo"
        @click="step(-1)"
      >
        ‹
      </button>
      <figure>
        <img :src="current.src" :alt="current.caption" />
        <figcaption v-if="current.caption || othersInPhoto.length">
          <strong v-if="current.caption">{{ current.caption }}</strong>
          <span v-if="othersInPhoto.length" class="also">
            Also in this photo:
            <RouterLink
              v-for="o in othersInPhoto"
              :key="o.id"
              :to="{ name: 'person', params: { id: o.id } }"
              class="lb-chip"
            >
              {{ o.name }}
            </RouterLink>
          </span>
        </figcaption>
      </figure>
      <button
        v-if="album.length > 1"
        class="lb-btn next"
        aria-label="Next photo"
        @click="step(1)"
      >
        ›
      </button>
      <span class="lb-count">{{ viewing + 1 }} / {{ album.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 16px;
  text-decoration: none;
  font-weight: 500;
}
.hero {
  display: flex;
  gap: 32px;
  padding: 28px;
  align-items: flex-start;
}
.hero-photo {
  flex-shrink: 0;
  box-shadow: 0 0 0 4px var(--surface), 0 0 0 6px var(--accent-soft);
}
.hero-text {
  flex: 1;
  min-width: 0;
}
.hero-text h1 {
  font-size: 2.1rem;
  margin-bottom: 4px;
}
.dob {
  margin: 0 0 14px;
  font-weight: 500;
}
.bio {
  margin: 0 0 18px;
  font-size: 1.05rem;
  max-width: 60ch;
}
.relatives {
  margin: 0 0 18px;
  display: grid;
  gap: 8px;
}
.rel-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
}
dt {
  width: 72px;
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--muted);
}
dd {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 3px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text);
  text-decoration: none;
  font-size: 0.9rem;
}
.chip:hover {
  background: var(--accent-soft);
}
.chip :deep(.avatar-fallback) {
  font-size: 10px !important;
}
.section {
  margin-top: 36px;
}
.album {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}
.thumb {
  position: relative;
  padding: 0;
  border: none;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  cursor: zoom-in;
  background: var(--surface-2);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.thumb:hover img {
  transform: scale(1.04);
}
.shared {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.75rem;
}
.missing {
  padding: 40px;
  text-align: center;
}
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 10, 5, 0.88);
  display: grid;
  place-items: center;
  padding: 48px 16px;
}
.lightbox figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 100%;
}
.lightbox img {
  max-width: 100%;
  max-height: calc(100vh - 180px);
  border-radius: 8px;
  object-fit: contain;
}
figcaption {
  color: #fff;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}
.also {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
}
.lb-chip {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  text-decoration: none;
}
.lb-chip:hover {
  background: rgba(255, 255, 255, 0.3);
}
.lb-btn {
  position: absolute;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}
.lb-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.close {
  top: 12px;
  right: 12px;
  font-size: 1.1rem;
}
.prev {
  left: 12px;
  top: 50%;
}
.next {
  right: 12px;
  top: 50%;
}
.lb-count {
  position: absolute;
  bottom: 14px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
}
@media (max-width: 640px) {
  .hero {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px 18px;
  }
  .rel-row {
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  dt {
    width: auto;
  }
  dd {
    justify-content: center;
  }
}
</style>
