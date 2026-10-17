<template>
  <nav class="tabs" aria-label="Admin sections">
    <RouterLink to="/admin" class="tab" exact-active-class="active">People</RouterLink>
    <RouterLink to="/admin/photos" class="tab" active-class="active">Photos</RouterLink>
  </nav>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.tab {
  padding: 8px 14px;
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
}
.tab:hover {
  color: var(--text);
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
</style>
