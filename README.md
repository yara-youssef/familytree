# Our Family Tree

A private family tree app built with Vue 3 + Vite.

## Features

- **Family key gate** – enter the family key (`1717`) to get in. The app stays unlocked for the
  browser session; use **Lock** in the header to lock it again.
- **Family tree** – everyone is drawn with their picture, name and date of birth, connected by
  parent/child and spouse lines. People who aren't connected to each other appear as separate trees.
- **Profiles** – click a picture to open someone's profile: picture, birthday, short bio, photo
  album (with a full-screen viewer), their relatives, and their own tree with them in the centre.
- **Admin dashboard** (`Admin` in the header) – add, edit and delete people: picture, name,
  birthday, short summary, album pictures, and their parents, spouse(s) and children.
- **Backup** – download everything as a JSON file and import it again (e.g. on another device).
- **Sample data** – a placeholder family is loaded on first run; "Reset to sample family" in the
  admin dashboard brings it back.

## Where data is stored

There is no server yet: all data (including pictures, which are resized on upload) is saved in
the browser's IndexedDB. Each browser/device has its own copy, so use the backup download/import
to move data around.

The family key is checked in the browser, so it keeps out casual visitors but is not real
security — anyone who reads the page source can find it. Real access control needs a backend.

## Project setup

```sh
npm install
npm run dev      # development server with hot reload
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Code map

- `src/store/gate.js` – family key check
- `src/store/people.js` – people data, relationships, persistence
- `src/lib/layout.js` – tree layout algorithm (generations, couples, line routing)
- `src/components/FamilyTree.vue` – pan/zoom tree renderer
- `src/views/` – tree page, profile page, admin dashboard, person editor
- `src/data/samples.js` – placeholder profiles
