// Placeholder profiles for testing. Images are generated SVGs so nothing
// needs to be downloaded.

const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

function avatar(name, hue) {
  const letters = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue},55%,62%)"/>
    <stop offset="1" stop-color="hsl(${(hue + 40) % 360},50%,42%)"/>
  </linearGradient></defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <circle cx="100" cy="80" r="36" fill="rgba(255,255,255,.35)"/>
  <path d="M30 200c6-44 36-66 70-66s64 22 70 66z" fill="rgba(255,255,255,.35)"/>
  <text x="100" y="92" text-anchor="middle" font-family="Georgia,serif" font-size="34" fill="#fff">${letters}</text>
</svg>`)
}

function scene(caption, hue) {
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(${hue},70%,78%)"/>
    <stop offset="1" stop-color="hsl(${(hue + 30) % 360},60%,90%)"/>
  </linearGradient></defs>
  <rect width="400" height="300" fill="url(#s)"/>
  <circle cx="310" cy="80" r="34" fill="hsl(${(hue + 180) % 360},80%,85%)"/>
  <path d="M0 230 L90 140 L170 210 L250 120 L400 240 L400 300 L0 300z" fill="hsl(${hue},30%,45%)"/>
  <path d="M0 260 L120 200 L230 250 L330 210 L400 240 L400 300 L0 300z" fill="hsl(${hue},35%,32%)"/>
  <text x="20" y="40" font-family="Georgia,serif" font-size="22" fill="rgba(0,0,0,.55)">${caption}</text>
</svg>`)
}

export function samplePeople() {
  const p = (id, name, birthDate, hue, bio, opts = {}) => ({
    id,
    name,
    birthDate,
    bio,
    photo: avatar(name, hue),
    album: (opts.album || []).map((c, i) => scene(c, (hue + i * 50) % 360)),
    parentIds: opts.parents || [],
    spouseIds: opts.spouses || [],
  })

  return [
    // The Haddad family — three generations
    p('george', 'George Haddad', '1940-03-12', 20,
      'The family patriarch. A carpenter for forty years who still builds birdhouses for every grandchild.',
      { spouses: ['mary'], album: ['Wedding day, 1963', 'The old workshop', 'Summer in the village'] }),
    p('mary', 'Mary Haddad', '1943-07-25', 340,
      'Keeper of the family recipes and the loudest laugh at every gathering.',
      { spouses: ['george'], album: ['Sunday lunch', 'Garden roses'] }),
    p('elias', 'Elias Haddad', '1965-11-02', 200,
      'Eldest son, engineer, and the unofficial family photographer.',
      { parents: ['george', 'mary'], spouses: ['rania'], album: ['Graduation', 'Road trip 1990', 'First house'] }),
    p('rania', 'Rania Haddad', '1968-04-18', 280,
      'Teacher, gardener, and organizer of every family reunion.',
      { spouses: ['elias'], album: ['Classroom', 'Beach holiday'] }),
    p('nadia', 'Nadia Khoury', '1969-09-30', 120,
      'Nurse and storyteller; ask her about the time the roof blew off.',
      { parents: ['george', 'mary'], spouses: ['sami'], album: ['Hospital team', 'Hiking'] }),
    p('sami', 'Sami Khoury', '1966-01-14', 160,
      'Runs a small bakery downtown. Famous for his cardamom bread.',
      { spouses: ['nadia'], album: ['The bakery opening'] }),
    p('fadi', 'Fadi Haddad', '1972-06-05', 50,
      'Youngest of the siblings, musician, and world traveller.',
      { parents: ['george', 'mary'], album: ['On stage', 'Tokyo', 'Patagonia'] }),
    p('karim', 'Karim Haddad', '1995-02-21', 230,
      'Software developer who set up this family tree.',
      { parents: ['elias', 'rania'], album: ['Graduation 2017'] }),
    p('dana', 'Dana Haddad', '1998-08-09', 300,
      'Architecture student who sketches every building she visits.',
      { parents: ['elias', 'rania'], album: ['Sketchbook', 'Study trip'] }),
    p('lina', 'Lina Khoury', '2000-12-01', 100,
      'Marine biology student and a very competitive swimmer.',
      { parents: ['nadia', 'sami'], album: ['Swim meet', 'Reef dive'] }),

    // The Mansour family — not connected to the Haddads, so it forms its own tree
    p('antoine', 'Antoine Mansour', '1950-05-17', 30,
      'Retired sea captain with a story for every port.',
      { spouses: ['leila'], album: ['The ship', 'Harbour at dawn'] }),
    p('leila', 'Leila Mansour', '1952-10-03', 260,
      'Painter whose watercolours hang in every family home.',
      { spouses: ['antoine'], album: ['Studio', 'Exhibition'] }),
    p('maya', 'Maya Mansour', '1980-03-28', 180,
      'Doctor and marathon runner.',
      { parents: ['antoine', 'leila'], album: ['Finish line'] }),
  ]
}
