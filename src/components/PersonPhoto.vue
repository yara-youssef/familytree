<script setup>
import { initials } from '@/lib/format'

defineProps({
  person: { type: Object, required: true },
  size: { type: Number, default: 88 },
})
</script>

<template>
  <img
    v-if="person.photo"
    :src="person.photo"
    :alt="person.name"
    class="avatar"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
  <div
    v-else
    class="avatar-fallback"
    :style="{ width: size + 'px', height: size + 'px', fontSize: size * 0.36 + 'px' }"
    :aria-label="person.name"
  >
    {{ initials(person.name) }}
  </div>
</template>
