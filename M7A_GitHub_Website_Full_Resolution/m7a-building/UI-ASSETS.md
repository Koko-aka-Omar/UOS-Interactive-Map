# UI asset provenance

`uos-badge.png` is the unchanged `UOS_2.png` from the University of Sharjah's
[official logo download](https://www.sharjah.ac.ae/-/media/project/uos/sites/uos/media-hub/uos_logo.zip),
linked by its [Brand Guideline page](https://www.sharjah.ac.ae/Brand-Guideline).
The SVG viewport removes only unused outer canvas, retaining the complete
bilingual emblem, proportions and clear space. The original file is untouched.
Its inclusion does not assert endorsement or a new licence.

`covers/*.jpg` are separate 960×540 perspective captures of the existing rendered
tours, not edited panorama sources: Al Zahra Theater Entrance; C4 Café Corridor;
A4 Main Hall; E2 Auditorium Center; E4 Study Area 5; M7A Entrance. No fictitious
photography, panorama resizing or rendering/colour change was used.

## Checkpoint perspective stills

`scene-previews.generated.js` covers all 88 registered checkpoints: 82 new
960×540 rectilinear JPEGs in `previews/` and the six unchanged covers above.
Student Forums 072 is its building cover; 073/074 use the corrected media binding.
`scene-previews.js` is the shared scene/building selection for hover, card and
handoff. Metadata records source paths/Git revision, negative-bearing camera
yaw, positive-up pitch, vertical FOV, dimensions, byte weight and image revision.
Versioned URLs prevent an older visited still masking a changed capture.

Reproduce with `node scripts/build-scene-previews.cjs` (Python with Pillow/NumPy;
set `PYTHON` if needed). The helper reads only registry-referenced GLB textures,
one at a time, and never writes original panoramas. `--refresh-metadata` keeps
existing captures only when source revision and view metadata still agree.
After captures, run the manifest generator and `tests/scene-previews.cjs`.

The stills are demand-loaded, not installation precached. Visited new previews
use a separate serialized 24-entry cache; the existing panorama cache is retained.
Initial browser requests changed from 38 to 43 small shell requests, with zero
new checkpoint photographs or panoramas loaded on fresh map opening. All seven
building hover/focus photographs loaded without full panorama requests at
desktop DPR 1, 2 and 3. All contact sheets and seven covers were visually reviewed.

Phone peek measured 398→146 CSS px at 390×844 and 360×740. Chrome browser
emulation covered the five requested viewports, English/Arabic, light/dark,
filter/room/contextual return, drag cancellation, matching/mismatched handoff,
reduced motion, real load failure/retry and cancellation. Enlarged text and a
short keyboard-like viewport were emulated; native keyboard/Safari remain
unverified. No publication is authorized by this brief.

## Focused change and verification record

Touched app files: `index.html`, `ui-polish.css`, `ui-theme.js`,
`campus-directory.js`, `campus-sheet.js`, `campus-map-labels.js`,
`campus-popovers.js`, `campus-preview.js`, `campus-handoff.js`, `tour.js`,
`tour-routes.js`, `routes/student-forums.js`, `scene-previews.js`,
`scene-previews.generated.js`, `service-worker.js`, `tour-assets.generated.js`,
and the 82 new `previews/*.jpg` derivatives. Supporting files:
`scripts/build-scene-previews.cjs`, `scripts/render-scene-previews.py`,
`tests/campus-sheet.cjs`, `tests/campus-directory.cjs`, `tests/student-forums.cjs`, `tests/scene-previews.cjs`,
this document and `STUDENT-FORUMS.md`. Existing untracked work was preserved.

Passed: tracked-assets manifest generation, source-only tour validation (2,175
checks, no asset-directory scan), campus state/sheet/directory tests, preview
metadata/version assertions and Student Forums original-byte/isolated-graph
checks. Actual Chrome runtime tests used MapLibre, Three and original referenced
panorama assets, not stubbed maps or panorama loaders. They covered all 14
directed Forum links on desktop and emulated touch, nine off-axis crossings,
direct URLs, successful URL/title/share-link identity and Back/Forward.

Additional runtime checks passed: seven hover/focus covers at DPR 1–3,
rapid three-marker crossing, sidebar/viewport-edge positioning, pending-hover
pan cancellation, progressive three-to-seven viewpoint photos, Escape/new
selection load cancellation, repeated taps, resize, browser Back during loading,
late-response rejection, failure/retry, exact map-state restoration and a fresh
versus returning service-worker context with the 24-entry visited-preview limit.
Tests of hover produced zero panorama requests. The 075↔076 seating detour
remains explicitly unverified; source mapping and calibration notes are in
`STUDENT-FORUMS.md`. Safari and a physical phone/native keyboard were not tested.

The publish follow-up removes the original zoom-scaled colour mask from tour
labels only. Their horizontal code/360° label has its own surface, so the old
vertical artwork mask must not paint over its text. Original map artwork,
building anchors and non-tour code masks are unchanged.

## Sharper campus map artwork

`campus-map-2026.webp` is a direct rasterization of page 1 of the university's
[2026 campus-map PDF](https://www.sharjah.ac.ae/-/media/project/uos/sites/uos/discover-uos/uos-map/uosmap-2026.pdf).
The retained crop is `(81, 507, 597, 2868)` in PDF points, with the origin at the
top left. Render page 1 with Poppler at 216 DPI, then crop pixel bounds
`(243, 1521, 1791, 8604)` and resample with Pillow LANCZOS to **1350 × 6177**.
Encode WebP at quality 88, method 6 (707,270 bytes).

This is exactly 1.5 times the original 900 × 4118 raster in each dimension.
The logical artwork coordinate system, map corners, marker anchors, footprints,
camera limits and aspect ratio remain unchanged. Crop registration against the
previous asset recovered the same PDF bounds; no warping, redrawing, sharpening,
colour treatment or label replacement was applied. The vector source supplies
the additional detail. The original image remains available in Git history.

The horizontal code overlays now cover the antialiased edges of the original
rotated lettering (including A14). Their artwork-scaled masks are centered on
the marker behind the label surface, including tour badges. This supersedes
the earlier tour-mask removal: the badge stays in front, while the backing
prevents fragments of the original code from showing above and below it.
Building names, anchors and the sharper raster are unchanged by this label fix.

## Progressive panorama travel

All desktop tours now enter using the existing revisioned mobile GLB, then
replace only the panorama artwork with the original desktop GLB in place.
Camera orientation, field of view, hotspots and history do not reset during
refinement. Phones retain their native mobile asset; data-saving mode retains
the single-download path. No panorama files were regenerated or modified.

The decoded neighbor cache holds up to two desktop previews (one on phones).
Refinement is canceled when navigation starts, the map opens or the page is
hidden. Late decoded images are disposed, and a failed refinement leaves the
usable preview on screen. The existing memory budget also reserves room for
the incoming full-quality texture before upload.

Local C4 010→011 measurement, same browser and cached original assets:
1,295 ms before, 408 ms after, including the 360 ms travel animation.
The immediate C4 010 asset is 585,064 bytes at 3072×1536, versus the original
23,720,564 bytes at 11904×5952, which still loads as the final desktop view.
These are local measurements, not a guarantee for every device or connection.

## C4 floor-arrow placement

C4 floor markers now use a consistent 0.90 distance (entrance 0.82). The 003→002
marker is centered in the clear aisle independently of its existing travel
bearing. The 011→012 marker sits closer on unobstructed floor (0.72), with its
tip turned toward dining rather than into the tiered seating. The 014→015
marker uses its corridor bearing rather than the previous side offset.
All 28 directed C4 links, arrival bearings, opening views and panorama files
are preserved. Other tours' arrow placement is unchanged.
