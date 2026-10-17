<script setup>
import { onMounted } from 'vue'
import KeyGate from '@/components/KeyGate.vue'
import { unlocked, lock } from '@/store/gate'
import { loaded, loadPeople } from '@/store/people'

onMounted(loadPeople)
</script>

<template>
  <KeyGate v-if="!unlocked" />
  <template v-else>
    <header class="topbar">
      <RouterLink to="/" class="brand">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2a5 5 0 0 0-4.9 4A4.5 4.5 0 0 0 4 14.5 4.5 4.5 0 0 0 8.5 19H11v3h2v-3h2.5A4.5 4.5 0 0 0 20 14.5 4.5 4.5 0 0 0 16.9 6 5 5 0 0 0 12 2z"
          />
        </svg>
        Our Family Tree
      </RouterLink>
      <nav>
        <RouterLink to="/" class="navlink">Tree</RouterLink>
        <RouterLink to="/admin" class="navlink">Admin</RouterLink>
        <button class="btn small" @click="lock">Lock</button>
      </nav>
    </header>
    <main>
      <RouterView v-if="loaded" />
      <p v-else class="container muted">Loading family…</p>
    </main>
  </template>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--serif);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
  white-space: nowrap;
}
.brand svg {
  color: var(--accent);
}
nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.navlink {
  padding: 6px 12px;
  border-radius: 8px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
}
.navlink:hover {
  color: var(--text);
}
.navlink.router-link-exact-active,
.navlink[href^='#/admin'].router-link-active {
  color: var(--accent);
  background: var(--accent-soft);
}
@media (max-width: 480px) {
  .brand {
    font-size: 1rem;
  }
}
</style>
