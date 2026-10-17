<script setup>
import { computed, ref } from 'vue'
import PersonPhoto from '@/components/PersonPhoto.vue'

const props = defineProps({
  label: { type: String, required: true },
  options: { type: Array, required: true }, // people that can be picked
  max: { type: Number, default: Infinity },
})
const model = defineModel({ type: Array, required: true })

const pick = ref('')
const byId = computed(() => new Map(props.options.map((p) => [p.id, p])))
const selected = computed(() => model.value.map((id) => byId.value.get(id)).filter(Boolean))
const available = computed(() => props.options.filter((p) => !model.value.includes(p.id)))

function add() {
  if (pick.value && model.value.length < props.max) model.value = [...model.value, pick.value]
  pick.value = ''
}
function removeId(id) {
  model.value = model.value.filter((x) => x !== id)
}
</script>

<template>
  <div class="picker">
    <span class="field-label">{{ label }}</span>
    <div v-if="selected.length" class="chips">
      <span v-for="p in selected" :key="p.id" class="chip">
        <PersonPhoto :person="p" :size="24" />
        {{ p.name }}
        <button type="button" :aria-label="`Remove ${p.name}`" @click="removeId(p.id)">✕</button>
      </span>
    </div>
    <select
      v-if="model.length < max && available.length"
      v-model="pick"
      :aria-label="`Add ${label.toLowerCase()}`"
      @change="add"
    >
      <option value="">+ Add…</option>
      <option v-for="p in available" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>
    <p v-else-if="!selected.length" class="muted none">No one available to add.</p>
  </div>
</template>

<style scoped>
.picker {
  margin-bottom: 18px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 3px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: 0.9rem;
}
.chip :deep(.avatar-fallback) {
  font-size: 10px !important;
}
.chip button {
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.75rem;
}
.chip button:hover {
  background: var(--surface);
  color: var(--danger);
}
.none {
  margin: 0;
  font-size: 0.9rem;
}
</style>
