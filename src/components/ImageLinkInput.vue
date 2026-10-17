<script setup>
import { ref } from 'vue'
import { normalizeImageUrl, checkImageUrl } from '@/lib/image'

defineProps({
  buttonLabel: { type: String, default: 'Add' },
})
const emit = defineEmits(['add'])

const url = ref('')
const error = ref('')
const checking = ref(false)

async function add() {
  error.value = ''
  const link = normalizeImageUrl(url.value)
  if (!/^https?:\/\//i.test(link)) {
    error.value = 'Paste a full link starting with https://'
    return
  }
  checking.value = true
  try {
    await checkImageUrl(link)
    emit('add', link)
    url.value = ''
  } catch (err) {
    error.value = `${err.message} Make sure it links to the image itself (right-click the picture → "Copy image address").`
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="link-input">
    <div class="row">
      <input
        v-model="url"
        type="url"
        placeholder="Paste a picture link (https://…)"
        aria-label="Picture link"
        @keydown.enter.prevent="add"
        @input="error = ''"
      />
      <button type="button" class="btn" :disabled="!url.trim() || checking" @click="add">
        {{ checking ? 'Checking…' : buttonLabel }}
      </button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  gap: 6px;
}
.row input {
  flex: 1;
  min-width: 0;
}
.row .btn {
  flex-shrink: 0;
}
.error {
  margin: 6px 0 0;
  color: var(--danger);
  font-size: 0.85rem;
}
</style>
