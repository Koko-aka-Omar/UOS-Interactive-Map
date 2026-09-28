# Codex repository guide

The live GitHub Pages app is in `M7A_GitHub_Website_Full_Resolution/m7a-building/`.

Keep context small: inspect only files relevant to the requested change. Do not scan `assets/`, `assets-mobile/`, or `panoramas-mobile/` unless the task explicitly involves panorama files.

Task routing:
- Routes, checkpoint names, arrow bearings, scene links: `routes/m7a.js`, `routes/theater.js`, `routes/library.js`, or `routes/mens-hall.js`.
- Rendering pipeline/post-processing setup: `tour-renderer.js`.
- Transitions, loading, camera behavior and viewer orchestration: `tour.js`.
- UI styling: `styles.css` and `ui-polish.css`.
- Campus directory/search: `halls.js`, `campus-directory.js`, `campus-map-labels.js`, `directions.js`.
- Translation copy: `tour-i18n.js`.
- Generated cache/asset manifest: `tour-assets.generated.js` (never hand-edit); generator: `scripts/build-tour-manifest.cjs`.
- Deployment: `.github/workflows/pages.yml`.

Read `NAVIGATION.md` only for navigation calibration work, and `ADDING-HALLS.md` only when adding halls.

Do not move the app root, rename panorama assets, delete `.nojekyll`, or manually rewrite generated mobile assets unless the task requires it. Preserve scene IDs and route connectivity.

After runtime, route, or panorama changes, run `node scripts/build-tour-manifest.cjs`, then `node tests/validate-tour.cjs`. Use the narrower tests when relevant.
