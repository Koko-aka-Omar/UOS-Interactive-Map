# UOS Virtual Tour — File Guide

Use this only when the task needs a repo map. Do not read every file for routine edits.

| Task | Primary file |
| --- | --- |
| M7A routes/arrows/names | `routes/m7a.js` |
| Auditorium routes/arrows/names | `routes/theater.js` |
| Library routes/arrows/names | `routes/library.js` |
| Men's Hall routes/arrows/names | `routes/mens-hall.js` |
| Shared route exports | `tour-routes.js` |
| Rendering, transitions, loading, controls | `tour.js` |
| English/Arabic UI copy | `tour-i18n.js` |
| Campus directory/search data | `halls.js` |
| Campus directory/search UI | `campus-directory.js` |
| Pathfinding | `directions.js` |
| Core layout/style | `styles.css` |
| Responsive/UOS visual polish | `ui-polish.css` |
| Page markup | `index.html` |
| Offline/PWA caching | `service-worker.js` |

## Route ranges

- M7A: scenes 0–9
- Auditorium: scenes 10–22
- Library: scenes 23–46
- Men's Hall: scenes 47–57

The validator currently expects 58 checkpoints. Keep route-specific calibration in the relevant `routes/*.js` file instead of adding one-off positioning logic to `tour.js`.

## Large generated assets

- `assets/`: full-resolution GLB panoramas
- `assets-mobile/`: generated phone GLBs
- `panoramas-mobile/`: generated standalone phone JPEGs

Avoid opening or rewriting binary panorama files unless the task explicitly concerns those assets.
