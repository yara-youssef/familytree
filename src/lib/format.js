// Birthdates are free text because many are incomplete ("1952", "March 1930",
// "about 1900"). Full ISO dates (YYYY-MM-DD) are still formatted nicely.
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatDate(text) {
  if (!text) return ''
  const m = text.trim().match(ISO_DATE)
  if (!m) return text.trim()
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Age in years, only when the birthdate is a complete date. */
export function age(text) {
  const m = text?.trim().match(ISO_DATE)
  if (!m) return null
  const [y, mo, d] = [+m[1], +m[2], +m[3]]
  const now = new Date()
  let a = now.getFullYear() - y
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) a--
  return a
}

/** A string that sorts people from oldest to youngest; unknown dates sort last. */
export function birthSortKey(text) {
  const t = text?.trim() || ''
  if (ISO_DATE.test(t)) return t
  const year = t.match(/\b(1\d{3}|2\d{3})\b/)
  return year ? year[1] : '9999'
}

export const byBirth = (a, b) => birthSortKey(a.birthDate).localeCompare(birthSortKey(b.birthDate))

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
