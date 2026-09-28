# M7A Virtual Tour — File Guide

The project is split so common edits can be made without opening the full viewer runtime.

| File | Change this when… |
| --- | --- |
| `tour-routes.js` | Thin compatibility layer that combines the three area route files; normally do not edit it directly |
| `routes/m7a.js` | M7A-only checkpoints, room links, arrow bearings, names, panorama order, and calibration |
| `routes/theater.js` | Theater/Auditorium-only routes, stair arrows, names, bearings, and Theater hotspot tuning |
| `routes/library.js` | Library-only checkpoints, links, names, bearings, and panorama order |
| `tour-i18n.js` | Changing English/Arabic interface text |
| `styles.css` | Changing layout, colors, controls, panels, responsive behavior, or visual polish |
| `tour.js` | Changing Three.js rendering, transitions, loading, interaction, preloading, motion controls, search behavior, or viewer logic |
| `index.html` | Changing page markup/structure only |
| `tour-boot.js` | Loading-screen fallback only |
| `halls.js` | Campus hall/room directory data |
| `campus-directory.js` | Campus directory/search UI logic |
| `directions.js` | Pathfinding logic |
| `assets/` | Full-resolution panorama GLBs |
| `assets-mobile/` | Mobile panorama GLBs |

## Navigation editing

Navigation is split by physical area:

- `routes/m7a.js` = scenes 0–9.
- `routes/theater.js` = scenes 10–22.
- `routes/library.js` = scenes 23–34.
- `tour-routes.js` only combines those files for the viewer.

Each area file owns its checkpoint names, route graph, bearings, panorama filenames, and Arabic location labels. Theater-specific hotspot distance/scale overrides also live in `routes/theater.js`.

Do not add one-off hotspot positioning logic to `tour.js`; keep route-specific calibration in the relevant area route file.
