import { byBirth } from './format.js'

// Family tree layout.
//
// 1. Every person gets a generation (row): parents one row above their
//    children, spouses on the same row.
// 2. Spouses on the same row are grouped into "units" that are drawn side by side.
// 3. Units in each row are ordered by the positions of their parents/children
//    (barycenter sweeps) to reduce crossing lines.
// 4. X positions are relaxed so children sit under their parents and parents
//    are centred over their children, without units overlapping.

export const NODE_W = 140
export const NODE_H = 172
export const PHOTO_CY = 54 // vertical centre of the photo inside a node
const SPOUSE_GAP = 34
const H_GAP = 46
const V_GAP = 92
const PAD = 30

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Split people into groups that are connected through parent or spouse links. */
export function findComponents(people) {
  const ids = new Set(people.map((p) => p.id))
  const parent = new Map(people.map((p) => [p.id, p.id]))
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)))
      x = parent.get(x)
    }
    return x
  }
  const union = (a, b) => parent.set(find(a), find(b))
  for (const p of people) {
    for (const o of [...p.parentIds, ...p.spouseIds]) if (ids.has(o)) union(p.id, o)
  }
  const groups = new Map()
  for (const p of people) {
    const root = find(p.id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(p)
  }
  return [...groups.values()].sort((a, b) => b.length - a.length)
}

/** The people shown in someone's personal tree. */
export function familyAround(people, centerId) {
  const map = new Map(people.map((p) => [p.id, p]))
  const children = new Map()
  for (const p of people) {
    for (const pid of p.parentIds) {
      if (!children.has(pid)) children.set(pid, [])
      children.get(pid).push(p.id)
    }
  }
  const keep = new Set([centerId])
  const parentsOf = (id) => map.get(id)?.parentIds ?? []
  const childrenOf = (id) => children.get(id) ?? []
  const spousesOf = (id) => map.get(id)?.spouseIds ?? []

  // Ancestors: parents and grandparents
  for (const p of parentsOf(centerId)) {
    keep.add(p)
    parentsOf(p).forEach((g) => keep.add(g))
    // Siblings (children of the parents)
    childrenOf(p).forEach((s) => keep.add(s))
  }
  // Spouses
  spousesOf(centerId).forEach((s) => keep.add(s))
  // Descendants: children and grandchildren, with their partners and co-parents
  for (const c of childrenOf(centerId)) {
    keep.add(c)
    parentsOf(c).forEach((p) => keep.add(p))
    spousesOf(c).forEach((s) => keep.add(s))
    for (const g of childrenOf(c)) {
      keep.add(g)
      parentsOf(g).forEach((p) => keep.add(p))
    }
  }
  return people.filter((p) => keep.has(p.id))
}

export function layoutTree(input) {
  if (input.length === 0) return { nodes: [], paths: [], width: 0, height: 0 }

  const ids = new Set(input.map((p) => p.id))
  const people = input.map((p) => ({
    ...p,
    parentIds: p.parentIds.filter((x) => ids.has(x)),
    spouseIds: p.spouseIds.filter((x) => ids.has(x)),
  }))
  const map = new Map(people.map((p) => [p.id, p]))
  const kids = new Map(people.map((p) => [p.id, []]))
  for (const p of people) p.parentIds.forEach((pid) => kids.get(pid).push(p.id))

  // --- 1. Generations -----------------------------------------------------
  const gen = new Map()
  for (const start of [...people].sort(byBirth)) {
    if (gen.has(start.id)) continue
    gen.set(start.id, 0)
    const queue = [start.id]
    while (queue.length) {
      const id = queue.shift()
      const g = gen.get(id)
      const p = map.get(id)
      const visit = (other, og) => {
        if (!gen.has(other)) {
          gen.set(other, og)
          queue.push(other)
        }
      }
      p.parentIds.forEach((o) => visit(o, g - 1))
      kids.get(id).forEach((o) => visit(o, g + 1))
      p.spouseIds.forEach((o) => visit(o, g))
    }
  }
  // Push children below all of their parents and keep spouses level.
  for (let iter = 0, changed = true; changed && iter < people.length * 2; iter++) {
    changed = false
    for (const p of people) {
      for (const q of p.parentIds) {
        if (gen.get(p.id) < gen.get(q) + 1) {
          gen.set(p.id, gen.get(q) + 1)
          changed = true
        }
      }
      for (const s of p.spouseIds) {
        if (gen.get(s) < gen.get(p.id)) {
          gen.set(s, gen.get(p.id))
          changed = true
        }
      }
    }
  }
  const minGen = Math.min(...gen.values())
  for (const [k, v] of gen) gen.set(k, v - minGen)
  const genCount = Math.max(...gen.values()) + 1

  // --- 2. Units (spouses on the same row) -----------------------------------
  const unitOf = new Map()
  const rows = Array.from({ length: genCount }, () => [])
  for (const p of [...people].sort(byBirth)) {
    if (unitOf.has(p.id)) continue
    const g = gen.get(p.id)
    // Collect everyone reachable through same-row spouse links
    const group = new Set([p.id])
    const stack = [p.id]
    while (stack.length) {
      for (const s of map.get(stack.pop()).spouseIds) {
        if (!group.has(s) && gen.get(s) === g) {
          group.add(s)
          stack.push(s)
        }
      }
    }
    const members = orderChain([...group], map, g, gen)
    const unit = {
      members,
      gen: g,
      w: members.length * NODE_W + (members.length - 1) * SPOUSE_GAP,
      cx: 0,
    }
    members.forEach((m) => unitOf.set(m, unit))
    rows[g].push(unit)
  }

  const memberOffset = (unit, id) =>
    -unit.w / 2 + NODE_W / 2 + unit.members.indexOf(id) * (NODE_W + SPOUSE_GAP)
  const xOf = (id) => {
    const u = unitOf.get(id)
    return u.cx + memberOffset(u, id)
  }

  // --- 3. Ordering ----------------------------------------------------------
  const setSequential = (row) => {
    let x = 0
    row.forEach((u) => {
      u.cx = x + u.w / 2
      x += u.w + H_GAP
    })
  }
  rows.forEach(setSequential)

  const sortRow = (row, keyFn) => {
    const keyed = row.map((u, i) => ({ u, k: keyFn(u) ?? u.cx, i }))
    keyed.sort((a, b) => a.k - b.k || a.i - b.i)
    row.splice(0, row.length, ...keyed.map((e) => e.u))
    setSequential(row)
  }
  const parentKey = (u) => {
    const xs = u.members.flatMap((m) => map.get(m).parentIds.map(xOf))
    return xs.length ? avg(xs) : null
  }
  const childKey = (u) => {
    const xs = u.members.flatMap((m) => kids.get(m).map(xOf))
    return xs.length ? avg(xs) : null
  }
  // Flip couples so the partner whose parents are shown sits nearer to them.
  const orient = (row) => {
    for (const u of row) {
      if (u.members.length !== 2) continue
      const cost = () =>
        u.members.reduce((sum, m) => {
          const ps = map.get(m).parentIds
          return ps.length ? sum + Math.abs(xOf(m) - avg(ps.map(xOf))) : sum
        }, 0)
      const before = cost()
      u.members.reverse()
      if (cost() >= before) u.members.reverse()
    }
  }
  for (let pass = 0; pass < 3; pass++) {
    for (let g = 1; g < genCount; g++) {
      sortRow(rows[g], parentKey)
      orient(rows[g])
    }
    for (let g = genCount - 2; g >= 0; g--) sortRow(rows[g], childKey)
  }
  for (let g = 1; g < genCount; g++) {
    sortRow(rows[g], parentKey)
    orient(rows[g])
  }

  // --- 4. X positions -------------------------------------------------------
  const place = (row, desired) => {
    const n = row.length
    const dist = (i) => (row[i - 1].w + row[i].w) / 2 + H_GAP
    const L = desired.slice()
    for (let i = 1; i < n; i++) L[i] = Math.max(L[i], L[i - 1] + dist(i))
    const R = desired.slice()
    for (let i = n - 2; i >= 0; i--) R[i] = Math.min(R[i], R[i + 1] - dist(i + 1))
    row.forEach((u, i) => (u.cx = (L[i] + R[i]) / 2))
  }
  const desiredFromParents = (u) => {
    const ds = []
    for (const m of u.members) {
      const ps = map.get(m).parentIds
      if (ps.length) ds.push(avg(ps.map(xOf)) - memberOffset(u, m))
    }
    return ds.length ? avg(ds) : u.cx
  }
  const desiredFromChildren = (u) => {
    const xs = u.members.flatMap((m) => kids.get(m).map(xOf))
    return xs.length ? avg(xs) : u.cx
  }
  const placeFromParents = (row) => {
    place(row, row.map(desiredFromParents))
    orient(row)
  }
  for (let pass = 0; pass < 8; pass++) {
    for (let g = 1; g < genCount; g++) placeFromParents(rows[g])
    for (let g = genCount - 2; g >= 0; g--) place(rows[g], rows[g].map(desiredFromChildren))
  }
  for (let g = 1; g < genCount; g++) placeFromParents(rows[g])

  // --- Output ---------------------------------------------------------------
  const minX = Math.min(...rows.flat().map((u) => u.cx - u.w / 2))
  const maxX = Math.max(...rows.flat().map((u) => u.cx + u.w / 2))
  const left = (id) => xOf(id) - NODE_W / 2 - minX + PAD
  const top = (id) => PAD + gen.get(id) * (NODE_H + V_GAP)
  const cx = (id) => left(id) + NODE_W / 2

  const nodes = input.map((p) => ({ id: p.id, person: p, x: left(p.id), y: top(p.id) }))
  const paths = []

  // Spouse links
  const adjacentSpouses = (a, b) => {
    const u = unitOf.get(a)
    return u === unitOf.get(b) && Math.abs(u.members.indexOf(a) - u.members.indexOf(b)) === 1
  }
  for (const p of people) {
    for (const s of p.spouseIds) {
      if (p.id > s) continue
      const y1 = top(p.id) + PHOTO_CY
      const y2 = top(s) + PHOTO_CY
      if (adjacentSpouses(p.id, s)) {
        const [a, b] = cx(p.id) < cx(s) ? [p.id, s] : [s, p.id]
        paths.push({ type: 'spouse', d: `M${left(a) + NODE_W - 22},${y1} H${left(b) + 22}` })
      } else {
        paths.push({ type: 'spouse far', d: `M${cx(p.id)},${y1} L${cx(s)},${y2}` })
      }
    }
  }

  // Parent → children links, one bus per set of parents
  const groups = new Map()
  for (const p of people) {
    if (!p.parentIds.length) continue
    const key = [...p.parentIds].sort().join('|')
    if (!groups.has(key)) groups.set(key, { parents: [...p.parentIds].sort(), children: [] })
    groups.get(key).children.push(p.id)
  }
  const busesPerRow = new Map()
  for (const { parents, children } of groups.values()) {
    const parentBottom = Math.max(...parents.map((q) => top(q) + NODE_H))
    const row = Math.max(...parents.map((q) => gen.get(q)))
    const idx = busesPerRow.get(row) ?? 0
    busesPerRow.set(row, idx + 1)
    const busY = parentBottom + V_GAP / 2 + ((idx % 3) - 1) * 10

    let ax, startY
    if (parents.length === 2 && adjacentSpouses(parents[0], parents[1])) {
      ax = avg(parents.map(cx))
      startY = top(parents[0]) + PHOTO_CY
    } else {
      ax = avg(parents.map(cx))
      startY = parentBottom
      // Join separated parents to the drop point
      if (parents.length > 1) {
        parents.forEach((q) => {
          paths.push({ type: 'child', d: `M${cx(q)},${top(q) + NODE_H} V${parentBottom + 12} H${ax}` })
        })
        startY = parentBottom + 12
      }
    }
    // Snap drops that are nearly aligned with the parents so lines stay straight
    const dropX = (c) => (Math.abs(cx(c) - ax) < 10 ? ax : cx(c))
    const xs = [ax, ...children.map(dropX)]
    let d = `M${ax},${startY} V${busY}`
    if (Math.max(...xs) > Math.min(...xs)) d += ` M${Math.min(...xs)},${busY} H${Math.max(...xs)}`
    for (const c of children) d += ` M${dropX(c)},${busY} V${top(c)}`
    paths.push({ type: 'child', d })
  }

  return {
    nodes,
    paths,
    width: maxX - minX + PAD * 2,
    height: genCount * (NODE_H + V_GAP) - V_GAP + PAD * 2,
  }
}

// Order spouses in a unit so linked partners sit next to each other
// (e.g. someone with two partners is placed between them).
function orderChain(group, map, g, gen) {
  if (group.length <= 2) {
    return group.sort((a, b) => byBirth(map.get(a), map.get(b)))
  }
  const deg = (id) => map.get(id).spouseIds.filter((s) => group.includes(s) && gen.get(s) === g).length
  const start = [...group].sort((a, b) => deg(a) - deg(b))[0]
  const out = []
  const seen = new Set()
  const walk = (id) => {
    if (seen.has(id)) return
    seen.add(id)
    out.push(id)
    map.get(id).spouseIds.filter((s) => group.includes(s)).forEach(walk)
  }
  walk(start)
  group.forEach((id) => !seen.has(id) && out.push(id))
  return out
}
