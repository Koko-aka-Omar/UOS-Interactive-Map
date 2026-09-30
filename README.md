# UOS Interactive Map

An interactive campus map and **360° virtual tour experience for the University of Sharjah**. Explore campus buildings, find destinations, and move through photographed spaces using connected floor-arrow navigation.

**[Open the interactive map](https://koko-aka-omar.github.io/UOS-Interactive-Map/)** · **[Repository](https://github.com/Koko-aka-Omar/UOS-Interactive-Map)**

## Tour areas

The current asset manifest includes **88 panorama checkpoints across seven tour areas**:

| Area | Checkpoints | Route module |
| --- | ---: | --- |
| M7A / College of Science | 10 | `routes/m7a.js` |
| Al Razi Auditorium | 13 | `routes/theater.js` |
| Library | 24 | `routes/library.js` |
| Men's Hall | 11 | `routes/mens-hall.js` |
| C4 Dining Hall | 15 | `routes/c4.js` |
| Al Zahra Hall | 8 | `routes/al-zahra.js` |
| Student Forums | 7 | `routes/student-forums.js` |
| **Total** | **88** | |

Routes follow explicitly configured physical connections. Listing areas together does not imply that every area is directly connected to every other area. M7A includes study-room destinations; the Library includes searchable Study Areas 1–10.

## Features

- Interactive campus map, building directory, search, and category filters.
- Connected 360° viewpoints with floor arrows and destination-aware loading.
- Shareable scene links and browser Back/Forward navigation between viewpoints.
- English and Arabic interface, light/dark controls, and responsive mobile layouts.
- Expandable campus-directory sheet, fullscreen viewing, reset controls, and motion viewing on supported phones.
- Dedicated mobile panorama assets, likely-destination preloading, and limited decoded-scene caching.
- A web app manifest and service worker that cache the application shell and previously viewed panoramas. Offline availability depends on resources already being cached.

The viewer uses HTML, CSS, JavaScript ES modules, Three.js **0.180.0**, WebGL, and GLB panoramas. The campus map uses MapLibre GL. GitHub Actions publishes the static application through GitHub Pages; no frontend framework or package installation is required to serve it locally.

## Project structure

The application remains in `M7A_GitHub_Website_Full_Resolution/m7a-building/`. The repository rename does **not** change that directory or any panorama filenames.

```text
UOS-Interactive-Map/
├── .github/workflows/pages.yml
├── M7A_GitHub_Website_Full_Resolution/
│   └── m7a-building/
│       ├── index.html
│       ├── tour.js
│       ├── tour-renderer.js
│       ├── tour-routes.js
│       ├── tour-assets.generated.js
│       ├── tour-boot.js
│       ├── tour-i18n.js
│       ├── campus-directory.js
│       ├── campus-inventory.js
│       ├── campus-sheet.js
│       ├── campus-state.js
│       ├── halls.js
│       ├── directions.js
│       ├── styles.css
│       ├── ui-polish.css
│       ├── ui-theme.js
│       ├── service-worker.js
│       ├── manifest.webmanifest
│       ├── routes/
│       │   ├── m7a.js
│       │   ├── theater.js
│       │   ├── library.js
│       │   ├── mens-hall.js
│       │   ├── c4.js
│       │   ├── al-zahra.js
│       │   └── student-forums.js
│       ├── covers/
│       ├── assets/
│       ├── assets-mobile/
│       └── panoramas-mobile/
├── scripts/build-tour-manifest.cjs
├── tests/
├── AGENTS.md
├── NAVIGATION.md
├── ADDING-HALLS.md
├── STUDENT-FORUMS.md
└── README.md
```

| Files | Responsibility |
| --- | --- |
| `routes/*.js` | Scene names, connections, arrow bearings, and camera calibration |
| `tour.js` | Viewer orchestration, transitions, loading, recovery, and search integration |
| `tour-renderer.js` | Renderer configuration |
| `campus-*.js`, `halls.js`, `directions.js` | Campus directory, map data, sheet behavior, and destinations |
| `tour-i18n.js` | English and Arabic interface copy |
| `styles.css`, `ui-polish.css`, `ui-theme.js` | Layout, branding, responsive presentation, and theme controls |
| `service-worker.js` | Application-shell and panorama caching |
| `tour-assets.generated.js` | Generated core asset list, route list, panorama revisions, and shell build identifier |

## Run locally

Use a local HTTP server rather than opening `index.html` directly.

```bash
git clone https://github.com/Koko-aka-Omar/UOS-Interactive-Map.git
cd UOS-Interactive-Map/M7A_GitHub_Website_Full_Resolution/m7a-building
python -m http.server 8000
```

Open **http://localhost:8000/** in a browser.

For an existing local clone, run this from its repository directory to update the remote after the rename:

```bash
git remote set-url origin https://github.com/Koko-aka-Omar/UOS-Interactive-Map.git
git remote -v
```

Renaming the local folder is optional. The application subdirectory remains unchanged.

## Deployment and links

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes the application directory to GitHub Pages on pushes to `main`, or when manually dispatched.

**Site address:** https://koko-aka-omar.github.io/UOS-Interactive-Map/

The workflow checks the generated asset manifest and selected browser-module syntax before deploying. Its upload path is the application subdirectory, not the repository name.

Local application resources and the PWA's start URL and scope use relative paths. The absolute social-preview URLs in `index.html` must match the published site address.

Update old bookmarks, QR-code destinations, and previously shared Pages links to the new address. GitHub redirects renamed repository URLs, but **does not automatically redirect project-site URLs**; see [GitHub's repository-renaming guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository). Existing scene query parameters can be retained when updating a site link.

## Maintenance and validation

Read [AGENTS.md](AGENTS.md) before making changes. Keep edits focused, preserve scene IDs and route connectivity, and do not rename panorama assets or move the app root.

After runtime, route, or panorama changes, run these commands from the repository root:

```bash
node scripts/build-tour-manifest.cjs
node tests/validate-tour.cjs
```

Check that the generated manifest is current with:

```bash
node scripts/build-tour-manifest.cjs --check
```

The manifest is generated; do not hand-edit it. Its shell build identifier changes with core-file content, while panorama revisions track panorama content separately.

For navigation work, also run:

```bash
node tests/build-navigation-qa.cjs
```

Use [NAVIGATION.md](NAVIGATION.md) for calibration and [ADDING-HALLS.md](ADDING-HALLS.md) when adding a hall. [STUDENT-FORUMS.md](STUDENT-FORUMS.md) documents the Student Forums addition. Arrow bearings and arrival directions depend on each panorama's actual orientation; avoid automatic reverse-angle assumptions or unrelated navigation changes.

## Credits

Developed by **part-time students for the University of Sharjah**, under the guidance of **Dr. Afra Saif Altunaiji**.

The University of Sharjah logo and campus map are the property of the University of Sharjah. All rights reserved.
