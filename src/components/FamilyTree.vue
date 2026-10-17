<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { layoutTree, NODE_W, NODE_H } from '@/lib/layout'
import { formatDate } from '@/lib/format'
import PersonPhoto from '@/components/PersonPhoto.vue'

const props = defineProps({
  people: { type: Array, required: true },
  highlightId: { type: String, default: null },
})

const layout = computed(() => layoutTree(props.people))

const viewport = ref(null)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

const heightFor = (s) =>
  Math.max(280, Math.min(layout.value.height * Math.min(1, s) + 8, window.innerHeight * 0.72))
const viewportHeight = computed(() => heightFor(scale.value))

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function fit(centerId = props.highlightId) {
  const el = viewport.value
  if (!el) return
  const { width, height, nodes } = layout.value
  const vw = el.clientWidth
  const fitScale = Math.min(vw / width, heightFor(1) / height)
  scale.value = clamp(fitScale, centerId ? 0.6 : 0.4, 1)
  const vh = heightFor(scale.value)
  const node = centerId && nodes.find((n) => n.id === centerId)
  if (node && width * scale.value > vw) {
    tx.value = vw / 2 - (node.x + NODE_W / 2) * scale.value
  } else {
    tx.value = (vw - width * scale.value) / 2
  }
  ty.value = height * scale.value < vh ? (vh - height * scale.value) / 2 : 0
}

function zoom(factor, cx, cy) {
  const el = viewport.value
  if (cx === undefined) {
    cx = el.clientWidth / 2
    cy = el.clientHeight / 2
  }
  const next = clamp(scale.value * factor, 0.25, 2)
  tx.value = cx - ((cx - tx.value) * next) / scale.value
  ty.value = cy - ((cy - ty.value) * next) / scale.value
  scale.value = next
}

function onWheel(e) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const rect = viewport.value.getBoundingClientRect()
  zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - rect.left, e.clientY - rect.top)
}

// Drag to pan. A drag must not count as a click on a person.
let drag = null
let dragged = false
function onPointerDown(e) {
  if (e.button !== 0) return
  drag = { x: e.clientX, y: e.clientY, tx: tx.value, ty: ty.value, id: e.pointerId }
  dragged = false
}
function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.id) return
  const dx = e.clientX - drag.x
  const dy = e.clientY - drag.y
  if (!dragged && Math.hypot(dx, dy) > 5) {
    dragged = true
    viewport.value.setPointerCapture(e.pointerId)
  }
  if (dragged) {
    tx.value = drag.tx + dx
    ty.value = drag.ty + dy
  }
}
function onPointerUp() {
  drag = null
}
function onClickCapture(e) {
  if (dragged) {
    e.preventDefault()
    e.stopPropagation()
    dragged = false
  }
}

onMounted(() => nextTick(() => fit()))
watch(
  () => [props.people, props.highlightId],
  () => nextTick(() => fit()),
)
</script>

<template>
  <div class="tree-wrap">
    <div
      ref="viewport"
      class="viewport"
      :style="{ height: viewportHeight + 'px' }"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onClickCapture"
    >
      <div
        class="canvas"
        :style="{
          width: layout.width + 'px',
          height: layout.height + 'px',
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        }"
      >
        <svg class="lines" :width="layout.width" :height="layout.height" aria-hidden="true">
          <path v-for="(p, i) in layout.paths" :key="i" :d="p.d" :class="p.type" />
        </svg>
        <RouterLink
          v-for="n in layout.nodes"
          :key="n.id"
          :to="{ name: 'person', params: { id: n.id } }"
          class="node"
          :class="{ highlight: n.id === highlightId }"
          :style="{ left: n.x + 'px', top: n.y + 'px', width: NODE_W + 'px', height: NODE_H + 'px' }"
          draggable="false"
        >
          <PersonPhoto :person="n.person" :size="88" />
          <span class="name">{{ n.person.name }}</span>
          <span class="dob">{{ formatDate(n.person.birthDate) }}</span>
        </RouterLink>
      </div>
    </div>
    <div class="controls">
      <button class="btn small" title="Zoom in" aria-label="Zoom in" @click="zoom(1.2)">＋</button>
      <button class="btn small" title="Zoom out" aria-label="Zoom out" @click="zoom(1 / 1.2)">−</button>
      <button class="btn small" title="Fit to view" @click="fit()">Fit</button>
    </div>
  </div>
</template>

<style scoped>
.tree-wrap {
  position: relative;
}
.viewport {
  position: relative;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 22px 22px;
  background-color: var(--bg);
  border-radius: var(--radius);
}
.viewport:active {
  cursor: grabbing;
}
.canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}
.lines {
  position: absolute;
  inset: 0;
  overflow: visible;
}
.lines path {
  fill: none;
  stroke: var(--line);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.lines path.spouse {
  stroke: var(--accent);
  stroke-width: 2.5;
}
.lines path.far {
  stroke-dasharray: 6 6;
}
.node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
  text-align: center;
  color: var(--text);
  text-decoration: none;
  border-radius: 14px;
  transition: background 0.15s;
  -webkit-user-drag: none;
}
.node :deep(.avatar),
.node :deep(.avatar-fallback) {
  border: 3px solid var(--surface);
  box-shadow: 0 0 0 2px var(--line), var(--shadow);
  transition: box-shadow 0.15s, transform 0.15s;
  pointer-events: none;
}
.node:hover :deep(.avatar),
.node:hover :deep(.avatar-fallback),
.node:focus-visible :deep(.avatar) {
  box-shadow: 0 0 0 3px var(--accent), var(--shadow);
  transform: scale(1.04);
}
.node.highlight :deep(.avatar),
.node.highlight :deep(.avatar-fallback) {
  box-shadow: 0 0 0 4px var(--accent), 0 0 0 10px var(--accent-soft), var(--shadow);
}
.name {
  margin-top: 10px;
  padding: 0 4px;
  font-family: var(--serif);
  font-weight: 600;
  font-size: 0.98rem;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  background: var(--bg);
  border-radius: 4px;
}
.dob {
  font-size: 0.8rem;
  color: var(--muted);
  background: var(--bg);
  padding: 0 4px;
  border-radius: 4px;
}
.controls {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 4px;
}
.controls .btn {
  min-width: 34px;
  box-shadow: var(--shadow);
}
</style>
