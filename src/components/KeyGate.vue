<script setup>
import AppLogo from '@/components/AppLogo.vue'
import { ref, onMounted } from 'vue'
import { tryUnlock } from '@/store/gate'

const key = ref('')
const error = ref(false)
const input = ref(null)

onMounted(() => input.value?.focus())

function submit() {
  error.value = !tryUnlock(key.value)
  if (error.value) {
    key.value = ''
    input.value?.focus()
  }
}
</script>

<template>
  <div class="gate">
    <form class="card gate-card" @submit.prevent="submit">
      <AppLogo :size="56" class="icon" />
      <h1>Our Family Tree</h1>
      <p class="muted">Enter the secret family key to come in.</p>
      <input
        ref="input"
        v-model="key"
        type="password"
        inputmode="numeric"
        autocomplete="off"
        maxlength="12"
        placeholder="••••"
        aria-label="Family key"
        :class="{ shake: error }"
        @input="error = false"
      />
      <p v-if="error" class="error" role="alert">That's not the family key. Try again.</p>
      <button class="btn primary" type="submit" :disabled="!key">Enter</button>
    </form>
  </div>
</template>

<style scoped>
.gate {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  background: radial-gradient(circle at 50% 30%, var(--accent-soft), var(--bg) 70%);
}
.gate-card {
  width: 100%;
  max-width: 360px;
  padding: 36px 28px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.icon {
  color: var(--accent);
}
h1 {
  margin: 0;
}
p {
  margin: 0 0 6px;
}
input {
  text-align: center;
  font-size: 1.6rem;
  letter-spacing: 0.4em;
}
.btn {
  width: 100%;
  margin-top: 6px;
}
.error {
  color: var(--danger);
  font-size: 0.9rem;
}
.shake {
  animation: shake 0.35s;
  border-color: var(--danger);
}
@keyframes shake {
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-3px); }
}
</style>
