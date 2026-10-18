# Our Family Tree

A private family tree app built with Vue 3 + Vite.

## Features

- **Family key gate** – enter the family key (`1717`) to get in. The app stays unlocked for the
  browser session; use **Lock** in the header to lock it again.
- **Family tree** – everyone is drawn with their picture, name and date of birth, connected by
  parent/child and spouse lines. People who aren't connected to each other appear as separate trees.
- **Profiles** – click a picture to open someone's profile: picture, birthday, short bio, photo
  album (with a full-screen viewer showing who else is in each photo), their relatives, and their
  own tree with them in the centre.
- **Admin dashboard** (`Admin` in the header) – add, edit and delete people: picture, name,
  birthday, short summary, album pictures, and their parents, spouse(s) and children.
- **Shared photos** – album photos live in one photo library (`Admin → Photos`). Upload a photo
  once and tag everyone in it; it appears in each tagged person's album.
- **Photos by link** – instead of uploading, paste the link of a picture that's already online
  (for profile pictures, album photos and the photo library). Nothing is copied; the photo is
  shown from where it lives. Google Drive and Dropbox share links are converted to direct image
  links automatically. If a link stops working, the picture is hidden (profile pictures fall back
  to initials).
- **Flexible birthdays** – the birthday is free text, so incomplete dates like `1940`,
  `March 1952` or `about 1930` are fine. Full dates written as `YYYY-MM-DD` are shown nicely and
  also show the person's age.
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

## Deployment

The site is deployed to GitHub Pages at https://yara-youssef.github.io/familytree/ by
`.github/workflows/deploy.yml` on every push to `main` (it can also be run by hand from the
Actions tab). In the repository settings, **Pages → Build and deployment → Source** must be set
to **GitHub Actions**.

## Code map

- `src/store/gate.js` – family key check
- `src/store/people.js` – people data, relationships, persistence
- `src/lib/layout.js` – tree layout algorithm (generations, couples, line routing)
- `src/components/FamilyTree.vue` – pan/zoom tree renderer
- `src/views/` – tree page, profile page, admin dashboard, person editor, photo library
- `src/data/samples.js` – placeholder profiles
