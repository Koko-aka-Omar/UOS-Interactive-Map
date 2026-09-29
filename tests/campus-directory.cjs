const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '../M7A_GitHub_Website_Full_Resolution/m7a-building');
const load = file => import(require('node:url').pathToFileURL(path.join(root,file)).href);
(async () => {
  const { groupNearby, searchHalls } = await load('campus-directory.js');
  const { HALLS } = await load('halls.js');
  const project = ([x, y]) => ({ x, y });
  const halls = [0, 50, 100, 220].map((x, i) => ({ id: String(i), coordinates: [x, 0] }));
  assert.deepEqual(groupNearby(halls, project).map(g => g.length), [3, 1], 'Nearby chains form one group');
  assert.equal(groupNearby(halls, ([x,y]) => ({x:x*2,y})).length, 4, 'Zoom separates nearby halls');
  assert.equal(groupNearby([{coordinates:[0,0]}, {coordinates:[0,0]}], project)[0].length, 2, 'Coincident halls remain selectable as a group');
  assert.equal(searchHalls(HALLS, 'm7a002', 'en')[0].room.id, 'm7a-002');
  assert.equal(searchHalls(HALLS, 'كلية العلوم', 'ar')[0].hall.id, 'm7');
  assert.equal(searchHalls(HALLS, 'does-not-exist', 'en').length, 0);
  assert.equal(searchHalls(HALLS, '', 'en').length, HALLS.length);
  const ids = new Set();
  const routeFiles = [...fs.readFileSync(path.join(root,'tour-routes.js'),'utf8').matchAll(/from\s+['"]\.\/routes\/([^'"]+\.js)['"]/g)].map(match=>match[1]);
  const routeIds = new Set();
  for (const routeFile of routeFiles) {
    const routeModule = await load(path.join('routes', routeFile));
    for (const location of routeModule.LOCATIONS || []) routeIds.add(location.id);
  }
  for (const hall of HALLS) {
    assert(!ids.has(hall.id)); ids.add(hall.id);
    const position = hall.mapCoordinates || hall.coordinates;
    assert(position.length === 2 && position.every(Number.isFinite));
    assert(Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90);
    for (const item of [hall, ...(hall.rooms || [])]) {
      if (item.tour?.scene) assert(routeIds.has(item.tour.scene), `Scene ${item.tour.scene} exists`);
    }
  }
  console.log('PASS grouping, zoom separation, coincident halls, bilingual room search and directory scene references');
})().catch(error => { console.error(error); process.exitCode = 1; });
