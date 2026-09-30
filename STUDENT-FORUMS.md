# Student Forums — A6

The owner confirmed A6 (men's forum). The tour retains `building-a6`, its
verified artwork anchor, directory descriptions, stable IDs and seven pairs:
071–072, 072–073, 072–074, 073–075, 074–075, 075–076, 076–077.
No other hall connections or global scene order changed.

## Corrected source binding

| Stable semantic scene | Original photograph / runtime media |
| --- | --- |
| student-forums-071 · Outside Entrance | IMG_20260926_180711_00_071.jpg / student-forums-071.glb |
| student-forums-072 · Central Hall | IMG_20260926_180820_00_072.jpg / student-forums-072.glb |
| student-forums-073 · Left-Side Checkpoint | **IMG_20260926_180958_00_074.jpg / student-forums-074.glb** |
| student-forums-074 · Right-Side Checkpoint | **IMG_20260926_180908_00_073.jpg / student-forums-073.glb** |
| student-forums-075 · Rejoining Checkpoint | IMG_20260926_181203_00_075.jpg / student-forums-075.glb |
| student-forums-076 · Glass Passage Entrance | IMG_20260926_181301_00_076.jpg / student-forums-076.glb |
| student-forums-077 · Glass Passage | IMG_20260926_181403_00_077.jpg / student-forums-077.glb |

`mediaForScene()` resolves the same source binding for desktop GLB, mobile GLB
and standalone JPEG references. The existing runtime loads GLBs; standalone
JPEG fallback is a source-reference check, not a new runtime loading path.
Preview captures use the corrected binding. Source files are not copied,
mirrored, re-encoded or renamed. Original 11904×5952 JPEG bytes and existing
3072×1536 mobile GLBs / 2048×1024 JPEGs remain unchanged.

## Calibration and review

Branch views and independent incoming/outgoing bearings follow the actual new
photographs. 071 targets the middle doorway; 072 branches around the tree;
073/074 face the passages beside the backdrop. 075 return markers remain on
foreground clear floor, with independently directed tips. 076 points beside
the glass passage support; 077 returns along the passage.

The owner confirmed on 2026-10-01 that **075↔076 goes through the middle**.
Keep the central passage bearing and clear foreground marker; no side detour
or additional checkpoint is needed.

The 073/074 onward arrows now face the floor gaps between the seating and
display stands (3.18 / 3.10 radians), instead of the chairs. Their opening
views and arrivals from 072 use these same aisle bearings. At 075 the two
return arrows retain separate placement and tip directions. Their departure
reference now matches the marker visitors tap, preventing an unintended 30°
arrival turn caused by the marker's offset. Small deliberate look offsets
are still preserved.

Actual local Chrome desktop and emulated touch-phone clicks exercised:
071 → 072 → 073 → 075 → 074 → 072 → 074 → 075 → 076 → 077 → 076 → 075 →
073 → 072 → 071. All 14 directed views were inspected in rendered screenshots.
Additional modest off-axis branch travel checked calibrated arrival yaw and
preserved pitch. Direct 077 entry, Arabic search, browser Back/Forward and exact
map/card restoration passed. This does not establish a physical-phone/Safari
test. The central seating approach is now owner-confirmed as noted above.

## Focused reproduction

```sh
node scripts/build-tour-manifest.cjs --tracked-assets
node tests/validate-tour.cjs --source-only
node tests/student-forums.cjs
node tests/scene-previews.cjs
```

Sparse-checkout switches avoid scanning unrelated panorama directories. The
focused Forum check reads only its 21 registered runtime assets, checks original
JPEG hashes/resolutions, the exact graph/media mapping and other halls' routes.
Preloading remains the existing bounded single-neighbor system; no panorama
cache version or renderer grading changed.
