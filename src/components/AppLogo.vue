<script setup>
// The site logo: a tree whose branches end in people.
defineProps({ size: { type: Number, default: 24 } })
</script>

<template>
  <svg viewBox="0 0 32 32" :width="size" :height="size" aria-hidden="true" class="logo">
    <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 29V12M16 18.5 9 12.5M16 18.5l7-6M16 23.5l-8.5-3.5M16 23.5l8.5-3.5M11 29h10" />
    </g>
    <g fill="currentColor">
      <circle cx="16" cy="7" r="4" />
      <circle cx="7.5" cy="10.5" r="3.4" />
      <circle cx="24.5" cy="10.5" r="3.4" />
      <circle cx="5.5" cy="19.5" r="2.6" />
      <circle cx="26.5" cy="19.5" r="2.6" />
    </g>
  </svg>
</template>
