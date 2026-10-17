<script setup>
import { computed, ref } from 'vue'
import PersonPhoto from '@/components/PersonPhoto.vue'
import { formatDate } from '@/lib/format'
import {
  people,
  deletePerson,
  resetToSamples,
  exportJson,
  importJson,
  childrenOf,
} from '@/store/people'

const query = ref('')
const message = ref('')
const fileInput = ref(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? people.value.filter((p) => p.name.toLowerCase().includes(q)) : people.value
})

function flash(text) {
  message.value = text
  setTimeout(() => (message.value = ''), 3000)
}

async function remove(p) {
  if (!confirm(`Delete ${p.name}? Their links to other family members will be removed too.`)) return
  await deletePerson(p.id)
  flash(`${p.name} was deleted.`)
}

async function reset() {
  if (!confirm('Replace everyone with the sample family? All current data will be lost.')) return
  await resetToSamples()
  flash('Sample family loaded.')
}

function download() {
  const blob = new Blob([exportJson()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function onImport(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  if (!confirm('Importing replaces everyone currently in the tree. Continue?')) return
  try {
    await importJson(await file.text())
    flash('Family imported.')
  } catch (err) {
    alert('Could not import that file: ' + err.message)
  }
}

const summary = (p) => {
  const bits = []
  if (p.parentIds.length) bits.push(`${p.parentIds.length} parent${p.parentIds.length > 1 ? 's' : ''}`)
  if (p.spouseIds.length) bits.push(p.spouseIds.length > 1 ? `${p.spouseIds.length} spouses` : 'married')
  const kids = childrenOf(p.id).length
  if (kids) bits.push(`${kids} child${kids > 1 ? 'ren' : ''}`)
  if (p.album.length) bits.push(`${p.album.length} photo${p.album.length > 1 ? 's' : ''}`)
  return bits.join(' · ')
}
</script>

<template>
  <div class="container">
    <header class="head">
      <div>
        <h1>Admin dashboard</h1>
        <p class="muted">Add family members, their pictures, and how they're related.</p>
      </div>
      <RouterLink to="/admin/new" class="btn primary">+ Add person</RouterLink>
    </header>

    <p v-if="message" class="flash" role="status">{{ message }}</p>

    <div class="card list-card">
      <div class="list-toolbar">
        <input v-model="query" type="search" placeholder="Search by name…" aria-label="Search" />
        <span class="muted count">{{ people.length }} people</span>
      </div>

      <ul v-if="filtered.length" class="list">
        <li v-for="p in filtered" :key="p.id" class="row">
          <RouterLink :to="{ name: 'person', params: { id: p.id } }" class="who">
            <PersonPhoto :person="p" :size="48" />
            <span>
              <strong>{{ p.name }}</strong>
              <span class="meta muted">
                {{ formatDate(p.birthDate) || 'No birthday' }}
                <template v-if="summary(p)"> · {{ summary(p) }}</template>
              </span>
            </span>
          </RouterLink>
          <div class="actions">
            <RouterLink :to="{ name: 'admin-edit', params: { id: p.id } }" class="btn small">
              Edit
            </RouterLink>
            <button class="btn small danger" @click="remove(p)">Delete</button>
          </div>
        </li>
      </ul>
      <p v-else class="empty muted">
        {{ people.length ? 'No one matches that search.' : 'No family members yet.' }}
      </p>
    </div>

    <section class="card data">
      <h2>Data</h2>
      <p class="muted">
        Everything is saved in this browser. Download a backup to keep it safe or move it to
        another device.
      </p>
      <div class="data-actions">
        <button class="btn" @click="download">Download backup</button>
        <button class="btn" @click="fileInput.click()">Import backup…</button>
        <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImport" />
        <button class="btn danger" @click="reset">Reset to sample family</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.head p {
  margin: 0;
}
.flash {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--accent-soft);
  margin: 0 0 16px;
}
.list-card {
  overflow: hidden;
}
.list-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border);
}
.list-toolbar input {
  max-width: 320px;
}
.count {
  white-space: nowrap;
  font-size: 0.9rem;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
.row:last-child {
  border-bottom: none;
}
.who {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: var(--text);
  text-decoration: none;
}
.who strong {
  display: block;
}
.meta {
  display: block;
  font-size: 0.85rem;
}
.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.empty {
  padding: 24px 14px;
  margin: 0;
}
.data {
  margin-top: 28px;
  padding: 20px;
}
.data p {
  margin-top: 0;
}
.data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
@media (max-width: 560px) {
  .row {
    flex-direction: column;
    align-items: stretch;
  }
  .actions {
    justify-content: flex-end;
  }
}
</style>
