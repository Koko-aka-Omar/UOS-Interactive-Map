// Label positions are measured on the unchanged 900 × 4118 campus artwork.
// Screen-aligned labels cover the printed codes when the artwork is turned sideways.
const groups = [
  ['#454166', [['A1',562,282],['A2',532,424],['A3',562,565],['A4',558,716],['A5',458,710],['A6',637,742,13],['A7',600,828],['A8',668,919],['A9',607,919],['A10',546,919],['A11',494,1009],['A12',546,1097],['A13',607,1097],['A14',668,1097],['A15',451,819,13],['A16',294,930],['A17',299,840,13],['A19',257,173],['A-P1',738,988],['A-P2',699,440],['A-P3',457,244],['A-P4',457,534],['A-P5',457,622],['A-P6',297,878,9],['A-P7',457,936],['A-P8',457,1103]]],
  ['#f17e4e', [['B1',604,1203],['B3',484,1207],['B4',466,1297],['B-P1',738,1160,13],['B-P2',738,1293,13]]],
  ['#3268a4', [['C1',563,2128],['C2',535,1990],['C3',563,1847],['C4',555,1708],['C5',458,1702],['C6',637,1660,13],['C7',608,1578],['C8',668,1495],['C9',607,1495],['C10',546,1495],['C11',493,1406],['C12',546,1314],['C13',607,1314],['C14',668,1314],['C15',449,2169],['C-P1',738,1459],['C-P2',699,2003],['C-P3',600,2305],['C-P4',457,2305],['C-P5',457,2094],['C-P6',457,1906],['C-P7',457,1820],['C-P8',457,1603],['C-P9',457,1505]]],
  ['#02bc91', [['E1',554,3149],['E2',577,3305],['E3',561,3388],['E4',577,3462],['E5',554,3620],['E6',434,3484],['E7',397,3423],['E8',397,3343],['E9',434,3283],['E9A',443,3226,10],['E10',381,3201,13],['E16',491,3602,10],['E17',492,3550,10],['E18',484,3226,10],['E19',484,3174,10],['E6A',453,3550,10],['E-P1',651,3492,13],['E-P2',624,3043],['E-P3',427,3100],['E-P4',339,3393,8],['E-P5',431,3692],['E-P6',631,3762],['HP',219,3134],['HP',114,3227],['HP',114,3594],['HP',237,3652]]],
  ['#487f90', [['G1',193,358,12],['G2',193,572,12],['G3',321,572,12],['G4',153,789,12],['G5',318,742,12],['G6',232,709,12]]],
  ['#8653a4', [['H1',312,1739,12],['H2',193,1690,12],['H3',193,1909,12],['H4',321,1909,12],['H5',193,2158,12],['H6',321,2158,12],['H7',180,2302,12],['H8',335,2302,12],['H9',232,1772,12]]],
  ['#00bc91', [['مستشفى الجامعة\nUniversity Hospital',252,3390,15,58,104],['UoHS\nE11',257,3198,12,48,56]]],
  ['#e0ddd6', [['سكن الموظفين\nFaculty Housing',291,2889,13,34,175],['سكن الموظفين\nFaculty Housing',264,3962,13,34,175]]],
  ['#333333', [['F1',446,3927,12],['F2',605,3927,12],['F3',491,3884,12]]],
  ['#979a98', [['I',157,2415,13],['H',220,2415,13],['G',355,2415,13],['D',157,2553,13],['E',220,2553,13],['F',355,2553,13],['C',157,2688,13],['B',220,2688,13],['V',355,2688,13],['F',423,2760,13]]],
  ['#616462', [['M',159,1053,13],['N',295,1064,13],['L',159,1173,13],['O',295,1183,13],['K',159,1314,13],['P',295,1303,13],['J',159,1444,13],['Q',295,1553,13],['R',129,1545,13],['S',114,839,13],['T',114,628,13],['U',114,517,13],['V',114,380,13],['W',114,186,13]]]
];
export function addCampusArtworkLabels(map, corners, halls) {
  const point = (x, y) => [corners[0][0] + (corners[3][0] - corners[0][0]) * y / 4118,
    corners[0][1] + (corners[1][1] - corners[0][1]) * x / 900];
  groups.flatMap(([color, entries]) => entries.map(([code, x, y, size = 18, maskWidth = size + 3, maskHeight = code.length * size * 0.58 + 4]) => {
    const mask = document.createElement('div'); mask.className = 'campus-artwork-label';
    mask.style.background = color; if (color === '#e0ddd6') mask.style.color = '#333'; mask.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span'); text.textContent = code; mask.append(text);
    new maplibregl.Marker({element: mask, anchor: 'center'}).setLngLat(point(x, y)).addTo(map);
    mask.style.width = `calc(${maskWidth}px * var(--campus-art-scale, 1))`;
    mask.style.height = `calc(${maskHeight}px * var(--campus-art-scale, 1))`;
    mask.style.fontSize = `calc(${size}px * var(--campus-art-scale, 1))`;
    return mask;
  }));
  const resize = () => {
    const left = map.project(corners[3]), right = map.project(corners[0]);
    const scale = Math.abs(right.x - left.x) / 4118;
    map.getContainer().style.setProperty('--campus-art-scale', scale);
  };
  map.on('zoom', resize); map.on('resize', resize); resize();
  // Only buildings with an actual tour receive a highlight.
  const footprints = {e3: [[537,3362],[581,3362],[581,3376],[594,3376],[594,3402],[581,3402],[581,3411],[537,3411]], e2: [[540,3280],[611,3280],[620,3298],[603,3336],[551,3336],[540,3320]],
    m7: [[473,987],[515,987],[515,1026],[473,1026]]};
  const features = halls.filter(hall => hall.tour && footprints[hall.id]).map(hall => {
    const ring = footprints[hall.id].map(([x,y]) => point(x,y)); ring.push(ring[0]);
    return {type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}};
  });
  map.on('load', () => {
    map.addSource('available-tours', {type:'geojson',data:{type:'FeatureCollection',features}});
    map.addLayer({id:'tour-building-glow',type:'line',source:'available-tours',paint:{'line-color':'#23ffe0','line-width':14,'line-blur':9,'line-opacity':0.9}});
    map.addLayer({id:'tour-building-outline',type:'line',source:'available-tours',paint:{'line-color':'#b9fff0','line-width':2.5}});
  });
}
