<script setup>
import { computed } from 'vue'
import FamilyTree from '@/components/FamilyTree.vue'
import { findComponents } from '@/lib/layout'
import { people } from '@/store/people'
import { byBirth } from '@/lib/format'

// Each group of connected people becomes its own tree.
const families = computed(() =>
  findComponents(people.value).map((members) => {
    const founders = members.filter((p) => !p.parentIds.some((id) => members.find((m) => m.id === id)))
    const eldest = [...founders].sort(byBirth)[0]
    const surname = eldest.name.trim().split(/\s+/).pop()
    return {
      key: members.map((m) => m.id).sort().join(),
      title: members.length === 1 ? eldest.name : `The ${surname} Family`,
      members,
    }
  }),
)
</script>

<template>
  <div class="container">
    <header class="page-head">
      <h1>Family Tree</h1>
      <p class="muted">
        Tap a picture to open someone's profile. Drag to move around; use the buttons to zoom.
      </p>
    </header>

    <div v-if="families.length === 0" class="card empty">
      <h2>No one here yet</h2>
      <p class="muted">Start the tree by adding the first family member.</p>
      <RouterLink to="/admin/new" class="btn primary">Add a person</RouterLink>
    </div>

    <section v-for="f in families" :key="f.key" class="family">
      <div class="family-head">
        <h2>{{ f.title }}</h2>
        <span class="muted">{{ f.members.length }} {{ f.members.length === 1 ? 'person' : 'people' }}</span>
      </div>
      <FamilyTree :people="f.members" class="card tree" />
    </section>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 24px;
}
.page-head p {
  margin: 0;
}
.family {
  margin-bottom: 36px;
}
.family-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}
.family-head h2 {
  margin: 0;
}
.tree {
  padding: 0;
}
.empty {
  padding: 40px 24px;
  text-align: center;
}
</style>
