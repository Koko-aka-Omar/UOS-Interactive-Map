# Codex repository guide

The live GitHub Pages app is in `M7A_GitHub_Website_Full_Resolution/m7a-building/`.

Keep context small: inspect only files relevant to the requested change. Do not scan `assets/`, `assets-mobile/`, or `panoramas-mobile/` unless the task explicitly involves panorama files.

Task routing:
- Routes, checkpoint names, arrow bearings, scene links: `routes/m7a.js`, `routes/theater.js`, `routes/library.js`, or `routes/mens-hall.js`.
- Rendering, transitions, loading, camera behavior: `tour.js`.
- UI styling: `styles.css` and `ui-polish.css`.
- Campus directory/search: `halls.js`, `campus-directory.js`, `campus-map-labels.js`, `directions.js`.
- Translation copy: `tour-i18n.js`.
- Deployment: `.github/workflows/pages.yml`.

Read `NAVIGATION.md` only for navigation calibration work, and `ADDING-HALLS.md` only when adding halls.

Do not move the app root, rename panorama assets, delete `.nojekyll`, or manually rewrite generated mobile assets unless the task requires it. Preserve scene IDs and route connectivity.

For structural/navigation changes, run `node tests/validate-tour.cjs`. Use the narrower tests only when relevant.
