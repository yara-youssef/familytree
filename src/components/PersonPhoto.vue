<script setup>
import { ref, watch } from 'vue'
import { initials } from '@/lib/format'

const props = defineProps({
  person: { type: Object, required: true },
  size: { type: Number, default: 88 },
})

// Linked pictures can disappear; show initials instead of a broken image.
const failed = ref(false)
watch(() => props.person.photo, () => (failed.value = false))
</script>

<template>
  <img
    v-if="person.photo && !failed"
    :src="person.photo"
    :alt="person.name"
    class="avatar"
    :style="{ width: size + 'px', height: size + 'px' }"
    @error="failed = true"
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
