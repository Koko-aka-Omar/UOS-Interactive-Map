# Student Forums — A6

The owner confirmed A6 (men's forum). This tour reuses `building-a6`, its
existing map anchor, directory entry and university-authored descriptions.
The added tour outline is traced from the existing campus artwork; it is not GPS.

## Source mapping

| Original JPEG | Checkpoint | Stable scene ID |
| --- | --- | --- |
| IMG_20260926_180711_00_071.jpg | 1 · Outside Entrance | student-forums-071 |
| IMG_20260926_180820_00_072.jpg | 2 · Central Hall | student-forums-072 |
| IMG_20260926_180908_00_073.jpg | 3 · Left-Side Checkpoint | student-forums-073 |
| IMG_20260926_180958_00_074.jpg | 4 · Right-Side Checkpoint | student-forums-074 |
| IMG_20260926_181203_00_075.jpg | 5 · Rejoining Checkpoint | student-forums-075 |
| IMG_20260926_181301_00_076.jpg | 6 · Glass Passage Entrance | student-forums-076 |
| IMG_20260926_181403_00_077.jpg | 7 · Glass Passage | student-forums-077 |

The only bidirectional pairs are 71–72, 72–73, 72–74, 73–75, 74–75,
75–76 and 76–77. Both loops around the tree are traversable. No cross-hall
arrows or shortcuts are added. Left/right directions at 72 and 75 are roughly
90 degrees apart; bearings in other images follow their own landmarks.

Desktop GLBs contain the byte-identical original 11904×5952 JPEGs. Only this
batch has mobile derivatives (3072×1536, existing mobile size). No per-scene
colour correction is applied. Reproduce packaging with:

```sh
python scripts/package-student-forums.py "path/to/supplied/folder"
node scripts/build-tour-manifest.cjs
node tests/validate-tour.cjs
node tests/student-forums.cjs
```

In the sparse checkout, `--tracked-assets` for the generator and `--source-only`
for the validator avoid inspecting unrelated panorama directories. The focused
Student Forums test additionally reads and verifies all 21 new runtime assets.

## Calibration and remaining review

- 71 targets the middle entrance doorway, not a side door.
- 72 branches around the tree; 73/74 onward arrows pass the backdrop rather
  than pointing toward the side exterior doors.
- 75 keeps separate branch returns and distinct branch arrival headings.
  Return hotspot placement is offset onto clear floor without rotating the tips
  merely to face the camera.
- 76's forward arrow uses the glass opening beside the central support pole.
- 77 has only the independently calibrated return along the glass passage.
- **Manual review: 75↔76.** The onward passage is identifiable, but a row of
  movable seats obstructs the straight aisle in the supplied photographs.
  The owner confirmed connectivity, not a left/right walking detour. The onward
  bearing is retained, the marker stays on foreground floor, and no detour or
  shortcut is invented. Confirm the physical approach around the seating row.

Preloading remains the existing bounded single-neighbor system: at 72 its
first likely forward choice is 73, not both branches; at 75 it prioritizes 76.
Generated revisions use the unchanged panorama cache version; existing cached
panoramas are not cleared to add this area.
