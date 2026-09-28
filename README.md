# University of Sharjah Virtual Tour

An interactive **360° campus tour system for the University of Sharjah (UOS)**, built with Three.js and deployed through GitHub Pages.

The project currently connects four tour areas:

- **M7A / College of Science**
- **Al Razi Auditorium**
- **Library**
- **Men's Hall**

Live site: **https://koko-aka-omar.github.io/hallV3/**

---

## Overview

The project is designed as a lightweight indoor/campus experience inspired by Street View. Visitors can explore connected 360° checkpoints, follow floor arrows, search for destinations, return to the campus map, and open direct links to individual scenes.

The current tour contains **58 panorama checkpoints**:

| Area | Checkpoints |
| --- | ---: |
| M7A | 10 |
| Al Razi Auditorium | 13 |
| Library | 24 |
| Men's Hall | 11 |
| **Total** | **58** |

Navigation follows explicit physical routes rather than allowing arbitrary jumps between panorama images.

---

## Main Features

- Connected 360° panorama navigation
- Calibrated floor arrows
- University campus map and building directory
- Search across available buildings and rooms
- Searchable Library Study Areas 1–10
- Turn-by-turn route guidance to searchable rooms
- English and Arabic interface
- Direct links to individual scenes
- Scene URLs update as visitors move, with browser Back/Forward navigation between viewpoints
- Device-motion viewing on supported phones
- Fullscreen and reset controls
- Responsive phone and landscape layouts
- Dedicated lower-resolution mobile panorama assets
- Destination-aware loading states
- Subtle forward/back/stair-specific scene transitions
- Mild renderer grading to reduce exposure/color differences between tour areas
- Branded UOS campus home state before entering a tour
- Retry/back recovery when a scene fails to load
- Scene preloading and decoded-scene memory limits
- Progressive Web App manifest and service worker
- Offline caching for the application shell, UI modules, map/Three.js runtime, static assets, and previously viewed panoramas

---

## Interface

The interface uses University of Sharjah teal as an accent while retaining darker translucent controls over the 360° imagery.

The main toolbar is intentionally compact:

**Campus Map · Search · More**

The **More** menu contains secondary viewing controls such as:

- Phone motion
- Reset view
- Full screen
- Tour information

On phones, the campus directory uses an expandable bottom sheet. It can be expanded or reduced using the sheet handle.

The active tour area is shown separately from the exact checkpoint so visitors can distinguish between the building/area and their current position.

---

## Tour Areas

### M7A

Includes the main hall, study-room corridor, upper floor, and rooms:

- M7A-001
- M7A-002
- M7A-003
- M7A-004

### Al Razi Auditorium

Includes the exterior approaches, covered entrance, main hall, foyer, auditorium seating/stair viewpoints, stage-side viewpoints, and Library-side connection.

### Library

Includes:

- Entrance
- Lobby
- Study Area 1
- Study Area 2
- Study Area 3
- Study Area 4
- Study Area 5
- Study Area 6
- Study Area 7
- Study Area 8
- Study Area 9
- Study Area 10
- Corridor checkpoints 030–041

### Men's Hall

Includes checkpoints 078–088 as a standalone sequential route.

---

## Technology

The project intentionally avoids a heavy frontend framework.

Main technologies:

- HTML5
- CSS
- JavaScript ES Modules
- Three.js
- WebGL
- GLTF / GLB
- MapLibre GL
- Service Workers
- Web App Manifest
- GitHub Actions
- GitHub Pages

Three.js currently uses version **0.180.0**.

---

## Project Structure

```text
hallV3/
├── .github/
│   └── workflows/
│       └── pages.yml
├── M7A_GitHub_Website_Full_Resolution/
│   └── m7a-building/
│       ├── index.html
│       ├── styles.css
│       ├── ui-polish.css
│       ├── tour.js
│       ├── tour-renderer.js
│       ├── tour-assets.generated.js
│       ├── tour-boot.js
│       ├── tour-i18n.js
│       ├── tour-routes.js
│       ├── campus-directory.js
│       ├── campus-map-labels.js
│       ├── directions.js
│       ├── halls.js
│       ├── service-worker.js
│       ├── manifest.webmanifest
│       ├── routes/
│       │   ├── m7a.js
│       │   ├── theater.js
│       │   ├── library.js
│       │   └── mens-hall.js
│       ├── assets/
│       ├── assets-mobile/
│       └── panoramas-mobile/
├── scripts/
│   └── build-tour-manifest.cjs
├── tests/
├── NAVIGATION.md
└── README.md
```

### Responsibilities

- **`routes/*.js`** — scene names, connections, arrow bearings, camera/navigation calibration
- **`tour.js`** — viewer orchestration, transitions, search integration, motion controls, loading and recovery
- **`tour-renderer.js`** — Three.js renderer and panorama post-processing pipeline
- **`tour-assets.generated.js`** — generated cache manifest and content revisions
- **`campus-directory.js`** — campus directory, building/room search, map markers, mobile map sheet
- **`tour-i18n.js`** — English/Arabic interface copy
- **`styles.css`** — core viewer styling
- **`ui-polish.css`** — UOS branding and responsive presentation layer
- **`service-worker.js`** — offline shell and panorama caching

Keeping route calibration separate from presentation code reduces the risk of visual UI work changing navigation.

---

## Navigation System

Each panorama is a node in a route graph. A route can define values such as:

```js
{
  to: 1,
  angle: 2.1,
  label: 'Main Hall · Study Rooms'
}
```

Depending on the scene, routes may also include:

- arrival angle
- departure angle
- hotspot angle
- arrow angle
- hotspot distance
- stair direction
- back-navigation state

Panorama bearings are calibrated independently because each 360° photograph can have a different stitched orientation.

See **`NAVIGATION.md`** for calibration details.

---

## Performance

The viewer uses several optimizations for large panorama files:

- Full-resolution desktop assets
- Dedicated mobile assets
- Dynamic renderer pixel-ratio limits
- Network prefetching
- Likely-destination preloading
- Limited decoded-scene caching
- GPU-conscious mobile transitions
- Static shell caching
- Reuse of previously downloaded panorama files
- Reduced effects on coarse-pointer devices

Mobile devices currently use dedicated **3072 × 1536** panorama resources where available.

---

## Offline / PWA

The service worker caches the main application shell and runtime resources, including:

- HTML
- Core and responsive CSS
- Viewer modules
- Route modules
- Map assets
- MapLibre resources
- Three.js runtime resources
- Icons and manifest
- Static thumbnails encountered while browsing
- Previously viewed panorama files

Large panorama downloads remain separately cached so UI releases do not unnecessarily invalidate them.

---

## Running Locally

Because the project uses JavaScript modules, GLB assets, and a service worker, serve it through HTTP rather than opening the HTML file directly.

```bash
git clone https://github.com/Koko-aka-Omar/hallV3.git
cd hallV3/M7A_GitHub_Website_Full_Resolution/m7a-building
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

## Deployment

Every push to `main` triggers the GitHub Pages workflow:

```text
.github/workflows/pages.yml
```

Published site:

**https://koko-aka-omar.github.io/hallV3/**

---

## Navigation QA

The repository contains navigation checks under `tests/`.

From the repository root:

```bash
node tests/build-navigation-qa.cjs
```

The navigation data should be tested whenever route connections, arrow bearings, arrival directions, or panorama files are changed.

UI-only changes should avoid editing route calibration unless there is a specific navigation issue.

### Automated integrity gate

Every GitHub Pages deployment runs:

```bash
node tests/validate-tour.cjs
node tests/build-navigation-qa.cjs
```

The validator checks scene IDs, route targets and reverse links, panorama assets, mobile assets, search destinations, thumbnails, translation key parity, and required UI files. A failed validation blocks the Pages deployment. Pull requests also have a dedicated **UOS Tour QA** workflow.

---

## Credits

Developed by **part-time students for the University of Sharjah**, under **Doctor Afra Alteniji’s instructions**.

Repository:

**https://github.com/Koko-aka-Omar/hallV3**
